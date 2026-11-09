# Stale Worker Rejection Report

## 1. Objective & Scenario
To prove that worker lease fencing is active directly at the database mutation boundary, `scripts/test-monotonic-fencing.js` executed the exact sequence required by Phase 51.6.3:

1. **Worker A** holds fencing version 10 on a running workflow.
2. **Worker A** pauses (1.5-second artificial delay / garbage collection pause).
3. **Worker B** detects expired lease and acquires fencing version 11 atomically in PostgreSQL.
4. **Worker A** resumes and attempts a domain mutation (`create_project`) using version 10.
5. **Worker A** is rejected at the database mutation boundary (`HTTP 403 Forbidden`).
6. **Worker B** commits the mutation using valid version 11.
7. Direct PostgreSQL query verifies that **exactly one** entity exists.

---

## 2. Verifiable Execution Output
Harness script: `scripts/test-monotonic-fencing.js`  
Target API: `http://localhost:3001/api/v1`

```text
================================================================
PHASE 51.6.3 — P0-C MONOTONIC DATABASE FENCING HARNESS
Target API: http://localhost:3001/api/v1
User ID: 00000000-0000-0000-0000-000000000001
================================================================

[Step 1] Initialized Workflow d6578b6c-298f-4cd1-99b7-208b80def5a9
  Worker A holds Token: worker-A-1793967837273 | Fencing Version: 10
[Step 2] Worker A pauses (1.5s delay)...
[Step 3] Worker B acquires lease with monotonically increasing fencing version 11...
  Worker B CAS claim count: 1 (Version: 11)
[Step 4 & 5] Worker A resumes and attempts domain mutation using stale version 10...
  Worker A response HTTP status: 403
  Worker A response body: {
  success: false,
  statusCode: 403,
  error: 'Forbidden',
  message: 'Stale worker fencing version 10. Active workflow fencing version is 11. Mutation rejected.',
  path: '/api/v1/ai/tools/create_project/execute',
  timestamp: '2026-11-06T12:24:03.965Z'
}
  Assertion: Stale Worker A rejected at database mutation boundary? PASS (Fenced)
[Step 6] Worker B commits using valid active version 11...
  Worker B response HTTP status: 201
  Worker B committed entity ID: 4abfbd26-0d68-49d2-bfeb-5c39800d46e8
[Step 7] Direct PostgreSQL Query Count: 1 project(s) created.
  Assertion: Exactly ONE domain entity exists in PostgreSQL? PASS

================================================================
P0-C MONOTONIC FENCING RESULTS:
Worker A Rejected at DB Boundary: PASS (403 Forbidden)
Worker B Committed with Version 11: PASS
PostgreSQL Row Count is Exactly 1: PASS
Overall Status: ALL FENCING TESTS PASSED (100%)
================================================================
```

---

## 3. Analysis & Key Findings
- **Pre-execution lease checks alone are insufficient** because a worker can pass the lease check, experience an unexpected I/O stall or network pause, and wake up after its lease has been transferred to another worker.
- By binding `fencingVersion` to the database mutation boundary in `JarvisToolRegistryService.executeTool`, the database record itself acts as the authoritative gatekeeper.
- As proven by Step 4 & 5, Worker A was rejected with `HTTP 403 Forbidden` (`Stale worker fencing version 10. Active workflow fencing version is 11. Mutation rejected.`). Zero partial or orphan records were created by Worker A.
- Worker B cleanly committed with version 11, resulting in exactly one persisted entity in PostgreSQL.

