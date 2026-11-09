import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import {
  StartFocusSessionDto,
  UpdateFocusPreferencesDto,
} from './dto/focus.dto';
import { FocusSessionStatus } from '@prisma/client';

@Injectable()
export class FocusService {
  private readonly logger = new Logger(FocusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getPreferences(userId: string) {
    if (!this.prisma.isConnected) {
      return {
        userId,
        focusDurationMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        dailyTargetMinutes: 120,
        soundEnabled: true,
        autoStartBreaks: false,
        autoStartFocus: false,
      };
    }

    let pref = await this.prisma.focusPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await this.prisma.focusPreference.create({
        data: { userId },
      });
    }

    return pref;
  }

  async updatePreferences(userId: string, dto: UpdateFocusPreferencesDto) {
    if (!this.prisma.isConnected) return { userId, ...dto };

    return this.prisma.focusPreference.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }

  async getCurrentSession(userId: string) {
    if (!this.prisma.isConnected) return null;

    const session = await this.prisma.focusSession.findFirst({
      where: {
        userId,
        status: { in: [FocusSessionStatus.ACTIVE, FocusSessionStatus.PAUSED] },
      },
      include: {
        task: { select: { id: true, title: true, category: true, priority: true } },
        project: { select: { id: true, title: true, color: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) return null;

    const now = new Date();
    let currentElapsedSeconds = session.actualDuration;

    if (session.status === FocusSessionStatus.ACTIVE) {
      const totalElapsedMs = now.getTime() - session.startedAt.getTime();
      const pausedMs = session.pausedDuration * 1000;
      currentElapsedSeconds = Math.max(0, Math.floor((totalElapsedMs - pausedMs) / 1000));
    }

    const remainingSeconds = Math.max(0, session.plannedDuration - currentElapsedSeconds);

    return {
      session,
      currentElapsedSeconds,
      remainingSeconds,
      isOvertime: currentElapsedSeconds > session.plannedDuration,
    };
  }

  async startSession(userId: string, dto: StartFocusSessionDto) {
    if (!this.prisma.isConnected) {
      return { id: 'mock-focus-session', userId, ...dto, status: FocusSessionStatus.ACTIVE };
    }

    // Auto-abandon any lingering active/paused session
    await this.prisma.focusSession.updateMany({
      where: {
        userId,
        status: { in: [FocusSessionStatus.ACTIVE, FocusSessionStatus.PAUSED] },
      },
      data: {
        status: FocusSessionStatus.ABANDONED,
        endedAt: new Date(),
      },
    });

    const pref = await this.getPreferences(userId);
    const durationMinutes = dto.plannedDurationMinutes || pref.focusDurationMinutes || 25;
    const plannedDurationSeconds = durationMinutes * 60;

    const session = await this.prisma.focusSession.create({
      data: {
        userId,
        taskId: dto.taskId || null,
        projectId: dto.projectId || null,
        sessionType: dto.sessionType || 'FOCUS',
        plannedDuration: plannedDurationSeconds,
        actualDuration: 0,
        status: FocusSessionStatus.ACTIVE,
        startedAt: new Date(),
        notes: dto.notes || null,
      },
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, title: true } },
      },
    });

    return session;
  }

  async pauseSession(userId: string, sessionId: string) {
    if (!this.prisma.isConnected) return { id: sessionId, status: FocusSessionStatus.PAUSED };

    const session = await this.prisma.focusSession.findFirst({
      where: { id: sessionId, userId, status: FocusSessionStatus.ACTIVE },
    });

    if (!session) {
      throw new NotFoundException('Active focus session not found');
    }

    const now = new Date();
    const totalElapsedMs = now.getTime() - session.startedAt.getTime();
    const pausedMs = session.pausedDuration * 1000;
    const activeSeconds = Math.max(0, Math.floor((totalElapsedMs - pausedMs) / 1000));

    return this.prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        status: FocusSessionStatus.PAUSED,
        pausedAt: now,
        actualDuration: activeSeconds,
        interruptionCount: { increment: 1 },
      },
    });
  }

  async resumeSession(userId: string, sessionId: string) {
    if (!this.prisma.isConnected) return { id: sessionId, status: FocusSessionStatus.ACTIVE };

    const session = await this.prisma.focusSession.findFirst({
      where: { id: sessionId, userId, status: FocusSessionStatus.PAUSED },
    });

    if (!session) {
      throw new NotFoundException('Paused focus session not found');
    }

    const now = new Date();
    const pauseIntervalSeconds = session.pausedAt
      ? Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000)
      : 0;

    return this.prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        status: FocusSessionStatus.ACTIVE,
        pausedAt: null,
        pausedDuration: session.pausedDuration + pauseIntervalSeconds,
      },
    });
  }

  async completeSession(userId: string, sessionId: string, notes?: string) {
    if (!this.prisma.isConnected) return { id: sessionId, status: FocusSessionStatus.COMPLETED };

    const session = await this.prisma.focusSession.findFirst({
      where: {
        id: sessionId,
        userId,
        status: { in: [FocusSessionStatus.ACTIVE, FocusSessionStatus.PAUSED] },
      },
    });

    if (!session) {
      throw new NotFoundException('In-progress focus session not found');
    }

    const now = new Date();
    let finalActiveSeconds = session.actualDuration;

    if (session.status === FocusSessionStatus.ACTIVE) {
      const totalElapsedMs = now.getTime() - session.startedAt.getTime();
      const pausedMs = session.pausedDuration * 1000;
      finalActiveSeconds = Math.max(0, Math.floor((totalElapsedMs - pausedMs) / 1000));
    }

    const completed = await this.prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        status: FocusSessionStatus.COMPLETED,
        endedAt: now,
        actualDuration: finalActiveSeconds,
        notes: notes || session.notes,
      },
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, title: true } },
      },
    });

    // Invalidate analytics caches
    await this.redis.del(`focus:${userId}:analytics`);

    return completed;
  }

  async abandonSession(userId: string, sessionId: string) {
    if (!this.prisma.isConnected) return { id: sessionId, status: FocusSessionStatus.ABANDONED };

    const session = await this.prisma.focusSession.findFirst({
      where: {
        id: sessionId,
        userId,
        status: { in: [FocusSessionStatus.ACTIVE, FocusSessionStatus.PAUSED] },
      },
    });

    if (!session) {
      throw new NotFoundException('In-progress focus session not found');
    }

    return this.prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        status: FocusSessionStatus.ABANDONED,
        endedAt: new Date(),
      },
    });
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    if (!this.prisma.isConnected) return { sessions: [], total: 0 };

    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      this.prisma.focusSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: {
          task: { select: { id: true, title: true, category: true } },
          project: { select: { id: true, title: true, color: true } },
        },
      }),
      this.prisma.focusSession.count({ where: { userId } }),
    ]);

    return {
      sessions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAnalytics(userId: string) {
    if (!this.prisma.isConnected) {
      return {
        todayFocusMinutes: 0,
        dailyTargetMinutes: 120,
        dailyTargetProgressPercent: 0,
        weekFocusMinutes: 0,
        completedSessionsCount: 0,
        interruptionCount: 0,
        recentDaysTrend: [],
      };
    }

    const pref = await this.getPreferences(userId);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const [todaySessions, weekSessions] = await Promise.all([
      this.prisma.focusSession.findMany({
        where: {
          userId,
          status: FocusSessionStatus.COMPLETED,
          startedAt: { gte: startOfToday },
        },
      }),
      this.prisma.focusSession.findMany({
        where: {
          userId,
          status: FocusSessionStatus.COMPLETED,
          startedAt: { gte: startOfWeek },
        },
        include: {
          project: { select: { id: true, title: true, color: true } },
        },
      }),
    ]);

    const todaySeconds = todaySessions.reduce((acc, s) => acc + s.actualDuration, 0);
    const todayFocusMinutes = Math.round(todaySeconds / 60);

    const weekSeconds = weekSessions.reduce((acc, s) => acc + s.actualDuration, 0);
    const weekFocusMinutes = Math.round(weekSeconds / 60);

    const dailyTargetMinutes = pref.dailyTargetMinutes || 120;
    const dailyTargetProgressPercent = Math.min(
      100,
      Math.round((todayFocusMinutes / dailyTargetMinutes) * 100),
    );

    const totalInterruptions = weekSessions.reduce((acc, s) => acc + s.interruptionCount, 0);

    // Build 7-day daily trend
    const recentDaysTrend: { date: string; day: string; minutes: number }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];

      const daySeconds = weekSessions
        .filter((s) => s.startedAt.toISOString().split('T')[0] === dateStr)
        .reduce((acc, s) => acc + s.actualDuration, 0);

      recentDaysTrend.push({
        date: dateStr,
        day: dayName,
        minutes: Math.round(daySeconds / 60),
      });
    }

    return {
      todayFocusMinutes,
      dailyTargetMinutes,
      dailyTargetProgressPercent,
      weekFocusMinutes,
      completedSessionsCount: todaySessions.length,
      weeklyCompletedSessionsCount: weekSessions.length,
      interruptionCount: totalInterruptions,
      recentDaysTrend,
    };
  }
}

