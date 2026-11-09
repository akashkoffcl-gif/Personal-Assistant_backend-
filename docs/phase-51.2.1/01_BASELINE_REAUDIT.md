# PHASE 51.2.1 — BASELINE RE-AUDIT & GAP IDENTIFICATION

## 1. Executive Summary

Phase 51.2 successfully introduced the multi-step autonomous workflow engine into Nova Personal Assistant PWA, including the DAG validator (`ExecutionGraphValidator`), the workflow planner (`WorkflowPlannerService`), and the streaming orchestrator (`WorkflowOrchestratorService`).

However, an exhaustive baseline audit of Phase 51.2 uncovered critical integrity, security, concurrency, and reliability risks:
1. **Saga Compensation Lifecycle Defect:** Focus sessions created during aborted workflows were either left in an `ACTIVE` state or erroneously marked completed, contaminating productivity analytics.
2. **Approval Binding & Tamper Resistance Gaps:** Approval signatures did not enforce plan versions (`planVersion`), expiration bounds (`expiresAt`), or atomic compare-and-swap (CAS) database state transitions, allowing replay attacks, race conditions, or double executions.
3. **Timezone Conversion Ambiguity:** Relative expressions such as "tomorrow at 4 PM" lacked authoritative user IANA timezone resolution, causing UTC offset drift and improper reminder scheduling.
4. **Worker Recovery & Idempotency Constraints:** Workflow executions lacked crash recovery protections, step-level idempotency markers, and bounded retries.

This report establishes the baseline findings and serves as the architectural foundation for Phase 51.2.1 hardening.

---

## 2. Audit Findings Breakdown

### 2.1 Saga Compensation Integrity (P0)
- **Problem:** `FocusSession` lacks a standard rollback mechanism. In `FocusSessionStatus`, statuses are `ACTIVE`, `PAUSED`, `COMPLETED`, `ABANDONED`. When a workflow step failed following a focus session creation, the focus session remained `ACTIVE` indefinitely or was marked `COMPLETED` when attempting naive cleanup.
- **Impact:** Contaminated user analytics, skewed focus metrics, and ghost active sessions in the database.
- **Remediation Required:**
  1. Register `abort_focus_session` in `JarvisToolRegistryService` backed by `FocusService.abandonSession()`.
  2. Map `start_focus_session` compensation in `WorkflowOrchestratorService` to `abort_focus_session`.
  3. Ensure failure returns status `PARTIALLY_COMPLETED` with reverse-ordered compensation logs.

### 2.2 Approval & Anti-Tampering Integrity (P0)
- **Problem:** The approval mechanism verified SHA-256 step hashes but lacked:
  - Plan version verification (`planVersion`).
  - Approval signature time-to-live (`expiresAt`).
  - Concurrency locks / Atomic CAS status changes (`PROPOSED` -> `CONFIRMED` / `RUNNING`).
- **Impact:** Workflows could be confirmed multiple times simultaneously; stale approvals could be replayed; out-of-order execution could lead to duplicate projects, tasks, or focus sessions.
- **Remediation Required:**
  1. Add `planVersion` and 30-minute `expiresAt` ISO timestamps to `WorkflowPlan`.
  2. Implement atomic CAS updates using Prisma `updateMany({ where: { id, userId, status } })`.
  3. Enforce expiration checks prior to SSE stream initiation.

### 2.3 Timezone Parsing & Temporal Correctness (P0)
- **Problem:** Natural language temporal expressions ("tomorrow at 4 PM") were parsed without consulting the user's configured IANA timezone (`Asia/Kolkata` for local demo user).
- **Impact:** 4:00 PM local time was either stored as 4:00 PM UTC (a 5.5 hour discrepancy) or failed to adjust for regional offsets.
- **Remediation Required:**
  1. Implement `TimezoneService` utilizing standard ECMAScript Intl API for zero-dependency offset resolution.
  2. Inject `TimezoneService` into `WorkflowPlannerService` to compute exact UTC ISO instants (e.g. `2026-11-07T10:30:00.000Z` for 4:00 PM IST on Nov 7, 2026).

---

## 3. Baseline Audit Conclusion

All identified gaps have clear, non-invasive remediation paths using existing domain services and modular architecture. Phase 51.2.1 focuses strictly on hardening these specific failure modes.

