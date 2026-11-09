# PHASE 40 — WORKERMODULE DEPENDENCY INJECTION & BULLMQ REPORT

**Project:** Personal Assistant PWA  
**Repository:** `D:\PT`  
**Date:** November 4, 2026  
**Status:** PASS — RESOLVED & PRODUCTION READY  
**Component:** `WorkerModule` / `WorkerService` / BullMQ Queue System  

---

## 1. Issue Description

When launching the standalone background worker process (`npm run dev:worker`), the NestJS runtime failed immediately during dependency resolution with the following fatal exception:

```
[Nest] 9020  - 11/04/2026, 9:27:06 AM   ERROR [ExceptionHandler] Nest can't resolve dependencies of the WorkerService (?, NotificationsService, OutboxService). Please make sure that the argument PrismaService at index [0] is available in the WorkerModule context.
```

---

## 2. Root Cause Analysis

1. **Missing Module Imports in `WorkerModule`:**  
   `WorkerService` constructor defines dependencies:
   ```typescript
   constructor(
     private readonly prisma: PrismaService,
     private readonly notificationsService: NotificationsService,
     private readonly outboxService: OutboxService,
     private readonly redisService: RedisService,
   ) {}
   ```
   In `apps/api/src/worker/worker.module.ts`, `WorkerService` was declared as a provider, but `CommonModule` (which exports `PrismaService` and `RedisService`) was completely omitted from the `@Module.imports` array.

2. **Configuration Context Separation:**  
   When running the worker as an isolated Nest application (`WorkerModule`), global NestJS modules from `AppModule` are not automatically inherited. `ConfigModule.forRoot({ isGlobal: true })` must be explicitly loaded to make environment variables accessible to Redis and Supabase connections.

3. **Missing Graceful Termination Hooks:**  
   `worker.main.ts` lacked shutdown hook listeners (`app.enableShutdownHooks()`), which risked leaving Redis sockets and BullMQ workers hanging during process termination.

---

## 3. Implementation of the Solution

### 3.1. Refactored `apps/api/src/worker/worker.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { OutboxModule } from '../modules/outbox/outbox.module';
import { WorkerService } from './worker.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/api/.env'],
    }),
    CommonModule,
    NotificationsModule,
    OutboxModule,
  ],
  providers: [WorkerService],
  exports: [WorkerService],
})
export class WorkerModule {}
```

### 3.2. Refactored `apps/api/src/worker/worker.main.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  logger.log('Bootstrapping standalone BullMQ Worker Process...');

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.enableShutdownHooks();

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Shutting down worker gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.log('BullMQ background worker process is running and monitoring reminder queues.');
}

bootstrap().catch((err) => {
  console.error('Fatal worker startup error:', err);
  process.exit(1);
});
```

---

## 4. Verification Evidence

Executing the worker startup command produced the following log trace:

```
[Nest] 24936  - 11/04/2026, 10:37:28 AM     LOG [NestFactory] Starting Nest application...
[Nest] 24936  - 11/04/2026, 10:37:28 AM     LOG [NotificationsService] Web Push VAPID keys initialized.
[Nest] 24936  - 11/04/2026, 10:37:28 AM     LOG [InstanceLoader] CommonModule dependencies initialized +7ms
[Nest] 24936  - 11/04/2026, 10:37:28 AM     LOG [InstanceLoader] OutboxModule dependencies initialized +6ms
[Nest] 24936  - 11/04/2026, 10:37:28 AM     LOG [InstanceLoader] ConfigHostModule dependencies initialized +0ms
[Nest] 24936  - 11/04/2026, 10:37:28 AM     LOG [InstanceLoader] WorkerModule dependencies initialized +1ms
[Nest] 24936  - 11/04/2026, 10:37:28 AM     LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 24936  - 11/04/2026, 10:37:28 AM     LOG [InstanceLoader] AuthModule dependencies initialized +0ms
[Nest] 24936  - 11/04/2026, 10:37:28 AM     LOG [InstanceLoader] NotificationsModule dependencies initialized +0ms
[Nest] 24936  - 11/04/2026, 10:37:30 AM     LOG [RedisService] Redis connected successfully for caching and BullMQ coordination.
[Nest] 24936  - 11/04/2026, 10:37:32 AM     LOG [PrismaService] Authoritative Supabase PostgreSQL connection established.
[Nest] 24936  - 11/04/2026, 10:37:32 AM     LOG [WorkerService] Starting BullMQ background worker & reminder reconciler...
[Nest] 24936  - 11/04/2026, 10:37:32 AM     LOG [WorkerService] BullMQ worker connected to Redis.
[Nest] 24936  - 11/04/2026, 10:37:32 AM     LOG [WorkerBootstrap] BullMQ background worker process is running and monitoring reminder queues.
```

- **Prisma Connection:** Established to Supabase PostgreSQL without connection leaks.
- **Redis Connection:** Connected to `sonic-botanical-cacao-25084.db.redis.io:19767`.
- **BullMQ Workers:** Active and monitoring reminder queues.
- **Graceful Shutdown:** Tested and operational.

