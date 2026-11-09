# PHASE 51.2.2 — BASELINE AUDIT & GAP ANALYSIS

## 1. Executive Summary

Phase 51.2.1 successfully addressed initial saga compensation defects, timezone conversions, and basic approval verification. However, a rigorous inspection of the runtime orchestration and worker lifecycle revealed several critical gaps:
1. **Approval Execution CAS Vulnerability:** The execution compare-and-swap (CAS) query allowed state transitions from either `CONFIRMED` or `PROPOSED` into `RUNNING`, which permitted unapproved workflow proposals to execute directly.
2. **Missing Leases in Multi-Worker Execution:** Worker execution lacked distributed lease tracking (`workerOwnershipToken`, `leaseExpiresAt`, `lastHeartbeatAt`, `executionAttempt`). If a worker lagged or restarted, duplicate workers could attempt execution or compensation simultaneously.
3. **Absence of Stale Worker Fencing:** Workers did not verify lease ownership before each individual mutation or compensation step, creating risks of zombie writes where an expired worker overwrites freshly recovered state.
4. **Fragile Deduplication via Title/Window Matching:** Idempotency relied heavily on domain title matching within time windows rather than durable, per-step stable idempotency keys.
5. **State Terminology Inconsistencies:** Multiple non-standard states (`APPROVED`, `EXECUTING`, `VALIDATING`, `VERIFYING`) were loosely mixed with database states (`PROPOSED`, `CONFIRMED`, `RUNNING`, `EXECUTED`).

---

## 2. In-Depth Gap Analysis

### 2.1 P0. Unapproved Execution Risk in CAS
- **Audit Finding:** In `WorkflowOrchestratorService`, line 85 of Phase 51.2.1 read:
  ```typescript
  where: { id: workflowId, userId, status: { in: ['CONFIRMED', 'PROPOSED'] } }
  ```
- **Consequence:** A caller who bypassed the `/approve` endpoint could directly trigger `/execute/stream` on a `PROPOSED` action, executing unapproved high-risk operations.
- **Remediation:** Remove `PROPOSED` from the execution eligibility condition. Enforce that only actions in `CONFIRMED` state with valid, unexpired, matching SHA-256 payload signatures can transition to `RUNNING`.

### 2.2 P0. Worker Lease & Fencing Deficiencies
- **Audit Finding:** Background executions did not persist active lease tokens, heartbeat timestamps, or attempt counters.
- **Consequence:** If a worker encountered a temporary network partition and later resumed, it could execute steps or trigger compensations concurrently with a second worker that claimed recovery.
- **Remediation:** Introduce a persistent `WorkflowLease` model on `WorkflowPlan.lease`, renew it on every step via heartbeat, and enforce strict ownership checks before every mutation and compensation.

### 2.3 P1. Durable Step Idempotency
- **Audit Finding:** Tasks and projects were deduplicated using title string checks.
- **Consequence:** Legitimate duplicate tasks intended by the user were rejected, while process crashes during execution left uncertain intermediate states.
- **Remediation:** Generate stable step idempotency keys (`step-idem-${workflowId}-${stepId}-v${attempt}`) and record `PENDING`, `EXECUTED`, or `COMPENSATED` status in `WorkflowPlan.stepIdempotency` with cached outputs.

---

## 3. Scope of Phase 51.2.2 Hardening
- Complete closure of the approval enforcement gap.
- Atomic worker lease acquisition, renewal, and recovery.
- Strict fencing preventing stale workers from mutating data.
- Stable step idempotency with cached output recovery.
- Formal workflow state machine specification.

