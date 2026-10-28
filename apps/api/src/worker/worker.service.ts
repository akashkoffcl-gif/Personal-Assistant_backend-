import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { OutboxService } from '../modules/outbox/outbox.service';
import { ReminderStatus, TaskStatus } from '@assistant/shared';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private reconciliationTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly outboxService: OutboxService,
  ) {}

  async onModuleInit() {
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
      );

      this.worker.on('completed', (job) => {
        this.logger.log(`Job ${job.id} for reminder ${job.data?.reminderId} completed.`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.id} failed: ${err.message}`);
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
    await this.prisma.reminderAttempt.create({
      data: {
        reminderId: reminder.id,
        attemptNumber: reminder.attemptCount + 1,
        status: result.deliveredCount > 0 ? 'SUCCESS' : 'FAILED_NO_ACTIVE_SUBSCRIPTION',
        responseCode: result.deliveredCount > 0 ? 200 : 404,
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
   */
  async reconcileOutboxAndReminders() {
    if (!this.prisma.isConnected) return;

    try {
      const now = new Date();

      // Find pending outbox events
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

      // Reconcile overdue reminders that are still marked SCHEDULED
      const overdueReminders = await this.prisma.reminder.findMany({
        where: {
          status: ReminderStatus.SCHEDULED,
          triggerTime: { lte: now },
        },
        include: { task: true },
        take: 10,
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

          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              status: ReminderStatus.SENT,
              attemptCount: { increment: 1 },
              lastAttemptAt: now,
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.error(`Reconciliation run error: ${err?.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.reconciliationTimer) {
      clearInterval(this.reconciliationTimer);
    }
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
  }
}
