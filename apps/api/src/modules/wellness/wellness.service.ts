import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { WellnessMetricType, TaskStatus } from '@assistant/shared';

@Injectable()
export class WellnessService {
  private readonly logger = new Logger(WellnessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async logMetric(
    userId: string,
    data: {
      type: WellnessMetricType;
      value: number;
      unit: string;
      notes?: string;
      recordedAt?: string;
    },
  ) {
    if (!this.prisma.isConnected) {
      return { id: 'mock-metric-id', userId, ...data };
    }

    const recordedAt = data.recordedAt ? new Date(data.recordedAt) : new Date();
    const metric = await this.prisma.wellnessMetric.create({
      data: {
        userId,
        type: data.type,
        value: data.value,
        unit: data.unit,
        notes: data.notes,
        recordedAt,
      },
    });

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);
    return metric;
  }

  async recordCheckIn(
    userId: string,
    data: {
      energyScore?: number;
      moodScore?: number;
      fatigueScore?: number;
      stressScore?: number;
      notes?: string;
      checkInDate?: string;
    },
  ) {
    const checkInDate = data.checkInDate || new Date().toISOString().split('T')[0];

    if (!this.prisma.isConnected) {
      return { id: 'mock-checkin-id', userId, ...data, checkInDate };
    }

    const checkIn = await this.prisma.wellnessCheckIn.upsert({
      where: {
        userId_checkInDate: { userId, checkInDate },
      },
      update: {
        energyScore: data.energyScore,
        moodScore: data.moodScore,
        fatigueScore: data.fatigueScore,
        stressScore: data.stressScore,
        notes: data.notes,
      },
      create: {
        userId,
        checkInDate,
        energyScore: data.energyScore,
        moodScore: data.moodScore,
        fatigueScore: data.fatigueScore,
        stressScore: data.stressScore,
        notes: data.notes,
      },
    });

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);
    return checkIn;
  }

  async getDailySummary(userId: string, date: string) {
    if (!this.prisma.isConnected) {
      return {
        date,
        hydrationTotalMl: 0,
        exerciseDurationMinutes: 0,
        sleepHours: 0,
        mealsLogged: 0,
        breaksLogged: 0,
        routineAdherencePercent: 0,
        adherenceTrendLabel: 'Insufficient data',
        checkIn: null,
      };
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Sum metrics for this day
    const metrics = await this.prisma.wellnessMetric.findMany({
      where: {
        userId,
        recordedAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    let hydrationTotalMl = 0;
    let exerciseDurationMinutes = 0;
    let sleepHours = 0;
    let mealsLogged = 0;
    let breaksLogged = 0;

    for (const m of metrics) {
      if (m.type === WellnessMetricType.HYDRATION) hydrationTotalMl += m.value;
      if (m.type === WellnessMetricType.EXERCISE) exerciseDurationMinutes += m.value;
      if (m.type === WellnessMetricType.SLEEP) sleepHours += m.value;
      if (m.type === WellnessMetricType.MEAL) mealsLogged++;
      if (m.type === WellnessMetricType.BREAK) breaksLogged++;
    }

    // Routine adherence for this date
    const occurrences = await this.prisma.routineOccurrence.findMany({
      where: { userId, date },
    });
    const totalRoutines = occurrences.length;
    const completedRoutines = occurrences.filter((o) => o.status === TaskStatus.COMPLETED).length;
    const routineAdherencePercent =
      totalRoutines > 0 ? Math.round((completedRoutines / totalRoutines) * 100) : 0;

    // Baseline comparison: average adherence of the past 14 days
    const past14DaysOccurrences = await this.prisma.routineOccurrence.findMany({
      where: {
        userId,
        date: { lt: date },
      },
      take: 70,
    });

    let adherenceTrendLabel: 'Consistent' | 'Improving' | 'Needs attention' | 'Insufficient data' =
      'Insufficient data';

    if (past14DaysOccurrences.length >= 7) {
      const pastCompleted = past14DaysOccurrences.filter((o) => o.status === TaskStatus.COMPLETED).length;
      const baselineAdherence = Math.round((pastCompleted / past14DaysOccurrences.length) * 100);

      if (routineAdherencePercent >= baselineAdherence + 10) {
        adherenceTrendLabel = 'Improving';
      } else if (routineAdherencePercent < baselineAdherence - 15) {
        adherenceTrendLabel = 'Needs attention';
      } else {
        adherenceTrendLabel = 'Consistent';
      }
    } else if (totalRoutines > 0) {
      adherenceTrendLabel = routineAdherencePercent >= 70 ? 'Consistent' : 'Needs attention';
    }

    // Get check-in for the day
    const checkIn = await this.prisma.wellnessCheckIn.findUnique({
      where: { userId_checkInDate: { userId, checkInDate: date } },
    });

    // Upsert into persistent WellnessDailySummary
    await this.prisma.wellnessDailySummary.upsert({
      where: { userId_date: { userId, date } },
      update: {
        hydrationTotalMl,
        exerciseDurationMinutes,
        sleepHours,
        mealsLogged,
        breaksLogged,
        routineAdherencePercent,
        adherenceTrendLabel,
      },
      create: {
        userId,
        date,
        hydrationTotalMl,
        exerciseDurationMinutes,
        sleepHours,
        mealsLogged,
        breaksLogged,
        routineAdherencePercent,
        adherenceTrendLabel,
      },
    });

    return {
      date,
      hydrationTotalMl,
      exerciseDurationMinutes,
      sleepHours,
      mealsLogged,
      breaksLogged,
      routineAdherencePercent,
      adherenceTrendLabel,
      checkIn,
    };
  }

  async clearUserWellnessData(userId: string) {
    if (!this.prisma.isConnected) return { success: true };
    await this.prisma.wellnessMetric.deleteMany({ where: { userId } });
    await this.prisma.wellnessCheckIn.deleteMany({ where: { userId } });
    await this.prisma.wellnessDailySummary.deleteMany({ where: { userId } });
    await this.redis.invalidatePattern(`dashboard:${userId}:*`);
    return { success: true, message: 'All personal wellness records have been permanently cleared.' };
  }
}

