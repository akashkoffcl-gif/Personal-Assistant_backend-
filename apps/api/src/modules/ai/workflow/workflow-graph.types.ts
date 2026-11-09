import { createHash } from 'crypto';

export type WorkflowStepStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'READY'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED'
  | 'COMPENSATION_REQUIRED'
  | 'COMPENSATED';

export type WorkflowStatus =
  | 'DRAFT'
  | 'PROPOSED'
  | 'CONFIRMED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'EXECUTED'
  | 'FAILED'
  | 'PARTIALLY_COMPLETED'
  | 'COMPENSATED'
  | 'CANCELLED'
  | 'REJECTED';

export interface WorkflowLease {
  workflowId: string;
  workerOwnershipToken: string;
  leaseExpiresAt: string;
  lastHeartbeatAt: string;
  executionAttempt: number;
  fencingVersion: number;
}

export interface StepIdempotencyRecord {
  stepId: string;
  idempotencyKey: string;
  status: 'PENDING' | 'EXECUTED' | 'COMPENSATED';
  output?: any;
  executedAt?: string;
  compensatedAt?: string;
}

export interface WorkflowStep {
  id: string; // e.g. "step-1"
  workflowId?: string;
  toolId: string;
  description: string;
  input: Record<string, any>;
  dependencies: string[]; // List of step IDs that must succeed before this step runs
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: WorkflowStepStatus;
  idempotencyKey?: string;
  output?: any;
  error?: string;
  executedAt?: string;
  compensatedAt?: string;
}

export interface WorkflowPlan {
  id: string;
  userId: string;
  title: string;
  originalPrompt: string;
  status: WorkflowStatus;
  planVersion: number;
  steps: WorkflowStep[];
  approvalSignature?: {
    approvedAt: string;
    approvedBy: string;
    expiresAt: string;
    planVersion: number;
    stepPayloadHash: string;
  };
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  requiresExplicitApproval: boolean;
  lease?: WorkflowLease;
  stepIdempotency?: Record<string, StepIdempotencyRecord>;
  compensationLog?: Array<{
    stepId: string;
    toolId: string;
    action: string;
    status: 'SUCCESS' | 'FAILED';
    timestamp: string;
    error?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export class WorkflowStateMachine {
  private static readonly PERMITTED_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
    DRAFT: ['PROPOSED', 'CANCELLED'],
    PROPOSED: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
    CONFIRMED: ['RUNNING', 'CANCELLED'],
    RUNNING: ['COMPLETED', 'EXECUTED', 'PARTIALLY_COMPLETED', 'FAILED', 'COMPENSATED', 'CANCELLED'],
    COMPLETED: [],
    EXECUTED: [],
    PARTIALLY_COMPLETED: [],
    FAILED: [],
    COMPENSATED: [],
    CANCELLED: [],
    REJECTED: [],
  };

  static validateTransition(from: WorkflowStatus, to: WorkflowStatus): void {
    const allowed = this.PERMITTED_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw new Error(`Illegal workflow state transition from "${from}" to "${to}". Permitted: [${allowed.join(', ')}]`);
    }
  }

  static isTerminal(status: WorkflowStatus): boolean {
    return ['COMPLETED', 'EXECUTED', 'PARTIALLY_COMPLETED', 'FAILED', 'COMPENSATED', 'CANCELLED', 'REJECTED'].includes(status);
  }
}

export class ExecutionGraphValidator {
  /**
   * Generates a deterministic hash of the workflow's step payloads
   * Used to guarantee that approval cannot be forged or replayed against modified payloads.
   */
  static computeStepPayloadHash(steps: WorkflowStep[]): string {
    const canonical = steps.map((s) => ({
      id: s.id,
      toolId: s.toolId,
      input: s.input,
      dependencies: [...s.dependencies].sort(),
      riskLevel: s.riskLevel,
    }));
    return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  }

