# Phase 51.5 Workstream B: Workflow Recovery & Idempotency Report

**Application:** Nova Personal Assistant PWA  
**Engine:** `WorkflowOrchestratorService`  
**Test Suite:** `apps/api/test/multi-step-workflow.spec.ts`  
**Result:** **23 / 23 Tests PASS (100%)**

---

## 1. Stable Logical Idempotency Identity

Under Phase 51.5 Workstream B, step idempotency keys were audited and verified to prevent duplicate mutations across retry and recovery attempts.

Each workflow step generates a deterministic idempotency key:
$$\text{idempotencyKey} = \text{stepIdempotencyKey} \parallel \text{step.id} \parallel \text{workflowId}$$

### Pre-Mutation Persistence Boundary
Before invoking any mutating tool through `JarvisToolRegistryService.executeTool()`, the orchestrator marks the step as `PENDING` within the durable proposal payload:
```typescript
plan.stepIdempotency[step.id] = {
  stepId: step.id,
  idempotencyKey: stepIdempotencyKey,
  status: 'PENDING',
};
await this.persistWorkflowPlan(workflowId, plan);
```

---

## 2. Recovery Under Worker Failure

### Test Scenario: Worker Crash After Mutation Before Step Completion
1. Worker $A$ starts execution on Step 1 (`create_project`).
2. Domain mutation creates the project in PostgreSQL.
3. Worker $A$ crashes before recording step completion.
4. Worker $B$ claims the expired lease after 30 seconds via atomic CAS:
   ```typescript
   where: { id: workflowId, leaseExpiresAt: { lt: new Date() } }
   ```
5. Worker $B$ detects existing durable execution state (`status === 'EXECUTED'` or domain idempotency record) and reuses the cached output without re-invoking the mutation.
6. Execution proceeds cleanly to Step 2.

---

## 3. Worker Lease Fencing Guarantees

1. **Heartbeat Renewal:** Active workers renew their monotonic lease before every step execution loop.
2. **Immediate Halting on Stolen Lease:** If a worker loses its lease (e.g. heartbeat timeout or clock skew), the next step check throws `ForbiddenException: Execution lease expired or stolen by another worker. Execution halted.`
3. **Split-Brain Immunity:** Stale workers cannot commit subsequent step outputs or trigger spurious Saga compensations.

