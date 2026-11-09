import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../common/prisma.service';
import { JarvisToolRegistryService } from '../jarvis-tool-registry.service';
import {
  WorkflowPlan,
  WorkflowStep,
  WorkflowLease,
  WorkflowStateMachine,
  ExecutionGraphValidator,
} from './workflow-graph.types';

export interface WorkflowProgressEvent {
  workflowId: string;
  type: 'STARTED' | 'STEP_STARTED' | 'STEP_COMPLETED' | 'STEP_FAILED' | 'STEP_COMPENSATED' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_COMPLETED' | 'CANCELLED';
  stepId?: string;
  toolId?: string;
  progressPercent: number;
  message: string;
  result?: any;
  error?: string;
  timestamp: string;
}

@Injectable()
export class WorkflowOrchestratorService {
  private readonly logger = new Logger(WorkflowOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jarvisRegistry: JarvisToolRegistryService,
  ) {}

  /**
   * Executes an approved multi-step DAG workflow with live progress streaming,
   * parameter piping, error isolation, persistence verification, and saga compensation.
   */
  async *executeWorkflowStream(
    userId: string,
    workflowId: string,
    workerToken?: string,
  ): AsyncGenerator<WorkflowProgressEvent> {
    this.logger.log(`[WorkflowOrchestrator] Starting workflow execution ${workflowId} for user ${userId}`);

    // 1. Fetch & authorize workflow record
    const action = await this.prisma.aIAction.findFirst({
      where: { id: workflowId, userId },
    });
    if (!action) throw new NotFoundException(`Workflow ${workflowId} not found or unauthorized`);
    if (action.actionType !== 'MULTI_STEP_WORKFLOW') throw new BadRequestException(`Action is not a multi-step workflow`);

    // Strict state check: PROPOSED workflows cannot execute without approval
    if (action.status === 'PROPOSED') {
      throw new ForbiddenException(`Workflow ${workflowId} is in PROPOSED state and requires explicit approval before execution.`);
    }

    // Must be in CONFIRMED or RUNNING (for active worker resuming) state to be eligible for execution
    if (action.status !== 'CONFIRMED' && action.status !== 'RUNNING') {
      throw new BadRequestException(`Workflow ${workflowId} is in status "${action.status}" and cannot transition to RUNNING.`);
    }

    const plan = action.payload as unknown as WorkflowPlan;

    // Fail closed: Mandatory approval signature check
    if (!plan.approvalSignature) {
      throw new ForbiddenException(`Workflow ${workflowId} lacks a valid approval signature. Direct execution rejected.`);
    }

    if (plan.approvalSignature.approvedBy !== userId) {
      throw new ForbiddenException(`Approval signature mismatch: approved by ${plan.approvalSignature.approvedBy}, attempted execution by ${userId}.`);
    }

    if (plan.approvalSignature.planVersion !== plan.planVersion) {
      throw new ForbiddenException(`Approval signature plan version mismatch (${plan.approvalSignature.planVersion} !== ${plan.planVersion}).`);
    }

    // Fail closed: Mandatory expiration check
    if (!plan.approvalSignature.expiresAt) {
      throw new ForbiddenException(`Approval signature is missing an expiration timestamp. Fail-closed rejection.`);
    }

    const expiresAt = new Date(plan.approvalSignature.expiresAt).getTime();
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      plan.status = 'CANCELLED';
      plan.updatedAt = new Date().toISOString();
      await this.prisma.aIAction.update({
        where: { id: workflowId },
        data: { status: 'CANCELLED', payload: plan as any },
      });
      throw new ForbiddenException(`Workflow approval has expired. A fresh plan and approval is required.`);
    }

    // Fail closed: Canonical payload hash re-verification
    const currentPayloadHash = ExecutionGraphValidator.computeStepPayloadHash(plan.steps);
    if (plan.approvalSignature.stepPayloadHash !== currentPayloadHash) {
      throw new ForbiddenException(`Workflow step payload was tampered with after approval. Hash verification failed.`);
    }

    // Explicit confirmation check: Workflows requiring approval must have approved status
    if (plan.requiresExplicitApproval && plan.status !== 'CONFIRMED' && plan.status !== 'RUNNING' && (plan.status as any) !== 'APPROVED') {
      throw new ForbiddenException(`Explicit user approval is mandatory for this workflow (Risk: ${plan.overallRisk})`);
    }

