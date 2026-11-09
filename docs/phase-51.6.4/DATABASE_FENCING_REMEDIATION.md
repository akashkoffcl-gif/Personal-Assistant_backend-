# Phase 51.6.4 — Database Fencing Remediation Report

## 1. Remediation Architecture

To address the stale worker write hazard, database-boundary fencing was integrated directly within the PostgreSQL transaction:

1. **Pre-Mutation In-Transaction Check:**
   - Inside `this.prisma.$transaction(async (tx) => { ... })`, the active workflow record is queried from the authoritative PostgreSQL database.
   - The current `lease.fencingVersion` is evaluated against the worker's supplied `fencingVersion`.
   - If `activeLease.fencingVersion > fencingVersion`, a `ForbiddenException` is thrown *inside the transaction*.
   - Because this check runs within `tx`, PostgreSQL immediately rolls back any mutation attempts and frees locks.

2. **Monotonic Lease Token & CAS Increment:**
   - Worker lease acquisition in `WorkflowOrchestratorService` performs conditional atomic updates (`UPDATE "AIAction" ... WHERE id = :id AND (payload->'lease'->>'fencingVersion')::int = :currentVersion`).
   - Lease theft or recovery strictly increments `fencingVersion` ($v_{n+1} > v_n$), permanently fencing out all previous workers.

## 2. Source Code Implementation

File: `apps/api/src/modules/ai/jarvis-tool-registry.service.ts`

```typescript
if (workflowId && fencingVersion !== undefined) {
  const currentWf = await tx.aIAction.findUnique({
    where: { id: workflowId },
    select: { payload: true },
  });
  const activeLease = (currentWf?.payload as any)?.lease;
  if (activeLease && activeLease.fencingVersion !== undefined && activeLease.fencingVersion > fencingVersion) {
    this.logger.error(`[WorkerFencing Tx] Stale worker fencing version ${fencingVersion} aborted inside transaction. (Active is ${activeLease.fencingVersion})`);
    throw new ForbiddenException(`Stale worker fencing version ${fencingVersion}. Active workflow fencing version is ${activeLease.fencingVersion}. Transaction aborted.`);
  }
}
```

