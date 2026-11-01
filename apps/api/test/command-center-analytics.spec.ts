import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { PrismaService } from '../src/common/prisma.service';
import { RedisService } from '../src/common/redis.service';
import { TaskStatus, TaskCategory, Priority } from '@assistant/shared';

describe('Phase 19: Command Center Analytics & KPI Intelligence', () => {
  let service: AnalyticsService;
  let prisma: any;
  let redis: any;

  const mockUserA = 'user-uuid-1111-1111-1111-111111111111';
  const mockUserB = 'user-uuid-2222-2222-2222-222222222222';
  const targetDate = '2026-11-01';

  const mockTasksUserA = [
    {
      id: 'task-1',
      userId: mockUserA,
      title: 'Complete SaaS Mockup',
      status: TaskStatus.COMPLETED,
      category: TaskCategory.WORK,
      priority: Priority.HIGH,
      actualDurationMinutes: 60,
      scheduledStartTime: new Date('2026-11-01T09:00:00Z'),
      completedAt: new Date('2026-11-01T10:00:00Z'),
    },
    {
      id: 'task-2',
      userId: mockUserA,
      title: 'Backend API Optimization',
      status: TaskStatus.COMPLETED,
      category: TaskCategory.WORK,
      priority: Priority.HIGH,
      actualDurationMinutes: 120,
      scheduledStartTime: new Date('2026-11-01T10:30:00Z'),
      completedAt: new Date('2026-11-01T12:30:00Z'),
    },
    {
      id: 'task-3',
      userId: mockUserA,
      title: 'Submit Code Review',
      status: TaskStatus.COMPLETED,
      category: TaskCategory.WORK,
      priority: Priority.MEDIUM,
      actualDurationMinutes: 90,
      scheduledStartTime: new Date('2026-11-01T14:00:00Z'),
      completedAt: new Date('2026-11-01T15:30:00Z'),
    },
    {
      id: 'task-4',
      userId: mockUserA,
      title: 'Evening Team Sync',
      status: TaskStatus.TODO,
      category: TaskCategory.WORK,
      priority: Priority.MEDIUM,
      estimatedDurationMinutes: 30,
      scheduledStartTime: new Date('2026-11-01T17:00:00Z'),
    },
  ];

  const mockOccurrencesUserA = [
    {
      id: 'occ-1',
      userId: mockUserA,
      routineId: 'routine-1',
      date: targetDate,
      status: TaskStatus.COMPLETED,
      routine: { title: 'Morning Workout' },
    },
    {
      id: 'occ-2',
      userId: mockUserA,
      routineId: 'routine-2',
      date: targetDate,
      status: TaskStatus.COMPLETED,
      routine: { title: 'Hydration' },
    },
    {
      id: 'occ-3',
      userId: mockUserA,
      routineId: 'routine-3',
      date: targetDate,
      status: TaskStatus.COMPLETED,
      routine: { title: 'Healthy Breakfast' },
    },
    {
      id: 'occ-4',
      userId: mockUserA,
      routineId: 'routine-4',
      date: targetDate,
      status: TaskStatus.COMPLETED,
      routine: { title: 'Meditation' },
    },
    {
      id: 'occ-5',
      userId: mockUserA,
      routineId: 'routine-5',
      date: targetDate,
      status: TaskStatus.TODO,
      routine: { title: 'Sleep Routine' },
    },
  ];

  beforeEach(async () => {
    prisma = {
      isConnected: true,
      task: {
        findMany: jest.fn().mockImplementation((args) => {
          if (args?.where?.userId === mockUserA) {
            if (args?.where?.deadline?.lt) {
              return Promise.resolve([mockTasksUserA[3]]); // 1 overdue
            }
            return Promise.resolve(mockTasksUserA);
          }
          return Promise.resolve([]);
        }),
      },
      routineOccurrence: {
        findMany: jest.fn().mockImplementation((args) => {
          if (args?.where?.userId === mockUserA) {
            return Promise.resolve(mockOccurrencesUserA);
          }
          return Promise.resolve([]);
        }),
      },
      reminder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      project: {
        findMany: jest.fn().mockImplementation((args) => {
          if (args?.where?.userId === mockUserA) {
            return Promise.resolve([
              { id: 'p1', title: 'Website Redesign', tasks: [{ status: TaskStatus.COMPLETED }, { status: TaskStatus.TODO }] },
              { id: 'p2', title: 'Mobile App', tasks: [{ status: TaskStatus.COMPLETED }] },
              { id: 'p3', title: 'Personal Growth', tasks: [] },
            ]);
          }
          return Promise.resolve([]);
        }),
      },
      wellnessLog: {
        findMany: jest.fn().mockResolvedValue([
          { date: targetDate, exerciseMinutes: 45, waterGlasses: 7, sleepHours: 7.5, energyScore: 8, moodScore: 8 },
        ]),
      },
      taskEvent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      wellnessDailySummary: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('KPI Intelligence Calculations', () => {
    it('should accurately calculate task completion percentage and counts', async () => {
      const data = await service.getCommandCenterData(mockUserA, targetDate, 7);

      expect(data).toBeDefined();
      expect(data.kpi).toBeDefined();
      expect(data.kpi.taskCompletion.total).toBe(4);
      expect(data.kpi.taskCompletion.completed).toBe(3);
      expect(data.kpi.taskCompletion.percentage).toBe(75);
      expect(data.kpi.taskCompletion.trend).toContain('% vs last week');
    });

    it('should accurately calculate routine adherence percentage', async () => {
      const data = await service.getCommandCenterData(mockUserA, targetDate, 7);

      expect(data.kpi.routineAdherence.total).toBe(5);
      expect(data.kpi.routineAdherence.completed).toBe(4);
      expect(data.kpi.routineAdherence.percentage).toBe(80);
      expect(data.kpi.routineAdherence.trend).toContain('+8%');
    });

    it('should aggregate upcoming activities and next activity prompt', async () => {
      const data = await service.getCommandCenterData(mockUserA, targetDate, 7);

      expect(data.kpi.upcomingActivities.count).toBeGreaterThanOrEqual(1);
      expect(data.kpi.upcomingActivities.nextActivity).toBeDefined();
    });

    it('should calculate active projects count and details', async () => {
      const data = await service.getCommandCenterData(mockUserA, targetDate, 7);

      expect(data.kpi.activeProjects.count).toBe(3);
      expect(data.kpi.activeProjects.detail).toContain('in progress');
    });

    it('should calculate focus hours from completed WORK tasks (60+120+90 = 270 min = 4.5h)', async () => {
      const data = await service.getCommandCenterData(mockUserA, targetDate, 7);

      expect(data.kpi.focusTime.hoursText).toBe('4.5h');
      expect(data.kpi.focusTime.trend).toContain('+28%');
    });
  });

  describe('Productivity Overview & Category Distribution', () => {
    it('should generate multi-day chart data with both completed and scheduled bars', async () => {
      const data = await service.getCommandCenterData(mockUserA, targetDate, 7);

      expect(Array.isArray(data.overviewChart)).toBe(true);
      expect(data.overviewChart.length).toBe(7);

      const todayEntry = data.overviewChart[data.overviewChart.length - 1];
      expect(todayEntry).toHaveProperty('tasksScheduled');
      expect(todayEntry).toHaveProperty('tasksCompleted');
      expect(todayEntry).toHaveProperty('completionRate');
    });

    it('should group tasks into Work, Personal, Projects, and Other categories', async () => {
      const data = await service.getCommandCenterData(mockUserA, targetDate, 7);

      expect(data.taskDistribution).toBeDefined();
      expect(Array.isArray(data.taskDistribution.segments)).toBe(true);
      expect(data.taskDistribution.segments.length).toBe(4);

      const names = data.taskDistribution.segments.map((s: any) => s.name);
      expect(names).toEqual(['Work', 'Personal', 'Projects', 'Other']);

      const totalPct = data.taskDistribution.segments.reduce((acc: number, s: any) => acc + s.percent, 0);
      expect(totalPct).toBeGreaterThanOrEqual(99);
      expect(totalPct).toBeLessThanOrEqual(101);
    });
  });

  describe('Multi-User Workspace Data Isolation', () => {
    it('should return 0/0 and empty counts for a user with no data without cross-tenant leakage', async () => {
      const dataUserB = await service.getCommandCenterData(mockUserB, targetDate, 7);

      expect(dataUserB).toBeDefined();
      expect(dataUserB.kpi.taskCompletion.total).toBe(0);
      expect(dataUserB.kpi.taskCompletion.completed).toBe(0);
      expect(dataUserB.kpi.taskCompletion.percentage).toBe(0);
      expect(dataUserB.kpi.routineAdherence.total).toBe(0);
      expect(dataUserB.kpi.routineAdherence.completed).toBe(0);
      expect(dataUserB.kpi.routineAdherence.percentage).toBe(0);
      expect(dataUserB.kpi.activeProjects.count).toBe(0);
      expect(dataUserB.kpi.focusTime.hoursText).toBe('0.0h');
    });
  });

  describe('High-Performance Redis Caching', () => {
    it('should cache aggregated payload in Redis with TTL and return cached on subsequent requests', async () => {
      const cachedPayload = {
        kpi: { taskCompletion: { total: 10, completed: 10, percentage: 100 } },
        overviewChart: [],
      };
      redis.get.mockResolvedValueOnce(JSON.stringify(cachedPayload));

      const result = await service.getCommandCenterData(mockUserA, targetDate, 7);

      expect(redis.get).toHaveBeenCalledWith(`dashboard:${mockUserA}:command-center:${targetDate}:7`);
      expect(result.kpi.taskCompletion.percentage).toBe(100);
      expect(prisma.task.findMany).not.toHaveBeenCalled();
    });
  });
});
