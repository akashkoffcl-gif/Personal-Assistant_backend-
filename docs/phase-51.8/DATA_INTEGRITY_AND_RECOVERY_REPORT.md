# PHASE 51.8: DATA INTEGRITY AND RECOVERY REPORT

## 1. Overview
This report audits the crash safety, transactional boundaries, idempotency persistence, and recovery mechanics of Nova's stateful operations.

## 2. Crash-Safe Idempotency Mechanics
Nova guarantees that no duplicate domain mutations occur across network retries, crash events, or concurrent invocations:

1. **Pre-Mutation Durable Claim:**
   Before mutating PostgreSQL state, an `AIAction` idempotency record is persisted with status `PENDING` and a unique `claimToken`:
   ```typescript
   await this.prisma.aIAction.create({
     data: {
       userId,
       actionType: 'DOMAIN_STEP_IDEMPOTENCY',
       status: 'PENDING',
       idempotencyKey: stepIdempotencyKey,
       payload: { toolId, status: 'CLAIMED', claimToken: newClaimToken, claimedAt: ... }
     }
   });
   ```

2. **Atomic In-Transaction Claim Verification:**
   Inside the PostgreSQL interactive transaction, the claim row is locked using `SELECT ... FOR UPDATE`. The worker's `claimToken` is compared with the database token. If mismatched (e.g. reclaimed after lease expiration), the transaction rolls back immediately.

3. **Co-located Entity & Idempotency Result Persistence:**
   The domain entity insertion and `AIAction` status transition (`PENDING` -> `EXECUTED` with cached result) occur within the same transaction. Either both commit or neither commits.

4. **Deterministic Cached Re-entry:**
   Subsequent retries with the same `stepIdempotencyKey` bypass mutation execution and return the original persisted result:
   ```typescript
   if (existingRecord.status === 'EXECUTED' && existingRecord.payload) {
     return {
       toolId,
       success: true,
       data: (existingRecord.payload as any).result,
       cachedFromIdempotency: true
     };
   }
   ```

## 3. Abandoned Claim Recovery
If a worker crashes after acquiring a claim, the claim lease expires after 15 seconds (`CLAIM_TIMEOUT_MS = 15000`). A recovery worker atomically reclaims the slot using CAS conditional update (`updateMany` on `claimToken`), ensuring exactly one worker proceeds with execution.

