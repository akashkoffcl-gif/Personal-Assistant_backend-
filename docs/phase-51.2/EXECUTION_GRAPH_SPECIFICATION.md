# Phase 51.2 — Execution Graph Specification

## 1. Graph Model
A multi-step workflow is modeled as a Directed Acyclic Graph:
$$G = (V, E)$$
Where:
- $V = \{s_1, s_2, \dots, s_n\}$ represents the set of workflow steps.
- $E = \{(s_i, s_j)\}$ represents execution dependencies where step $s_j$ requires step $s_i$ to succeed before $s_j$ can execute.

## 2. Step Data Interface
```typescript
interface WorkflowStep {
  id: string; // e.g. "step-1"
  workflowId?: string;
  toolId: string;
  description: string;
  input: Record<string, any>;
  dependencies: string[]; // List of ancestor step IDs
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: WorkflowStepStatus;
  idempotencyKey?: string;
  output?: any;
  error?: string;
  executedAt?: string;
  compensatedAt?: string;
}
```

## 3. Parameter Piping Contract
- Steps may reference outputs of ancestor steps using the canonical token:
  `$stepId.field`
- Example: `projectId: '$step-1.id'`
- Safe resolution evaluates against `ancestorOutput[field]` or `ancestorOutput.data[field]`.
- Evaluating arbitrary expressions (e.g. `eval`, functions, or complex JavaScript syntax) is strictly forbidden and rejected at graph validation time.

## 4. Graph Lifecycle
```
DRAFT ──> VALIDATING ──> PROPOSED ──> APPROVED ──> EXECUTING ──> VERIFYING ──> COMPLETED
  │                         │                                            │
  └─── (Errors) ────────────┴───> REJECTED / CANCELLED                   └───> FAILED / PARTIALLY_COMPLETED / COMPENSATED
```

