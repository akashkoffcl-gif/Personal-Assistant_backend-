# PHASE 51.9: FENCING FINAL REGRESSION REPORT

## 1. Objective
Verify transactional fencing version equality, workflow lease boundaries, and atomic claim ownership fail-closed behavior across edge cases.

## 2. Boundary Verification Matrix

| Condition | Verification Boundary | Defense Mechanism | Outcome |
|---|---|---|---|
| **Missing Workflow Lease** | Outer & Tx Boundary | `if (!activeLease) throw ForbiddenException` | Rejected (403) |
| **Missing Lease Expiry** | Outer & Tx Boundary | `if (!activeLease.leaseExpiresAt) throw ForbiddenException` | Rejected (403) |
| **Expired Lease** | Outer & Tx Boundary | `if (activeLease.leaseExpiresAt < now) throw ForbiddenException` | Rejected (403) |
| **Missing Fencing Version**| Outer & Tx Boundary | `if (fencingVersion === undefined) throw BadRequestException` | Rejected (400) |
| **Stale Fencing Version** | Inner RowLock Tx | `if (activeLease.fencingVersion !== fencingVersion) throw ForbiddenException` | Rejected (403) |
| **Future Fencing Version** | Inner RowLock Tx | `if (activeLease.fencingVersion !== fencingVersion) throw ForbiddenException` | Rejected (403) |
| **Missing Claim Token** | Pre-Tx Boundary | `if (!activeClaimToken) throw ForbiddenException` | Rejected (403) |
| **Mismatched Claim Token**| Inner RowLock Tx | `if (tokenInDb !== activeClaimToken) throw ForbiddenException` | Rejected (403) |
| **Expired Claim Lease** | Inner RowLock Tx | `if (Date.now() - claimedTime > 15000) throw ForbiddenException` | Rejected (403) |
| **Wrong Tenant Ownership** | Pre-Tx & Tx Boundary| `if (existingRecord.userId !== userId) throw ForbiddenException` | Rejected (403) |
| **Non-RUNNING Workflow** | Inner RowLock Tx | `if (lockedWf.status !== 'RUNNING') throw ForbiddenException` | Rejected (403) |

## 3. Co-located Commit Guarantee
All domain writes (`tx.project.create`, `tx.task.create`, etc.) are coupled with the idempotency status update (`tx.aIAction.update`) inside the exact same PostgreSQL interactive transaction block. Network drops or worker failures cannot produce orphaned domain mutations without idempotency cache rows.

