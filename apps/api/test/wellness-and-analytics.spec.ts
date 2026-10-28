import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { WellnessService } from '../src/modules/wellness/wellness.service';
import { TaskCategory, TaskStatus, WellnessMetricType } from '@assistant/shared';

describe('Wellness and Analytics Services', () => {
  let analyticsService: AnalyticsService;
  let wellnessService: WellnessService;

  const mockPrisma = {
    isConnected: true,
    task: {
      findMany: jest.fn(),
    },
    routineOccurrence: {
      findMany: jest.fn(),
    },
    dailySummary: {
      upsert: jest.fn(),
    },
    wellnessDailySummary: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    wellnessMetric: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    wellnessCheckIn: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = new AnalyticsService(mockPrisma as any, mockRedis as any);
    wellnessService = new WellnessService(mockPrisma as any, mockRedis as any);
  });

  describe('Daily KPI Calculation', () => {
    it('computes accurate completion rates, routine adherence, and overdue counts', async () => {
      const today = '2026-10-29';
      mockPrisma.task.findMany.mockResolvedValue([
        {
          id: 't-1',
          category: TaskCategory.WORK,
          status: TaskStatus.COMPLETED,
          deadline: null,
        },
        {
          id: 't-2',
          category: TaskCategory.WORK,
          status: TaskStatus.TODO,
          deadline: new Date('2026-10-28T10:00:00Z'), // Past deadline -> Overdue
        },
        {
          id: 't-3',
          category: TaskCategory.PERSONAL_ROUTINE,
          status: TaskStatus.COMPLETED,
          deadline: null,
        },
        {
          id: 't-4',
          category: TaskCategory.DAY_PLAN,
          status: TaskStatus.TODO,
          deadline: null,
        },
      ]);

      mockPrisma.routineOccurrence.findMany.mockResolvedValue([
        { id: 'ro-1', status: TaskStatus.COMPLETED },
        { id: 'ro-2', status: TaskStatus.COMPLETED },
        { id: 'ro-3', status: TaskStatus.SKIPPED },
        { id: 'ro-4', status: TaskStatus.TODO },
      ]);

      mockPrisma.dailySummary.upsert.mockResolvedValue({});

      const kpi = await analyticsService.getDailyKpi('user-test-1', today);

      expect(kpi.totalTasks).toBe(4);
      expect(kpi.completedTasks).toBe(2);
      expect(kpi.completionRatePercent).toBe(50); // 2/4 = 50%
      expect(kpi.workTasksTotal).toBe(2);
      expect(kpi.workTasksCompleted).toBe(1);
      expect(kpi.overdueTasksCount).toBe(1); // t-2 is overdue
      expect(kpi.routinesTotal).toBe(4);
      expect(kpi.routinesCompleted).toBe(2);
      expect(kpi.routineAdherencePercent).toBe(50); // 2/4 = 50%

      // Verify cached with 60s TTL
      expect(mockRedis.set).toHaveBeenCalledWith(
        `dashboard:user-test-1:kpi:${today}`,
        expect.any(String),
        60,
      );
    });
  });

  describe('Trends Feeds for Recharts', () => {
    it('constructs multi-day trends across all 5 chart datasets', async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { category: TaskCategory.WORK, status: TaskStatus.COMPLETED },
        { category: TaskCategory.WORK, status: TaskStatus.IN_PROGRESS },
        { category: TaskCategory.PERSONAL_ROUTINE, status: TaskStatus.COMPLETED },
        { category: TaskCategory.DAY_PLAN, status: TaskStatus.TODO },
        { category: TaskCategory.EMERGENCY, status: TaskStatus.COMPLETED },
      ]);
      mockPrisma.routineOccurrence.findMany.mockResolvedValue([]);
      mockPrisma.dailySummary.upsert.mockResolvedValue({});
      mockPrisma.wellnessDailySummary.findUnique.mockResolvedValue({
        hydrationTotalMl: 2250,
        exerciseDurationMinutes: 45,
        sleepHours: 7.5,
      });

      const trends = await analyticsService.getTrends('user-test-1', 7);

      expect(trends.completionTrends).toHaveLength(7);
      expect(trends.routineAdherenceTrends).toHaveLength(7);
      expect(trends.wellnessTrends).toHaveLength(7);
      expect(trends.wellnessTrends[0].hydration).toBe(2250);
      expect(trends.wellnessTrends[0].exercise).toBe(45);
      expect(trends.wellnessTrends[0].sleep).toBe(7.5);

      expect(trends.categoryDistribution).toEqual([
        expect.objectContaining({ name: 'Work', value: 2 }),
        expect.objectContaining({ name: 'Routine', value: 1 }),
        expect.objectContaining({ name: 'Planning', value: 1 }),
        expect.objectContaining({ name: 'Emergency', value: 1 }),
      ]);

      expect(trends.workStatusBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'Completed', count: 1 }),
          expect.objectContaining({ status: 'In Progress', count: 1 }),
        ]),
      );
    });
  });

  describe('Wellness Logging and Check-Ins', () => {
    it('logs hydration metric and invalidates user cache', async () => {
      mockPrisma.wellnessMetric.create.mockResolvedValue({
        id: 'metric-1',
        userId: 'user-test-1',
        type: WellnessMetricType.HYDRATION,
        value: 500,
        unit: 'ml',
      });

      const result = await wellnessService.logMetric('user-test-1', {
        type: WellnessMetricType.HYDRATION,
        value: 500,
        unit: 'ml',
      });

      expect(result.value).toBe(500);
      expect(mockPrisma.wellnessMetric.create).toHaveBeenCalled();
      expect(mockRedis.invalidatePattern).toHaveBeenCalledWith('dashboard:user-test-1:*');
    });

    it('upserts daily wellness check-in with mood and energy ratings', async () => {
      mockPrisma.wellnessCheckIn.upsert.mockResolvedValue({
        id: 'checkin-1',
        userId: 'user-test-1',
        checkInDate: '2026-10-29',
        energyScore: 5,
        moodScore: 4,
        stressScore: 2,
      });

      const result = await wellnessService.recordCheckIn('user-test-1', {
        energyScore: 5,
        moodScore: 4,
        stressScore: 2,
        checkInDate: '2026-10-29',
      });

      expect(result.energyScore).toBe(5);
      expect(result.moodScore).toBe(4);
      expect(mockPrisma.wellnessCheckIn.upsert).toHaveBeenCalledWith({
        where: { userId_checkInDate: { userId: 'user-test-1', checkInDate: '2026-10-29' } },
        update: expect.objectContaining({ energyScore: 5, moodScore: 4 }),
        create: expect.objectContaining({ energyScore: 5, moodScore: 4 }),
      });
      expect(mockRedis.invalidatePattern).toHaveBeenCalledWith('dashboard:user-test-1:*');
    });
  });
});
