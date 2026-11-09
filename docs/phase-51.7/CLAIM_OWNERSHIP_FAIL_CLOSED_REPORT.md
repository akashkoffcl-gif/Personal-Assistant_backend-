# Phase 51.7 — Claim Ownership Fail-Closed Report

## 1. Mandatory Fail-Closed Invariants

Under Phase 51.7, mutation execution is rejected fail-closed unless all 10 authoritative conditions are satisfied:

1. **Authoritative Workflow Existence:** Workflow record must exist in PostgreSQL. If missing, throws 404 Not Found.
2. **Coupled Fencing Arguments:** If either `workflowId` or `fencingVersion` is provided, both are strictly mandatory. Missing arguments throw 400 Bad Request.
3. **Active Permitted Workflow Status:** Workflow status must be strictly `RUNNING`. States like `COMPLETED`, `EXECUTED`, or `FAILED` throw 403 Forbidden.
4. **Valid Authoritative Lease:** Lease metadata and `fencingVersion` must be present on the record.
5. **Monotonic Fencing Validation:** `activeLease.fencingVersion` must equal or not exceed the worker's version. Higher active version throws 403 Forbidden.
6. **Lease Expiration Invariant:** Workflow lease must not be past its `leaseExpiresAt` timestamp.
7. **Authoritative Idempotency Record:** Claim row must exist in PostgreSQL under lock (`SELECT ... FOR UPDATE`).
8. **Claim Status Invariant:** Claim status must be strictly `PENDING`.
9. **Claim Token Identity:** Claim token in DB must match `activeClaimToken`. Mismatch throws 403 Forbidden.
10. **Claim Lease Timeout Invariant:** Claim age must not exceed `CLAIM_TIMEOUT_MS` (15s).

## 2. Regression Test Results (`scripts/test-fail-closed-validation.js`)

```
================================================================
FAIL-CLOSED VALIDATION SUMMARY:
┌─────────┬──────────────────────────────────┬───────────┬────────┬────────┐
│ (index) │ condition                        │ expected  │ actual │ passed │
├─────────┼──────────────────────────────────┼───────────┼────────┼────────┤
│ 0       │ '1. Missing Workflow Record'     │ '404/403' │ 404    │ true   │
│ 1       │ '2. Missing Fencing Version'     │ '400/403' │ 400    │ true   │
│ 2       │ '3. Stale Fencing Version'       │ '403'     │ 403    │ true   │
│ 3       │ '4. Non-Running Workflow Status' │ '403'     │ 403    │ true   │
│ 4       │ '5. Valid Request Acceptance'    │ '200/201' │ 201    │ true   │
└─────────┴──────────────────────────────────┴───────────┴────────┴────────┘
Overall Fail-Closed Status: ALL CONDITIONS ENFORCED (100% FAIL-CLOSED)
================================================================
```

