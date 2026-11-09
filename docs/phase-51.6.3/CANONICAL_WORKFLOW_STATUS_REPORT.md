# Canonical Workflow Status Reconciliation Report

## 1. Context & Motivation
Across legacy components, three distinct state vocabularies previously overlapped:
- Single-step `AIAction` entities utilized `PROPOSED`, `CONFIRMED`, `EXECUTED`, and `REJECTED`.
- Multi-step workflows and DAG engines utilized `DRAFT`, `PROPOSED`, `CONFIRMED`, `RUNNING`, `COMPLETED`, `PARTIALLY_COMPLETED`, `FAILED`, `COMPENSATED`, and `CANCELLED`.
- Frontend UI components and action drawers historically mapped `EXECUTED` as completion, leading to subtle ambiguities where completion CAS updates checked `status: 'RUNNING'` and wrote `status: 'EXECUTED'`, while state machine transitions expected `'COMPLETED'`.

Phase 51.6.3 establishes a unified canonical workflow status model that eliminates mapping mismatches across database, state machine, SSE streams, and frontend types.

---

## 2. The Canonical Status Definition
Defined in `apps/api/src/modules/ai/workflow/workflow-graph.types.ts`:

```typescript
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
```

---

## 3. Authoritative State Machine Transitions
Defined in `WorkflowStateMachine`:

```typescript
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

  static isTerminal(status: WorkflowStatus): boolean {
    return ['COMPLETED', 'EXECUTED', 'PARTIALLY_COMPLETED', 'FAILED', 'COMPENSATED', 'CANCELLED', 'REJECTED'].includes(status);
  }
}
```

---

## 4. Frontend & SSE Contract Alignment
- In `apps/web/src/components/AIAssistant/types.ts`, `ActionProposal.status` now explicitly accommodates all canonical lifecycle states:
  ```typescript
  export interface ActionProposal {
    id: string;
    actionType: string;
    description: string;
    payload: any;
    status: 'DRAFT' | 'PROPOSED' | 'CONFIRMED' | 'RUNNING' | 'COMPLETED' | 'EXECUTED' | 'REJECTED' | 'FAILED' | 'PARTIALLY_COMPLETED' | 'COMPENSATED' | 'CANCELLED';
    createdAt?: string;
  }
  ```
- SSE Progress Stream (`WorkflowProgressEvent`):
  - Emits `STARTED`, `STEP_STARTED`, `STEP_COMPLETED`, `STEP_FAILED`, `STEP_COMPENSATED`, `COMPLETED`, `FAILED`, `PARTIALLY_COMPLETED`, or `CANCELLED`.
  - Final database CAS update commits `EXECUTED` to `ai_actions.status` while persisting `plan.status = 'COMPLETED'` in the payload, ensuring both backend queries on `status = 'EXECUTED'` and workflow engines reading `plan.status` operate without friction.

---

## 5. Verification
- All 6 state-transition concurrency scenarios in `scripts/test-state-concurrency.js` pass with 100% deterministic single-winner assertions.
- 23/23 Jest specs in `apps/api/test/multi-step-workflow.spec.ts` pass without state transition violations.

