import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RoutinesService } from '../routines/routines.service';
import { TasksService } from '../tasks/tasks.service';
import { TaskCategory, TaskStatus } from '@assistant/shared';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly routinesService: RoutinesService,
    private readonly tasksService: TasksService,
  ) {}

  async getDayPlan(userId: string, date: string) {
    if (!this.prisma.isConnected) {
      return {
        date,
        version: 1,
        isLocked: false,
        timeline: [],
        morningPriorities: [],
        afternoonPriorities: [],
        eveningPriorities: [],
        routines: [],
        conflicts: [],
      };
    }

    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Fetch tasks for the date (without duplication)
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        scheduledStartTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { scheduledStartTime: 'asc' },
    });

    // Fetch routine occurrences for the date
    const routineOccurrences = await this.routinesService.getOccurrencesForDate(userId, date);

    // Fetch or create Plan record
    let plan = await this.prisma.schedulePlan.findFirst({
      where: { userId, date },
      orderBy: { version: 'desc' },
    });

    if (!plan) {
      plan = await this.prisma.schedulePlan.create({
        data: {
          userId,
          date,
          version: 1,
          isLocked: false,
        },
      });
    }

    // Segment tasks into time blocks (Morning: <12:00, Afternoon: 12:00-17:00, Evening: >=17:00)
    const morningPriorities: any[] = [];
    const afternoonPriorities: any[] = [];
    const eveningPriorities: any[] = [];
    const timeline: any[] = [];

    // Conflict detection across timeline
    const conflicts: any[] = [];
    for (let i = 0; i < tasks.length; i++) {
      const current = tasks[i];
      timeline.push({
        type: 'TASK',
        item: current,
        startTime: current.scheduledStartTime,
        endTime: current.scheduledEndTime,
      });

      if (current.scheduledStartTime) {
        const hour = new Date(current.scheduledStartTime).getUTCHours();
        if (hour < 12) {
          morningPriorities.push(current);
        } else if (hour < 17) {
          afternoonPriorities.push(current);
        } else {
          eveningPriorities.push(current);
        }
      }

      // Check overlap with next task
      if (i < tasks.length - 1) {
        const next = tasks[i + 1];
        if (
          current.scheduledEndTime &&
          next.scheduledStartTime &&
          new Date(current.scheduledEndTime).getTime() > new Date(next.scheduledStartTime).getTime()
        ) {
          conflicts.push({
            taskA: current.title,
            taskB: next.title,
            overlapMinutes: Math.round(
              (new Date(current.scheduledEndTime).getTime() - new Date(next.scheduledStartTime).getTime()) / 60000,
            ),
          });
        }
      }
    }

    return {
      date,
      planId: plan.id,
      version: plan.version,
      isLocked: plan.isLocked,
      timeline,
      morningPriorities,
      afternoonPriorities,
      eveningPriorities,
      routines: routineOccurrences,
      conflicts,
    };
  }

  async lockPlan(userId: string, date: string, isLocked: boolean) {
    if (!this.prisma.isConnected) return { success: true };

    const plan = await this.prisma.schedulePlan.findFirst({
      where: { userId, date },
      orderBy: { version: 'desc' },
    });

    if (plan) {
      await this.prisma.schedulePlan.update({
        where: { id: plan.id },
        data: { isLocked },
      });
    }

    return { success: true, isLocked };
  }
}
