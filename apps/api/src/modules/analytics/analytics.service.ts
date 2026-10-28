import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { TaskCategory, TaskStatus } from '@assistant/shared';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getDailyKpi(userId: string, date: string) {
    const cacheKey = `dashboard:${userId}:kpi:${date}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    if (!this.prisma.isConnected) {
      return {
        date,
        totalTasks: 0,
        completedTasks: 0,
        completionRatePercent: 0,
        routinesTotal: 0,
        routinesCompleted: 0,
        routineAdherencePercent: 0,
        workTasksTotal: 0,
        workTasksCompleted: 0,
        overdueTasksCount: 0,
      };
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    const now = new Date();

    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        scheduledStartTime: { gte: startOfDay, lte: endOfDay },
      },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const completionRatePercent =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const workTasks = tasks.filter((t) => t.category === TaskCategory.WORK);
    const workTasksTotal = workTasks.length;
    const workTasksCompleted = workTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;

    const overdueTasksCount = tasks.filter(
      (t) =>
        t.deadline &&
        new Date(t.deadline) < now &&
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.SKIPPED &&
        t.status !== TaskStatus.CANCELLED,
    ).length;

    const routineOccurrences = await this.prisma.routineOccurrence.findMany({
      where: { userId, date },
    });
    const routinesTotal = routineOccurrences.length;
    const routinesCompleted = routineOccurrences.filter(
      (o) => o.status === TaskStatus.COMPLETED,
    ).length;
    const routineAdherencePercent =
      routinesTotal > 0 ? Math.round((routinesCompleted / routinesTotal) * 100) : 0;

    const summary = {
      date,
      totalTasks,
      completedTasks,
      completionRatePercent,
      routinesTotal,
      routinesCompleted,
      routineAdherencePercent,
      workTasksTotal,
      workTasksCompleted,
      overdueTasksCount,
    };

    // Upsert into DailySummary
    await this.prisma.dailySummary.upsert({
      where: { userId_date: { userId, date } },
      update: summary,
      create: { userId, ...summary },
    });

    // Cache with 60s TTL
    await this.redis.set(cacheKey, JSON.stringify(summary), 60);

    return summary;
  }

  async getTrends(userId: string, days = 7) {
    const dates: string[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    if (!this.prisma.isConnected) {
      return {
        completionTrends: dates.map((date) => ({ date, total: 0, completed: 0, rate: 0 })),
        routineAdherenceTrends: dates.map((date) => ({ date, adherence: 0 })),
        categoryDistribution: [
          { name: 'Work', value: 0, color: '#142B4A' },
          { name: 'Routine', value: 0, color: '#38BDF8' },
          { name: 'Planning', value: 0, color: '#16A34A' },
          { name: 'Emergency', value: 0, color: '#DC2626' },
        ],
        workStatusBreakdown: [
          { status: 'Completed', count: 0, fill: '#16A34A' },
          { status: 'In Progress', count: 0, fill: '#38BDF8' },
          { status: 'Pending', count: 0, fill: '#64748B' },
          { status: 'Overdue', count: 0, fill: '#DC2626' },
        ],
        wellnessTrends: dates.map((date) => ({
          date,
          hydration: 0,
          exercise: 0,
          sleep: 0,
        })),
      };
    }

    // 1. Completion & Routine trends
    const completionTrends = [];
    const routineAdherenceTrends = [];
    const wellnessTrends = [];

    for (const date of dates) {
      const kpi = await this.getDailyKpi(userId, date);
      completionTrends.push({
        date,
        total: kpi.totalTasks,
        completed: kpi.completedTasks,
        rate: kpi.completionRatePercent,
      });
      routineAdherenceTrends.push({
        date,
        adherence: kpi.routineAdherencePercent,
      });

      const wellnessSum = await this.prisma.wellnessDailySummary.findUnique({
        where: { userId_date: { userId, date } },
      });

      wellnessTrends.push({
        date,
        hydration: wellnessSum?.hydrationTotalMl || 0,
        exercise: wellnessSum?.exerciseDurationMinutes || 0,
        sleep: wellnessSum?.sleepHours || 0,
      });
    }

    // 2. Category distribution
    const allTasks = await this.prisma.task.findMany({
      where: { userId },
      select: { category: true, status: true, deadline: true },
    });

    const categoryCounts: Record<string, number> = {
      [TaskCategory.WORK]: 0,
      [TaskCategory.ROUTINE]: 0,
      [TaskCategory.PLANNING]: 0,
      [TaskCategory.EMERGENCY]: 0,
    };

    let workCompleted = 0;
    let workInProgress = 0;
    let workPending = 0;
    let workOverdue = 0;
    const now = new Date();

    for (const t of allTasks) {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;

      if (t.category === TaskCategory.WORK) {
        if (t.status === TaskStatus.COMPLETED) {
          workCompleted++;
        } else if (t.status === TaskStatus.IN_PROGRESS) {
          workInProgress++;
        } else {
          if (t.deadline && new Date(t.deadline) < now) {
            workOverdue++;
          } else {
            workPending++;
          }
        }
      }
    }

    const categoryDistribution = [
      { name: 'Work', value: categoryCounts[TaskCategory.WORK], color: '#142B4A' },
      { name: 'Routine', value: categoryCounts[TaskCategory.ROUTINE], color: '#38BDF8' },
      { name: 'Planning', value: categoryCounts[TaskCategory.PLANNING], color: '#16A34A' },
      { name: 'Emergency', value: categoryCounts[TaskCategory.EMERGENCY], color: '#DC2626' },
    ];

    const workStatusBreakdown = [
      { status: 'Completed', count: workCompleted, fill: '#16A34A' },
      { status: 'In Progress', count: workInProgress, fill: '#38BDF8' },
      { status: 'Pending', count: workPending, fill: '#64748B' },
      { status: 'Overdue', count: workOverdue, fill: '#DC2626' },
    ];

    return {
      completionTrends,
      routineAdherenceTrends,
      categoryDistribution,
      workStatusBreakdown,
      wellnessTrends,
    };
  }
}
