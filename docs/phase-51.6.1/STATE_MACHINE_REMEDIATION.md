# Phase 51.6.1 State Machine Remediation Report

**Application:** Nova Personal Assistant PWA  
**Engine:** `WorkflowOrchestratorService` & `WorkflowStateMachine`  
**Database Model:** `AIAction` (`ai_actions` PostgreSQL table)

---

## 1. Canonical State Transition Specification

Every state transition in the Nova workflow engine is governed by strict database-level Compare-And-Set (CAS) conditional queries:

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PROPOSED: generatePlan()
    PROPOSED --> CONFIRMED: approveWorkflow(CAS status: 'PROPOSED')
    PROPOSED --> CANCELLED: cancelWorkflow(CAS status in [DRAFT, PROPOSED])
    CONFIRMED --> RUNNING: executeWorkflowStream(CAS status: 'CONFIRMED')
    CONFIRMED --> CANCELLED: cancelWorkflow(CAS status: 'CONFIRMED')
    RUNNING --> CANCELLED: cancelWorkflow(CAS status: 'RUNNING')
    RUNNING --> COMPLETED: finalizeSuccess(CAS status: 'RUNNING')
    RUNNING --> FAILED: finalizeFailure(CAS status: 'RUNNING')
    RUNNING --> COMPENSATING: startCompensation(CAS status: 'RUNNING')
    COMPENSATING --> COMPENSATED: finalizeCompensation(CAS status: 'COMPENSATING')
    COMPLETED --> [*]: Terminal (CAS fails on all transitions)
    CANCELLED --> [*]: Terminal (CAS fails on all transitions)
    FAILED --> [*]: Terminal (CAS fails on all transitions)
    COMPENSATED --> [*]: Terminal (CAS fails on all transitions)
```

---

## 2. Concurrency Race Mitigation

- **Zero Overwrite Risk:** Completion updates strictly specify `where: { id: workflowId, userId, status: 'RUNNING' }`. If a cancellation arrives first and sets `status = 'CANCELLED'`, the completion query matches 0 rows and logs a warning, refraining from overwriting the cancellation.
- **Fail-Closed Terminal Transitions:** Terminal states (`COMPLETED`, `CANCELLED`, `FAILED`, `COMPENSATED`) cannot transition to any other status.

