# Phase 51.6.1 Worker Fencing Remediation Report

**Application:** Nova Personal Assistant PWA  
**Engine:** `WorkflowOrchestratorService`  
**Test Suite:** `apps/api/test/multi-step-workflow.spec.ts` (Section E)

---

## 1. Persisted Worker Ownership & Fencing Tokens

Each worker claims execution by writing a unique persisted worker token into the proposal lease payload:
```typescript
interface WorkflowLease {
  workflowId: string;
  workerOwnershipToken: string;
  leaseExpiresAt: string;
  lastHeartbeatAt: string;
  executionAttempt: number;
}
```

---

## 2. In-Loop Lease Heartbeat & Fencing Enforcement

1. **Step-by-Step Lease Verification:** Before executing each topological DAG step, the worker calls `verifyAndRenewLease()`.
2. **Immediate Halting:** If the lease has expired or been acquired by another recovering worker, `verifyAndRenewLease()` returns `false`, causing the worker to halt immediately with `ForbiddenException: Execution lease expired or stolen by another worker.`
3. **Atomic Recovery Claims:** Two workers attempting recovery concurrently issue an atomic CAS query. Exactly one worker wins (`count: 1`); the losing worker receives `count: 0` and aborts.

