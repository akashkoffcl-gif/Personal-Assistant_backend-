# Phase 51.7 — Domain Idempotency Report

## 1. Mutation Tools Classification

| Domain Mutation Tool | Target Entity | Idempotency Boundary | Side-Effect Mechanism | Compensation Support |
| :--- | :--- | :--- | :--- | :--- |
| `create_project` | Project | Atomic DB Transaction | In-transaction `$transaction` | `delete_project` |
| `create_task` | Task | Atomic DB Transaction | In-transaction `$transaction` | `delete_task` |
| `create_routine` | Routine | Atomic DB Transaction | In-transaction `$transaction` | Database cascade |
| `create_knowledge_note`| KnowledgeNote | Atomic DB Transaction | In-transaction `$transaction` | `delete_knowledge_note` |
| `create_transaction_entry`| FinanceTransaction | Atomic DB Transaction | In-transaction `$transaction` | Reverse transaction |
| `create_reminder` | Reminder | Database Outbox | Transactional Outbox Pattern | Invalidate notification |

## 2. Crash Window Test Evidence (`scripts/test-crash-injection.js`)

Verified real failure injection points across all protected mutations:
1. Process stops before claim reservation: Clean retry creates exactly 1 record.
2. Process stops after reservation before mutation: Expired claim safely reclaimed; 1 record.
3. Process stops during domain transaction: PostgreSQL transaction rolls back; 0 rows written.
4. Process stops after commit before HTTP response: Retried request returns cached entity ID.
5. Worker loses ownership while recovery occurs: Older worker's stale write is rejected.

All crash scenarios preserved 100% data integrity with zero orphaned domain entities.

