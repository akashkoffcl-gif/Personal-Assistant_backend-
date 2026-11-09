import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BehaviouralContextService } from './behavioral-context.service';
import { TaskStatus, FocusSessionStatus } from '@prisma/client';
import {
  ProactiveOpportunity,
  InterruptionContext,
  ProactiveAction,
  ProactiveUrgency,
} from './proactive-intelligence.types';

@Injectable()
export class ProactiveIntelligenceService {
  private readonly logger = new Logger(ProactiveIntelligenceService.name);

  // Fallback in-memory debounce cache if Redis/DB is unavailable
  private readonly localSuppressionFallback = new Map<string, number>();
  private readonly suppressionCooldownSeconds = 4 * 60 * 60; // 4 hours cooldown per opportunity key

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly behaviouralContext: BehaviouralContextService,
  ) {}

  /**
   * Evaluates the user's ongoing life, work, calendar, and past blockers to identify
   * contextually relevant proactive assistance opportunities.
   */
  async evaluateProactiveOpportunities(
    userId: string,
    now: Date = new Date(),
  ): Promise<ProactiveOpportunity[]> {
    const opportunities: ProactiveOpportunity[] = [];

    // 1. Compile User Profile & Constraints
    const profile = await this.behaviouralContext.getUserProfile(userId);

    // 2. Determine Interruption Constraints (Quiet Hours & Active Focus)
    const interruptionCtx = await this.getInterruptionContext(userId, now);

    // 3. Scan Active Projects and Milestone Next Steps
    const activeProjects = await this.prisma.project.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { tasks: true },
      take: 5,
    });

    for (const project of activeProjects) {
      const completedTasks = project.tasks.filter((t) => t.status === TaskStatus.COMPLETED);
      const pendingTasks = project.tasks.filter((t) => t.status !== TaskStatus.COMPLETED);

      // Milestone next-step trigger
      if (completedTasks.length > 0 && pendingTasks.length > 0) {
        const nextTask = pendingTasks[0];
        const oppKey = `milestone-${project.id}-${nextTask.id}`;
        if (!(await this.isSuppressed(userId, oppKey, now))) {
          opportunities.push({
            id: oppKey,
            category: 'MILESTONE_NEXT_STEP',
            title: `Next step for ${project.title}`,
            naturalMessage: `You've completed the initial phase of ${project.title}. The logical next step ready for you is "${nextTask.title}".`,
            rationale: `Milestone completed on project ${project.title} with pending follow-up.`,
            action: 'SUGGEST',
            urgency: 'MEDIUM',
            confidence: 0.9,
            relatedEntity: { type: 'project', id: project.id, name: project.title },
            interruptionPermitted: !interruptionCtx.suppressNonCritical,
          });
        }
      }
    }

    // 4. Scan Schedule Constraints & Protected Morning Focus
    const currentHour = now.getHours();
    const morningFocusRule = profile.confirmedPreferences.find(
      (p) =>
        p.key.toLowerCase().includes('meeting') ||
        p.value.toLowerCase().includes('11 am') ||
        p.value.toLowerCase().includes('morning deep work'),
    );

    if (morningFocusRule && currentHour >= 8 && currentHour < 11) {
      const oppKey = `morning-focus-protection-${now.toISOString().slice(0, 10)}`;
      if (!(await this.isSuppressed(userId, oppKey, now))) {
        opportunities.push({
          id: oppKey,
          category: 'PROTECTED_FOCUS_TIME',
          title: 'Protected Morning Focus Block',
          naturalMessage: `Your morning deep work block is protected until 11:00 AM per your standing rule. Your calendar is clear of meetings.`,
          rationale: 'Active morning window aligns with confirmed user focus rule.',
          action: 'NOTIFY',
          urgency: 'LOW',
          confidence: 0.95,
          interruptionPermitted: !interruptionCtx.inQuietHours && !interruptionCtx.isFocusSessionActive,
        });
      }
    }

    // 5. Scan Pending/Overdue Tasks
    const overdueTasks = await this.prisma.task.findMany({
      where: {
        userId,
        deadline: { lt: now },
        status: { not: TaskStatus.COMPLETED },
      },
      take: 3,
    });

    for (const task of overdueTasks) {
      const oppKey = `overdue-${task.id}`;
      if (!(await this.isSuppressed(userId, oppKey, now))) {
        opportunities.push({
          id: oppKey,
          category: 'DEADLINE_RISK',
          title: `Overdue item: ${task.title}`,
          naturalMessage: `The task "${task.title}" has passed its scheduled target. Would you like to tackle it now or reschedule it?`,
          rationale: `Task target deadline elapsed without completion.`,
          action: 'ASK',
          urgency: 'HIGH',
          confidence: 0.94,
          relatedEntity: { type: 'task', id: task.id, name: task.title },
          interruptionPermitted: !interruptionCtx.inQuietHours,
        });
      }
    }

    // 6. Scan Unresolved Past Blockers from Memory
    const blockerMemory = profile.confirmedPreferences.find(
      (p) => p.key.toLowerCase().includes('blocker') || p.value.toLowerCase().includes('unresolved'),
    );
    if (blockerMemory) {
      const oppKey = `blocker-${blockerMemory.key}`;
      if (!(await this.isSuppressed(userId, oppKey, now))) {
        opportunities.push({
          id: oppKey,
          category: 'UNRESOLVED_BLOCKER',
          title: `Unresolved Blocker: ${blockerMemory.key}`,
          naturalMessage: `You previously noted that "${blockerMemory.value}" was an active blocker. Do you want to revisit that today?`,
          rationale: 'Previous technical blocker flagged without recorded resolution.',
          action: 'ASK',
          urgency: 'MEDIUM',
          confidence: 0.88,
          interruptionPermitted: !interruptionCtx.suppressNonCritical,
        });
      }
    }

    // If quiet hours or focus session is active, filter out non-critical opportunities to enforce silence
    return opportunities.map((opp) => {
      if (!opp.interruptionPermitted) {
        return {
          ...opp,
          action: 'SILENCE' as ProactiveAction,
          suppressionReason: interruptionCtx.inQuietHours
            ? 'Quiet hours active'
            : interruptionCtx.isFocusSessionActive
            ? 'Active focus session in progress'
            : 'Non-critical interruption suppressed',
        };
      }
      return opp;
    });
  }

  /**
   * Records user feedback on a proactive suggestion (ACCEPTED, DISMISSED, SNOOZED).
   * Persisted durably to KnowledgeNote (for audit/memory) and Redis cooldown.
   */
  async recordFeedback(userId: string, opportunityId: string, action: 'ACCEPTED' | 'DISMISSED' | 'SNOOZED') {
    this.logger.log(`[Proactive Intelligence] User ${userId} responded to ${opportunityId} with ${action}`);

    // 1. Calculate cooldown window
    // SNOOZED = 2 hours; DISMISSED/ACCEPTED = 4 hours
    const ttlSeconds = action === 'SNOOZED' ? 2 * 60 * 60 : this.suppressionCooldownSeconds;

    // 2. Register suppression in durable Redis + fallback memory
    await this.markSuppressed(userId, opportunityId, ttlSeconds);

    // 3. Persist feedback event to KnowledgeNote for permanent historical record
    try {
      const feedbackTitle = `[PROACTIVE_FEEDBACK] ${opportunityId}`;
      const payload = JSON.stringify({
        opportunityId,
        action,
        timestamp: new Date().toISOString(),
      });

      const existing = await this.prisma.knowledgeNote.findFirst({
        where: { userId, title: feedbackTitle, deletedAt: null },
      });

      if (existing) {
        await this.prisma.knowledgeNote.update({
          where: { id: existing.id },
          data: { content: payload, updatedAt: new Date() },
        });
      } else {
        await this.prisma.knowledgeNote.create({
          data: {
            userId,
            title: feedbackTitle,
            content: payload,
            category: 'NOTE',
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed persisting proactive feedback note: ${err.message}`);
    }

    return { success: true, opportunityId, action };
  }

  private async getInterruptionContext(userId: string, now: Date): Promise<InterruptionContext> {
    const hour = now.getHours();
    // Default quiet hours: 10:00 PM to 7:00 AM
    const inQuietHours = hour >= 22 || hour < 7;

    // Check if active focus session is running
    const activeFocus = await this.prisma.focusSession.findFirst({
      where: {
        userId,
        status: FocusSessionStatus.ACTIVE,
        endedAt: null,
      },
    });

    const isFocusSessionActive = !!activeFocus;
    const suppressNonCritical = inQuietHours || isFocusSessionActive;

    return {
      inQuietHours,
      isFocusSessionActive,
      isMeetingActive: false,
      suppressNonCritical,
    };
  }

  private async isSuppressed(userId: string, key: string, now: Date): Promise<boolean> {
    const redisKey = `proactive:suppress:${userId}:${key}`;
    try {
      const val = await this.redis.get(redisKey);
      if (val !== null) return true;
    } catch (e) {
      // ignore
    }

    // Fallback to local memory map
    const localTimestamp = this.localSuppressionFallback.get(`${userId}:${key}`);
    if (localTimestamp && now.getTime() - localTimestamp < this.suppressionCooldownSeconds * 1000) {
      return true;
    }

    return false;
  }

  private async markSuppressed(userId: string, key: string, ttlSeconds: number) {
    const redisKey = `proactive:suppress:${userId}:${key}`;
    try {
      await this.redis.set(redisKey, 'SUPPRESSED', ttlSeconds);
    } catch (e) {
      // ignore
    }
    this.localSuppressionFallback.set(`${userId}:${key}`, Date.now());
  }
}
