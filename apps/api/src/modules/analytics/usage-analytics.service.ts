import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import {
  UsageOverviewDto,
  UsageTrendPoint,
  ModuleUsagePoint,
  FeatureAdoptionPoint,
  AutomationUsageSummary,
  ReminderOutcomeSummary,
} from '@assistant/shared';

export const TRACKED_FEATURES_CATALOG: Array<{ feature: string; displayName: string; module: string }> = [
  { feature: 'TASK_CREATE', displayName: 'Task Creation', module: 'TASKS' },
  { feature: 'TASK_UPDATE', displayName: 'Task Editing', module: 'TASKS' },
  { feature: 'TASK_COMPLETE', displayName: 'Task Completion', module: 'TASKS' },
  { feature: 'TASK_RESCHEDULE', displayName: 'Task Rescheduling', module: 'TASKS' },
  { feature: 'SUBTASK_CREATE', displayName: 'Subtask Hierarchy', module: 'TASKS' },
  { feature: 'ROUTINE_CREATE', displayName: 'Habit Definition', module: 'ROUTINES' },
  { feature: 'ROUTINE_COMPLETE', displayName: 'Habit Step / Occurrence Log', module: 'ROUTINES' },
  { feature: 'PROJECT_CREATE', displayName: 'Project Workspace Creation', module: 'PROJECTS' },
  { feature: 'CALENDAR_NAVIGATE', displayName: 'Calendar Day / Week Navigation', module: 'CALENDAR' },
  { feature: 'EMERGENCY_REPLAN', displayName: 'Emergency Schedule Replanning', module: 'PLANNING' },
  { feature: 'WELLNESS_LOG', displayName: 'Wellness & Hydration Logging', module: 'WELLNESS' },
  { feature: 'AUTOMATION_CREATE', displayName: 'Automation Rule Creation', module: 'AUTOMATION' },
  { feature: 'DATA_EXPORT', displayName: 'Data Export / Audit Log', module: 'SETTINGS' },
];

