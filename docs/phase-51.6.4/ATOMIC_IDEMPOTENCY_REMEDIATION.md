# Phase 51.6.4 — Atomic Idempotency Remediation Report

## 1. Remediation Architecture

To achieve true crash-safe domain idempotency, `JarvisToolRegistryService.executeTool()` was remediated to enforce:

1. **Durable Claim with Ownership & Lease Timeout:**
   - Every step execution with `stepIdempotencyKey` checks for an existing `AIAction` row.
   - If `status === 'EXECUTED'`, the cached domain entity payload is returned immediately with `cachedFromIdempotency: true`.
   - If `status === 'PENDING'`, the claim age is verified against `CLAIM_TIMEOUT_MS = 15000` (15 seconds).
   - If the claim is active (<15s), the worker polls for completion. If the claim is abandoned (>=15s), the worker reclaims the slot safely with state `RECLAIMED` and updated `claimedAt`.

2. **Atomic In-Transaction Coupling:**
   - For all core PostgreSQL mutations (`create_project`, `create_task`, `create_routine`, `create_knowledge_note`, `create_transaction_entry`), domain creation and `AIAction` status advancement to `EXECUTED` are wrapped in a single `this.prisma.$transaction(async (tx) => { ... })`.
   - If the database engine, worker process, or server crashes at any moment prior to commit, both the domain mutation and the idempotency state roll back cleanly.

## 2. Code Implementation Verification

File: `apps/api/src/modules/ai/jarvis-tool-registry.service.ts`

```typescript
const targetMutations = ['create_project', 'create_task', 'create_routine', 'create_knowledge_note', 'create_transaction_entry'];
const isTransactionalTarget = targetMutations.includes(toolId) && stepIdempotencyKey && this.prisma.isConnected;

if (isTransactionalTarget) {
  result = await this.prisma.$transaction(async (tx) => {
    // 1. In-Tx Fencing validation
    if (workflowId && fencingVersion !== undefined) {
      const currentWf = await tx.aIAction.findUnique({ where: { id: workflowId }, select: { payload: true } });
      const activeLease = (currentWf?.payload as any)?.lease;
      if (activeLease && activeLease.fencingVersion !== undefined && activeLease.fencingVersion > fencingVersion) {
        throw new ForbiddenException(`Stale worker fencing version ${fencingVersion}. Active is ${activeLease.fencingVersion}. Transaction aborted.`);
      }
    }

    // 2. Execute domain creation using tx
    // ...
    
    // 3. Persist EXECUTED status inside the SAME transaction
    await tx.aIAction.upsert({
      where: { idempotencyKey: stepIdempotencyKey },
      update: { status: 'EXECUTED', payload: { toolId, result: domainResult, timestamp: new Date().toISOString() }, executedAt: new Date() },
      create: { userId, actionType: 'DOMAIN_STEP_IDEMPOTENCY', description: `Domain execution result for ${toolId}`, status: 'EXECUTED', idempotencyKey: stepIdempotencyKey, payload: { toolId, result: domainResult, timestamp: new Date().toISOString() }, executedAt: new Date() }
    });

    return domainResult;
  });
}
```

## 3. Production Readiness & Safety
- **Single-Worker Mode Compliance:** Compatible with single-worker local daemon (`DISABLE_WORKER="true"`, `ALLOW_LOCAL_LOCK="true"`).
- **Zero Schema Destruction:** Leveraged existing `AIAction.idempotencyKey` unique index without schema modification.

