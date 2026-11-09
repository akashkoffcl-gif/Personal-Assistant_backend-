import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkflowPlannerService } from '../src/modules/ai/workflow/workflow-planner.service';
import { WorkflowOrchestratorService } from '../src/modules/ai/workflow/workflow-orchestrator.service';
import { ExecutionGraphValidator, WorkflowStep, WorkflowPlan } from '../src/modules/ai/workflow/workflow-graph.types';
import { JarvisToolRegistryService } from '../src/modules/ai/jarvis-tool-registry.service';
import { PrismaService } from '../src/common/prisma.service';

describe('Phase 51.2 — Multi-Step Autonomous Workflow Engine Test Suite', () => {
  let planner: WorkflowPlannerService;
  let orchestrator: WorkflowOrchestratorService;
  let jarvisRegistry: JarvisToolRegistryService;

  const mockPrisma = {
    isConnected: true,
    userSettings: {
      findUnique: jest.fn().mockResolvedValue({ userId: 'user-test-1', timezone: 'UTC' }),
    },
    aIAction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    task: {
      create: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJarvisRegistry = {
    getAllTools: jest.fn().mockReturnValue([
      { id: 'create_project', name: 'Create Project', riskLevel: 'MEDIUM', description: 'Create project' },
      { id: 'create_task', name: 'Create Task', riskLevel: 'MEDIUM', description: 'Create task' },
      { id: 'delete_task', name: 'Delete Task', riskLevel: 'HIGH', description: 'Delete task' },
      { id: 'delete_project', name: 'Delete Project', riskLevel: 'HIGH', description: 'Delete project' },
      { id: 'start_focus_session', name: 'Start Focus Session', riskLevel: 'LOW', description: 'Start focus block' },
      { id: 'create_reminder', name: 'Create Reminder', riskLevel: 'MEDIUM', description: 'Create reminder' },
      { id: 'report_emergency', name: 'Report Emergency', riskLevel: 'HIGH', description: 'Emergency mode' },
      { id: 'get_overdue_tasks', name: 'Get Overdue Tasks', riskLevel: 'LOW', description: 'Get overdue tasks' },
    ]),
    executeTool: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowPlannerService,
        WorkflowOrchestratorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JarvisToolRegistryService, useValue: mockJarvisRegistry },
      ],
    }).compile();

    planner = module.get<WorkflowPlannerService>(WorkflowPlannerService);
    orchestrator = module.get<WorkflowOrchestratorService>(WorkflowOrchestratorService);
    jarvisRegistry = module.get<JarvisToolRegistryService>(JarvisToolRegistryService);

    jest.clearAllMocks();
  });

  // ==================== SECTION A: PLANNING & DECOMPOSITION ====================
  describe('A. Planning & Intent Decomposition', () => {
    it('decomposes canonical instruction into multi-step project, tasks, focus, and reminder plan', async () => {
      const plan = await planner.planWorkflow(
        'user-test-1',
        'Create a project called Website Launch, add three tasks, schedule a focus session and remind me tomorrow at 4 PM'
      );

      expect(plan).toBeDefined();
      expect(plan.steps.length).toBe(6);
      expect(plan.steps[0].toolId).toBe('create_project');
      expect(plan.steps[1].toolId).toBe('create_task');
      expect(plan.steps[2].toolId).toBe('create_task');
      expect(plan.steps[3].toolId).toBe('create_task');
      expect(plan.steps[4].toolId).toBe('start_focus_session');
      expect(plan.steps[5].toolId).toBe('create_reminder');
      expect(plan.overallRisk).toBe('MEDIUM');
      expect(plan.requiresExplicitApproval).toBe(true);
      expect(mockPrisma.aIAction.create).toHaveBeenCalled();
    });

    it('identifies emergency high-risk instructions and flags mandatory approval', async () => {
      const plan = await planner.planWorkflow(
        'user-test-1',
        'I have an emergency, shift non-critical tasks'
      );

      expect(plan.steps.length).toBe(2);
      expect(plan.steps[0].toolId).toBe('report_emergency');
      expect(plan.overallRisk).toBe('HIGH');
      expect(plan.requiresExplicitApproval).toBe(true);
    });
  });

  // ==================== SECTION B: DAG VALIDATION & PIPING ====================
  describe('B. DAG Graph Validation & Parameter Piping', () => {
    const availableToolIds = new Set(['create_project', 'create_task', 'start_focus_session']);

    it('validates a correct acyclic graph with valid dependencies and piping', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step-1',
          toolId: 'create_project',
          description: 'Create Project',
          input: { name: 'Alpha' },
          dependencies: [],
          riskLevel: 'MEDIUM',
          status: 'PENDING',
        },
        {
          id: 'step-2',
          toolId: 'create_task',
          description: 'Create Task',
          input: { title: 'Design', projectId: '$step-1.id' },
          dependencies: ['step-1'],
          riskLevel: 'MEDIUM',
          status: 'PENDING',
        },
      ];

      const res = ExecutionGraphValidator.validateDAG(steps, availableToolIds);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it('rejects circular dependencies in the DAG', () => {
      const circularSteps: WorkflowStep[] = [
        {
          id: 'step-1',
          toolId: 'create_project',
          description: 'Create Project',
          input: {},
          dependencies: ['step-2'],
          riskLevel: 'MEDIUM',
          status: 'PENDING',
        },
        {
          id: 'step-2',
          toolId: 'create_task',
          description: 'Create Task',
          input: {},
          dependencies: ['step-1'],
          riskLevel: 'MEDIUM',
          status: 'PENDING',
        },
      ];

      const res = ExecutionGraphValidator.validateDAG(circularSteps, availableToolIds);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('Circular dependency'))).toBe(true);
    });

    it('rejects missing or undeclared parameter piping dependencies', () => {
      const undeclaredPipingSteps: WorkflowStep[] = [
        {
          id: 'step-1',
          toolId: 'create_project',
          description: 'Create Project',
          input: {},
          dependencies: [],
          riskLevel: 'MEDIUM',
          status: 'PENDING',
        },
        {
          id: 'step-2',
          toolId: 'create_task',
          description: 'Create Task',
          input: { projectId: '$step-1.id' },
          dependencies: [], // Missing declaration of step-1
          riskLevel: 'MEDIUM',
          status: 'PENDING',
        },
      ];

      const res = ExecutionGraphValidator.validateDAG(undeclaredPipingSteps, availableToolIds);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('does not declare it as a dependency'))).toBe(true);
    });

    it('correctly resolves piped parameter references from ancestor step outputs', () => {
      const step: WorkflowStep = {
        id: 'step-2',
        toolId: 'create_task',
        description: 'Create Task',
        input: { title: 'Design', projectId: '$step-1.id' },
        dependencies: ['step-1'],
        riskLevel: 'MEDIUM',
        status: 'PENDING',
      };

      const stepOutputs = new Map<string, any>();
      stepOutputs.set('step-1', { id: 'proj-uuid-12345', name: 'Alpha' });

      const resolved = ExecutionGraphValidator.resolvePipedInput(step, stepOutputs);
      expect(resolved.projectId).toBe('proj-uuid-12345');
      expect(resolved.title).toBe('Design');
    });
  });

  // ==================== SECTION C: APPROVAL & SECURITY ====================
  describe('C. Approval Binding & Anti-Tampering Security', () => {
    const userId = 'user-owner-1';
    const attackerId = 'user-attacker-666';
    const workflowId = 'wf-12345';

    it('rejects approval from a user who does not own the workflow', async () => {
      mockPrisma.aIAction.findFirst.mockResolvedValueOnce(null);

      await expect(
        planner.approveWorkflow(attackerId, workflowId)
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects approval if payload was modified after proposal (hash mismatch)', async () => {
      const canonicalSteps: WorkflowStep[] = [
        { id: 'step-1', toolId: 'create_project', description: 'Proj', input: { name: 'Alpha' }, dependencies: [], riskLevel: 'MEDIUM', status: 'PENDING' },
      ];

      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'PROPOSED',
        payload: {
          id: workflowId,
          steps: canonicalSteps,
        },
      });

      // Submit an invalid/forged hash
      await expect(
        planner.approveWorkflow(userId, workflowId, 'tampered-hash-value')
      ).rejects.toThrow(ForbiddenException);
    });

    it('approves workflow when valid payload hash matches exactly', async () => {
      const canonicalSteps: WorkflowStep[] = [
        { id: 'step-1', toolId: 'create_project', description: 'Proj', input: { name: 'Alpha' }, dependencies: [], riskLevel: 'MEDIUM', status: 'PENDING' },
      ];
      const validHash = ExecutionGraphValidator.computeStepPayloadHash(canonicalSteps);

      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'PROPOSED',
        payload: {
          id: workflowId,
          planVersion: 1,
          steps: canonicalSteps,
        },
      });

      const approvedPlan = await planner.approveWorkflow(userId, workflowId, validHash, 1);
      expect(approvedPlan.status).toBe('CONFIRMED');
      expect(approvedPlan.approvalSignature?.stepPayloadHash).toBe(validHash);
      expect(mockPrisma.aIAction.updateMany).toHaveBeenCalledWith({
        where: { id: workflowId, userId, status: 'PROPOSED' },
        data: expect.objectContaining({ status: 'CONFIRMED' }),
      });
    });
  });

  // ==================== SECTION D: ORCHESTRATION & SAGA RECOVERY ====================
  describe('D. Orchestration & Saga-Style Recovery', () => {
    const userId = 'user-owner-1';
    const workflowId = 'wf-execution-999';

    const createValidApprovedPlan = (steps: WorkflowStep[]) => {
      const hash = ExecutionGraphValidator.computeStepPayloadHash(steps);
      const plan = {
        id: workflowId,
        userId,
        status: 'CONFIRMED' as const,
        planVersion: 1,
        overallRisk: 'MEDIUM' as const,
        requiresExplicitApproval: true,
        approvalSignature: {
          approvedAt: new Date().toISOString(),
          approvedBy: userId,
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
          planVersion: 1,
          stepPayloadHash: hash,
        },
        steps,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Configure mock findUnique to return this action when checking lease
      mockPrisma.aIAction.findUnique.mockResolvedValue({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'RUNNING',
        payload: plan,
      });
      return plan;
    };

    it('successfully executes dependency-ordered steps and persists output', async () => {
      const planSteps: WorkflowStep[] = [
        { id: 'step-1', toolId: 'create_project', description: 'Create Project', input: { name: 'Alpha' }, dependencies: [], riskLevel: 'MEDIUM', status: 'PENDING' },
        { id: 'step-2', toolId: 'create_task', description: 'Create Task', input: { title: 'Design', projectId: '$step-1.id' }, dependencies: ['step-1'], riskLevel: 'MEDIUM', status: 'PENDING' },
      ];

      const validPlan = createValidApprovedPlan(planSteps);

      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'CONFIRMED',
        payload: validPlan,
      });

      // Tool mock: Step 1 returns project ID, Step 2 succeeds
      mockJarvisRegistry.executeTool
        .mockResolvedValueOnce({ success: true, data: { id: 'proj-123', name: 'Alpha' } })
        .mockResolvedValueOnce({ success: true, data: { id: 'task-456', title: 'Design', projectId: 'proj-123' } });

      const events: any[] = [];
      for await (const event of orchestrator.executeWorkflowStream(userId, workflowId)) {
        events.push(event);
      }

      expect(events.some((e) => e.type === 'STARTED')).toBe(true);
      expect(events.some((e) => e.type === 'COMPLETED')).toBe(true);
      expect(mockJarvisRegistry.executeTool).toHaveBeenCalledTimes(2);

      // Verify parameter was piped to Step 2
      expect(mockJarvisRegistry.executeTool).toHaveBeenNthCalledWith(
        2,
        userId,
        'create_task',
        expect.objectContaining({ title: 'Design', projectId: 'proj-123' })
      );
    });

    it('triggers saga compensation when an intermediate step fails and halts dependent operations', async () => {
      const planSteps: WorkflowStep[] = [
        { id: 'step-1', toolId: 'create_project', description: 'Create Project', input: { name: 'Alpha' }, dependencies: [], riskLevel: 'MEDIUM', status: 'PENDING' },
        { id: 'step-2', toolId: 'create_task', description: 'Create Task', input: { title: 'Design' }, dependencies: ['step-1'], riskLevel: 'MEDIUM', status: 'PENDING' },
      ];

      const validPlan = createValidApprovedPlan(planSteps);

      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'CONFIRMED',
        payload: validPlan,
      });

      // Step 1 succeeds, Step 2 throws error
      mockJarvisRegistry.executeTool
        .mockResolvedValueOnce({ success: true, data: { id: 'proj-to-delete-123' } })
        .mockResolvedValueOnce({ success: false, error: 'Database constraint violation on Task creation' });

      // Compensation for step-1 succeeds
      mockJarvisRegistry.executeTool.mockResolvedValueOnce({ success: true, data: { deleted: true } });

      const events: any[] = [];
      for await (const event of orchestrator.executeWorkflowStream(userId, workflowId)) {
        events.push(event);
      }

      expect(events.some((e) => e.type === 'STEP_FAILED')).toBe(true);
      expect(events.some((e) => e.type === 'STEP_COMPENSATED')).toBe(true);
      expect(events.some((e) => e.type === 'PARTIALLY_COMPLETED' || e.type === 'FAILED')).toBe(true);

      // Verify that delete_project compensation was invoked
      expect(mockJarvisRegistry.executeTool).toHaveBeenCalledWith(
        userId,
        'delete_project',
        { id: 'proj-to-delete-123' }
      );
    });

    it('compensates focus sessions via abort_focus_session when subsequent step fails', async () => {
      const planSteps: WorkflowStep[] = [
        { id: 'step-1', toolId: 'start_focus_session', description: 'Focus Session', input: { durationMinutes: 25 }, dependencies: [], riskLevel: 'LOW', status: 'PENDING' },
        { id: 'step-2', toolId: 'create_reminder', description: 'Create Reminder', input: { title: 'Break' }, dependencies: ['step-1'], riskLevel: 'MEDIUM', status: 'PENDING' },
      ];

      const validPlan = createValidApprovedPlan(planSteps);

      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'CONFIRMED',
        payload: validPlan,
      });

      // Step 1 (focus session) succeeds, Step 2 fails
      mockJarvisRegistry.executeTool
        .mockResolvedValueOnce({ success: true, data: { id: 'focus-session-id-999', status: 'ACTIVE' } })
        .mockResolvedValueOnce({ success: false, error: 'Reminder service down' });

      // Compensation for step-1 abort_focus_session succeeds
      mockJarvisRegistry.executeTool.mockResolvedValueOnce({ success: true, data: { status: 'ABANDONED' } });

      const events: any[] = [];
      for await (const event of orchestrator.executeWorkflowStream(userId, workflowId)) {
        events.push(event);
      }

      expect(events.some((e) => e.type === 'STEP_COMPENSATED')).toBe(true);
      expect(events.some((e) => e.type === 'PARTIALLY_COMPLETED')).toBe(true);

      // Verify that abort_focus_session was called with the session id
      expect(mockJarvisRegistry.executeTool).toHaveBeenCalledWith(
        userId,
        'abort_focus_session',
        { id: 'focus-session-id-999' }
      );
    });

    it('rejects execution when approval has expired (>30 minutes)', async () => {
      const planSteps: WorkflowStep[] = [
        { id: 'step-1', toolId: 'create_project', description: 'Create Project', input: { name: 'Alpha' }, dependencies: [], riskLevel: 'MEDIUM', status: 'PENDING' },
      ];

      // Expired signature from 1 hour ago
      const expiredAt = new Date(Date.now() - 3600 * 1000).toISOString();

      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'CONFIRMED',
        payload: {
          id: workflowId,
          userId,
          status: 'CONFIRMED',
          planVersion: 1,
          approvalSignature: {
            approvedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
            approvedBy: userId,
            expiresAt: expiredAt,
            planVersion: 1,
            stepPayloadHash: ExecutionGraphValidator.computeStepPayloadHash(planSteps),
          },
          steps: planSteps,
        },
      });

      await expect(async () => {
        for await (const _ of orchestrator.executeWorkflowStream(userId, workflowId)) {}
      }).rejects.toThrow(ForbiddenException);
    });

    it('rejects duplicate execution when CAS check fails (workflow already RUNNING or COMPLETED)', async () => {
      const planSteps: WorkflowStep[] = [
        { id: 'step-1', toolId: 'create_project', description: 'Create Project', input: { name: 'Alpha' }, dependencies: [], riskLevel: 'MEDIUM', status: 'PENDING' },
      ];

      const validPlan = createValidApprovedPlan(planSteps);

      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'CONFIRMED',
        payload: validPlan,
      });

      // Simulate concurrent CAS failure (count: 0)
      mockPrisma.aIAction.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(async () => {
        for await (const _ of orchestrator.executeWorkflowStream(userId, workflowId)) {}
      }).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== SECTION E: PHASE 51.2.2 LEASE & APPROVAL HARDENING ====================
  describe('E. Phase 51.2.2 Lease, Recovery, and Approval Hardening', () => {
    const userId = 'user-owner-1';
    const attackerId = 'attacker-user-999';
    const workflowId = 'wf-lease-hardening-100';

    const createValidApprovedPlan = (steps: WorkflowStep[]): WorkflowPlan => {
      const hash = ExecutionGraphValidator.computeStepPayloadHash(steps);
      const plan: WorkflowPlan = {
        id: workflowId,
        userId,
        title: 'Test Workflow',
        originalPrompt: 'Test Prompt',
        status: 'CONFIRMED',
        planVersion: 1,
        overallRisk: 'MEDIUM',
        requiresExplicitApproval: true,
        approvalSignature: {
          approvedAt: new Date().toISOString(),
          approvedBy: userId,
          expiresAt: new Date(Date.now() + 1800000).toISOString(),
          planVersion: 1,
          stepPayloadHash: hash,
        },
        steps,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockPrisma.aIAction.findUnique.mockResolvedValue({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'RUNNING',
        payload: plan,
      });
      return plan;
    };

    it('rejects direct execution of a PROPOSED workflow without prior approval', async () => {
      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'PROPOSED',
        payload: {
          id: workflowId,
          userId,
          status: 'PROPOSED',
          steps: [],
        },
      });

      await expect(async () => {
        for await (const _ of orchestrator.executeWorkflowStream(userId, workflowId)) {}
      }).rejects.toThrow(ForbiddenException);
    });

    it('rejects execution when approval record is missing', async () => {
      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'CONFIRMED',
        payload: {
          id: workflowId,
          userId,
          status: 'CONFIRMED',
          // Missing approvalSignature
          steps: [],
        },
      });

      await expect(async () => {
        for await (const _ of orchestrator.executeWorkflowStream(userId, workflowId)) {}
      }).rejects.toThrow(ForbiddenException);
    });

    it('rejects execution when approval signature is missing expiry timestamp', async () => {
      const steps = [{ id: 's1', toolId: 'create_project', description: 'p', input: {}, dependencies: [], riskLevel: 'LOW' as const, status: 'PENDING' as const }];
      const hash = ExecutionGraphValidator.computeStepPayloadHash(steps);
      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'CONFIRMED',
        payload: {
          id: workflowId,
          userId,
          status: 'CONFIRMED',
          planVersion: 1,
          approvalSignature: {
            approvedAt: new Date().toISOString(),
            approvedBy: userId,
            planVersion: 1,
            stepPayloadHash: hash,
            // missing expiresAt
          },
          steps,
        },
      });

      await expect(async () => {
        for await (const _ of orchestrator.executeWorkflowStream(userId, workflowId)) {}
      }).rejects.toThrow(ForbiddenException);
    });

    it('rejects execution when step payload was tampered with after approval (hash mismatch)', async () => {
      const steps = [{ id: 's1', toolId: 'create_project', description: 'p', input: { name: 'Alpha' }, dependencies: [], riskLevel: 'LOW' as const, status: 'PENDING' as const }];
      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'CONFIRMED',
        payload: {
          id: workflowId,
          userId,
          status: 'CONFIRMED',
          planVersion: 1,
          approvalSignature: {
            approvedAt: new Date().toISOString(),
            approvedBy: userId,
            expiresAt: new Date(Date.now() + 1800000).toISOString(),
            planVersion: 1,
            stepPayloadHash: 'tampered-hash-does-not-match',
          },
          steps,
        },
      });

      await expect(async () => {
        for await (const _ of orchestrator.executeWorkflowStream(userId, workflowId)) {}
      }).rejects.toThrow(ForbiddenException);
    });

    it('rejects cross-user execution attempts', async () => {
      mockPrisma.aIAction.findFirst.mockResolvedValueOnce(null);

      await expect(async () => {
        for await (const _ of orchestrator.executeWorkflowStream(attackerId, workflowId)) {}
      }).rejects.toThrow(NotFoundException);
    });

    it('halts worker immediately when execution lease is lost or stolen mid-workflow', async () => {
      const planSteps: WorkflowStep[] = [
        { id: 'step-1', toolId: 'create_project', description: 'Proj', input: { name: 'Alpha' }, dependencies: [], riskLevel: 'MEDIUM', status: 'PENDING' },
      ];
      createValidApprovedPlan(planSteps);

      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'CONFIRMED',
        payload: createValidApprovedPlan(planSteps),
      });

      // Simulate lease stolen: findUnique returns a different worker token
      mockPrisma.aIAction.findUnique.mockResolvedValueOnce({
        id: workflowId,
        payload: {
          lease: {
            workerOwnershipToken: 'stolen-by-other-worker-token',
            leaseExpiresAt: new Date(Date.now() + 60000).toISOString(),
          },
        },
      });

      await expect(async () => {
        for await (const _ of orchestrator.executeWorkflowStream(userId, workflowId, 'worker-token-original')) {}
      }).rejects.toThrow(ForbiddenException);
    });

    it('allows claiming recovery only when lease has genuinely expired', async () => {
      const activeExpiresAt = new Date(Date.now() + 60000).toISOString();
      const expiredAt = new Date(Date.now() - 5000).toISOString();

      // Case 1: Active lease - recovery must be denied
      mockPrisma.aIAction.findUnique.mockResolvedValueOnce({
        id: workflowId,
        status: 'RUNNING',
        payload: {
          status: 'RUNNING',
          lease: {
            workerOwnershipToken: 'worker-1',
            leaseExpiresAt: activeExpiresAt,
            executionAttempt: 1,
          },
        },
      });

      const activeClaim = await orchestrator.claimWorkflowRecovery(workflowId, 'worker-recovery-2');
      expect(activeClaim).toBeNull();

      // Case 2: Expired lease - recovery succeeds atomically
      mockPrisma.aIAction.findUnique.mockResolvedValueOnce({
        id: workflowId,
        status: 'RUNNING',
        payload: {
          status: 'RUNNING',
          lease: {
            workerOwnershipToken: 'worker-1',
            leaseExpiresAt: expiredAt,
            executionAttempt: 1,
          },
        },
      });
      mockPrisma.aIAction.updateMany.mockResolvedValueOnce({ count: 1 });

      const recoveryClaim = await orchestrator.claimWorkflowRecovery(workflowId, 'worker-recovery-2');
      expect(recoveryClaim).not.toBeNull();
      expect(recoveryClaim?.lease?.workerOwnershipToken).toBe('worker-recovery-2');
      expect(recoveryClaim?.lease?.executionAttempt).toBe(2);
    });

    it('rejects simultaneous recovery claims when another worker claimed first (CAS count: 0)', async () => {
      const expiredAt = new Date(Date.now() - 5000).toISOString();
      mockPrisma.aIAction.findUnique.mockResolvedValueOnce({
        id: workflowId,
        status: 'RUNNING',
        payload: {
          status: 'RUNNING',
          lease: {
            workerOwnershipToken: 'worker-1',
            leaseExpiresAt: expiredAt,
            executionAttempt: 1,
          },
        },
      });
      // Race: another worker updated the row first
      mockPrisma.aIAction.updateMany.mockResolvedValueOnce({ count: 0 });

      const claim = await orchestrator.claimWorkflowRecovery(workflowId, 'worker-recovery-losing');
      expect(claim).toBeNull();
    });

    it('recovers previously executed steps idempotently without re-executing mutations', async () => {
      const planSteps: WorkflowStep[] = [
        { id: 'step-1', toolId: 'create_project', description: 'Proj', input: { name: 'Alpha' }, dependencies: [], riskLevel: 'MEDIUM', status: 'PENDING' },
        { id: 'step-2', toolId: 'create_task', description: 'Task', input: { title: 'T1' }, dependencies: ['step-1'], riskLevel: 'MEDIUM', status: 'PENDING' },
      ];

      const validPlan = createValidApprovedPlan(planSteps);
      // Simulate step-1 was already durably executed before worker crash
      validPlan.stepIdempotency = {
        'step-1': {
          stepId: 'step-1',
          idempotencyKey: 'step-idem-123',
          status: 'EXECUTED',
          output: { id: 'cached-proj-123', name: 'Alpha' },
        },
      };

      mockPrisma.aIAction.findFirst.mockResolvedValueOnce({
        id: workflowId,
        userId,
        actionType: 'MULTI_STEP_WORKFLOW',
        status: 'CONFIRMED',
        payload: validPlan,
      });

      // Only step 2 should execute tool!
      mockJarvisRegistry.executeTool.mockResolvedValueOnce({ success: true, data: { id: 'task-999', title: 'T1' } });

      const events: any[] = [];
      for await (const event of orchestrator.executeWorkflowStream(userId, workflowId)) {
        events.push(event);
      }

      expect(events.some((e) => e.type === 'COMPLETED')).toBe(true);
      // Tool was executed only ONCE for step-2!
      expect(mockJarvisRegistry.executeTool).toHaveBeenCalledTimes(1);
      expect(mockJarvisRegistry.executeTool).toHaveBeenCalledWith(
        userId,
        'create_task',
        expect.objectContaining({ title: 'T1' })
      );
    });
  });
});

