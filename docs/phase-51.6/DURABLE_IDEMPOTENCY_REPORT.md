# Phase 51.6 — Durable Idempotency Report

**Application:** Nova Personal Assistant PWA  
**Engine:** `WorkflowOrchestratorService` & `JarvisToolRegistryService`  
**Database Tables:** `ai_actions`, `tasks`, `projects`, `calendar_events`, `notes`, `finance_transactions`

---

## 1. Multi-Tier Idempotency Architecture

To prevent duplicate side-effects (such as creating duplicate tasks, calendar appointments, or financial debits) during retries or worker recovery, Nova enforces idempotency across two distinct layers:

### Layer 1: Logical Step Idempotency (Workflow Engine)
- **Key Format:** `step-idem-${workflowId}-${step.id}-v${executionAttempt}`
- **Pre-Mutation Persistence:** Prior to invoking any tool, the step state is marked `PENDING` in the proposal payload:
  ```typescript
  plan.stepIdempotency[step.id] = {
    stepId: step.id,
    idempotencyKey: stepIdempotencyKey,
    status: 'PENDING',
  };
  await this.persistWorkflowPlan(workflowId, plan);
  ```
- **Post-Mutation Persistence:** Once the tool succeeds, the record is immediately updated with `status: 'EXECUTED'` and the output payload.
- **Recovery Inspection:** A recovering worker checks `plan.stepIdempotency[step.id]`. If `status === 'EXECUTED'`, the mutation is skipped and the cached output is reused.

### Layer 2: Domain Boundary Idempotency (PostgreSQL Uniqueness)
- In the `AIAction` table, `idempotencyKey` has an enforced `@unique` index:
  ```prisma
  model AIAction {
    id             String    @id @default(uuid())
    idempotencyKey String    @unique
    ...
  }
  ```
- Duplicate requests carrying identical idempotency tokens fail closed with a unique constraint violation or return the existing persisted entity.

---

## 2. Crash-After-Mutation Failure Window Verification

### Failure Scenario Tested:
1. Worker $A$ starts Step 1 (`create_project`).
2. Project `Audit Alpha` is created in PostgreSQL with ID `proj-101`.
3. Worker $A$ crashes before updating `plan.stepIdempotency[step-1].status = 'EXECUTED'`.
4. Worker $B$ restarts and claims the expired workflow lease.
5. In Phase 51.6, domain mutation tools (`create_project`, `create_task`) enforce natural deduplication (e.g. checking existing projects with identical names created within the active workflow session).
6. Worker $B$ skips duplicate creation and continues forward execution cleanly.

