# PHASE 51.2.1 — APPROVAL INTEGRITY & ANTI-TAMPERING AUDIT

## 1. Executive Summary

Autonomous AI actions that modify user data require robust, tamper-resistant authorization. In Phase 51.2.1, the approval lifecycle was hardened against replay attacks, payload tampering, stale execution, and race conditions through four layered controls:
1. **Canonical Payload Hashing (SHA-256)**
2. **Strict Plan Version Tracking (`planVersion`)**
3. **Approval Time-To-Live Bounds (`expiresAt` = 30 minutes)**
4. **Atomic Compare-And-Swap (CAS) State Transitions**

---

## 2. Hardening Mechanisms

### 2.1 Canonical Payload Hashing
The workflow engine computes a deterministic SHA-256 hash across all steps, sorted step keys, tools, and inputs using `ExecutionGraphValidator.computeStepPayloadHash(steps)`:
- If a client or malicious actor modifies any tool ID, parameter, dependency, or order between the proposal and approval phases, the re-computed hash diverges.
- The server rejects approval with `ForbiddenException('Approval signature hash mismatch. Workflow payload has been modified.')`.

### 2.2 Plan Version Integrity
- Workflows initialize at `planVersion: 1`.
- Any modification or replanning increments `planVersion`.
- `approveWorkflow(userId, workflowId, confirmedPayloadHash, expectedPlanVersion)` enforces that `expectedPlanVersion === plan.planVersion`. Mismatches are rejected with `ForbiddenException`.

### 2.3 Expiration & TTL Enforcement
- Every workflow plan receives an `expiresAt` timestamp set to exactly `now + 30 minutes`.
- Prior to initiating the execution stream, `WorkflowOrchestratorService` validates:
  ```typescript
  if (plan.approvalSignature?.expiresAt) {
    const expires = new Date(plan.approvalSignature.expiresAt).getTime();
    if (Date.now() > expires) {
      throw new ForbiddenException('Approval has expired. Please re-propose the workflow.');
    }
  }
  ```

### 2.4 Atomic Compare-And-Swap (CAS)
To eliminate duplicate executions and race conditions when multiple approval requests arrive concurrently:
```typescript
// WorkflowPlannerService: PROPOSED -> CONFIRMED
const casUpdate = await this.prisma.aIAction.updateMany({
  where: {
    id: workflowId,
    userId,
    status: 'PROPOSED',
  },
  data: {
    status: 'CONFIRMED',
    payload: plan as any,
  },
});
if (casUpdate.count === 0) {
  throw new BadRequestException('Workflow cannot be approved (already approved, executed, or cancelled)');
}

// WorkflowOrchestratorService: CONFIRMED -> RUNNING
const execCas = await this.prisma.aIAction.updateMany({
  where: {
    id: workflowId,
    userId,
    status: { in: ['CONFIRMED', 'PROPOSED'] },
  },
  data: {
    status: 'RUNNING',
    payload: plan as any,
  },
});
if (execCas.count === 0) {
  throw new BadRequestException('Workflow execution could not be started: workflow is already running or completed');
}
```

---

## 3. Test & Verification Summary

All conditions were verified through automated Jest test suites and live API calls:
- Owner mismatch: Rejects with `NotFoundException` (404/403).
- Tampered payload: Rejects with `ForbiddenException`.
- Expired approval (>30m): Rejects with `ForbiddenException`.
- Re-execution / Duplicate submission: CAS returns `count: 0`, throwing `BadRequestException`.

