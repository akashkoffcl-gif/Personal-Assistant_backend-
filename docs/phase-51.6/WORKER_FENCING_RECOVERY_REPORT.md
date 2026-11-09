# Phase 51.6 — Worker Fencing & Recovery Report

**Application:** Nova Personal Assistant PWA  
**Engine:** `WorkflowOrchestratorService`  
**Test Suite:** `apps/api/test/multi-step-workflow.spec.ts` (Section E)

---

## 1. Persisted Worker Ownership & Fencing Tokens

To eliminate split-brain multi-worker execution, every workflow claimed by a worker generates a unique persisted ownership token:

$$\text{workerOwnershipToken} = \text{worker-lease-} \parallel \text{UUID} \parallel \text{-attempt-} \parallel \text{counter}$$

### Atomic Lease Acquisition CAS:
```typescript
const updateResult = await this.prisma.aIAction.updateMany({
  where: {
    id: workflowId,
    status: 'RUNNING',
  },
  data: {
    payload: plan as any, // contains new leaseExpiresAt and activeWorkerToken
  },
});
```

---

## 2. In-Loop Lease Verification

Before executing every single topological DAG step, `WorkflowOrchestratorService` validates lease ownership:
```typescript
const hasLease = await this.verifyAndRenewLease(workflowId, activeWorkerToken);
if (!hasLease) {
  this.logger.error(`[WorkflowOrchestrator] Worker lost execution lease for workflow ${workflowId} at step ${step.id}. Halting.`);
  throw new ForbiddenException(`Execution lease expired or stolen by another worker. Execution halted.`);
}
```

### Verified Failure Scenarios:
1. **Heartbeat Timeout Mid-Workflow:**
   - Worker lease expires after 30 seconds of inactivity.
   - The original worker's next step attempt is immediately rejected with `403 Forbidden`.
2. **Duplicate Simultaneous Recovery Claims:**
   - Two workers identifying an expired lease attempt atomic CAS acquisition simultaneously.
   - Exactly one worker succeeds (`count: 1`); the losing worker receives `count: 0` and aborts recovery.
3. **Crash Recovery After Worker Restart:**
   - The recovering worker resumes execution from the exact step where the crashed worker stopped, without re-executing completed operations.

