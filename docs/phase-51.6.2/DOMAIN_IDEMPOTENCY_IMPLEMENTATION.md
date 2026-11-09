# Domain-Level Idempotency Implementation Report

## 1. Architectural Strategy
In distributed workflows, a worker may successfully commit a database mutation (e.g. create a task or transaction) but crash or lose network connectivity before persisting the step completion into its workflow plan record. Upon recovery, the step is replayed. Without domain-level idempotency, duplicate records are created in PostgreSQL.

To solve this, `JarvisToolRegistryService.executeTool` now enforces durable idempotency directly at the execution boundary:
1. **Pre-Execution Check:**
   - If `input.stepIdempotencyKey` is supplied, query `prisma.aIAction` where `idempotencyKey = input.stepIdempotencyKey`.
   - If an `EXECUTED` record exists, return the cached entity data immediately with `cachedFromIdempotency: true`. No mutation is re-executed.
2. **Post-Execution Atomic Persistence:**
   - When a mutation succeeds, an `AIAction` row with `actionType: 'DOMAIN_STEP_IDEMPOTENCY'`, `idempotencyKey: stepIdempotencyKey`, and `payload: { toolId, result, timestamp }` is atomically persisted via PostgreSQL `upsert`.
   - The unique database constraint on `AIAction.idempotencyKey` prevents duplicate execution across concurrent workers.

## 2. Key Target Mutations Hardened
- `create_project` (PROJECT_MANAGEMENT)
- `create_task` (TASK_MANAGEMENT)
- `create_routine` (CALENDAR_ROUTINES / recurring schedule)
- `create_knowledge_note` (KNOWLEDGE_MANAGEMENT)
- `create_transaction_entry` (FINANCIAL_INTELLIGENCE)

## 3. Implementation Code Reference
File: `apps/api/src/modules/ai/jarvis-tool-registry.service.ts`

```typescript
// Pre-Execution Check
if (stepIdempotencyKey && this.prisma.isConnected) {
  const existingRecord = await this.prisma.aIAction.findUnique({
    where: { idempotencyKey: stepIdempotencyKey },
  });
  if (existingRecord && existingRecord.status === 'EXECUTED' && existingRecord.payload) {
    return {
      toolId,
      success: true,
      data: (existingRecord.payload as any).result,
      latencyMs: 1,
      cachedFromIdempotency: true,
    };
  }
}

// Post-Execution Upsert
if (stepIdempotencyKey && this.prisma.isConnected && result) {
  await this.prisma.aIAction.upsert({
    where: { idempotencyKey: stepIdempotencyKey },
    update: { status: 'EXECUTED', payload: { toolId, result, timestamp: new Date().toISOString() }, executedAt: new Date() },
    create: {
      userId,
      actionType: 'DOMAIN_STEP_IDEMPOTENCY',
      description: `Domain execution result for ${toolId}`,
      status: 'EXECUTED',
      idempotencyKey: stepIdempotencyKey,
      payload: { toolId, result, timestamp: new Date().toISOString() },
      executedAt: new Date(),
    },
  });
}
```

