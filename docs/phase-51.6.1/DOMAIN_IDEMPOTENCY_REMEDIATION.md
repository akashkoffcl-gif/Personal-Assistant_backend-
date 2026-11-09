# Phase 51.6.1 Domain Idempotency Remediation Report

**Application:** Nova Personal Assistant PWA  
**Engine:** `WorkflowOrchestratorService` (`apps/api/src/modules/ai/workflow/workflow-orchestrator.service.ts`)  
**Domain Modules:** Tasks, Projects, Calendar, Notes, Focus, Finance

---

## 1. Stable Logical Idempotency Key Design

### The Remediation:
In previous builds, step idempotency keys included the execution attempt counter:
```typescript
// PREVIOUS FLAWED IMPLEMENTATION:
const stepIdempotencyKey = step.idempotencyKey || `step-idem-${workflowId}-${step.id}-v${executionAttempt}`;
```
When Worker $A$ failed on attempt 1, Worker $B$ resumed on attempt 2, generating `...-v2`. This defeated domain deduplication checks because the idempotency token changed across recovery attempts.

### The Corrected Implementation (Phase 51.6.1):
```typescript
// STABLE CANONICAL IDEMPOTENCY KEY:
const stepIdempotencyKey = step.idempotencyKey || `step-idem-${workflowId}-${step.id}`;
step.idempotencyKey = stepIdempotencyKey;
```
Now, across initial execution, worker restarts, crashes, and retry attempts, the logical key remains **100% stable and deterministic**.

---

## 2. Pre-Mutation Status Persistence & Crash Windows

1. **Before Tool Execution:**
   - The orchestrator persists the step with `status: 'PENDING'` and the stable `stepIdempotencyKey` directly into the database.
2. **If a Crash Occurs After Mutation But Before Result Persistence:**
   - A recovering worker inspects the persisted proposal payload.
   - For domain entities with unique idempotency keys or natural constraints (e.g. task / project creation), the domain layer returns the existing created entity rather than creating a duplicate row.
3. **Recovery Verification:**
   - The recovering worker resumes from the next uncompleted step, leaving previously committed records pristine.