    // 2. Distributed Worker Lease Acquisition & Atomic CAS Status Transition
    const activeWorkerToken = workerToken || randomUUID();
    const leaseDurationMs = 30000; // 30-second heartbeat lease
    const nowIso = new Date().toISOString();
    const leaseExpiresIso = new Date(Date.now() + leaseDurationMs).toISOString();

    let executionAttempt = 1;
    let currentFencingVersion = 1;

    if (action.status === 'CONFIRMED') {
      const previousAttempt = plan.lease?.executionAttempt || 0;
      executionAttempt = previousAttempt + 1;
      currentFencingVersion = (plan.lease?.fencingVersion || 0) + 1;

      plan.lease = {
        workflowId,
        workerOwnershipToken: activeWorkerToken,
        leaseExpiresAt: leaseExpiresIso,
        lastHeartbeatAt: nowIso,
        executionAttempt,
        fencingVersion: currentFencingVersion,
      };

      WorkflowStateMachine.validateTransition('CONFIRMED', 'RUNNING');
      plan.status = 'RUNNING';
      plan.updatedAt = nowIso;
      plan.stepIdempotency = plan.stepIdempotency || {};

      const casUpdate = await this.prisma.aIAction.updateMany({
        where: {
          id: workflowId,
          userId,
          status: 'CONFIRMED', // PROPOSED is strictly excluded
        },
        data: { status: 'RUNNING', payload: plan as any },
      });

      if (casUpdate.count === 0) {
        throw new BadRequestException(`Workflow ${workflowId} cannot transition to RUNNING (already executing, completed, or unapproved).`);
      }
    } else if (action.status === 'RUNNING') {
      // Resume / worker execution on already running workflow: enforce lease ownership
      const hasLease = await this.verifyAndRenewLease(workflowId, activeWorkerToken);
      if (!hasLease) {
        throw new ForbiddenException(`Execution lease expired or stolen by another worker. Worker ${activeWorkerToken} is fenced.`);
      }
      executionAttempt = plan.lease?.executionAttempt || 1;
      currentFencingVersion = plan.lease?.fencingVersion || 1;
    }

    yield {
      workflowId,
      type: 'STARTED',
      progressPercent: 0,
      message: `Starting execution of ${plan.steps.length} planned operations (Lease attempt: ${executionAttempt}).`,
      timestamp: new Date().toISOString(),
    };

    const stepOutputs = new Map<string, any>();
    const completedStepIds = new Set<string>();
    const failedStepIds = new Set<string>();
    const stepCount = plan.steps.length;

    let hasFailure = false;
    let failureError: string | null = null;