@Injectable()
export class UsageAnalyticsService {
  private readonly logger = new Logger(UsageAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a meaningful application usage event with deduplication
   */
  async recordEvent(
    userId: string,
    data: {
      eventName: string;
      module: string;
      feature: string;
      action?: string;
      status?: string;
      sessionId?: string;
      metadata?: any;
      idempotencyKey?: string;
      occurredAt?: Date;
    },
  ) {
    if (!this.prisma.isConnected) {
      return null;
    }

    try {
      // Check idempotency if key provided
      if (data.idempotencyKey) {
        const existing = await this.prisma.usageEvent.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
        });
        if (existing) {
          return existing;
        }
      }

      return await this.prisma.usageEvent.create({
        data: {
          userId,
          sessionId: data.sessionId || null,
          eventName: data.eventName,
          module: data.module.toUpperCase(),
          feature: data.feature.toUpperCase(),
          action: data.action ? data.action.toUpperCase() : null,
          status: data.status ? data.status.toUpperCase() : 'SUCCESS',
          occurredAt: data.occurredAt || new Date(),
          idempotencyKey: data.idempotencyKey || null,
          metadata: data.metadata || null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to record usage event: ${err.message}`);
      return null;
    }
  }

  /**
   * High-level Executive KPI Overview
   */
  async getOverview(userId: string, days = 30): Promise<UsageOverviewDto> {
    const sinceDate = subDays(new Date(), days);
    const prevSinceDate = subDays(sinceDate, days);

    if (!this.prisma.isConnected) {
      return {
        totalInteractions: 0,
        activeDays: 0,
        mostUsedModule: 'N/A',
        mostUsedFeature: 'N/A',
        featuresAdoptedCount: 0,
        totalTrackedFeaturesCount: TRACKED_FEATURES_CATALOG.length,
        featuresAdoptedPercent: 0,
        automationExecutionsCount: 0,
        automationSuccessRatePercent: 100,
        reminderSuccessRatePercent: 100,
        failedActionsCount: 0,
        periodComparisonPercent: 0,
      };
    }

    // 1. Current period events
    const currentEvents = await this.prisma.usageEvent.findMany({
      where: {
        userId,
        occurredAt: { gte: sinceDate },
      },
      select: {
        module: true,
        feature: true,
        status: true,
        occurredAt: true,
      },
    });

    // 2. Previous period events for trend delta comparison
    const prevEventsCount = await this.prisma.usageEvent.count({
      where: {
        userId,
        occurredAt: { gte: prevSinceDate, lt: sinceDate },
      },
    });

    const totalInteractions = currentEvents.length;
    const failedActionsCount = currentEvents.filter((e) => e.status !== 'SUCCESS').length;

    // Active days count (distinct YYYY-MM-DD dates)
    const activeDatesSet = new Set(
      currentEvents.map((e) => format(new Date(e.occurredAt), 'yyyy-MM-dd')),
    );
    const activeDays = activeDatesSet.size;

    // Module frequencies
    const moduleCounts: Record<string, number> = {};
    const featureCounts: Record<string, number> = {};
    for (const e of currentEvents) {
      moduleCounts[e.module] = (moduleCounts[e.module] || 0) + 1;
      featureCounts[e.feature] = (featureCounts[e.feature] || 0) + 1;
    }

    let mostUsedModule = 'N/A';
    let maxModuleCount = 0;
    for (const [mod, cnt] of Object.entries(moduleCounts)) {
      if (cnt > maxModuleCount) {
        maxModuleCount = cnt;
        mostUsedModule = mod;
      }
    }

    let mostUsedFeature = 'N/A';
    let maxFeatureCount = 0;
    for (const [feat, cnt] of Object.entries(featureCounts)) {
      if (cnt > maxFeatureCount) {
        maxFeatureCount = cnt;
        const found = TRACKED_FEATURES_CATALOG.find((t) => t.feature === feat);
        mostUsedFeature = found ? found.displayName : feat;
      }
    }

    // Feature adoption count (how many distinct catalog features were used at least once)
    const usedFeaturesSet = new Set(currentEvents.map((e) => e.feature));
    let featuresAdoptedCount = 0;
    for (const cat of TRACKED_FEATURES_CATALOG) {
      if (usedFeaturesSet.has(cat.feature)) {
        featuresAdoptedCount++;
      }
    }
    const totalTrackedFeaturesCount = TRACKED_FEATURES_CATALOG.length;
    const featuresAdoptedPercent =
      totalTrackedFeaturesCount > 0
        ? Math.round((featuresAdoptedCount / totalTrackedFeaturesCount) * 100)
        : 0;

    // Period comparison percentage delta
    const periodComparisonPercent =
      prevEventsCount > 0
        ? Math.round(((totalInteractions - prevEventsCount) / prevEventsCount) * 100)
        : totalInteractions > 0
        ? 100
        : 0;

    // Automation executions & success rate
    const autoExecutions = await this.prisma.automationRuleExecution.findMany({
      where: {
        userId,
        executedAt: { gte: sinceDate },
      },
      select: { status: true },
    });
    const automationExecutionsCount = autoExecutions.length;
    const autoSuccessCount = autoExecutions.filter((a) => a.status === 'SUCCESS').length;
    const automationSuccessRatePercent =
      automationExecutionsCount > 0
        ? Math.round((autoSuccessCount / automationExecutionsCount) * 100)
        : 100;

    // Reminder delivery attempts & outcome rate
    const reminderAttempts = await this.prisma.reminderAttempt.findMany({
      where: {
        reminder: { userId },
        attemptedAt: { gte: sinceDate },
      },
      select: { status: true },
    });
    const totalAttempts = reminderAttempts.length;
    const successfulAttempts = reminderAttempts.filter((r) => r.status === 'SUCCESS').length;
    const reminderSuccessRatePercent =
      totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 100;

    return {
      totalInteractions,
      activeDays,
      mostUsedModule,
      mostUsedFeature,
      featuresAdoptedCount,
      totalTrackedFeaturesCount,
      featuresAdoptedPercent,
      automationExecutionsCount,
      automationSuccessRatePercent,
      reminderSuccessRatePercent,
      failedActionsCount,
      periodComparisonPercent,
    };
  }

  /**
   * Daily interaction trend lines (Total, Successful, Failed)
   */
  async getTrends(userId: string, days = 14): Promise<UsageTrendPoint[]> {
    const points: UsageTrendPoint[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(now, i);
      const dayStart = startOfDay(d);
      const dayEnd = endOfDay(d);
      const dateKey = format(d, 'yyyy-MM-dd');

      if (!this.prisma.isConnected) {
        points.push({ date: dateKey, interactions: 0, successful: 0, failed: 0 });
        continue;
      }

      const dayEvents = await this.prisma.usageEvent.findMany({
        where: {
          userId,
          occurredAt: { gte: dayStart, lte: dayEnd },
        },
        select: { status: true },
      });

      const interactions = dayEvents.length;
      const successful = dayEvents.filter((e) => e.status === 'SUCCESS').length;
      const failed = interactions - successful;

      points.push({
        date: dateKey,
        interactions,
        successful,
        failed,
      });
    }

    return points;
  }

  /**
   * Usage breakdown by module
   */
  async getModules(userId: string, days = 30): Promise<ModuleUsagePoint[]> {
    if (!this.prisma.isConnected) {
      return [];
    }

    const sinceDate = subDays(new Date(), days);
    const events = await this.prisma.usageEvent.findMany({
      where: {
        userId,
        occurredAt: { gte: sinceDate },
      },
      select: { module: true },
    });

    const total = events.length;
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.module] = (counts[e.module] || 0) + 1;
    }

    const moduleColors: Record<string, string> = {
      TASKS: '#8B45F5',
      ROUTINES: '#6935C8',
      PROJECTS: '#16A36A',
      CALENDAR: '#3B82F6',
      PLANNING: '#E5A12A',
      WELLNESS: '#EC4899',
      ANALYTICS: '#10B981',
      AUTOMATION: '#6366F1',
      SETTINGS: '#74738A',
      DASHBOARD: '#A855F7',
    };

    const moduleNames: Record<string, string> = {
      TASKS: 'Work & Tasks',
      ROUTINES: 'Habits & Routines',
      PROJECTS: 'Projects Workspace',
      CALENDAR: 'Calendar Views',
      PLANNING: 'Day Planning',
      WELLNESS: 'Health & Wellness',
      ANALYTICS: 'Analytics',
      AUTOMATION: 'Automation Rules',
      SETTINGS: 'System Settings',
      DASHBOARD: 'Command Center',
    };

    const result: ModuleUsagePoint[] = Object.entries(counts).map(([mod, cnt]) => ({
      module: mod,
      displayName: moduleNames[mod] || mod,
      interactions: cnt,
      percent: total > 0 ? Math.round((cnt / total) * 100) : 0,
      color: moduleColors[mod] || '#8B45F5',
    }));

    // Sort descending by interactions
    return result.sort((a, b) => b.interactions - a.interactions);
  }

  /**
   * Feature adoption tracking & rank
   */
  async getFeatures(userId: string, days = 30): Promise<FeatureAdoptionPoint[]> {
    if (!this.prisma.isConnected) {
      return TRACKED_FEATURES_CATALOG.map((f) => ({
        feature: f.feature,
        displayName: f.displayName,
        module: f.module,
        interactions: 0,
        activeDays: 0,
        isAdopted: false,
        lastUsedAt: null,
      }));
    }

    const sinceDate = subDays(new Date(), days);
    const events = await this.prisma.usageEvent.findMany({
      where: {
        userId,
        occurredAt: { gte: sinceDate },
      },
      select: {
        feature: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: 'desc' },
    });

    const featureStats: Record<
      string,
      { count: number; activeDates: Set<string>; lastUsedAt: string | null }
    > = {};

    for (const e of events) {
      if (!featureStats[e.feature]) {
        featureStats[e.feature] = {
          count: 0,
          activeDates: new Set(),
          lastUsedAt: e.occurredAt.toISOString(),
        };
      }
      featureStats[e.feature].count++;
      featureStats[e.feature].activeDates.add(format(new Date(e.occurredAt), 'yyyy-MM-dd'));
    }

    return TRACKED_FEATURES_CATALOG.map((f) => {
      const stats = featureStats[f.feature];
      const interactions = stats ? stats.count : 0;
      const activeDays = stats ? stats.activeDates.size : 0;
      return {
        feature: f.feature,
        displayName: f.displayName,
        module: f.module,
        interactions,
        activeDays,
        isAdopted: interactions > 0,
        lastUsedAt: stats ? stats.lastUsedAt : null,
      };
    }).sort((a, b) => b.interactions - a.interactions);
  }

  /**
   * Automation execution analytics
   */
  async getAutomationAnalytics(userId: string, days = 30): Promise<AutomationUsageSummary> {
    if (!this.prisma.isConnected) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        cooldownSkips: 0,
        successRatePercent: 100,
        ruleBreakdown: [],
      };
    }

    const sinceDate = subDays(new Date(), days);
    const executions = await this.prisma.automationRuleExecution.findMany({
      where: {
        userId,
        executedAt: { gte: sinceDate },
      },
      include: {
        rule: { select: { name: true } },
      },
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter((e) => e.status === 'SUCCESS').length;
    const failedExecutions = executions.filter((e) => e.status === 'FAILED').length;
    const cooldownSkips = executions.filter((e) => e.status === 'SKIPPED_COOLDOWN').length;
    const successRatePercent =
      totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 100;

    const ruleMap: Record<string, { ruleId: string; name: string; count: number; successCount: number }> =
      {};
    for (const e of executions) {
      if (!ruleMap[e.ruleId]) {
        ruleMap[e.ruleId] = {
          ruleId: e.ruleId,
          name: e.rule?.name || 'Rule',
          count: 0,
          successCount: 0,
        };
      }
      ruleMap[e.ruleId].count++;
      if (e.status === 'SUCCESS') {
        ruleMap[e.ruleId].successCount++;
      }
    }

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      cooldownSkips,
      successRatePercent,
      ruleBreakdown: Object.values(ruleMap).sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Reminder delivery outcomes analytics
   */
  async getReminderAnalytics(userId: string, days = 30): Promise<ReminderOutcomeSummary> {
    if (!this.prisma.isConnected) {
      return {
        scheduled: 0,
        attempted: 0,
        confirmed: 0,
        failed: 0,
        retryCount: 0,
        deliveryRatePercent: 100,
      };
    }

    const sinceDate = subDays(new Date(), days);
    const reminders = await this.prisma.reminder.findMany({
      where: {
        userId,
        createdAt: { gte: sinceDate },
      },
      include: {
        attempts: true,
      },
    });

    const scheduled = reminders.length;
    let attempted = 0;
    let confirmed = 0;
    let failed = 0;
    let retryCount = 0;

    for (const rem of reminders) {
      attempted += rem.attempts.length;
      for (const att of rem.attempts) {
        if (att.status === 'SUCCESS') confirmed++;
        else if (att.status === 'FAILED') failed++;
        else if (att.status === 'RETRY') retryCount++;
      }
    }

    const deliveryRatePercent =
      attempted > 0 ? Math.round((confirmed / attempted) * 100) : 100;

    return {
      scheduled,
      attempted,
      confirmed,
      failed,
      retryCount,
      deliveryRatePercent,
    };
  }

  /**
   * Filterable raw interaction history with safe metadata
   */
  async getEvents(
    userId: string,
    filter: {
      page?: number;
      limit?: number;
      module?: string;
      feature?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    if (!this.prisma.isConnected) {
      return { items: [], total: 0, page: 1, totalPages: 1 };
    }

    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (filter.module && filter.module !== 'ALL') {
      where.module = filter.module.toUpperCase();
    }
    if (filter.feature && filter.feature !== 'ALL') {
      where.feature = filter.feature.toUpperCase();
    }
    if (filter.status && filter.status !== 'ALL') {
      where.status = filter.status.toUpperCase();
    }
    if (filter.startDate || filter.endDate) {
      where.occurredAt = {};
      if (filter.startDate) where.occurredAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.occurredAt.lte = new Date(filter.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.usageEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.usageEvent.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

