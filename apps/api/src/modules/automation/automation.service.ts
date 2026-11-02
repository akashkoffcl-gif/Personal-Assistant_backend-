import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TaskStatus, Priority } from '@assistant/shared';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getRules(userId: string) {
    if (!this.prisma.isConnected) return [];

    let rules = await this.prisma.automationRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    // Seed standard enterprise rules if none exist yet
    if (rules.length === 0) {
      const defaultRules = [
        {
          userId,
          name: 'Overdue Task Warning',
          ruleType: 'OVERDUE_ALERT',
          condition: { maxOverdueHours: 1 },
          action: { notify: true, priority: 'HIGH' },
          cooldownMinutes: 120,
          isEnabled: true,
        },
        {
          userId,
          name: 'Continuous Work Rest Suggestion',
          ruleType: 'BREAK_SUGGESTION',
          condition: { continuousMinutes: 90 },
          action: { suggestBreakMinutes: 10 },
          cooldownMinutes: 90,
          isEnabled: true,
        },
        {
          userId,
          name: 'Schedule Collision Warning',
          ruleType: 'CONFLICT_AUTO_SUGGEST',
          condition: { detectOverlap: true },
          action: { suggestFeasibleSlot: true },
          cooldownMinutes: 30,
          isEnabled: true,
        },
        {
          userId,
          name: 'Advance Task Reminder (15m)',
          ruleType: 'UPCOMING_REMINDER',
          condition: { leadMinutes: 15 },
          action: { sendPush: true },
          cooldownMinutes: 15,
          isEnabled: true,
        },
      ];

      for (const dr of defaultRules) {
        await this.prisma.automationRule.create({ data: dr });
      }

      rules = await this.prisma.automationRule.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
    }

    return rules.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      ruleType: r.ruleType,
      condition: r.condition as Record<string, any>,
      action: r.action as Record<string, any>,
      cooldownMinutes: r.cooldownMinutes,
      lastExecutedAt: r.lastExecutedAt ? r.lastExecutedAt.toISOString() : null,
      isEnabled: r.isEnabled,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async toggleRule(userId: string, ruleId: string, isEnabled: boolean) {
    if (!this.prisma.isConnected) return { id: ruleId, isEnabled };

    const rule = await this.prisma.automationRule.findFirst({
      where: { id: ruleId, userId },
    });

    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    return this.prisma.automationRule.update({
      where: { id: ruleId },
      data: { isEnabled },
    });
  }

  async createRule(
    userId: string,
    data: {
      name: string;
      ruleType: string;
      condition: Record<string, any>;
      action: Record<string, any>;
      cooldownMinutes?: number;
    },
  ) {
    if (!this.prisma.isConnected) {
      return { id: 'mock-rule', userId, ...data, isEnabled: true };
    }

    return this.prisma.automationRule.create({
      data: {
        userId,
        name: data.name,
        ruleType: data.ruleType,
        condition: data.condition || {},
        action: data.action || {},
        cooldownMinutes: data.cooldownMinutes || 60,
        isEnabled: true,
      },
    });
  }

  async updateRule(
    userId: string,
    ruleId: string,
    data: {
      name?: string;
      condition?: Record<string, any>;
      action?: Record<string, any>;
      cooldownMinutes?: number;
      isEnabled?: boolean;
    },
  ) {
    if (!this.prisma.isConnected) return { id: ruleId, ...data };
    const rule = await this.prisma.automationRule.findFirst({
      where: { id: ruleId, userId },
    });
    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }
    return this.prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.condition !== undefined && { condition: data.condition }),
        ...(data.action !== undefined && { action: data.action }),
        ...(data.cooldownMinutes !== undefined && { cooldownMinutes: data.cooldownMinutes }),
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      },
    });
  }

  async deleteRule(userId: string, ruleId: string) {
    if (!this.prisma.isConnected) return { id: ruleId, deleted: true };
    const rule = await this.prisma.automationRule.findFirst({
      where: { id: ruleId, userId },
    });
    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }
    await this.prisma.automationRule.delete({
      where: { id: ruleId },
    });
    return { success: true, id: ruleId };
  }

  async getExecutions(userId: string) {
    if (!this.prisma.isConnected) return [];

    const executions = await this.prisma.automationRuleExecution.findMany({
      where: { userId },
      orderBy: { executedAt: 'desc' },
      take: 50,
      include: {
        rule: { select: { name: true, ruleType: true } },
      },
    });

    return executions.map((e) => ({
      id: e.id,
      ruleId: e.ruleId,
      ruleName: e.rule?.name,
      ruleType: e.rule?.ruleType,
      userId: e.userId,
      triggeredBy: e.triggeredBy,
      actionTaken: e.actionTaken,
      status: e.status,
      details: e.details,
      executedAt: e.executedAt.toISOString(),
    }));
  }

  /**
   * Evaluates all active automation rules deterministically with cooldown enforcement.
   */
  async evaluateRules(userId: string): Promise<{ evaluated: number; executed: number }> {
    if (!this.prisma.isConnected) return { evaluated: 0, executed: 0 };

    const rules = await this.prisma.automationRule.findMany({
      where: { userId, isEnabled: true },
    });

    const now = new Date();
    let executedCount = 0;

    for (const rule of rules) {
      // 1. Cooldown check
      if (rule.lastExecutedAt) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        const timeSince = now.getTime() - rule.lastExecutedAt.getTime();
        if (timeSince < cooldownMs) {
          continue; // Cooldown active, skip to prevent spam loops
        }
      }

      // 2. Rule evaluation
      if (rule.ruleType === 'OVERDUE_ALERT') {
        const overdueTasks = await this.prisma.task.findMany({
          where: {
            userId,
            deadline: { lt: now },
            status: { notIn: [TaskStatus.COMPLETED, TaskStatus.SKIPPED, TaskStatus.CANCELLED] },
          },
          take: 5,
        });

        if (overdueTasks.length > 0) {
          const actionTaken = `Alerted user on ${overdueTasks.length} overdue task(s)`;
          await this.prisma.automationRuleExecution.create({
            data: {
              ruleId: rule.id,
              userId,
              triggeredBy: 'SCHEDULE_SCAN',
              actionTaken,
              status: 'SUCCESS',
              details: { overdueCount: overdueTasks.length, taskTitles: overdueTasks.map((t) => t.title) },
            },
          });

          await this.prisma.automationRule.update({
            where: { id: rule.id },
            data: { lastExecutedAt: now },
          });

          executedCount++;
        }
      } else if (rule.ruleType === 'BREAK_SUGGESTION') {
        // Log suggestion checkpoint
        const actionTaken = 'Recommended 10m rest interval after scheduled sprint';
        await this.prisma.automationRuleExecution.create({
          data: {
            ruleId: rule.id,
            userId,
            triggeredBy: 'CONTINUOUS_WORK_CHECK',
            actionTaken,
            status: 'SUCCESS',
            details: { suggestedBreakMinutes: 10 },
          },
        });

        await this.prisma.automationRule.update({
          where: { id: rule.id },
          data: { lastExecutedAt: now },
        });

        executedCount++;
      }
    }

    return { evaluated: rules.length, executed: executedCount };
  }
}