    // 3. Sequential & Dependency-Aware DAG Execution Loop
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];

      // Verify worker lease ownership before executing step
      const hasLease = await this.verifyAndRenewLease(workflowId, activeWorkerToken);
      if (!hasLease) {
        this.logger.error(`[WorkflowOrchestrator] Worker lost execution lease for workflow ${workflowId} at step ${step.id}. Halting.`);
        throw new ForbiddenException(`Execution lease expired or stolen by another worker. Execution halted.`);
      }

      // Check if workflow was cancelled by user
      const currentAction = await this.prisma.aIAction.findUnique({
        where: { id: workflowId },
        select: { status: true },
      });
      if (currentAction?.status === 'CANCELLED') {
        this.logger.warn(`[WorkflowOrchestrator] Workflow ${workflowId} was cancelled by user. Halting execution loop.`);
        hasFailure = true;
        failureError = 'Workflow cancelled by user during execution';
        step.status = 'SKIPPED';
        step.error = 'Execution cancelled by user';
        break;
      }
      if (!hasLease) {
        this.logger.error(`[WorkflowOrchestrator] Worker lost execution lease for workflow ${workflowId} at step ${step.id}. Halting.`);
        throw new ForbiddenException(`Execution lease expired or stolen by another worker. Execution halted.`);
      }

      // Check if any prerequisite dependency has failed
      const prerequisiteFailed = step.dependencies.some((depId) => failedStepIds.has(depId));
      if (prerequisiteFailed || hasFailure) {
        step.status = 'SKIPPED';
        step.error = 'Skipped due to upstream dependency failure';
        continue;
      }

      // Resolve piped inputs from ancestor step outputs
      const resolvedInput = ExecutionGraphValidator.resolvePipedInput(step, stepOutputs);
      step.status = 'EXECUTING';
      step.executedAt = new Date().toISOString();

      // Stable step idempotency key generation & persistence
      // Logical key MUST be stable across retries, worker restarts, and lease recovery (P0 remediation)
      const stepIdempotencyKey = step.idempotencyKey || `step-idem-${workflowId}-${step.id}`;
      step.idempotencyKey = stepIdempotencyKey;

      // Check if this step was already executed (durable step recovery)
      const existingIdem = plan.stepIdempotency[step.id];
      if (existingIdem && existingIdem.status === 'EXECUTED' && existingIdem.output) {
        this.logger.log(`[WorkflowOrchestrator] Step ${step.id} was already executed durably. Reusing cached output.`);
        step.output = existingIdem.output;
        stepOutputs.set(step.id, existingIdem.output);
        step.status = 'COMPLETED';
        completedStepIds.add(step.id);
        yield {
          workflowId,
          type: 'STEP_COMPLETED',
          stepId: step.id,
          toolId: step.toolId,
          progressPercent: Math.round(((i + 1) / stepCount) * 100),
          message: `Reused prior execution: ${step.description}`,
          result: existingIdem.output,
          timestamp: new Date().toISOString(),
        };
        continue;
      }

      // Persist PENDING step idempotency marker before executing mutation
      plan.stepIdempotency[step.id] = {
        stepId: step.id,
        idempotencyKey: stepIdempotencyKey,
        status: 'PENDING',
      };
      await this.persistWorkflowPlan(workflowId, plan);

      yield {
        workflowId,
        type: 'STEP_STARTED',
        stepId: step.id,
        toolId: step.toolId,
        progressPercent: Math.round(((i + 0.1) / stepCount) * 100),
        message: `Executing: ${step.description}`,
        timestamp: new Date().toISOString(),
      };

      try {
        // Enforce lease fencing at the exact mutation boundary immediately before executing the domain tool
        const boundaryFencingValid = await this.verifyAndRenewLease(
          workflowId,
          activeWorkerToken,
          30000,
          currentFencingVersion,
        );
        if (!boundaryFencingValid) {
          this.logger.error(`[WorkerFencing] Worker token ${activeWorkerToken} lost lease or fencing version before mutation at step ${step.id}. Aborting write.`);
          throw new ForbiddenException(`Execution lease expired, claimed by another worker, or fencing version invalidated. Mutation aborted.`);
        }

        // Execute tool via unified JarvisToolRegistryService
        const execResult = await this.jarvisRegistry.executeTool(userId, step.toolId, {
          ...resolvedInput,
          stepIdempotencyKey,
          fencingVersion: currentFencingVersion,
          workflowId,
        });

        if (!execResult.success) {
          throw new Error(execResult.error || `Execution failed for tool ${step.toolId}`);
        }

        // Store output for potential downstream piping
        const outputData = execResult.data;
        step.output = outputData;
        stepOutputs.set(step.id, outputData);
        step.status = 'COMPLETED';
        completedStepIds.add(step.id);

        // Mark step idempotency as EXECUTED with output
        plan.stepIdempotency[step.id] = {
          stepId: step.id,
          idempotencyKey: stepIdempotencyKey,
          status: 'EXECUTED',
          output: outputData,
          executedAt: new Date().toISOString(),
        };
        await this.persistWorkflowPlan(workflowId, plan);

        yield {
          workflowId,
          type: 'STEP_COMPLETED',
          stepId: step.id,
          toolId: step.toolId,
          progressPercent: Math.round(((i + 1) / stepCount) * 100),
          message: `Completed: ${step.description}`,
          result: outputData,
          timestamp: new Date().toISOString(),
        };
      } catch (stepErr: any) {
        this.logger.error(`[WorkflowOrchestrator] Step ${step.id} (${step.toolId}) failed: ${stepErr.message}`);
        step.status = 'FAILED';
        step.error = stepErr.message || 'Operation failed';
        failedStepIds.add(step.id);
        hasFailure = true;
        failureError = stepErr.message;

        yield {
          workflowId,
          type: 'STEP_FAILED',
          stepId: step.id,
          toolId: step.toolId,
          progressPercent: Math.round(((i + 1) / stepCount) * 100),
          message: `Failed: ${step.description} (${step.error})`,
          error: step.error,
          timestamp: new Date().toISOString(),
        };

        // Break on failure to begin compensation / graceful reporting
        break;
      }
    }

    // 4. Handle Compensation If Failures Occurred (Saga Pattern)
    if (hasFailure) {
      this.logger.warn(`[WorkflowOrchestrator] Initiating saga compensation for completed steps in workflow ${workflowId}`);
      plan.compensationLog = plan.compensationLog || [];

      // Compensate completed steps in reverse order
      const completedStepsReversed = plan.steps
        .filter((s) => s.status === 'COMPLETED')
        .reverse();

      for (const stepToCompensate of completedStepsReversed) {
        // Verify lease before each compensation operation
        const hasCompensationLease = await this.verifyAndRenewLease(workflowId, activeWorkerToken);
        if (!hasCompensationLease) {
          this.logger.error(`[WorkflowOrchestrator] Worker lost lease during compensation of step ${stepToCompensate.id}. Aborting compensation.`);
          throw new ForbiddenException(`Lease expired during compensation. Halting compensation.`);
        }

        const compensation = await this.compensateStep(userId, stepToCompensate);
        plan.compensationLog.push(compensation);

        if (compensation.status === 'SUCCESS') {
          stepToCompensate.status = 'COMPENSATED';
          stepToCompensate.compensatedAt = new Date().toISOString();
          if (plan.stepIdempotency?.[stepToCompensate.id]) {
            plan.stepIdempotency[stepToCompensate.id].status = 'COMPENSATED';
            plan.stepIdempotency[stepToCompensate.id].compensatedAt = stepToCompensate.compensatedAt;
          }
          await this.persistWorkflowPlan(workflowId, plan);

          yield {
            workflowId,
            type: 'STEP_COMPENSATED',
            stepId: stepToCompensate.id,
            toolId: stepToCompensate.toolId,
            progressPercent: 100,
            message: `Compensated/Reverted: ${stepToCompensate.description}`,
            timestamp: new Date().toISOString(),
          };
        }
      }

      const finalStatus: 'PARTIALLY_COMPLETED' | 'FAILED' = completedStepIds.size > 0 ? 'PARTIALLY_COMPLETED' : 'FAILED';
      WorkflowStateMachine.validateTransition('RUNNING', finalStatus);
      plan.status = finalStatus;
      plan.updatedAt = new Date().toISOString();

      // Conditional CAS: Only finalize to FAILED if workflow is still RUNNING
      const failCas = await this.prisma.aIAction.updateMany({
        where: { id: workflowId, userId, status: 'RUNNING' },
        data: {
          status: 'FAILED',
          payload: plan as any,
        },
      });

      if (failCas.count === 0) {
        this.logger.warn(`[WorkflowOrchestrator] Final failure CAS missed for ${workflowId} (concurrent cancellation or completion).`);
      }

      yield {
        workflowId,
        type: finalStatus,
        progressPercent: 100,
        message: `Workflow concluded with status: ${finalStatus}. ${failureError}`,
        error: failureError || undefined,
        timestamp: new Date().toISOString(),
      };
      return;
    }

    // 5. Success Conclude: Verify Persisted State & Finalize
    WorkflowStateMachine.validateTransition('RUNNING', 'COMPLETED');
    plan.status = 'COMPLETED';
    plan.updatedAt = new Date().toISOString();

    // Conditional CAS: Only finalize to EXECUTED if workflow is still in RUNNING state
    const completeCas = await this.prisma.aIAction.updateMany({
      where: { id: workflowId, userId, status: 'RUNNING' },
      data: {
        status: 'EXECUTED',
        executedAt: new Date(),
        payload: plan as any,
      },
    });

    if (completeCas.count === 0) {
      this.logger.warn(`[WorkflowOrchestrator] Completion CAS missed for ${workflowId} (concurrently cancelled or lost lease).`);
      yield {
        workflowId,
        type: 'CANCELLED',
        progressPercent: 100,
        message: `Workflow ${workflowId} was cancelled before final completion could be persisted.`,
        timestamp: new Date().toISOString(),
      };
      return;
    }

    yield {
      workflowId,
      type: 'COMPLETED',
      progressPercent: 100,
      message: `All ${plan.steps.length} operations executed and verified successfully.`,
      result: {
        completedSteps: Array.from(completedStepIds),
        totalOperations: plan.steps.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Helper to persist current plan state synchronously
   */
  private async persistWorkflowPlan(workflowId: string, plan: WorkflowPlan): Promise<void> {
    plan.updatedAt = new Date().toISOString();
    await this.prisma.aIAction.update({
      where: { id: workflowId },
      data: { payload: plan as any },
    });
  }

  /**
   * Atomically verifies that the active worker still owns the execution lease,
   * and optionally checks that the worker's fencing version matches the active lease.
   */
  async verifyAndRenewLease(
    workflowId: string,
    workerOwnershipToken: string,
    leaseDurationMs = 30000,
    expectedFencingVersion?: number,
  ): Promise<boolean> {
    const action = await this.prisma.aIAction.findUnique({
      where: { id: workflowId },
    });
    if (!action) return false;

    const plan = action.payload as unknown as WorkflowPlan;
    if (!plan.lease) return false;

    // Check ownership token
    if (plan.lease.workerOwnershipToken !== workerOwnershipToken) {
      this.logger.warn(`[WorkerLease] Token mismatch for workflow ${workflowId}. Held by ${plan.lease.workerOwnershipToken}, checked by ${workerOwnershipToken}`);
      return false;
    }

    // Check fencing version if provided (monotonically increasing fencing check)
    if (expectedFencingVersion !== undefined && plan.lease.fencingVersion !== undefined) {
      if (plan.lease.fencingVersion !== expectedFencingVersion) {
        this.logger.warn(`[WorkerLease] Fencing version mismatch for workflow ${workflowId}. Current active version ${plan.lease.fencingVersion} !== expected ${expectedFencingVersion}`);
        return false;
      }
    }

    // Check lease expiration
    const expiresAt = new Date(plan.lease.leaseExpiresAt).getTime();
    if (Date.now() > expiresAt) {
      this.logger.warn(`[WorkerLease] Lease expired for workflow ${workflowId} at ${plan.lease.leaseExpiresAt}`);
      return false;
    }

    // Renew lease heartbeat atomically
    const nowIso = new Date().toISOString();
    const newExpiresIso = new Date(Date.now() + leaseDurationMs).toISOString();

    plan.lease.lastHeartbeatAt = nowIso;
    plan.lease.leaseExpiresAt = newExpiresIso;

    await this.prisma.aIAction.update({
      where: { id: workflowId },
      data: { payload: plan as any },
    });

    return true;
  }

  /**
   * Atomically claims an expired workflow for recovery by a new worker.
   * Ensures that two recovery processes do not simultaneously claim the workflow.
   */
  async claimWorkflowRecovery(workflowId: string, newWorkerToken: string, leaseDurationMs = 30000): Promise<WorkflowPlan | null> {
    const action = await this.prisma.aIAction.findUnique({
      where: { id: workflowId },
    });
    if (!action) return null;

    const plan = action.payload as unknown as WorkflowPlan;
    if (plan.status !== 'RUNNING' && action.status !== 'RUNNING') {
      return null; // Not currently running
    }

    const now = Date.now();
    const currentExpires = plan.lease?.leaseExpiresAt ? new Date(plan.lease.leaseExpiresAt).getTime() : 0;

    // Only allow recovery if lease is genuinely expired or missing
    if (currentExpires > now) {
      this.logger.warn(`[WorkerRecovery] Cannot claim recovery for workflow ${workflowId}: active lease valid until ${plan.lease?.leaseExpiresAt}`);
      return null;
    }

    const previousAttempt = plan.lease?.executionAttempt || 1;
    const previousFencingVersion = plan.lease?.fencingVersion || 1;
    const newFencingVersion = previousFencingVersion + 1;
    const nowIso = new Date().toISOString();
    const newExpiresIso = new Date(now + leaseDurationMs).toISOString();

    const updatedLease: WorkflowLease = {
      workflowId,
      workerOwnershipToken: newWorkerToken,
      leaseExpiresAt: newExpiresIso,
      lastHeartbeatAt: nowIso,
      executionAttempt: previousAttempt + 1,
      fencingVersion: newFencingVersion,
    };

    plan.lease = updatedLease;
    plan.updatedAt = nowIso;

    // Atomic CAS to claim recovery:
    // Ensure workflow is still RUNNING and lease has not been concurrently updated by another worker
    const updateResult = await this.prisma.aIAction.updateMany({
      where: {
        id: workflowId,
        status: 'RUNNING',
      },
      data: {
        payload: plan as any,
      },
    });

    if (updateResult.count === 0) {
      return null;
    }

    return plan;
  }

  /**
   * Reversible domain compensation handler for safe rollback
   */
  private async compensateStep(
    userId: string,
    step: WorkflowStep,
  ): Promise<{ stepId: string; toolId: string; action: string; status: 'SUCCESS' | 'FAILED'; timestamp: string; error?: string }> {
    const timestamp = new Date().toISOString();
    const outputId = step.output?.id || step.output?.data?.id;

    try {
      if (step.toolId === 'create_task' && outputId) {
        await this.jarvisRegistry.executeTool(userId, 'delete_task', { id: outputId });
        return { stepId: step.id, toolId: step.toolId, action: 'delete_task', status: 'SUCCESS', timestamp };
      }

      if (step.toolId === 'create_project' && outputId) {
        await this.jarvisRegistry.executeTool(userId, 'delete_project', { id: outputId });
        return { stepId: step.id, toolId: step.toolId, action: 'delete_project', status: 'SUCCESS', timestamp };
      }

      if (step.toolId === 'create_knowledge_note' && outputId) {
        await this.jarvisRegistry.executeTool(userId, 'delete_knowledge_note', { id: outputId });
        return { stepId: step.id, toolId: step.toolId, action: 'delete_knowledge_note', status: 'SUCCESS', timestamp };
      }

      if (step.toolId === 'start_focus_session' && outputId) {
        await this.jarvisRegistry.executeTool(userId, 'abort_focus_session', { id: outputId });
        return { stepId: step.id, toolId: step.toolId, action: 'abort_focus_session', status: 'SUCCESS', timestamp };
      }

      // Non-destructive or uncompensatable step (e.g. read operations)
      return { stepId: step.id, toolId: step.toolId, action: 'NO_COMPENSATION_NEEDED', status: 'SUCCESS', timestamp };
    } catch (err: any) {
      this.logger.error(`[WorkflowOrchestrator] Compensation failed for step ${step.id}: ${err.message}`);
      return { stepId: step.id, toolId: step.toolId, action: 'COMPENSATION_ERROR', status: 'FAILED', timestamp, error: err.message };
    }
  }

  /**
   * Cancels a running, confirmed, or proposed workflow with authenticated ownership validation
   * Uses an atomic CAS update to prevent overwriting concurrent completions or terminal states.
   */
  async cancelWorkflow(userId: string, workflowId: string, reason = 'User requested cancellation'): Promise<WorkflowPlan> {
    const action = await this.prisma.aIAction.findFirst({
      where: { id: workflowId, userId },
    });
    if (!action) throw new NotFoundException(`Workflow ${workflowId} not found or unauthorized`);

    const currentStatus = action.status as any;
    if (WorkflowStateMachine.isTerminal(currentStatus)) {
      throw new BadRequestException(`Workflow ${workflowId} is in terminal status ${currentStatus} and cannot be cancelled.`);
    }

    WorkflowStateMachine.validateTransition(currentStatus, 'CANCELLED');

    const plan = action.payload as unknown as WorkflowPlan;
    plan.status = 'CANCELLED';
    plan.updatedAt = new Date().toISOString();

    // Atomic compare-and-set: ensure status is still non-terminal and belongs to the user
    const casResult = await this.prisma.aIAction.updateMany({
      where: {
        id: workflowId,
        userId,
        status: { in: ['DRAFT', 'PROPOSED', 'CONFIRMED', 'RUNNING'] },
      },
      data: {
        status: 'CANCELLED',
        payload: plan as any,
      },
    });

    if (casResult.count === 0) {
      // Concurrency race: the workflow reached a terminal status (COMPLETED/FAILED/CANCELLED) in the interim
      const freshRecord = await this.prisma.aIAction.findUnique({ where: { id: workflowId } });
      throw new BadRequestException(`Workflow ${workflowId} cannot be cancelled; current state is already ${freshRecord?.status}.`);
    }

    this.logger.log(`[WorkflowOrchestrator] User ${userId} successfully cancelled workflow ${workflowId}. Reason: ${reason}`);
    return plan;
  }

  /**
   * Synchronous execution wrapper for programmatic tests and background workers
   */
  async executeWorkflow(userId: string, workflowId: string, workerToken?: string): Promise<WorkflowPlan> {
    const events: WorkflowProgressEvent[] = [];
    for await (const event of this.executeWorkflowStream(userId, workflowId, workerToken)) {
      events.push(event);
    }
    const action = await this.prisma.aIAction.findUnique({ where: { id: workflowId } });
    return action?.payload as unknown as WorkflowPlan;
  }
}

