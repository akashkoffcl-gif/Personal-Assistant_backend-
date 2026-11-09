# PHASE 51.2.1 — WORKER RECOVERY & RESILIENCE REPORT

## 1. Executive Summary

This report assesses the behavior of the multi-step workflow engine during worker/process restarts, network interruptions, and transient infrastructure errors. 

Nova operates under a single-worker architecture (`DISABLE_WORKER="true"` on the NestJS HTTP API process, with background asynchronous tasks coordinated through BullMQ and PostgreSQL).

---

## 2. Recovery Architecture

### 2.1 State Durability via `AIAction`
Every workflow is persisted as an `AIAction` record with `actionType: 'MULTI_STEP_WORKFLOW'` in PostgreSQL:
- Before execution starts, the workflow is transitioned to `RUNNING` via CAS.
- After each individual step completes or fails, the workflow plan stored in the `payload` JSON column is updated synchronously.
- Each step records its state (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`), exact start/end timestamps, input arguments, and return output.
- If a server process crashes mid-workflow, the exact state of executed steps is preserved in the database.

### 2.2 Unfinished Workflow Detection
During worker initialization or periodic reconciliation:
- Workflows in status `RUNNING` with `updatedAt` older than the execution timeout (5 minutes) are flagged as orphaned.
- The reconciler marks orphaned workflows as `FAILED` and executes compensation logic for any registered compensations that were not marked `COMPENSATED`.

### 2.3 Bounded Retries & SSE Reconnection
- Transient tool execution errors (e.g. temporary database lock or HTTP timeout) can be retried up to 2 times with exponential backoff (500ms, 1500ms) before declaring a step failed.
- The SSE endpoint (`/api/v1/ai/workflows/:id/execute/stream`) yields standard JSON events (`STEP_STARTED`, `STEP_COMPLETED`, `COMPENSATION_STARTED`, `STEP_COMPENSATED`, `COMPLETED`, `PARTIALLY_COMPLETED`).
- Frontend clients maintain event stream listeners and re-query the action status if the connection drops.

