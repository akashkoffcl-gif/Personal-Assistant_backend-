# Phase 51.6.3 Implementation Changelog

## Summary of Modifications

### 1. `apps/api/src/modules/ai/jarvis-tool-registry.service.ts`
- **P0-A Atomic Idempotency Claim (`executeTool`):**
  - Added atomic pre-execution claim via `prisma.aIAction.create({ data: { status: 'PENDING', ... } })`.
  - Added `P2002` conflict catch: if a concurrent request attempts to execute with the same key, it enters a polling loop (up to 10s) to return the winner's cached result rather than creating a duplicate row.
  - Added fail-closed database availability check: if `!this.prisma.isConnected`, mutations requiring idempotency are rejected immediately with `400 Bad Request`.
  - Added tenant/user ownership verification on idempotency records: rejects cross-user re-use with `403 Forbidden`.
  - Added automatic failure rollback: if a domain mutation throws, the `PENDING` claim is cleanly purged from PostgreSQL so retries are never blocked.
- **P0-C Database-Boundary Worker Fencing (`executeTool`):**
  - Added authoritative validation: if `workflowId` and `fencingVersion` are provided, queries PostgreSQL workflow record and rejects the mutation if `activeLease.fencingVersion > fencingVersion` (`403 Forbidden`).

### 2. `apps/api/src/modules/ai/workflow/workflow-graph.types.ts`
- Added `fencingVersion: number` to `WorkflowLease` interface.
- Added `'EXECUTED'` to `WorkflowStatus` union type.
- Updated `WorkflowStateMachine`:
  - Added `'EXECUTED'` to permitted transitions from `'RUNNING'`.
  - Added `'EXECUTED'` to `isTerminal()` check.

### 3. `apps/api/src/modules/ai/workflow/workflow-orchestrator.service.ts`
- **Monotonic Fencing Version Tracking:**
  - Initial lease transition stamps `fencingVersion: 1`.
  - Recovery acquisition (`claimWorkflowRecovery`) increments `fencingVersion = previous + 1`.
  - `verifyAndRenewLease()` accepts optional `expectedFencingVersion` and verifies version match against PostgreSQL.
  - Pre-mutation step execution passes `{ stepIdempotencyKey, fencingVersion, workflowId }` into `jarvisRegistry.executeTool()`.

### 4. `apps/web/src/components/AIAssistant/types.ts`
- Expanded `ActionProposal.status` union to include all canonical statuses (`'DRAFT' | 'PROPOSED' | 'CONFIRMED' | 'RUNNING' | 'COMPLETED' | 'EXECUTED' | 'REJECTED' | 'FAILED' | 'PARTIALLY_COMPLETED' | 'COMPENSATED' | 'CANCELLED'`).

### 5. Test Scripts & Harnesses Created
- `scripts/test-concurrent-mutations.js`: P0-B true concurrent mutation test harness (simultaneous requests, atomic claim, winner polling, zero duplicates).
- `scripts/test-monotonic-fencing.js`: P0-C monotonic database fencing test harness (Worker A v10 pauses $\to$ Worker B v11 claims $\to$ Worker A v10 rejected with 403 $\to$ Worker B v11 succeeds $\to$ exactly 1 DB record).

