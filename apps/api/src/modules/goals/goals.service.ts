import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { GoalType, GoalStatus, Priority } from '@prisma/client';
import {
  CreateGoalDto,
  UpdateGoalDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  LogGoalProgressDto,
} from './dto/goal.dto';

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getGoals(userId: string, query?: { type?: GoalType; status?: GoalStatus; parentId?: string | null }) {
    const where: any = { userId };
    if (query?.type) where.type = query.type;
    if (query?.status) where.status = query.status;
    if (query?.parentId !== undefined) {
      where.parentId = query.parentId === 'null' ? null : query.parentId;
    }

    return this.prisma.goal.findMany({
      where,
      include: {
        milestones: {
          orderBy: { order: 'asc' },
        },
        subGoals: {
          include: {
            milestones: { orderBy: { order: 'asc' } },
          },
        },
        progressLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getGoalById(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId },
      include: {
        milestones: {
          orderBy: { order: 'asc' },
        },
        subGoals: {
          include: {
            milestones: { orderBy: { order: 'asc' } },
          },
        },
        progressLogs: {
          orderBy: { recordedAt: 'desc' },
        },
        parentGoal: true,
      },
    });

    if (!goal) {
      throw new NotFoundException(`Goal ${goalId} not found`);
    }

    return goal;
  }

  async createGoal(userId: string, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        type: dto.type || GoalType.MONTHLY,
        status: dto.status || GoalStatus.IN_PROGRESS,
        priority: dto.priority || Priority.MEDIUM,
        parentId: dto.parentId || null,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        color: dto.color || '#8B45F5',
        progressPercent: 0,
      },
      include: {
        milestones: true,
      },
    });
  }

  async updateGoal(userId: string, goalId: string, dto: UpdateGoalDto) {
    const existing = await this.prisma.goal.findFirst({
      where: { id: goalId, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Goal ${goalId} not found`);
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.startDate !== undefined) data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.targetDate !== undefined) data.targetDate = dto.targetDate ? new Date(dto.targetDate) : null;
    if (dto.color !== undefined) data.color = dto.color;

    if (dto.progressPercent !== undefined) {
      data.progressPercent = dto.progressPercent;
      if (dto.progressPercent >= 100) {
        data.status = GoalStatus.COMPLETED;
        data.completedAt = new Date();
      } else if (existing.status === GoalStatus.COMPLETED && dto.progressPercent < 100) {
        data.status = GoalStatus.IN_PROGRESS;
        data.completedAt = null;
      }
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === GoalStatus.COMPLETED && !existing.completedAt) {
        data.completedAt = new Date();
        data.progressPercent = 100;
      } else if (dto.status !== GoalStatus.COMPLETED) {
        data.completedAt = null;
      }
    }

    const updated = await this.prisma.goal.update({
      where: { id: goalId },
      data,
      include: {
        milestones: { orderBy: { order: 'asc' } },
        progressLogs: { orderBy: { recordedAt: 'desc' }, take: 5 },
      },
    });

    if (dto.progressPercent !== undefined && dto.progressPercent !== existing.progressPercent) {
      await this.prisma.goalProgressLog.create({
        data: {
          goalId,
          userId,
          previousProgress: existing.progressPercent,
          newProgress: dto.progressPercent,
          notes: 'Progress updated manually',
        },
      });
    }

    return updated;
  }

  async deleteGoal(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId },
    });
    if (!goal) {
      throw new NotFoundException(`Goal ${goalId} not found`);
    }

    await this.prisma.goal.delete({
      where: { id: goalId },
    });

    return { success: true, message: `Goal ${goalId} deleted` };
  }

  async addMilestone(userId: string, goalId: string, dto: CreateMilestoneDto) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId },
      include: { milestones: true },
    });
    if (!goal) {
      throw new NotFoundException(`Goal ${goalId} not found`);
    }

    const nextOrder = dto.order !== undefined ? dto.order : goal.milestones.length;

    const milestone = await this.prisma.goalMilestone.create({
      data: {
        goalId,
        userId,
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        order: nextOrder,
        isCompleted: false,
      },
    });

    // Recalculate progress
    await this.recalculateGoalProgress(userId, goalId);

    return milestone;
  }

  async updateMilestone(userId: string, goalId: string, milestoneId: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.goalMilestone.findFirst({
      where: { id: milestoneId, goalId, userId },
    });
    if (!milestone) {
      throw new NotFoundException(`Milestone ${milestoneId} not found`);
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.order !== undefined) data.order = dto.order;

    if (dto.isCompleted !== undefined) {
      data.isCompleted = dto.isCompleted;
      data.completedAt = dto.isCompleted ? new Date() : null;
    }

    const updated = await this.prisma.goalMilestone.update({
      where: { id: milestoneId },
      data,
    });

    if (dto.isCompleted !== undefined) {
      await this.recalculateGoalProgress(userId, goalId, `Milestone '${updated.title}' ${updated.isCompleted ? 'completed' : 'uncompleted'}`);
    }

    return updated;
  }

  async deleteMilestone(userId: string, goalId: string, milestoneId: string) {
    const milestone = await this.prisma.goalMilestone.findFirst({
      where: { id: milestoneId, goalId, userId },
    });
    if (!milestone) {
      throw new NotFoundException(`Milestone ${milestoneId} not found`);
    }

    await this.prisma.goalMilestone.delete({
      where: { id: milestoneId },
    });

    await this.recalculateGoalProgress(userId, goalId, `Milestone removed`);

    return { success: true };
  }

  async logProgress(userId: string, goalId: string, dto: LogGoalProgressDto) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId },
    });
    if (!goal) {
      throw new NotFoundException(`Goal ${goalId} not found`);
    }

    const previousProgress = goal.progressPercent;
    const newProgress = Math.max(0, Math.min(100, Math.round(dto.progressPercent)));

    const log = await this.prisma.goalProgressLog.create({
      data: {
        goalId,
        userId,
        previousProgress,
        newProgress,
        notes: dto.notes,
      },
    });

    const isCompleted = newProgress >= 100;
    await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        progressPercent: newProgress,
        status: isCompleted ? GoalStatus.COMPLETED : goal.status === GoalStatus.COMPLETED ? GoalStatus.IN_PROGRESS : goal.status,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    return log;
  }

  async getGoalsSummary(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      include: { milestones: true },
    });

    const totalGoals = goals.length;
    const activeGoals = goals.filter((g) => g.status === GoalStatus.IN_PROGRESS).length;
    const completedGoals = goals.filter((g) => g.status === GoalStatus.COMPLETED).length;

    const totalProgress = goals.reduce((acc, g) => acc + g.progressPercent, 0);
    const averageProgress = totalGoals > 0 ? Math.round(totalProgress / totalGoals) : 0;

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const approachingDeadlinesCount = goals.filter((g) => {
      if (g.status === GoalStatus.COMPLETED || !g.targetDate) return false;
      const target = new Date(g.targetDate);
      return target >= now && target <= sevenDaysFromNow;
    }).length;

    const totalMilestones = goals.reduce((acc, g) => acc + g.milestones.length, 0);
    const completedMilestones = goals.reduce((acc, g) => acc + g.milestones.filter((m) => m.isCompleted).length, 0);

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      averageProgress,
      approachingDeadlinesCount,
      totalMilestones,
      completedMilestones,
    };
  }

  private async recalculateGoalProgress(userId: string, goalId: string, logNote?: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, userId },
      include: { milestones: true },
    });
    if (!goal || goal.milestones.length === 0) return;

    const completedCount = goal.milestones.filter((m) => m.isCompleted).length;
    const totalCount = goal.milestones.length;
    const newProgress = Math.round((completedCount / totalCount) * 100);

    const previousProgress = goal.progressPercent;
    const isCompleted = newProgress >= 100;

    await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        progressPercent: newProgress,
        status: isCompleted ? GoalStatus.COMPLETED : goal.status === GoalStatus.COMPLETED ? GoalStatus.IN_PROGRESS : goal.status,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    if (newProgress !== previousProgress) {
      await this.prisma.goalProgressLog.create({
        data: {
          goalId,
          userId,
          previousProgress,
          newProgress,
          notes: logNote || `Automated milestone progression: ${completedCount}/${totalCount}`,
        },
      });
    }
  }
}

