# Phase 51.6.4 — Baseline Source Audit

## 1. Executive Summary

This baseline source audit independently inspected the actual state of `JarvisToolRegistryService`, domain services (`TasksService`, `ProjectsService`, `RoutinesService`, `KnowledgeService`, `FinanceService`), Prisma models, and active daemon processes at repository path `D:\PT` following Phase 51.6.3.

## 2. Source Code Inspection Findings

### A. Idempotency Claim Mechanics in `JarvisToolRegistryService`
- In Phase 51.6.3, `JarvisToolRegistryService.executeTool()` created a `PENDING` idempotency claim via `AIAction.create()` catching Prisma `P2002` uniqueness errors.
- **Identified Gap:** The domain mutation was executed via `await tool.execute(userId, input)` outside of a coupled database transaction with the idempotency record. If a process crashed after domain write but prior to `AIAction.upsert()`, an orphaned domain entity would exist with a pending idempotency claim.
- **Identified Gap in Claim Cleanup:** On execution failure, `deleteMany({ where: { idempotencyKey, status: 'PENDING' } })` was unconditionally called. If an abandoned claim lease had timed out and was in the middle of being reclaimed, blind deletion risked interfering with retry state.

### B. Worker Fencing at the Database Boundary
- In Phase 51.6.3, `executeTool()` performed an initial check of `workflowId` and `fencingVersion` against `this.prisma.aIAction.findUnique()`.
- **Identified Gap:** If Worker A passed the initial validation check and experienced a delay before executing the domain write, a concurrent Worker B could increment `fencingVersion`. Without transactional fencing inside the mutation boundary, Worker A's write could commit stale domain mutations.

### C. State Lifecycle & Immutability
- Evaluated `WorkflowPlan.status` (DAG engine lifecycle) versus `AIAction.status` (database action/idempotency record).
- Confirmed that PostgreSQL conditional updates (`WHERE status IN ('RUNNING', 'CONFIRMED')`) prevent terminal states (`COMPLETED`, `EXECUTED`, `FAILED`, `CANCELLED`, `COMPENSATED`) from being overwritten by delayed or out-of-order worker executions.

## 3. Remediation Target Scope
1. **Transactional Domain Coupling:** Group PostgreSQL domain creation and `AIAction` status transition (`PENDING -> EXECUTED`) into a single `this.prisma.$transaction(async (tx) => { ... })`.
2. **In-Transaction Fencing:** Query active workflow lease and verify monotonic `fencingVersion` inside the domain transaction before mutating rows.
3. **Lease Timeout Recovery:** Replace blind deletion with a 15-second claim lease expiration check and safe reclamation.

