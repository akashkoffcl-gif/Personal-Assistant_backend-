import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '../src/modules/settings/settings.service';
import { FollowUpsService } from '../src/modules/follow-ups/follow-ups.service';
import { PrismaService } from '../src/common/prisma.service';
import { TaskStatus, Priority, TaskCategory } from '@assistant/shared';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Phase 23: Intelligence, API Resilience & Automated Follow-Up System', () => {
  let settingsService: SettingsService;
  let followUpsService: FollowUpsService;
  let prisma: PrismaService;

  const mockUserA = '00000000-0000-0000-0000-000000000001';
  const mockUserB = '00000000-0000-0000-0000-000000000002';

  const mockPrisma = {
    isConnected: true,
    withRetry: jest.fn(async (op) => op()),
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    taskEvent: {
      create: jest.fn(),
    },
    routine: {
      update: jest.fn(),
    },
    routineOccurrence: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inAppNotification: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        FollowUpsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    settingsService = module.get<SettingsService>(SettingsService);
    followUpsService = module.get<FollowUpsService>(FollowUpsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Part A — Settings API & Resilience', () => {
    it('should return existing settings for an existing user without crashing', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue({
        id: 'settings-1',
        userId: mockUserA,
        workStartHour: 9,
        workEndHour: 18,
        quietHoursStart: 22,
        quietHoursEnd: 7,
        maxFollowUps: 3,
        followUpIntervalMinutes: 15,
        enablePush: true,
      });

      const result = await settingsService.getSettings(mockUserA);
      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserA);
      expect(result.workStartHour).toBe(9);
      expect(mockPrisma.userSettings.findUnique).toHaveBeenCalledWith({ where: { userId: mockUserA } });
    });

    it('should safely initialize User and UserSettings when a new user accesses settings for the first time', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({ id: 'new-user-123', email: 'new-user-123@assistant.local' });
      mockPrisma.userSettings.create.mockResolvedValueOnce({
        id: 'new-settings-id',
        userId: 'new-user-123',
        workStartHour: 9,
        workEndHour: 18,
        quietHoursStart: 22,
        quietHoursEnd: 7,
        maxFollowUps: 3,
        followUpIntervalMinutes: 15,
        enablePush: true,
      });

      const result = await settingsService.getSettings('new-user-123');
      expect(result).toBeDefined();
      expect(result.userId).toBe('new-user-123');
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.userSettings.create).toHaveBeenCalled();
    });

    it('should sanitize input on updateSettings and reject disallowed fields', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue({ id: 's-1', userId: mockUserA });
      mockPrisma.userSettings.update.mockResolvedValue({
        id: 's-1',
        userId: mockUserA,
        workStartHour: 8,
        workEndHour: 17,
      });

      const updated = await settingsService.updateSettings(mockUserA, {
        workStartHour: 8,
        workEndHour: 17,
        // @ts-ignore: extra invalid field
        maliciousField: 'exploit',
      });

      expect(updated.workStartHour).toBe(8);
      expect(mockPrisma.userSettings.update).toHaveBeenCalledWith({
        where: { userId: mockUserA },
        data: {
          workStartHour: 8,
          workEndHour: 17,
        },
      });
    });
  });

  describe('Part C & D — Automatic Follow-Up Engine', () => {
    it('should discover ended incomplete tasks and return structured follow-up items', async () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 30 * 60 * 1000);

      mockPrisma.task.findMany.mockResolvedValueOnce([
        {
          id: 'task-101',
          userId: mockUserA,
          title: 'Complete project proposal',
          category: TaskCategory.WORK,
          status: TaskStatus.TODO,
          priority: Priority.HIGH,
          scheduledStartTime: new Date(pastTime.getTime() - 60 * 60 * 1000),
          scheduledEndTime: pastTime,
        },
      ]);
      mockPrisma.routineOccurrence.findMany.mockResolvedValueOnce([]);

      const pending = await followUpsService.getPendingFollowUps(mockUserA);
      expect(pending).toHaveLength(1);
      expect(pending[0].type).toBe('TASK');
      expect(pending[0].targetId).toBe('task-101');
      expect(pending[0].title).toBe('Complete project proposal');
    });

    it('should record COMPLETED response: mark task complete and record TaskEvent', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        id: 'task-101',
        userId: mockUserA,
        title: 'Complete project proposal',
        status: TaskStatus.TODO,
      });

      const response = await followUpsService.respondToFollowUp(mockUserA, {
        taskId: 'task-101',
        action: 'COMPLETED',
      });

      expect(response.success).toBe(true);
      expect(response.action).toBe('COMPLETED');
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-101' },
          data: expect.objectContaining({ status: TaskStatus.COMPLETED }),
        }),
      );
      expect(mockPrisma.taskEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskId: 'task-101',
            userId: mockUserA,
            eventType: 'STATUS_CHANGED',
            newStatus: TaskStatus.COMPLETED,
          }),
        }),
      );
    });

    it('should record PARTIALLY_COMPLETED response: update progress percent and notes', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        id: 'task-101',
        userId: mockUserA,
        title: 'Complete project proposal',
        status: TaskStatus.TODO,
        notes: 'Initial notes',
      });

      const response = await followUpsService.respondToFollowUp(mockUserA, {
        taskId: 'task-101',
        action: 'PARTIALLY_COMPLETED',
        progressPercent: 75,
        notes: 'Need to review slide 4',
      });

      expect(response.success).toBe(true);
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-101' },
          data: expect.objectContaining({ status: TaskStatus.IN_PROGRESS }),
        }),
      );
      expect(mockPrisma.taskEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({ progressPercent: 75 }),
          }),
        }),
      );
    });

    it('should record STILL_WORKING response: extend scheduledEndTime', async () => {
      const originalEnd = new Date('2026-11-01T10:00:00Z');
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        id: 'task-101',
        userId: mockUserA,
        status: TaskStatus.IN_PROGRESS,
        scheduledEndTime: originalEnd,
      });

      const revisedEnd = new Date('2026-11-01T10:30:00Z').toISOString();
      const response = await followUpsService.respondToFollowUp(mockUserA, {
        taskId: 'task-101',
        action: 'STILL_WORKING',
        revisedEndTime: revisedEnd,
      });

      expect(response.success).toBe(true);
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'task-101' },
          data: expect.objectContaining({
            status: TaskStatus.IN_PROGRESS,
            scheduledEndTime: new Date(revisedEnd),
          }),
        }),
      );
    });

    it('should record routine follow-up with quantity tracking (e.g. hydration cups)', async () => {
      mockPrisma.routineOccurrence.findUnique.mockResolvedValueOnce({
        id: 'occ-hydration-1',
        routineId: 'routine-hyd-1',
        userId: mockUserA,
        status: TaskStatus.TODO,
        actualQuantity: 4,
      });

      const response = await followUpsService.respondToFollowUp(mockUserA, {
        occurrenceId: 'occ-hydration-1',
        action: 'COMPLETED',
        actualQuantity: 8,
      });

      expect(response.success).toBe(true);
      expect(mockPrisma.routineOccurrence.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'occ-hydration-1' },
          data: expect.objectContaining({
            status: TaskStatus.COMPLETED,
            actualQuantity: 8,
          }),
        }),
      );
      expect(mockPrisma.routine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'routine-hyd-1' },
          data: { streakCount: { increment: 1 } },
        }),
      );
    });
  });

  describe('Part G — Security & Multi-User Isolation Tests', () => {
    it('should FORBID User B from responding to User A\'s task follow-up', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({
        id: 'task-owned-by-user-a',
        userId: mockUserA,
        title: 'Confidential Task',
        status: TaskStatus.TODO,
      });

      await expect(
        followUpsService.respondToFollowUp(mockUserB, {
          taskId: 'task-owned-by-user-a',
          action: 'COMPLETED',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it('should FORBID User B from modifying User A\'s routine occurrence', async () => {
      mockPrisma.routineOccurrence.findUnique.mockResolvedValueOnce({
        id: 'occ-user-a',
        userId: mockUserA,
        status: TaskStatus.TODO,
      });

      await expect(
        followUpsService.respondToFollowUp(mockUserB, {
          occurrenceId: 'occ-user-a',
          action: 'COMPLETED',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.routineOccurrence.update).not.toHaveBeenCalled();
    });
  });
});
