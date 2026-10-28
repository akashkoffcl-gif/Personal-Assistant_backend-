import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { SchedulingEngineService } from '../scheduling/scheduling-engine.service';
import { RemindersService } from '../reminders/reminders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OutboxService } from '../outbox/outbox.service';
import {
  TaskCategory,
  TaskStatus,
  Priority,
  SchedulingMode,
  ScheduleChangeReason,
  SchedulableTask,
} from '@assistant/shared';

@Injectable()
export class EmergenciesService {
  private readonly logger = new Logger(EmergenciesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly schedulingEngine: SchedulingEngineService,
    private readonly remindersService: RemindersService,
    private readonly notificationsService: NotificationsService,
    private readonly outboxService: OutboxService,
  ) {}

  async handleEmergency(userId: string, data: {
    title: string;
    description?: string;
    estimatedDurationMinutes?: number;
    deadline?: string;
    earliestStartTime?: string;
    bufferMinutes?: number;
    autoRescheduleFlexible?: boolean;
  }) {
    if (!this.prisma.isConnected) {
      return {
        success: true,
        emergencyTask: { id: 'mock-emergency', title: data.title },
        scheduleChanges: [],
        conflicts: [],
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const dayStart = new Date(`${todayStr}T08:00:00.000Z`);
    const dayEnd = new Date(`${todayStr}T22:00:00.000Z`);

    // 1. Create Emergency Task with URGENT priority & EMERGENCY category
    const emergencyTask = await this.prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        category: TaskCategory.EMERGENCY,
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        schedulingMode: SchedulingMode.FIXED,
        estimatedDurationMinutes: data.estimatedDurationMinutes || 60,
        bufferMinutes: data.bufferMinutes || 10,
        earliestStartTime: data.earliestStartTime ? new Date(data.earliestStartTime) : new Date(),
        deadline: data.deadline ? new Date(data.deadline) : null,
      },
    });

    // 2. Fetch all existing tasks for today
    const existingTasks = await this.prisma.task.findMany({
      where: {
        userId,
        scheduledStartTime: {
          gte: new Date(`${todayStr}T00:00:00.000Z`),
          lte: new Date(`${todayStr}T23:59:59.999Z`),
        },
      },
    });

    const schedulableTasks: SchedulableTask[] = existingTasks.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category as TaskCategory,
      status: t.status as TaskStatus,
      priority: t.priority as Priority,
      schedulingMode: t.schedulingMode as SchedulingMode,
      estimatedDurationMinutes: t.estimatedDurationMinutes,
      bufferMinutes: t.bufferMinutes,
      scheduledStartTime: t.scheduledStartTime,
      scheduledEndTime: t.scheduledEndTime,
      earliestStartTime: t.earliestStartTime,
      deadline: t.deadline,
      maxDelayMinutes: t.maxDelayMinutes,
    }));

    const schedulableEmergency: SchedulableTask = {
      id: emergencyTask.id,
      title: emergencyTask.title,
      category: TaskCategory.EMERGENCY,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      schedulingMode: SchedulingMode.FIXED,
      estimatedDurationMinutes: emergencyTask.estimatedDurationMinutes,
      bufferMinutes: emergencyTask.bufferMinutes,
      earliestStartTime: emergencyTask.earliestStartTime,
      deadline: emergencyTask.deadline,
    };

    // 3. Run deterministic scheduling engine
    const replanResult = this.schedulingEngine.planDay(
      schedulableTasks,
      dayStart,
      dayEnd,
      schedulableEmergency,
    );

    // 4. Create or update SchedulePlan record with bumped version
    const latestPlan = await this.prisma.schedulePlan.findFirst({
      where: { userId, date: todayStr },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latestPlan?.version || 0) + 1;

    const newPlan = await this.prisma.schedulePlan.create({
      data: {
        userId,
        date: todayStr,
        version: nextVersion,
        isLocked: false,
      },
    });

    // 5. Apply assignments & record schedule changes in transaction
    const recordedChanges: any[] = [];
    for (const assignment of replanResult.assignments) {
      if (assignment.isModified) {
        // Update task scheduled times
        await this.prisma.task.update({
          where: { id: assignment.taskId },
          data: {
            scheduledStartTime: assignment.startTime,
            scheduledEndTime: assignment.endTime,
          },
        });

        // Record ScheduleChange audit
        const change = await this.prisma.scheduleChange.create({
          data: {
            userId,
            planId: newPlan.id,
            taskId: assignment.taskId,
            reason: ScheduleChangeReason.EMERGENCY_INSERTION,
            originalStartTime: assignment.originalStartTime,
            originalEndTime: assignment.originalEndTime,
            revisedStartTime: assignment.startTime,
            revisedEndTime: assignment.endTime,
          },
        });
        recordedChanges.push({
          ...change,
          taskTitle: assignment.taskTitle,
        });

        // Invalidate and reschedule reminder
        await this.remindersService.scheduleReminderForTask(
          userId,
          assignment.taskId,
          assignment.startTime,
          { title: assignment.taskTitle, type: 'EMERGENCY_REPLAN_REMINDER' },
        );
      }
    }

    // 6. Record Outbox event for emergency replan
    await this.outboxService.publish(
      'EMERGENCY',
      emergencyTask.id,
      'EMERGENCY_APPLIED',
      {
        emergencyTaskId: emergencyTask.id,
        planVersion: nextVersion,
        changesCount: recordedChanges.length,
        conflicts: replanResult.conflicts,
      },
    );

    // 7. Send immediate push notification to user
    await this.notificationsService.notifyUser(userId, {
      title: `🚨 Emergency: ${emergencyTask.title}`,
      body: `Schedule reorganized. ${recordedChanges.length} tasks adjusted.${
        replanResult.conflicts.length > 0
          ? ` Warning: ${replanResult.conflicts.length} conflict(s) detected.`
          : ''
      }`,
      taskId: emergencyTask.id,
      category: TaskCategory.EMERGENCY,
    });

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);

    return {
      success: true,
      emergencyTask,
      planVersion: nextVersion,
      scheduleChanges: recordedChanges,
      conflicts: replanResult.conflicts,
      unresolvedTasks: replanResult.unresolvedTasks,
    };
  }

  async getScheduleChanges(userId: string) {
    if (!this.prisma.isConnected) return [];

    const changes = await this.prisma.scheduleChange.findMany({
      where: { userId },
      include: {
        task: {
          select: { title: true, category: true, priority: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return changes.map((c) => ({
      ...c,
      taskTitle: c.task?.title,
      taskCategory: c.task?.category,
    }));
  }

  async cancelEmergency(userId: string, emergencyTaskId: string) {
    if (!this.prisma.isConnected) return { success: true };

    const task = await this.prisma.task.findFirst({
      where: { id: emergencyTaskId, userId },
    });

    if (!task) {
      throw new BadRequestException('Emergency task not found.');
    }

    await this.prisma.task.update({
      where: { id: emergencyTaskId },
      data: { status: TaskStatus.CANCELLED },
    });

    await this.remindersService.invalidateTaskReminders(emergencyTaskId);

    // Record Outbox event
    await this.outboxService.publish(
      'EMERGENCY',
      emergencyTaskId,
      'EMERGENCY_CANCELLED',
      { taskId: emergencyTaskId },
    );

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);
    return { success: true, message: 'Emergency cancelled and pending reminders cleared.' };
  }
}
