# Phase 51.4 — Security Regression Report: Multi-Tenant Isolation & Fencing

**Application:** Nova Personal Assistant PWA  
**Backend:** NestJS Modular Monolith (`http://localhost:3001/api/v1`)  
**Scope:** Tenant boundaries, CAS concurrency checks, SHA-256 payload tampering, and worker lease fencing.  
**Test Suite:** `scripts/test-cancellation-security.js` & `apps/api/test/multi-step-workflow.spec.ts`

---

## 1. Security Invariants Audited

| Invariant | Protection Mechanism | Threat Mitigated | Audit Result |
| :--- | :--- | :--- | :---: |
| **Strict Multi-Tenant Isolation** | Scoped queries `where: { id, userId }` on every mutation and read. | Tenant $B$ reads or tampers with Tenant $A$'s data. | VERIFIED |
| **Cryptographic Anti-Tampering** | SHA-256 canonical hash of the DAG graph and parameters. | Intercepting approval request to alter step parameters. | VERIFIED |
| **Atomic CAS State Transitions** | `prisma.planningProposal.updateMany({ where: { id, status: 'CONFIRMED' } })` | Race conditions leading to duplicate or concurrent runs. | VERIFIED |
| **Distributed Worker Leases** | Heartbeat lease with monotonic expiration and fencing token. | Zombie/split-brain worker double-executing mutations. | VERIFIED |
| **Fail-Closed Anaphora** | Context validation checks ownership before proposing actions. | Forging foreign task IDs in speech UI context. | VERIFIED |

---

## 2. Multi-Tenant Cross-User Attack Tests

### Test 1: Cross-User Workflow Cancellation
- **Attack Vector:** An authenticated attacker (User $B$) sends a `POST /ai/workflows/<User_A_Workflow_ID>/cancel` request.
- **Defense Implementation:** `ai.controller.ts` calls `workflowOrchestrator.cancelWorkflow(req.user.id, workflowId, reason)`. The Prisma query filters `where: { id: workflowId, userId: req.user.id }`.
- **Observed Behavior:** HTTP 404 / 403. Attacker receives no confirmation that the workflow exists, preventing ID enumeration.

### Test 2: Cross-User Workflow Execution
- **Attack Vector:** User $B$ discovers User $A$'s approved workflow ID and sends `POST /ai/workflows/<User_A_Workflow_ID>/execute`.
- **Defense Implementation:** Database query asserts `userId: user.id`. The operation aborts before acquiring a worker lease.
- **Observed Behavior:** HTTP 404 / 403. Execution fails immediately; zero side-effects produced.

### Test 3: Forged Context Injection (Anaphora Poisoning)
- **Attack Vector:** User $B$ passes `{ uiContext: { selectedTaskId: "<User_A_Task_ID>" } }` in a natural language command: *"Complete this task"*.
- **Defense Implementation:** `AIService` and `TasksService` validate that `selectedTaskId` belongs to `req.user.id`.
- **Observed Behavior:** HTTP 400 Bad Request (`Task with ID ... not found.`). User $B$ cannot read or mutate User $A$'s tasks.

---

## 3. Worker Lease Fencing & Recovery Under Split-Brain

In `WorkflowOrchestratorService`, lease hijacking and stale worker recovery were tested via Jest integration tests (`multi-step-workflow.spec.ts`):
1. **Heartbeat Expiry Enforcement:** A worker whose lease expires mid-workflow is immediately rejected from persisting subsequent step results (`Worker lost execution lease for workflow wf-... at step step-1. Halting.`).
2. **Lease Stealing Prevention:** An idle worker attempting to claim an unexpired lease is rejected with `CAS count: 0`.
3. **Idempotent Recovery:** A new worker claiming an expired lease resumes execution from the last uncompleted step without re-executing already committed mutations.

