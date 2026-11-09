# Phase 51.6.5 — Claim Ownership Protocol

## 1. Ownership Lifecycle & Mechanics

The claim ownership protocol enforces single-worker exclusivity across all domain mutations:

```
[Client Request]
       │
       ▼
[Check DB for idempotencyKey]
       │
   ┌───┴──────────────────────────────┐
   ▼                                  ▼
[EXECUTED]                        [PENDING]
Return cached payload (1ms)           │
                                  ┌───┴───────────────────────┐
                                  ▼                           ▼
                             [Age < 15s]                 [Age >= 15s]
                           Poll winner (up to 10s)     Atomic CAS Reclaim
                                                              │
                                                              ▼
                                                 Update payload->'claimToken' = tokenB
                                                 WHERE payload->'claimToken' = tokenA
```

## 2. In-Transaction Verification

When the domain transaction starts:
```typescript
if (stepIdempotencyKey && activeClaimToken) {
  const currentClaimRows: any[] = await tx.$queryRawUnsafe(
    'SELECT id, status, payload FROM "ai_actions" WHERE "idempotencyKey" = $1 FOR UPDATE',
    stepIdempotencyKey,
  );
  if (currentClaimRows && currentClaimRows.length > 0) {
    const currentClaim = currentClaimRows[0];
    const tokenInDb = (currentClaim.payload as any)?.claimToken;
    if (tokenInDb && tokenInDb !== activeClaimToken) {
      throw new ForbiddenException(`Claim ownership expired or reclaimed by another worker. Mutation rejected.`);
    }
  }
}
```

## 3. Guarantees
1. **Uniqueness:** Every acquisition assigns a fresh UUID `claimToken`.
2. **Reclaim Exclusion:** Only expired claims (>=15s) can be reclaimed.
3. **No Zombie Overwrites:** If a worker's claim was superseded during a pause, its mutation transaction aborts before touching domain tables.

