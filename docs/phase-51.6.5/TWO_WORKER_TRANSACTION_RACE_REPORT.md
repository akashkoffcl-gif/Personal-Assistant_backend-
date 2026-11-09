# Phase 51.6.5 — Two-Worker Transaction Race Report

## 1. Overview & Test Objectives

The test harness `scripts/test-two-worker-rowlock.js` established two distinct PostgreSQL client connections to verify:
- **Scenario 1:** Worker A holds row lock; Worker B is blocked and excluded until Worker A completes.
- **Scenario 2 (Reverse Ordering):** Worker B acquires version 11 first; stale Worker A (version 10) is rejected with HTTP 403 Forbidden, writing 0 rows.

## 2. Test Execution Output

```
================================================================
PHASE 51.6.5 — P0-B TWO-WORKER ROW LOCKING & FENCING RACE TEST
Target API: http://localhost:3001/api/v1
User ID: 00000000-0000-0000-0000-000000000001
Testing Row Lock Isolation & Monotonic Fencing Across Connections
================================================================

------------------------------------------------------------
[Scenario 1] Worker A Holds Row Lock on Lease; Worker B Excluded
  [Worker B] Attempting to acquire row lock to supersede lease to v11...
  [Worker A] Acquired PostgreSQL row lock on wf-rowlock-sc1-1793977451486. Fencing version: 10
  [Worker A] Pausing 2500ms to simulate slow write while holding lock...
  [Worker A] Releasing lock and completing.
  [Worker B] Acquired row lock after wait: 2652ms (Exclusion verified)
  Scenario 1 Lock Exclusion Verified? YES (Blocked wait: 2652ms)

------------------------------------------------------------
[Scenario 2] Reverse Ordering: Worker B Has v11; Stale Worker A Rejected
  [Worker A] Attempting transactional mutation with stale fencingVersion=10...
  Worker A response HTTP status: 403
  Worker A rejected with 403 Forbidden? YES
  Worker A error: Stale worker fencing version 10. Active workflow fencing version is 11. Mutation rejected.
  PostgreSQL task rows after stale attempt: 0 (Expected: 0)
  [Worker B] Attempting transactional mutation with active fencingVersion=11...
  Worker B response HTTP status: 201
  Worker B committed successfully? YES (Task ID: 1479839e-4288-400a-8e71-d73e88b968e3)
  PostgreSQL task rows after Worker B commit: 1 (Expected: 1)

================================================================
P0-B TWO-WORKER ROW LOCKING & FENCING RESULTS:
1. Scenario 1 (Lock Exclusion Verified):   PASS
2. Scenario 2 Stale Worker A Rejected:     PASS
3. Scenario 2 Worker A Rollback (0 Rows):  PASS
4. Scenario 2 Active Worker B Committed:   PASS
5. Exactly 1 Task in PostgreSQL:           PASS
Overall Status:                            ALL PASS (100%)
================================================================
```

