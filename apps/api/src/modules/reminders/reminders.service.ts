import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { ReminderStatus, OutboxEventStatus } from '@assistant/shared';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async scheduleReminderForTask(
    userId: string,
    taskId: string,
    triggerTime: Date,
    metadata: Record<string, any> = {},
  ) {
    if (!this.prisma.isConnected) {
      return { id: 'mock-reminder', taskId, triggerTime, status: ReminderStatus.SCHEDULED };
    }

    // Cancel existing active reminders for this task to avoid stale notifications
    await this.prisma.reminder.updateMany({
      where: {
        taskId,
        status: { in: [ReminderStatus.SCHEDULED, ReminderStatus.ENQUEUED] },
      },
      data: { status: ReminderStatus.CANCELLED },
    });

    const reminder = await this.prisma.reminder.create({
      data: {
        userId,
        taskId,
        triggerTime,
        status: ReminderStatus.SCHEDULED,
        metadata,
      },
    });

    // Write Outbox record for BullMQ worker queue synchronization
    await this.prisma.outboxEvent.create({
      data: {
        aggregateType: 'REMINDER',
        aggregateId: reminder.id,
        eventType: 'REMINDER_SCHEDULED',
        payload: {
          reminderId: reminder.id,
          userId,
          taskId,
          triggerTime: triggerTime.toISOString(),
        },
        status: OutboxEventStatus.PENDING,
      },
    });

    return reminder;
  }

  async invalidateTaskReminders(taskId: string) {
    if (!this.prisma.isConnected) return;
    await this.prisma.reminder.updateMany({
      where: {
        taskId,
        status: { in: [ReminderStatus.SCHEDULED, ReminderStatus.ENQUEUED] },
      },
      data: { status: ReminderStatus.CANCELLED },
    });
  }

  async getRemindersStatus(userId: string) {
    if (!this.prisma.isConnected) {
      return {
        activeCount: 0,
        upcoming: [],
        lastReconciledAt: new Date().toISOString(),
      };
    }

    const now = new Date();
    const upcoming = await this.prisma.reminder.findMany({
      where: {
        userId,
        status: { in: [ReminderStatus.SCHEDULED, ReminderStatus.ENQUEUED] },
        triggerTime: { gte: now },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            category: true,
            priority: true,
          },
        },
      },
      orderBy: { triggerTime: 'asc' },
      take: 20,
    });

    const activeCount = await this.prisma.reminder.count({
      where: {
        userId,
        status: { in: [ReminderStatus.SCHEDULED, ReminderStatus.ENQUEUED] },
      },
    });

    return {
      activeCount,
      upcoming,
      lastReconciledAt: now.toISOString(),
    };
  }
}