  /**
   * Validates DAG topological integrity:
   * 1. All dependencies must reference existing step IDs.
   * 2. No step may depend on itself.
   * 3. No circular dependency loops (DFS cycle detection).
   * 4. Parameter piping references ($step-id.field) must reference valid ancestor dependencies.
   */
  static validateDAG(steps: WorkflowStep[], availableToolIds: Set<string>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const stepMap = new Map<string, WorkflowStep>();

    for (const step of steps) {
      if (!step.id) {
        errors.push(`Step missing unique identifier.`);
        continue;
      }
      if (stepMap.has(step.id)) {
        errors.push(`Duplicate step identifier "${step.id}".`);
      }
      stepMap.set(step.id, step);

      if (!availableToolIds.has(step.toolId)) {
        errors.push(`Step "${step.id}" references unregistered tool "${step.toolId}".`);
      }
    }

    // Dependency presence check
    for (const step of steps) {
      for (const depId of step.dependencies) {
        if (!stepMap.has(depId)) {
          errors.push(`Step "${step.id}" depends on non-existent step "${depId}".`);
        }
        if (depId === step.id) {
          errors.push(`Step "${step.id}" cannot depend on itself.`);
        }
      }
    }

    // Circular dependency detection via Depth-First Search
    const visited = new Map<string, 'UNVISITED' | 'VISITING' | 'VISITED'>();
    for (const step of steps) visited.set(step.id, 'UNVISITED');

    const hasCycle = (stepId: string, path: string[]): boolean => {
      visited.set(stepId, 'VISITING');
      const step = stepMap.get(stepId);
      if (step) {
        for (const depId of step.dependencies) {
          const state = visited.get(depId);
          if (state === 'VISITING') {
            errors.push(`Circular dependency detected: ${[...path, stepId, depId].join(' -> ')}`);
            return true;
          }
          if (state === 'UNVISITED') {
            if (hasCycle(depId, [...path, stepId])) return true;
          }
        }
      }
      visited.set(stepId, 'VISITED');
      return false;
    };

    for (const step of steps) {
      if (visited.get(step.id) === 'UNVISITED') {
        if (hasCycle(step.id, [])) break;
      }
    }

    // Validate parameter piping references: {$stepId.field}
    const pipingRegex = /^\$([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.-]+)$/;
    for (const step of steps) {
      for (const [key, val] of Object.entries(step.input || {})) {
        if (typeof val === 'string' && val.startsWith('$')) {
          const match = val.match(pipingRegex);
          if (!match) {
            errors.push(`Step "${step.id}" parameter "${key}" contains invalid piping reference format: "${val}". Must match $stepId.field.`);
          } else {
            const refStepId = match[1];
            if (!step.dependencies.includes(refStepId)) {
              errors.push(`Step "${step.id}" pipes parameter from "${refStepId}", but does not declare it as a dependency in "dependencies".`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Resolves piped parameter values from ancestor outputs
   * Safe JSON extraction with no arbitrary code execution or eval
   */
  static resolvePipedInput(
    step: WorkflowStep,
    stepOutputs: Map<string, any>,
  ): Record<string, any> {
    const resolvedInput: Record<string, any> = {};
    const pipingRegex = /^\$([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.-]+)$/;

    for (const [key, val] of Object.entries(step.input || {})) {
      if (typeof val === 'string' && val.startsWith('$')) {
        const match = val.match(pipingRegex);
        if (match) {
          const refStepId = match[1];
          const refField = match[2];
          const ancestorOutput = stepOutputs.get(refStepId);

          if (ancestorOutput && typeof ancestorOutput === 'object') {
            const fieldVal = ancestorOutput[refField] !== undefined ? ancestorOutput[refField] : ancestorOutput?.data?.[refField];
            if (fieldVal !== undefined) {
              resolvedInput[key] = fieldVal;
            } else {
              resolvedInput[key] = val; // fallback
            }
          } else {
            resolvedInput[key] = val;
          }
        } else {
          resolvedInput[key] = val;
        }
      } else {
        resolvedInput[key] = val;
      }
    }

    return resolvedInput;
  }
}

