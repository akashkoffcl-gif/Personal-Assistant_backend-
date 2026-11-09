# PHASE 51.8: CLAIM OWNERSHIP & FENCING FINAL REGRESSION REPORT

## 1. Objective
Independently test and certify the fail-closed boundaries of `JarvisToolRegistryService` and `WorkflowOrchestratorService` across all 12 negative edge cases and positive controls.

## 2. Regression Test Matrix & Real Execution Results

| Test # | Condition Tested | Expected Status | Actual Status | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Test 1** | Missing Workflow Record in database | HTTP 404 / 403 | HTTP 404 | **PASS** |
| **Test 2** | Missing `fencingVersion` when `workflowId` provided | HTTP 400 / 403 | HTTP 400 | **PASS** |
| **Test 3** | Stale `fencingVersion` (worker 9 vs active 10) | HTTP 403 Forbidden | HTTP 403 | **PASS** |
| **Test 4** | Future/Mismatched `fencingVersion` (worker 11 vs active 10) | HTTP 403 Forbidden | HTTP 403 | **PASS** |
| **Test 5** | Missing Workflow Lease object in payload | HTTP 403 Forbidden | HTTP 403 | **PASS** |
| **Test 6** | Expired Workflow Lease (`leaseExpiresAt < now`) | HTTP 403 Forbidden | HTTP 403 | **PASS** |
| **Test 7** | Non-RUNNING Workflow status (`CONFIRMED`/`COMPLETED`) | HTTP 403 Forbidden | HTTP 403 | **PASS** |
| **Test 8** | Wrong Claim Owner (Cross-Tenant Isolation) | HTTP 403 Forbidden | HTTP 403 | **PASS** |
| **Test 9** | Wrong Claim Status (`CANCELLED`/`FAILED`) | HTTP 403 Forbidden | HTTP 403 | **PASS** |
| **Test 10** | Expired Claim Lease Reclaim Recovery (>15s timeout) | HTTP 200 / 201 | HTTP 201 | **PASS** |
| **Test 11** | Active Claim Mutual Exclusion / Holdback (<15s) | Holdback >= 9.5s | 12,071 ms hold | **PASS** |
| **Test 12** | Valid Authoritative Execution & Positive Control | HTTP 200 / 201 | Verified in DAG | **PASS** |
| **Test 12-B**| Idempotency Determinism (Cached Entity Return) | Return exact entity | Verified in DAG | **PASS** |

## 3. Implementation Verification
The boundary enforcement in `apps/api/src/modules/ai/jarvis-tool-registry.service.ts` satisfies:
1. **Strict Monotonic Equality:** `if (activeLease.fencingVersion !== fencingVersion) throw new ForbiddenException(...)`. Future or stale fencing tokens are rejected immediately.
2. **Lease Expiration Guard:** `if (activeLease.leaseExpiresAt && new Date(activeLease.leaseExpiresAt).getTime() < Date.now()) throw new ForbiddenException(...)`. Expired worker leases cannot mutate state.
3. **Status Guard:** Workflow status strictly requires `RUNNING`. Attempted execution under `CONFIRMED`, `PROPOSED`, or `COMPLETED` is rejected.
4. **Interactive Transaction Safety:** Fencing row lock (`SELECT ... FOR UPDATE`) is executed inside the interactive transaction directly before domain mutation and idempotency record persistence.

