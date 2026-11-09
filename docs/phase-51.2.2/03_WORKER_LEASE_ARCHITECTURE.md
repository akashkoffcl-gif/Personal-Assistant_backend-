# PHASE 51.2.2 — DISTRIBUTED WORKER LEASE ARCHITECTURE

## 1. Executive Summary

To prevent multi-worker concurrency, split-brain executions, and overlapping saga compensations, Phase 51.2.2 establishes a distributed worker lease contract persisted directly with the workflow record in PostgreSQL.

---

## 2. Worker Lease Data Structure

Defined in `WorkflowGraphTypes`:
```typescript
export interface WorkflowLease {
  workflowId: string;
  workerOwnershipToken: string; // Cryptographically random UUID (e.g. e73aa811-1605-43f0-9f19-e3c18966ee52)
  leaseExpiresAt: string;        // ISO 8601 timestamp (30-second sliding heartbeat window)
  lastHeartbeatAt: string;       // ISO 8601 timestamp of most recent heartbeat renewal
  executionAttempt: number;      // Monotonically increasing attempt counter (1, 2, 3...)
}
```

---

## 3. Lifecycle & Atomic Operations

### 3.1 Lease Acquisition on Transition to `RUNNING`
When a worker attempts to begin executing a `CONFIRMED` workflow:
1. Generates a new `workerOwnershipToken = randomUUID()`.
2. Computes `leaseExpiresAt = now + 30000ms`.
3. Sets `executionAttempt = (plan.lease?.executionAttempt || 0) + 1`.
4. Executes atomic CAS transition (`status: CONFIRMED` -> `RUNNING`). If the row is modified by another worker first, CAS returns `count: 0` and acquisition fails.

### 3.2 Step-Level Heartbeat Renewal & Ownership Verification
Before executing each individual DAG step or compensation step, the worker invokes:
```typescript
await this.verifyAndRenewLease(workflowId, activeWorkerToken, 30000);
```
- Fetches the active record from PostgreSQL.
- Verifies that `plan.lease.workerOwnershipToken === activeWorkerToken`.
- Verifies that `Date.now() <= new Date(plan.lease.leaseExpiresAt).getTime()`.
- Renews `lastHeartbeatAt = now` and extends `leaseExpiresAt = now + 30000ms`.
- If verification fails, the worker immediately aborts and raises `ForbiddenException`.

### 3.3 Atomic Recovery Claiming
If a worker crashes or becomes disconnected:
1. The lease expires after 30 seconds of inactivity.
2. A recovery worker calls `claimWorkflowRecovery(workflowId, newWorkerToken)`.
3. Validates that `plan.lease.leaseExpiresAt < Date.now()`. Active leases cannot be claimed.
4. Atomically updates the lease with `newWorkerToken`, new expiration, and increments `executionAttempt`.
5. Guarantees that only one recovery worker wins the claim.

