# Phase 51.6.5 — Claim Reclamation Race Report

## 1. Test Harness Overview

The race test script (`scripts/test-claim-reclamation-race.js`) reproduced the mandatory race scenario against the live running API:

1. Worker A acquires claim with `tokenA` and simulates expiration (>15s).
2. Worker B discovers expired claim, executes atomic CAS reclaim with `tokenB`, and commits domain mutation.
3. Database marks idempotency status as `EXECUTED`.
4. Worker A resumes and attempts domain mutation using the same idempotency key.
5. Deterministic entity returned: Worker A receives Worker B's committed entity ID (`CachedFromIdempotency: true`).
6. Active unexpired claim protection: Verified that an active claim cannot be stolen (CAS update count: 0).
7. Direct PostgreSQL check confirms exactly 1 domain entity created.

## 2. Test Execution Output

```
================================================================
PHASE 51.6.5 — P0-A CLAIM OWNERSHIP AND RECLAMATION RACE TEST
Target API: http://localhost:3001/api/v1
User ID: 00000000-0000-0000-0000-000000000001
================================================================

[Step 1] Initializing PENDING claim for Worker A with tokenA...
  Worker A claim established: key=claim-race-key-1793977381088, token=worker-A-claim-token-1793977381088 (Expired: >15s ago)

[Step 2 & 4] Worker B discovers expired claim and executes mutation...
  Worker B HTTP status: 201
  Worker B entity created: 362f591a-9cc4-44a1-b6ae-dc1948ee016a
  Database idempotency status after Worker B: EXECUTED (Executed: true)

[Step 5] Worker A resumes and attempts mutation with the same idempotency key...
  Worker A HTTP status: 201
  Worker A returned entity ID: 362f591a-9cc4-44a1-b6ae-dc1948ee016a (CachedFromIdempotency: true)

[Step 6] Direct PostgreSQL row count verification...
  PostgreSQL Project rows count: 1 (Expected: exactly 1)

[Step 7] Testing active unexpired claim CAS protection...
  Active claim mismatch CAS update count: 0 (Expected: 0)

================================================================
P0-A CLAIM OWNERSHIP AND RECLAMATION RESULTS:
1. Worker B Reclaim & Commit:         PASS
2. Database Marked EXECUTED:           PASS
3. Exactly 1 Domain Entity in DB:      PASS
4. Deterministic Entity ID Returned:   PASS
5. Active Claim Protected (CAS 0):     PASS
Overall Status:                        ALL PASS (100%)
================================================================
```

