import { Test } from '@nestjs/testing';
import { WorkerService } from '../src/worker/worker.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { OutboxService } from '../src/modules/outbox/outbox.service';
import { PrismaService } from '../src/common/prisma.service';
import { EmergenciesService } from '../src/modules/emergencies/emergencies.service';
import { SchedulingEngineService } from '../src/modules/scheduling/scheduling-engine.service';
import { RemindersService } from '../src/modules/reminders/reminders.service';
import { RedisService } from '../src/common/redis.service';
import { TaskStatus, ReminderStatus, Priority, TaskCategory, SchedulingMode } from '@assistant/shared';

describe('Worker, Notifications & Emergency Replan Recovery', () => {
  let workerService: WorkerService;
  let notificationsService: NotificationsService;
  let emergenciesService: EmergenciesService;
  let prisma: PrismaService;
  let outboxService: OutboxService;

  const mockPrisma = {
    isConnected: true,
    withRetry: jest.fn((cb) => cb()),
    reminder: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    reminderAttempt: {
      create: jest.fn(),
    },
    pushSubscription: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    task: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    schedulePlan: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    scheduleChange: {
      create: jest.fn(),
    },
  };

  const mockNotifications = {
    notifyUser: jest.fn().mockResolvedValue({ deliveredCount: 1 }),
    sendPushNotification: jest.fn(),
  };

  const mockOutbox = {
    getPendingEvents: jest.fn(),
    markProcessed: jest.fn(),
    publish: jest.fn(),
  };

  const mockRedis = {
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
    acquireLock: jest.fn().mockResolvedValue(true),
    releaseLock: jest.fn().mockResolvedValue(undefined),
  };

  const mockReminders = {
    scheduleReminderForTask: jest.fn(),
    invalidateTaskReminders: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    workerService = new WorkerService(
      mockPrisma as any,
      mockRedis as any,
      mockNotifications as any,
      mockOutbox as any,
    );
    notificationsService = new NotificationsService(mockPrisma as any);
    emergenciesService = new EmergenciesService(
      mockPrisma as any,
      mockRedis as any,
      new SchedulingEngineService(),
      mockReminders as any,
      mockNotifications as any,
      mockOutbox as any,
    );
  });

  describe('Worker Obsolete Reminder Handling', () => {
    it('cancels reminder and aborts push if the task is already COMPLETED', async () => {
      mockPrisma.reminder.findUnique.mockResolvedValue({
        id: 'rem-1',
        status: ReminderStatus.SCHEDULED,
        attemptCount: 0,
        task: {
          id: 'task-100',
          title: 'Finished Report',
          status: TaskStatus.COMPLETED,
          category: TaskCategory.WORK,
        },
        user: { settings: null },
      });

      const mockJob: any = {
        data: { reminderId: 'rem-1', userId: 'user-1', taskId: 'task-100' },
      };

      await workerService.processReminderJob(mockJob);

      // Verify notification was NOT sent
      expect(mockNotifications.notifyUser).not.toHaveBeenCalled();

      // Verify reminder was marked CANCELLED
      expect(mockPrisma.reminder.update).toHaveBeenCalledWith({
        where: { id: 'rem-1' },
        data: { status: ReminderStatus.CANCELLED },
      });
    });

    it('cancels reminder and aborts push if the task is SKIPPED or CANCELLED', async () => {
      mockPrisma.reminder.findUnique.mockResolvedValue({
        id: 'rem-2',
        status: ReminderStatus.SCHEDULED,
        attemptCount: 0,
        task: {
          id: 'task-101',
          title: 'Skipped Habit',
          status: TaskStatus.SKIPPED,
          category: TaskCategory.PERSONAL_ROUTINE,
        },
        user: { settings: null },
      });

      const mockJob: any = {
        data: { reminderId: 'rem-2', userId: 'user-1', taskId: 'task-101' },
      };

      await workerService.processReminderJob(mockJob);

      expect(mockNotifications.notifyUser).not.toHaveBeenCalled();
      expect(mockPrisma.reminder.update).toHaveBeenCalledWith({
        where: { id: 'rem-2' },
        data: { status: ReminderStatus.CANCELLED },
      });
    });

    it('defers non-urgent reminder during quiet hours', async () => {
      const currentUTCHour = new Date().getUTCHours();
      mockPrisma.reminder.findUnique.mockResolvedValue({
        id: 'rem-3',
        status: ReminderStatus.SCHEDULED,
        attemptCount: 0,
        task: {
          id: 'task-102',
          title: 'Evening Reading',
          status: TaskStatus.TODO,
          priority: Priority.LOW,
          category: TaskCategory.PERSONAL_ROUTINE,
        },
        user: {
          settings: {
            quietHoursStart: (currentUTCHour - 1 + 24) % 24,
            quietHoursEnd: (currentUTCHour + 2) % 24,
          },
        },
      });

      const mockJob: any = {
        data: { reminderId: 'rem-3', userId: 'user-1', taskId: 'task-102' },
      };

      await workerService.processReminderJob(mockJob);

      // Defers without sending
      expect(mockNotifications.notifyUser).not.toHaveBeenCalled();
    });

    it('sends push notification and records attempt when task is active', async () => {
      mockPrisma.reminder.findUnique.mockResolvedValue({
        id: 'rem-4',
        status: ReminderStatus.SCHEDULED,
        attemptCount: 0,
        task: {
          id: 'task-103',
          title: 'Client Proposal',
          status: TaskStatus.TODO,
          priority: Priority.HIGH,
          category: TaskCategory.WORK,
        },
        user: { settings: null },
      });

      const mockJob: any = {
        data: { reminderId: 'rem-4', userId: 'user-1', taskId: 'task-103' },
      };

      await workerService.processReminderJob(mockJob);

      expect(mockNotifications.notifyUser).toHaveBeenCalledWith('user-1', expect.objectContaining({
        title: expect.stringContaining('Client Proposal'),
        taskId: 'task-103',
      }));

      expect(mockPrisma.reminderAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reminderId: 'rem-4',
          status: 'SUCCESS',
        }),
      });

      expect(mockPrisma.reminder.update).toHaveBeenCalledWith({
        where: { id: 'rem-4' },
        data: expect.objectContaining({
          status: ReminderStatus.SENT,
          attemptCount: { increment: 1 },
        }),
      });
    });
  });

  describe('Outbox and Reconciler Recovery', () => {
    it('processes pending outbox events and reconciles overdue reminders', async () => {
      mockOutbox.getPendingEvents.mockResolvedValue([
        {
          id: 'outbox-1',
          eventType: 'REMINDER_SCHEDULED',
          payload: {
            reminderId: 'rem-10',
            userId: 'user-1',
            taskId: 'task-10',
            triggerTime: new Date(Date.now() + 60000).toISOString(),
          },
        },
      ]);

      mockPrisma.reminder.findMany.mockResolvedValue([
        {
          id: 'rem-overdue-1',
          userId: 'user-1',
          status: ReminderStatus.SCHEDULED,
          triggerTime: new Date(Date.now() - 5000),
          task: { id: 'task-overdue-1', title: 'Overdue Meeting', status: TaskStatus.TODO, category: TaskCategory.WORK },
        },
      ]);

      await workerService.reconcileOutboxAndReminders();

      expect(mockOutbox.markProcessed).toHaveBeenCalledWith('outbox-1');
      expect(mockNotifications.notifyUser).toHaveBeenCalledWith('user-1', expect.objectContaining({
        title: expect.stringContaining('Overdue Task'),
      }));
      expect(mockPrisma.reminder.update).toHaveBeenCalledWith({
        where: { id: 'rem-overdue-1' },
        data: expect.objectContaining({ status: ReminderStatus.SENT }),
      });
    });
  });

  describe('Emergency Cancellation Safe Replanning', () => {
    it('cancels emergency task, invalidates reminders, and recalculates feasible plan for remaining tasks', async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'em-task-1',
        userId: 'user-1',
        title: 'Cancelled Outage',
        category: TaskCategory.EMERGENCY,
      });

      mockPrisma.task.findMany.mockResolvedValue([
        {
          id: 'task-flex-remain',
          userId: 'user-1',
          title: 'Draft Feature Spec',
          category: TaskCategory.WORK,
          status: TaskStatus.TODO,
          priority: Priority.HIGH,
          schedulingMode: SchedulingMode.FLEXIBLE,
          estimatedDurationMinutes: 60,
          bufferMinutes: 10,
          scheduledStartTime: new Date(`${todayStr}T14:00:00.000Z`),
          scheduledEndTime: new Date(`${todayStr}T15:00:00.000Z`),
        },
      ]);

      mockPrisma.schedulePlan.findFirst.mockResolvedValue({ id: 'plan-1', version: 2 });
      mockPrisma.schedulePlan.create.mockResolvedValue({ id: 'plan-2', version: 3 });

      const result = await emergenciesService.cancelEmergency('user-1', 'em-task-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'em-task-1' },
        data: { status: TaskStatus.CANCELLED },
      });
      expect(mockReminders.invalidateTaskReminders).toHaveBeenCalledWith('em-task-1');
      expect(mockOutbox.publish).toHaveBeenCalledWith(
        'EMERGENCY',
        'em-task-1',
        'EMERGENCY_CANCELLED',
        { taskId: 'em-task-1' },
      );
    });
  });
});

