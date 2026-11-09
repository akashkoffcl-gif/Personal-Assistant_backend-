# Long-Running Workflow Architecture

## 1. Decoupled Workflow Execution
Heavy AI actions (bulk rescheduling, deep knowledge vector indexing, complex autonomous day reorganization) are decoupled from the synchronous HTTP request/response cycle.

## 2. Job State Lifecycle
Workflows progress through a well-defined state machine:
- `QUEUED`: Enqueued in Redis/BullMQ.
- `RUNNING`: Worker process is computing changes.
- `WAITING_FOR_APPROVAL`: Mutative actions requiring user consent (e.g., deleting tasks or modifying budgets) are held in `AIAction` records with status `PROPOSED`.
- `COMPLETED`: Plan committed to platform database.
- `FAILED`: Failure recorded with user-facing diagnostic note.
- `CANCELLED`: Interrupted via user action or timeout guard.

## 3. Idempotency & Safety
All AI-proposed actions generate unique `idempotencyKey` UUIDs, preventing accidental re-execution upon client retry or network duplicates.

