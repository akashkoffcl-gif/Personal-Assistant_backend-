# PHASE 51.2.2 — DURABLE STEP IDEMPOTENCY REPORT

## 1. Executive Summary

Previous implementations relied primarily on heuristic deduplication (such as querying tasks by title within a 10-minute window). This had two fatal flaws:
1. It blocked legitimate duplicate task creation when a user intentionally created two tasks with the same title.
2. If a network interruption occurred between mutation completion and database plan persistence, retrying the step created duplicates.

Phase 51.2.2 establishes durable, stable per-step idempotency keys with two-phase state persistence.

---

## 2. Architecture & Persistence Protocol

### 2.1 Stable Key Generation
For every step in a workflow plan:
```typescript
const stepIdempotencyKey = step.idempotencyKey || `step-idem-${workflowId}-${step.id}-v${executionAttempt}`;
step.idempotencyKey = stepIdempotencyKey;
```

### 2.2 Two-Phase Step Idempotency Lifecycle
1. **Phase 1: Pre-Mutation Registration (`PENDING`)**
   Before dispatching the mutation to `JarvisToolRegistryService`, the orchestrator marks:
   ```typescript
   plan.stepIdempotency[step.id] = {
     stepId: step.id,
     idempotencyKey: stepIdempotencyKey,
     status: 'PENDING',
   };
   await this.persistWorkflowPlan(workflowId, plan);
   ```
2. **Phase 2: Post-Mutation Persistence (`EXECUTED` with cached output)**
   Once the domain mutation completes:
   ```typescript
   plan.stepIdempotency[step.id] = {
     stepId: step.id,
     idempotencyKey: stepIdempotencyKey,
     status: 'EXECUTED',
     output: outputData,
     executedAt: new Date().toISOString(),
   };
   await this.persistWorkflowPlan(workflowId, plan);
   ```

### 2.3 Crash Recovery & Output Reuse
If the worker process restarts mid-execution or re-executes a workflow:
```typescript
const existingIdem = plan.stepIdempotency[step.id];
if (existingIdem && existingIdem.status === 'EXECUTED' && existingIdem.output) {
  // Reuse prior output without calling the domain tool
  step.output = existingIdem.output;
  stepOutputs.set(step.id, existingIdem.output);
  step.status = 'COMPLETED';
  completedStepIds.add(step.id);
  continue;
}
```

---

## 3. Test & Verification Evidence

### 3.1 Unit Test (`multi-step-workflow.spec.ts`)
- **Test:** `recovers previously executed steps idempotently without re-executing mutations`
- **Result:** **PASS**. Step 1 had cached idempotency output; only Step 2 executed `mockJarvisRegistry.executeTool`. Total tool invocations: 1.

### 3.2 Live Database Evidence (PostgreSQL)
Querying live workflow `wf-1793951970055-d68rg` verified that every step had its persistent record:
- Step 1: `idempotencyKey: 'step-idem-wf-1793951970055-d68rg-step-1-v1'`, status: `EXECUTED`, cached `id: b650f17a...`.
- Step 2: `idempotencyKey: 'step-idem-wf-1793951970055-d68rg-step-2-v1'`, status: `EXECUTED`, cached `id: c20bb369...`.
- Step 3: `status: 'COMPENSATED'`, compensated at `2026-11-06T08:00:06.079Z`.
- Step 4: `status: 'COMPENSATED'`, compensated at `2026-11-06T07:59:59.868Z`.
- Step 5: `status: 'PENDING'` (failed before mutation).

