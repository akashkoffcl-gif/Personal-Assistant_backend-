# BullMQ & Redis Workflow Recovery Test

## 1. Cloud Redis Connection
- **Cluster Endpoint:** `sonic-botanical-cacao-25084.db.redis.io:19767`
- **Protocol:** `ioredis` with TLS/TCP
- **Status:** Verified `PING -> PONG` active.

## 2. Long-Running Workflow Execution Lifecycle
- Action `746a42c6-03e2-49f7-90b2-d5a124063fa3` enqueued to `ai-workflows-queue`.
- Worker lifecycle transition: `QUEUED` -> `RUNNING` (25%, 50%, 75% progress events) -> `COMPLETED`.
- Verified in database:
  - `status`: `COMPLETED`
  - `payload.executionResult`: `{ strategy: 'DEEP_WORK_BLOCKING', reorganizedTasksCount: 1 }`

## 3. Disconnection & Restart Resilience
- **Browser Disconnection:** Client disconnection does not interrupt Redis queue jobs.
- **Worker Recovery:** BullMQ durable job states allow unacknowledged jobs to resume without data loss upon process restart.
- **Redis Downtime Fail-Safe:** If Redis is unreachable, `queueAiWorkflow` returns `{ success: false, reason: 'REDIS_UNAVAILABLE' }`, preventing misleading "QUEUED" claims.

