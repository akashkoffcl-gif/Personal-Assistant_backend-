# Phase 51.6.5 — Database Locking & Fencing Design

## 1. Architectural Design

To ensure true mutual exclusion between active domain workers and lease recovery workers, Nova uses PostgreSQL row-level locks on the authoritative workflow execution record in the `ai_actions` table.

### A. Lock Acquisition Order
1. **Transaction Start:** Worker starts a PostgreSQL transaction (`$transaction`).
2. **Authoritative Row Lock:**
   ```sql
   SELECT id, status, payload FROM "ai_actions" WHERE id = $1 FOR UPDATE;
   ```
3. **Fencing Verification:**
   Inside the lock, inspect `payload->'lease'->>'fencingVersion'`.
   If `activeFencingVersion > workerFencingVersion`, throw `ForbiddenException`.
4. **Idempotency Claim Lock:**
   ```sql
   SELECT id, status, payload FROM "ai_actions" WHERE "idempotencyKey" = $1 FOR UPDATE;
   ```
   Verify `claimToken` matches `activeClaimToken`.
5. **Domain Mutation Write:** Insert domain entity (e.g. `Task`, `Project`).
6. **Persistence of Result:** Update `ai_actions` with `status = 'EXECUTED'` and entity result.
7. **Transaction Commit:** Both locks released atomically; changes made visible simultaneously.

## 2. Deadlock Prevention
- Strict canonical lock order:
  1. Primary Lock: Workflow record (`id = workflowId`)
  2. Secondary Lock: Step Idempotency slot (`idempotencyKey = stepIdempotencyKey`)
- No cycle exists because steps within a DAG are processed sequentially or strictly follow dependency order.

