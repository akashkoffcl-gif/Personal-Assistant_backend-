import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { RemindersService } from '../reminders/reminders.service';
import { OutboxService } from '../outbox/outbox.service';
import {
  TaskCategory,
  TaskStatus,
  Priority,
  SchedulingMode,
  ScheduleChangeReason,
} from '@assistant/shared';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly remindersService: RemindersService,
    private readonly outboxService: OutboxService,
  ) {}

  async findAll(
    userId: string,
    filters?: {
      category?: TaskCategory;
      status?: TaskStatus;
      date?: string; // YYYY-MM-DD
    },
  ) {
    if (!this.prisma.isConnected) {
      return [];
    }

    const where: any = { userId };
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;

    if (filters?.date) {
      const startOfDay = new Date(`${filters.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${filters.date}T23:59:59.999Z`);
      where.scheduledStartTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { scheduledStartTime: 'asc' }],
    });

    const now = new Date();
    return tasks.map((task) => ({
      ...task,
      isOverdue:
        task.deadline &&
        new Date(task.deadline) < now &&
        task.status !== TaskStatus.COMPLETED &&
        task.status !== TaskStatus.SKIPPED &&
        task.status !== TaskStatus.CANCELLED,
    }));
  }

  async findOne(userId: string, id: string) {
    if (!this.prisma.isConnected) {
      throw new NotFoundException(`Task with ID ${id} not found.`);
    }

    const task = await this.prisma.task.findFirst({
      where: { id, userId },
      include: {
        taskEvents: { orderBy: { createdAt: 'desc' } },
        reminders: { orderBy: { triggerTime: 'desc' } },
        scheduleChanges: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found.`);
    }

    const now = new Date();
    return {
      ...task,
      isOverdue:
        task.deadline &&
        new Date(task.deadline) < now &&
        task.status !== TaskStatus.COMPLETED &&
        task.status !== TaskStatus.SKIPPED &&
        task.status !== TaskStatus.CANCELLED,
    };
  }

  async create(userId: string, data: any) {
    if (!this.prisma.isConnected) {
      return { id: 'mock-task-id', userId, ...data, status: TaskStatus.TODO, createdAt: new Date() };
    }

    const task = await this.prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        category: data.category,
        status: data.status || TaskStatus.TODO,
        priority: data.priority || Priority.MEDIUM,
        schedulingMode: data.schedulingMode || SchedulingMode.FLEXIBLE,
        estimatedDurationMinutes: data.estimatedDurationMinutes || 30,
        scheduledStartTime: data.scheduledStartTime ? new Date(data.scheduledStartTime) : null,
        scheduledEndTime: data.scheduledEndTime ? new Date(data.scheduledEndTime) : null,
        earliestStartTime: data.earliestStartTime ? new Date(data.earliestStartTime) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        maxDelayMinutes: data.maxDelayMinutes,
        canSplit: data.canSplit || false,
        bufferMinutes: data.bufferMinutes || 5,
        routineId: data.routineId || null,
        projectId: data.projectId || null,
        parentTaskId: data.parentTaskId || null,
        notes: data.notes || null,
      },
    });

    // Write persistent TaskEvent
    await this.prisma.taskEvent.create({
      data: {
        taskId: task.id,
        userId,
        eventType: 'CREATED',
        newStatus: task.status,
        metadata: { title: task.title, category: task.category },
      },
    });

    // Schedule reminder if start time is set
    if (task.scheduledStartTime) {
      await this.remindersService.scheduleReminderForTask(
        userId,
        task.id,
        new Date(task.scheduledStartTime),
        { title: task.title, type: 'START_REMINDER' },
      );
    }

    // Invalidate cached dashboard queries
    await this.redis.invalidatePattern(`dashboard:${userId}:*`);

    // Authoritative Usage Analytics Event
    await (this.prisma as any).usageEvent?.create({
      data: {
        userId,
        eventName: 'task.created',
        module: 'TASKS',
        feature: data.parentTaskId ? 'SUBTASK_CREATE' : 'TASK_CREATE',
        action: 'CREATE',
        status: 'SUCCESS',
        metadata: { taskId: task.id, priority: task.priority, category: task.category },
      },
    }).catch(() => {});

    return task;
  }

  async update(userId: string, id: string, data: any) {
    const existing = await this.findOne(userId, id);

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.schedulingMode !== undefined) updateData.schedulingMode = data.schedulingMode;
    if (data.estimatedDurationMinutes !== undefined) updateData.estimatedDurationMinutes = data.estimatedDurationMinutes;
    if (data.scheduledStartTime !== undefined) updateData.scheduledStartTime = data.scheduledStartTime ? new Date(data.scheduledStartTime) : null;
    if (data.scheduledEndTime !== undefined) updateData.scheduledEndTime = data.scheduledEndTime ? new Date(data.scheduledEndTime) : null;
    if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;

    const updated = await this.prisma.task.update({
      where: { id },
      data: updateData,
    });

    if (data.status && data.status !== existing.status) {
      await this.prisma.taskEvent.create({
        data: {
          taskId: id,
          userId,
          eventType: 'STATUS_CHANGED',
          previousStatus: existing.status,
          newStatus: data.status,
        },
      });
    }

    // If start time changed, update reminders
    if (data.scheduledStartTime && new Date(data.scheduledStartTime).getTime() !== new Date(existing.scheduledStartTime).getTime()) {
      await this.remindersService.scheduleReminderForTask(
        userId,
        id,
        new Date(data.scheduledStartTime),
        { title: updated.title, type: 'UPDATED_REMINDER' },
      );
    }

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);

    // Authoritative Usage Analytics Event
    await (this.prisma as any).usageEvent?.create({
      data: {
        userId,
        eventName: 'task.updated',
        module: 'TASKS',
        feature: 'TASK_UPDATE',
        action: 'UPDATE',
        status: 'SUCCESS',
        metadata: { taskId: id },
      },
    }).catch(() => {});

    return updated;
  }

  async complete(userId: string, id: string) {
    const task = await this.findOne(userId, id);

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.prisma.taskEvent.create({
      data: {
        taskId: id,
        userId,
        eventType: 'COMPLETED',
        previousStatus: task.status,
        newStatus: TaskStatus.COMPLETED,
      },
    });

    // Invalidate pending reminders
    await this.remindersService.invalidateTaskReminders(id);
    await this.redis.invalidatePattern(`dashboard:${userId}:*`);

    // Authoritative Usage Analytics Event
    await (this.prisma as any).usageEvent?.create({
      data: {
        userId,
        eventName: 'task.completed',
        module: 'TASKS',
        feature: 'TASK_COMPLETE',
        action: 'UPDATE',
        status: 'SUCCESS',
        metadata: { taskId: id },
      },
    }).catch(() => {});

    return updated;
  }

  async snooze(userId: string, id: string, minutes = 15, reason?: string) {
    const task = await this.findOne(userId, id);
    const now = new Date();
    const baseTime = task.scheduledStartTime ? new Date(task.scheduledStartTime) : now;
    const newStart = new Date(baseTime.getTime() + minutes * 60 * 1000);
    const newEnd = task.scheduledEndTime
      ? new Date(new Date(task.scheduledEndTime).getTime() + minutes * 60 * 1000)
      : new Date(newStart.getTime() + task.estimatedDurationMinutes * 60 * 1000);

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        scheduledStartTime: newStart,
        scheduledEndTime: newEnd,
      },
    });

    await this.prisma.taskEvent.create({
      data: {
        taskId: id,
        userId,
        eventType: 'SNOOZED',
        previousStatus: task.status,
        newStatus: task.status,
        metadata: { minutes, reason, originalStart: task.scheduledStartTime, newStart },
      },
    });

    // Reschedule reminder
    await this.remindersService.scheduleReminderForTask(
      userId,
      id,
      newStart,
      { title: updated.title, type: 'SNOOZED_REMINDER' },
    );

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);

    // Authoritative Usage Analytics Event
    await (this.prisma as any).usageEvent?.create({
      data: {
        userId,
        eventName: 'task.rescheduled',
        module: 'TASKS',
        feature: 'TASK_RESCHEDULE',
        action: 'UPDATE',
        status: 'SUCCESS',
        metadata: { taskId: id },
      },
    }).catch(() => {});

    return updated;
  }

  async reschedule(userId: string, id: string, newStartTime: string, newEndTime?: string) {
    const task = await this.findOne(userId, id);
    const start = new Date(newStartTime);
    const end = newEndTime
      ? new Date(newEndTime)
      : new Date(start.getTime() + task.estimatedDurationMinutes * 60 * 1000);

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        scheduledStartTime: start,
        scheduledEndTime: end,
      },
    });

    await this.prisma.taskEvent.create({
      data: {
        taskId: id,
        userId,
        eventType: 'RESCHEDULED',
        metadata: {
          originalStart: task.scheduledStartTime,
          newStart: start,
        },
      },
    });

    await this.remindersService.scheduleReminderForTask(
      userId,
      id,
      start,
      { title: updated.title, type: 'RESCHEDULED_REMINDER' },
    );

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);

    // Authoritative Usage Analytics Event
    await (this.prisma as any).usageEvent?.create({
      data: {
        userId,
        eventName: 'task.rescheduled',
        module: 'TASKS',
        feature: 'TASK_RESCHEDULE',
        action: 'UPDATE',
        status: 'SUCCESS',
        metadata: { taskId: id },
      },
    }).catch(() => {});

    return updated;
  }

  async getEvents(userId: string, taskId: string) {
    await this.findOne(userId, taskId); // verifies ownership
    return this.prisma.taskEvent.findMany({
      where: { taskId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.remindersService.invalidateTaskReminders(id);
    await this.prisma.task.delete({ where: { id } });
    await this.redis.invalidatePattern(`dashboard:${userId}:*`);
    return { success: true };
  }
}

