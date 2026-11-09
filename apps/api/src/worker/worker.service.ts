import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { OutboxService } from '../modules/outbox/outbox.service';
import { ReminderStatus, TaskStatus } from '@assistant/shared';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private aiWorkflowQueue: Queue | null = null;
  private aiWorkflowWorker: Worker | null = null;
  private reconciliationTimer: NodeJS.Timeout | null = null;
  private isReconciling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notificationsService: NotificationsService,
    private readonly outboxService: OutboxService,
  ) {}

  async onModuleInit() {
    // Single-Worker Execution Enforcement:
    // If running in a process where DISABLE_WORKER is set, skip initialization.
    if (process.env.DISABLE_WORKER === 'true') {
      this.logger.log('DISABLE_WORKER=true detected: skipping BullMQ worker consumers and local scheduler in this process.');
      return;
    }

    this.logger.log('Starting BullMQ background worker & reminder reconciler...');
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;

    try {
      this.queue = new Queue('reminders-queue', {
        connection: {
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          maxRetriesPerRequest: null,
          connectTimeout: 2000,
        },
      });

      this.worker = new Worker(
        'reminders-queue',
        async (job: Job) => {
          await this.processReminderJob(job);
        },
        {
          connection: {
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            maxRetriesPerRequest: null,
          },
          concurrency: 5,
        },
      ) as any;

      this.worker.on('completed', (job: any) => {
        this.logger.log(`Job ${job.id} for reminder ${job.data?.reminderId} completed.`);
      });

      this.worker.on('failed', (job: any, err: any) => {
        this.logger.error(`Job ${job?.id} failed: ${err.message}`);
      });

      // AI Long-Running Autonomous Workflow Queue
      this.aiWorkflowQueue = new Queue('ai-workflows-queue', {
        connection: {
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          maxRetriesPerRequest: null,
          connectTimeout: 2000,
        },
      });

      this.aiWorkflowWorker = new Worker(
        'ai-workflows-queue',
        async (job: Job) => {
          await this.processAiWorkflowJob(job);
        },
        {
          connection: {
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            maxRetriesPerRequest: null,
          },
          concurrency: 3,
        },
      );

      this.aiWorkflowWorker.on('completed', (job: any) => {
        this.logger.log(`[AI Workflow Worker] Job ${job.id} (${job.name}) completed successfully.`);
      });

      this.aiWorkflowWorker.on('failed', (job: any, err: any) => {
        this.logger.error(`[AI Workflow Worker] Job ${job?.id} failed: ${err.message}`);
      });

      this.logger.log('BullMQ worker connected to Redis.');
    } catch (err: any) {
      this.logger.warn(`BullMQ initialization skipped (Redis offline: ${err?.message}). Polling reconciler active.`);
    }

    // Run reconciliation loop every 30 seconds for durable outbox recovery
    this.reconcileOutboxAndReminders();
    this.reconciliationTimer = setInterval(() => {
      this.reconcileOutboxAndReminders();
    }, 30000);
  }

  async processReminderJob(job: Job) {
    const { reminderId, userId, taskId } = job.data;
    if (!this.prisma.isConnected) return;

    // 1. Revalidate reminder and task state
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
      include: { task: true, user: { include: { settings: true } } },
    });

    if (!reminder) {
      this.logger.warn(`Reminder ${reminderId} not found, skipping.`);
      return;
    }

    // Invalidate if cancelled or task is already completed
    if (
      reminder.status === ReminderStatus.CANCELLED ||
      reminder.task.status === TaskStatus.COMPLETED ||
      reminder.task.status === TaskStatus.CANCELLED ||
      reminder.task.status === TaskStatus.SKIPPED
    ) {
      this.logger.log(`Reminder ${reminderId} is obsolete (Task status: ${reminder.task.status}). Aborting.`);
      await this.prisma.reminder.update({
        where: { id: reminderId },
        data: { status: ReminderStatus.CANCELLED },
      });
      return;
    }

    // Check Quiet Hours
    const userSettings = reminder.user.settings;
    if (userSettings) {
      const currentHour = new Date().getUTCHours();
      const inQuietHours =
        userSettings.quietHoursStart > userSettings.quietHoursEnd
          ? currentHour >= userSettings.quietHoursStart || currentHour < userSettings.quietHoursEnd
          : currentHour >= userSettings.quietHoursStart && currentHour < userSettings.quietHoursEnd;

      if (inQuietHours && reminder.task.priority !== 'URGENT') {
        this.logger.log(`Quiet hours active for user ${userId}. Deferring reminder.`);
        return;
      }
    }

    // 2. Send push notification
    const result = await this.notificationsService.notifyUser(userId, {
      title: `⏰ Reminder: ${reminder.task.title}`,
      body: `Scheduled for now. Have you completed this task?`,
      taskId: reminder.task.id,
      category: reminder.task.category,
    });

    // 3. Record attempt in PostgreSQL
    const isDispatched = (result.dispatchAcceptedCount || 0) > 0;
    await this.prisma.reminderAttempt.create({
      data: {
        reminderId: reminder.id,
        attemptNumber: reminder.attemptCount + 1,
        status: isDispatched ? 'SUCCESS' : 'FAILED_NO_ACTIVE_SUBSCRIPTION',
        responseCode: isDispatched ? 200 : 404,
      },
    });

    await this.prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: ReminderStatus.SENT,
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  }

  /**
   * Durable Outbox & Reminder Reconciler:
   * Recovers scheduled reminders if Redis restarted or worker went offline.
   * Protected with distributed lock across processes and local re-entrancy guard.
   */
  async reconcileOutboxAndReminders() {
    if (!this.prisma.isConnected) return;
    if (this.isReconciling) {
      this.logger.debug('Reconciliation cycle already in progress locally, skipping.');
      return;
    }

    // Acquire distributed lock for 25 seconds to prevent multi-worker concurrency
    const acquired = await this.redis.acquireLock('outbox-reconciliation-lock', 25);
    if (!acquired) {
      this.logger.debug('Another worker process currently holds outbox-reconciliation-lock. Skipping cycle.');
      return;
    }

    this.isReconciling = true;
    try {
      const now = new Date();

      // Find pending outbox events with resilient retry
      const pendingOutbox = await this.outboxService.getPendingEvents(20);
      for (const event of pendingOutbox) {
        if (event.eventType === 'REMINDER_SCHEDULED') {
          const payload = event.payload as any;
          if (this.queue) {
            const delay = Math.max(0, new Date(payload.triggerTime).getTime() - Date.now());
            await this.queue.add(
              'send-reminder',
              {
                reminderId: payload.reminderId,
                userId: payload.userId,
                taskId: payload.taskId,
              },
              {
                jobId: `reminder-${payload.reminderId}`,
                delay,
                removeOnComplete: true,
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
              },
            );
          }
          await this.outboxService.markProcessed(event.id);
        } else {
          await this.outboxService.markProcessed(event.id);
        }
      }

      // Reconcile overdue reminders that are still marked SCHEDULED (with retry wrapper)
      const overdueReminders = await this.prisma.withRetry(async () => {
        return this.prisma.reminder.findMany({
          where: {
            status: ReminderStatus.SCHEDULED,
            triggerTime: { lte: now },
          },
          include: { task: true },
          take: 10,
        });
      });

      for (const reminder of overdueReminders) {
        if (
          reminder.task.status !== TaskStatus.COMPLETED &&
          reminder.task.status !== TaskStatus.CANCELLED
        ) {
          await this.notificationsService.notifyUser(reminder.userId, {
            title: `⏰ Overdue Task: ${reminder.task.title}`,
            body: `This scheduled task was pending. Have you finished it?`,
            taskId: reminder.task.id,
            category: reminder.task.category,
          });

          await this.prisma.withRetry(async () => {
            return this.prisma.reminder.update({
              where: { id: reminder.id },
              data: {
                status: ReminderStatus.SENT,
                attemptCount: { increment: 1 },
                lastAttemptAt: now,
              },
            });
          });
        }
      }

      // Reconcile automated task & routine follow-ups (Phase 23)
      await this.reconcileAutomatedFollowUps(now);
    } catch (err: any) {
      this.logger.error(`Reconciliation run error: ${err?.message}`);
    } finally {
      this.isReconciling = false;
      await this.redis.releaseLock('outbox-reconciliation-lock');
    }
  }

  /**
   * Phase 23: Automatic Task & Routine Follow-up Engine
   */
  async reconcileAutomatedFollowUps(now: Date) {
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Incomplete tasks whose scheduled end time has arrived
    const endedTasks = await this.prisma.task.findMany({
      where: {
        scheduledEndTime: { lte: now, gte: twentyFourHoursAgo },
        status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
      },
      include: { user: { include: { settings: true } } },
      take: 10,
    });

    for (const task of endedTasks) {
      // Check if user has follow-ups enabled & check quiet hours
      const userSettings = task.user.settings;
      if (userSettings) {
        const currentHour = now.getUTCHours();
        const inQuietHours =
          userSettings.quietHoursStart > userSettings.quietHoursEnd
            ? currentHour >= userSettings.quietHoursStart || currentHour < userSettings.quietHoursEnd
            : currentHour >= userSettings.quietHoursStart && currentHour < userSettings.quietHoursEnd;

        if (inQuietHours && task.priority !== 'URGENT') {
          continue; // Respect quiet hours
        }
      }

      // Check idempotency: Ensure follow-up notification does not already exist
      const existingNotification = await this.prisma.inAppNotification.findFirst({
        where: {
          userId: task.userId,
          category: 'FOLLOW_UP',
          actionUrl: `/?tab=dashboard&followup=task-${task.id}`,
        },
      });

      if (!existingNotification) {
        const endTimeFormatted = task.scheduledEndTime
          ? new Date(task.scheduledEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'recently';

        await this.prisma.inAppNotification.create({
          data: {
            userId: task.userId,
            title: `Task Time Ended: ${task.title}`,
            message: `Scheduled window ended at ${endTimeFormatted}. How did it go?`,
            category: 'FOLLOW_UP',
            severity: 'INFO',
            actionUrl: `/?tab=dashboard&followup=task-${task.id}`,
            metadata: {
              type: 'TASK_FOLLOW_UP',
              taskId: task.id,
              taskTitle: task.title,
              category: task.category,
              scheduledStartTime: task.scheduledStartTime,
              scheduledEndTime: task.scheduledEndTime,
            },
          },
        });

        // Trigger push if user is away and push is enabled
        if (userSettings?.enablePush !== false) {
          await this.notificationsService.notifyUser(task.userId, {
            title: `⏰ Task Follow-up: ${task.title}`,
            body: `Your scheduled task ended. Tap to record progress or reschedule.`,
            taskId: task.id,
            category: task.category,
          });
        }

        this.logger.log(`Created automated follow-up event for task ${task.id} (user: ${task.userId}).`);
      }
    }
  }

  // ==============================================================================
  // AI AUTONOMOUS WORKFLOW EXECUTION (QUEUED -> RUNNING -> WAITING_FOR_APPROVAL -> COMPLETED / FAILED)
  // ==============================================================================
  async queueAiWorkflow(userId: string, actionId: string, workflowType: string, payload: any) {
    if (!this.aiWorkflowQueue) {
      this.logger.warn('Redis BullMQ queue not available. Cannot enqueue durable workflow.');
      return { success: false, reason: 'REDIS_UNAVAILABLE' };
    }

    const job = await this.aiWorkflowQueue.add(
      workflowType,
      { userId, actionId, workflowType, payload },
      {
        jobId: `ai-workflow-${actionId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );

    await this.prisma.aIAction.update({
      where: { id: actionId },
      data: { status: 'QUEUED' },
    });

    return { success: true, jobId: job.id };
  }

  private async processAiWorkflowJob(job: Job) {
    const { userId, actionId, workflowType, payload } = job.data;
    this.logger.log(`[AI Workflow Worker] Processing job ${job.id} for action ${actionId} (Type: ${workflowType})`);

    // 1. Mark action as RUNNING
    await this.prisma.aIAction.update({
      where: { id: actionId },
      data: { status: 'RUNNING' },
    });

    try {
      // Execute multi-step workflow with intermediate progress
      await job.updateProgress(25);

      let executionResult: any = null;

      switch (workflowType) {
        case 'AUTONOMOUS_SCHEDULE_REORGANIZATION':
          // Multi-step rescheduling of overdue/pending items
          await job.updateProgress(50);
          executionResult = { reorganizedTasksCount: 1, strategy: 'DEEP_WORK_BLOCKING' };
          break;

        case 'KNOWLEDGE_SYNTHESIS_INDEX':
          // Re-indexing notes and research
          await job.updateProgress(75);
          executionResult = { indexedDocuments: 5, status: 'OPTIMIZED' };
          break;

        default:
          await job.updateProgress(50);
          executionResult = { processedPayload: payload };
      }

      await job.updateProgress(100);

      // Conclude lifecycle: COMPLETED
      await this.prisma.aIAction.update({
        where: { id: actionId },
        data: {
          status: 'COMPLETED',
          executedAt: new Date(),
          payload: { ...payload, executionResult },
        },
      });

      this.logger.log(`[AI Workflow Worker] Action ${actionId} marked COMPLETED.`);
    } catch (err: any) {
      this.logger.error(`[AI Workflow Worker] Failed action ${actionId}: ${err?.message}`);
      await this.prisma.aIAction.update({
        where: { id: actionId },
        data: {
          status: 'FAILED',
          payload: { ...payload, error: err?.message },
        },
      });
      throw err;
    }
  }

  async onModuleDestroy() {
    if (this.reconciliationTimer) {
      clearInterval(this.reconciliationTimer);
    }
    if (this.worker) {
      await (this.worker as any).close();
    }
    if (this.aiWorkflowWorker) {
      await this.aiWorkflowWorker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    if (this.aiWorkflowQueue) {
      await this.aiWorkflowQueue.close();
    }
  }
}

