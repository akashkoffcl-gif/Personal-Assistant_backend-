# Phase 51.6.4 — Security & Failure Mode Report

## 1. Security Architecture

### A. Strict Cross-Tenant Isolation
- In `JarvisToolRegistryService`, every idempotency lookup enforces:
  ```typescript
  if (existingRecord.userId !== userId) {
    throw new ForbiddenException(`Tenant violation: Idempotency key belongs to another user.`);
  }
  ```
- An attacker attempting to guess or replay idempotency keys belonging to other users receives an immediate 403 Forbidden without entity disclosure.
- Verified in `scripts/test-universal-capabilities.js` with attacker user `99999999-9999-9999-9999-999999999999`.

### B. High-Risk Action Confirmation Gate
- High-risk operations (`delete_project`, `delete_task`, `delete_knowledge_note`, `create_transaction_entry`, `apply_day_plan`, `report_emergency`) require explicit confirmation signatures and user approval tokens before execution.

## 2. Failure Mode Analysis

| Failure Mode | Trigger Scenario | System Defense | Outcome |
| :--- | :--- | :--- | :--- |
| **Worker Process Crash** | Worker dies mid-flight before committing | Database transaction aborts | 0 rows in PostgreSQL; slot reclaims after 15s |
| **Client Disconnect** | HTTP connection drops after DB commit | Durable `AIAction` record cached | Replay returns original entity ID; 1 row in DB |
| **Split-Brain Worker Race**| Two workers attempt to execute same step | PostgreSQL Unique Index `P2002` | Exactly 1 winner claims slot; loser polls winner |
| **Stale Worker Domain Write**| Old worker with stale lease attempts write | In-Tx Fencing Version Check | Write rejected with 403 Forbidden; 0 rows written |
| **Concurrent Terminal State Race**| User cancels while worker completes | Conditional CAS update | Cancellation wins; worker halts without overwrite |

