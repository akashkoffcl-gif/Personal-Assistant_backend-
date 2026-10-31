import { UsageAnalyticsService, TRACKED_FEATURES_CATALOG } from '../src/modules/analytics/usage-analytics.service';

describe('UsageAnalyticsService', () => {
  let service: UsageAnalyticsService;

  const mockPrisma = {
    isConnected: true,
    usageEvent: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    automationRuleExecution: {
      findMany: jest.fn(),
    },
    reminder: {
      findMany: jest.fn(),
    },
    reminderAttempt: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsageAnalyticsService(mockPrisma as any);
  });

  describe('recordEvent', () => {
    it('creates an event in the database with normalized uppercase module and feature', async () => {
      const eventPayload = {
        eventName: 'task.created',
        module: 'tasks',
        feature: 'task_create',
        action: 'create',
        status: 'success',
        metadata: { taskId: 'task-123' },
      };

      mockPrisma.usageEvent.create.mockResolvedValue({
        id: 'evt-1',
        userId: 'user-1',
        ...eventPayload,
        module: 'TASKS',
        feature: 'TASK_CREATE',
        action: 'CREATE',
        status: 'SUCCESS',
        occurredAt: new Date(),
      });

      const result = await service.recordEvent('user-1', eventPayload);

      expect(mockPrisma.usageEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          eventName: 'task.created',
          module: 'TASKS',
          feature: 'TASK_CREATE',
          action: 'CREATE',
          status: 'SUCCESS',
          metadata: { taskId: 'task-123' },
        }),
      });
      expect(result).toBeDefined();
    });

    it('enforces idempotency and does not duplicate event when idempotencyKey matches', async () => {
      const existing = {
        id: 'evt-existing',
        userId: 'user-1',
        eventName: 'task.created',
        idempotencyKey: 'idem-key-1',
      };
      mockPrisma.usageEvent.findUnique.mockResolvedValue(existing);

      const result = await service.recordEvent('user-1', {
        eventName: 'task.created',
        module: 'TASKS',
        feature: 'TASK_CREATE',
        idempotencyKey: 'idem-key-1',
      });

      expect(mockPrisma.usageEvent.findUnique).toHaveBeenCalledWith({
        where: { idempotencyKey: 'idem-key-1' },
      });
      expect(mockPrisma.usageEvent.create).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });
  });

  describe('getOverview', () => {
    it('accurately aggregates total interactions, active days, feature adoption, and failure counts', async () => {
      const mockEvents = [
        {
          module: 'TASKS',
          feature: 'TASK_CREATE',
          status: 'SUCCESS',
          occurredAt: new Date('2026-10-30T10:00:00Z'),
        },
        {
          module: 'TASKS',
          feature: 'TASK_COMPLETE',
          status: 'SUCCESS',
          occurredAt: new Date('2026-10-30T14:00:00Z'),
        },
        {
          module: 'ROUTINES',
          feature: 'ROUTINE_COMPLETE',
          status: 'SUCCESS',
          occurredAt: new Date('2026-10-31T08:00:00Z'),
        },
        {
          module: 'WELLNESS',
          feature: 'WELLNESS_LOG',
          status: 'FAILED',
          occurredAt: new Date('2026-10-31T09:00:00Z'),
        },
      ];

      mockPrisma.usageEvent.findMany.mockResolvedValue(mockEvents);
      mockPrisma.usageEvent.count.mockResolvedValue(2); // previous period count
      mockPrisma.automationRuleExecution.findMany.mockResolvedValue([
        { status: 'SUCCESS' },
        { status: 'SUCCESS' },
        { status: 'FAILED' },
      ]);
      mockPrisma.reminderAttempt.findMany.mockResolvedValue([
        { status: 'SUCCESS' },
        { status: 'SUCCESS' },
        { status: 'FAILED' },
        { status: 'SUCCESS' },
      ]);

      const overview = await service.getOverview('user-1', 30);

      expect(overview.totalInteractions).toBe(4);
      expect(overview.activeDays).toBe(2); // 2026-10-30 and 2026-10-31
      expect(overview.mostUsedModule).toBe('TASKS');
      expect(overview.failedActionsCount).toBe(1);
      expect(overview.featuresAdoptedCount).toBe(4); // TASK_CREATE, TASK_COMPLETE, ROUTINE_COMPLETE, WELLNESS_LOG
      expect(overview.totalTrackedFeaturesCount).toBe(TRACKED_FEATURES_CATALOG.length);
      expect(overview.featuresAdoptedPercent).toBe(
        Math.round((4 / TRACKED_FEATURES_CATALOG.length) * 100),
      );
      expect(overview.automationExecutionsCount).toBe(3);
      expect(overview.automationSuccessRatePercent).toBe(67); // 2 out of 3
      expect(overview.reminderSuccessRatePercent).toBe(75); // 3 out of 4
      expect(overview.periodComparisonPercent).toBe(100); // (4 - 2) / 2 * 100 = 100%
    });

    it('returns clean neutral zero-state when database is empty', async () => {
      mockPrisma.usageEvent.findMany.mockResolvedValue([]);
      mockPrisma.usageEvent.count.mockResolvedValue(0);
      mockPrisma.automationRuleExecution.findMany.mockResolvedValue([]);
      mockPrisma.reminderAttempt.findMany.mockResolvedValue([]);

      const overview = await service.getOverview('user-1', 30);

      expect(overview.totalInteractions).toBe(0);
      expect(overview.activeDays).toBe(0);
      expect(overview.mostUsedModule).toBe('N/A');
      expect(overview.featuresAdoptedPercent).toBe(0);
      expect(overview.failedActionsCount).toBe(0);
    });
  });

  describe('getTrends', () => {
    it('returns daily time-series with interactions, successful and failed counts', async () => {
      mockPrisma.usageEvent.findMany.mockResolvedValue([
        { status: 'SUCCESS' },
        { status: 'FAILED' },
      ]);

      const trends = await service.getTrends('user-1', 7);

      expect(trends.length).toBe(7);
      expect(trends[0]).toHaveProperty('date');
      expect(trends[0]).toHaveProperty('interactions');
      expect(trends[0]).toHaveProperty('successful');
      expect(trends[0]).toHaveProperty('failed');
    });
  });

  describe('getModules', () => {
    it('groups interactions by module and computes percentages with colors', async () => {
      mockPrisma.usageEvent.findMany.mockResolvedValue([
        { module: 'TASKS' },
        { module: 'TASKS' },
        { module: 'ROUTINES' },
        { module: 'WELLNESS' },
      ]);

      const modules = await service.getModules('user-1', 30);

      expect(modules.length).toBe(3);
      expect(modules[0].module).toBe('TASKS');
      expect(modules[0].interactions).toBe(2);
      expect(modules[0].percent).toBe(50);
      expect(modules[0].color).toBe('#8B45F5');
    });
  });

  describe('getFeatures', () => {
    it('computes adoption status for each catalog feature', async () => {
      mockPrisma.usageEvent.findMany.mockResolvedValue([
        { feature: 'TASK_CREATE', occurredAt: new Date('2026-10-31T10:00:00Z') },
        { feature: 'TASK_CREATE', occurredAt: new Date('2026-10-31T11:00:00Z') },
        { feature: 'EMERGENCY_REPLAN', occurredAt: new Date('2026-10-31T12:00:00Z') },
      ]);

      const features = await service.getFeatures('user-1', 30);

      expect(features.length).toBe(TRACKED_FEATURES_CATALOG.length);
      const taskCreate = features.find((f) => f.feature === 'TASK_CREATE');
      expect(taskCreate?.isAdopted).toBe(true);
      expect(taskCreate?.interactions).toBe(2);
      expect(taskCreate?.activeDays).toBe(1);

      const routineCreate = features.find((f) => f.feature === 'ROUTINE_CREATE');
      expect(routineCreate?.isAdopted).toBe(false);
      expect(routineCreate?.interactions).toBe(0);
    });
  });

  describe('getEvents', () => {
    it('supports pagination and module/status filters', async () => {
      mockPrisma.usageEvent.findMany.mockResolvedValue([
        { id: 'e-1', module: 'TASKS', feature: 'TASK_CREATE', status: 'SUCCESS' },
      ]);
      mockPrisma.usageEvent.count.mockResolvedValue(1);

      const res = await service.getEvents('user-1', {
        page: 1,
        limit: 10,
        module: 'TASKS',
        status: 'SUCCESS',
      });

      expect(res.items.length).toBe(1);
      expect(res.total).toBe(1);
      expect(mockPrisma.usageEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            module: 'TASKS',
            status: 'SUCCESS',
          }),
        }),
      );
    });
  });
});

