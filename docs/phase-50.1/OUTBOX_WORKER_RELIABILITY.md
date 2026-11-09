# PHASE 50.1: OUTBOX & WORKER RELIABILITY REPORT
## Single-Worker Execution Architecture & Distributed Reconciliation Coordination

**Date:** 6 November 2026  
**Target Environment:** Local Staging (`D:\PT`)  
**Components:** `WorkerService`, `OutboxService`, `RedisService`, BullMQ

---

## 1. Single-Worker Architecture Enforcement

### The Problem
Previously, both the main NestJS API server (`main.ts`) and the standalone worker process (`worker.main.ts`) imported `WorkerModule`. Consequently:
- Two separate BullMQ worker instances consumed from `reminders-queue` and `ai-workflows-queue`.
- Two separate 30-second interval reconciliation loops polled `outboxEvent` and `reminder` tables, triggering redundant notifications and duplicate database queries.

### The Solution
Enforced an architectural single-worker pattern:
1. Added environment guard in `WorkerService.onModuleInit()`:
   ```typescript
   if (process.env.DISABLE_WORKER === 'true') {
     this.logger.log('DISABLE_WORKER=true detected: skipping BullMQ worker consumers and local scheduler in this process.');
     return;
   }
   ```
2. The main API process is launched with `DISABLE_WORKER=true`. It produces jobs and saves outbox events without spinning up background consumers or timers.
3. The dedicated background worker process (`worker.main.ts`) operates without this flag, serving as the sole authoritative consumer.

---

## 2. Distributed Locking for Multi-Process Protection

To safeguard against accidental multi-process scheduler overlap (e.g. if the API server or worker is scaled horizontally in staging), distributed locking was implemented in `RedisService`:

```typescript
async acquireLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
  const key = `lock:${lockKey}`;
  if (this.isConnected && this.client) {
    try {
      const res = await this.client.set(key, 'LOCKED', 'EX', ttlSeconds, 'NX');
      return res === 'OK';
    } catch (err: any) {
      this.logger.warn(`Failed acquiring distributed lock via Redis: ${err?.message}`);
    }
  }
  // In-memory fallback lock for isolated execution
  ...
}
```

In `WorkerService.reconcileOutboxAndReminders()`:
```typescript
const acquired = await this.redis.acquireLock('outbox-reconciliation-lock', 25);
if (!acquired) {
  this.logger.debug('Another worker process currently holds outbox-reconciliation-lock. Skipping cycle.');
  return;
}
```

---

## 3. Resilient Outbox Processing

`OutboxService` wraps all event mutations in resilient retries:
1. `publish(eventType, payload, aggregateId)`: Inserts event with `PENDING` status.
2. `getPendingEvents(limit)`: Fetches oldest pending records under `withRetry`.
3. `markProcessed(id)`: Transitions event to `PROCESSED` with `processedAt` timestamp.

---

## 4. Test Certification

Automated unit tests (`test/worker-and-notifications.spec.ts`) passed:
- `cancels reminder and aborts push if the task is already COMPLETED`: PASS
- `cancels reminder and aborts push if the task is SKIPPED or CANCELLED`: PASS
- `defers non-urgent reminder during quiet hours`: PASS
- `sends push notification and records attempt when task is active`: PASS
- `processes pending outbox events and reconciles overdue reminders`: PASS
- `cancels emergency task, invalidates reminders, and recalculates feasible plan for remaining tasks`: PASS

