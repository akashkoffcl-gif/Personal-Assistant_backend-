# Phase 51.7 — Worker Fencing and Recovery Report

## 1. Locking Protocol & Deadlock Prevention

All workflow execution and lease recovery operations follow a single canonical lock order:
1. Primary Lock: `SELECT id, status, payload FROM "ai_actions" WHERE id = $1 FOR UPDATE` (Workflow Lease)
2. Secondary Lock: `SELECT id, status, payload FROM "ai_actions" WHERE "idempotencyKey" = $1 FOR UPDATE` (Step Idempotency Slot)

## 2. Multi-Connection Race Results (`scripts/test-two-worker-rowlock.js`)

Executed with two independent Prisma PostgreSQL client connections:
- **Scenario 1 (Lock Exclusion):** Worker A held row lock for 2,500 ms. Worker B was blocked for 2,695 ms until Worker A completed and released its lock.
- **Scenario 2 (Reverse Ordering):** Worker B acquired fencing version 11 first. Worker A attempting to write with version 10 was rejected at the database boundary with HTTP 403 Forbidden ("Stale worker fencing version 10. Active workflow fencing version is 11"). PostgreSQL query confirmed 0 rows written by Worker A, Worker B committed successfully, and exactly 1 entity existed in the database.

## 3. Claim Reclamation Race (`scripts/test-claim-reclamation-race.js`)
- Expired claims (>15s) were reclaimed via atomic conditional CAS matching previous `claimToken`.
- Resumed stale Worker A was rejected from mutating and received the deterministic cached entity ID.
- Active unexpired claims were protected against unauthorized stealing (update count: 0).

