# Long-Running Workflow Verification

## 1. BullMQ & Redis Integration
- **Queue:** `ai-workflows-queue` running on Redis cloud cluster (`sonic-botanical-cacao-25084.db.redis.io:19767`).
- **Worker:** Dedicated `WorkerService` concurrency pool handling multi-step autonomous workflows.

## 2. State Machine Lifecycle
- `QUEUED`: Enqueued into Redis queue with unique job ID.
- `RUNNING`: Worker begins processing, emitting intermediate progress (25%, 50%, 75%).
- `COMPLETED`: Result written to `AIAction` payload and marked completed.
- `FAILED`: Failure caught, recorded, and handled with exponential retry backoff.

## 3. Disconnection Resilience
Workflows continue processing in background processes regardless of whether the user remains connected to the web client.

