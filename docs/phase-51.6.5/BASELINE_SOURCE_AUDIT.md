# Phase 51.6.5 — Baseline Source Audit

## 1. Audit Scope & Executive Summary

This baseline audit independently examined `JarvisToolRegistryService`, `WorkflowOrchestratorService`, Prisma schema models, and PostgreSQL concurrency boundaries at repository path `D:\PT` following Phase 51.6.4.

## 2. Identified Concurrency Gaps

### A. Claim Ownership & Blind Reclamation Hazard
- In Phase 51.6.4, `JarvisToolRegistryService.executeTool()` created claims with status `PENDING` and lease timeouts.
- **Identified Gap:** The claim did not possess a unique ownership token (`claimToken`). When an abandoned claim was reclaimed, it updated the record without verifying who was currently holding it. If Worker A experienced a network or GC pause exceeding 15 seconds, Worker B could reclaim the claim. When Worker A resumed, without in-transaction ownership verification, Worker A had no way of knowing it was no longer the legitimate claim owner.

### B. In-Transaction Fencing Without Row Locking
- In Phase 51.6.4, `executeTool()` performed an in-transaction `tx.aIAction.findUnique()` query on the workflow record.
- **Identified Gap:** PostgreSQL default read isolation allows non-locking reads. If Worker A read version 10 and paused before writing, Worker B on a concurrent transaction could update the fencing version to 11. Without row-level mutual exclusion (`SELECT ... FOR UPDATE`), Worker B's recovery transaction could race with Worker A's write.

## 3. Engineering Decisions Implemented

1. **Unique Claim Ownership Token & CAS Reclaim:**
   - Every claim acquisition assigns a cryptographically unique `claimToken = randomUUID()`.
   - Abandoned claim reclamation performs an atomic conditional update (`UPDATE ai_actions WHERE idempotencyKey = :key AND payload->>'claimToken' = :previousToken`).
   - Inside the domain transaction, `tx.$queryRawUnsafe('SELECT id, payload FROM "ai_actions" WHERE "idempotencyKey" = $1 FOR UPDATE')` validates that the current claim token matches `activeClaimToken`. If a newer owner reclaimed it, Worker A is rejected with HTTP 403 Forbidden.

2. **Authoritative PostgreSQL Row Locking on Workflow Leases:**
   - Pre-mutation fencing validation now executes `SELECT id, status, payload FROM "ai_actions" WHERE id = $1 FOR UPDATE`.
   - Any concurrent worker attempting lease recovery is blocked by PostgreSQL row lock until the in-flight mutation transaction commits or rolls back.
   - If a higher fencing version was already committed, the locked read immediately detects `activeLease.fencingVersion > fencingVersion` and aborts with HTTP 403 Forbidden.

