# PHASE 51.2.1 — CONCURRENCY AND IDEMPOTENCY REPORT

## 1. Executive Summary

This report documents the concurrency control and idempotency mechanisms enforced across the Nova workflow pipeline. In multi-agent or rapid UI user interactions, identical or conflicting requests may be dispatched concurrently. The system must prevent duplicate resource creation, dirty reads, and race conditions.

---

## 2. Concurrency Controls

### 2.1 Atomic Compare-And-Swap (CAS)
Database status transitions are guarded by atomic conditions:
```sql
UPDATE ai_actions 
SET status = 'CONFIRMED', payload = $1 
WHERE id = $2 AND "userId" = $3 AND status = 'PROPOSED';
```
If two requests race to approve the same proposal, exactly one succeeds (`count = 1`), while the second encounters `count = 0` and is immediately aborted with a `BadRequestException`.

Similarly, starting execution transitions `status` from `CONFIRMED` to `RUNNING`:
```sql
UPDATE ai_actions 
SET status = 'RUNNING', payload = $1 
WHERE id = $2 AND "userId" = $3 AND status IN ('CONFIRMED', 'PROPOSED');
```
This guarantees that only one execution runner processes a workflow graph at any given moment.

---

## 3. Idempotency Guarantees

### 3.1 Idempotency Keys on Action Creation
- Every workflow proposal is minted with a unique ID format: `wf-${Date.now()}-${randomSuffix}`.
- If an approval payload hash is re-sent, the system checks whether the workflow is already `CONFIRMED` or `EXECUTED`. Re-executing an already executed workflow is rejected.

### 3.2 Domain Tool Idempotency
- **Projects & Tasks:** Title-based deduplication checks prevent duplicate active tasks with identical titles under the same project within short time windows.
- **Focus Sessions:** Starting a new focus session checks for existing active sessions; if one exists, it is closed or paused before a new one is initialized.
- **Reminders:** Prevents duplicate reminders with identical titles and trigger times for the same user.

