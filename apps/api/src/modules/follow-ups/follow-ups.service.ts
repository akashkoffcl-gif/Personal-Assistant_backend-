import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { TaskStatus } from '@assistant/shared';

export interface RespondFollowUpDto {
  followUpId?: string;
  taskId?: string;
  routineId?: string;
  occurrenceId?: string;
  action: 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'STILL_WORKING' | 'RESCHEDULE' | 'SKIPPED';
  progressPercent?: number;
  revisedEndTime?: string;
  rescheduleDate?: string;
  actualQuantity?: number;
  notes?: string;
}

@Injectable()
export class FollowUpsService {
  private readonly logger = new Logger(FollowUpsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all pending follow-up prompts for the authenticated user.
   */
  async getPendingFollowUps(userId: string) {
    if (!userId) return [];

    return this.prisma.withRetry(async () => {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const todayStr = now.toISOString().slice(0, 10);

      // 1. Tasks whose scheduled time has ended and remain incomplete
      const overdueTasks = await this.prisma.task.findMany({
        where: {
          userId,
          scheduledEndTime: { lte: now, gte: twentyFourHoursAgo },
          status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
        },
        orderBy: { scheduledEndTime: 'desc' },
        take: 5,
      });

      // 2. Active routines with incomplete occurrences for today
      const todayOccurrences = await this.prisma.routineOccurrence.findMany({
        where: {
          userId,
          date: todayStr,
          status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
        },
        include: { routine: true },
        take: 5,
      });

      // 3. Filter occurrences whose scheduled time window has passed
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      const pastRoutines = todayOccurrences.filter((occ) => {
        const timeTarget = occ.routine.timeWindowEnd || occ.routine.targetTime;
        if (!timeTarget) return true; // flexible routines prompt at end of day
        const [h, m] = timeTarget.split(':').map(Number);
        const targetMinutes = h * 60 + (m || 0);
        return currentTimeMinutes >= targetMinutes;
      });

      const pendingList: any[] = [];

      for (const t of overdueTasks) {
        const startTimeStr = t.scheduledStartTime
          ? new Date(t.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '09:00';
        const endTimeStr = t.scheduledEndTime
          ? new Date(t.scheduledEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '10:00';

        pendingList.push({
          id: `followup-task-${t.id}`,
          type: 'TASK',
          targetId: t.id,
          title: t.title,
          scheduledTimeText: `${startTimeStr} – ${endTimeStr}`,
          scheduledStartTime: t.scheduledStartTime,
          scheduledEndTime: t.scheduledEndTime,
          category: t.category,
          priority: t.priority,
        });
      }

      for (const occ of pastRoutines) {
        pendingList.push({
          id: `followup-routine-${occ.id}`,
          type: 'ROUTINE',
          targetId: occ.routineId,
          occurrenceId: occ.id,
          title: occ.routine.title,
          scheduledTimeText: occ.routine.targetTime || 'Today',
          targetQuantity: occ.routine.targetQuantity,
          actualQuantity: occ.actualQuantity || 0,
          unit: occ.routine.unit || '',
        });
      }

      return pendingList;
    });
  }

  /**
   * Processes a user's follow-up response and updates PostgreSQL durably.
   */
  async respondToFollowUp(userId: string, body: RespondFollowUpDto) {
    if (!userId) {
      throw new ForbiddenException('User must be authenticated.');
    }

    return this.prisma.withRetry(async () => {
      const now = new Date();

      // CASE A: Task Follow-up
      if (body.taskId) {
        const task = await this.prisma.task.findUnique({
          where: { id: body.taskId },
        });

        if (!task) {
          throw new NotFoundException(`Task ${body.taskId} not found`);
        }
        if (task.userId !== userId) {
          throw new ForbiddenException('You cannot modify another user\'s task follow-up.');
        }

        switch (body.action) {
          case 'COMPLETED':
            await this.prisma.task.update({
              where: { id: task.id },
              data: {
                status: TaskStatus.COMPLETED,
                completedAt: now,
              },
            });
            await this.prisma.taskEvent.create({
              data: {
                taskId: task.id,
                userId,
                eventType: 'STATUS_CHANGED',
                previousStatus: task.status,
                newStatus: TaskStatus.COMPLETED,
                metadata: { source: 'AUTOMATED_FOLLOW_UP', completedAt: now.toISOString() },
              },
            });
            this.logger.log(`Task ${task.id} marked COMPLETED via follow-up prompt.`);
            break;

          case 'PARTIALLY_COMPLETED':
            const partialNotes = body.notes
              ? `${task.notes || ''}\n[Partial: ${body.progressPercent || 50}%] ${body.notes}`.trim()
              : task.notes;

            await this.prisma.task.update({
              where: { id: task.id },
              data: {
                status: TaskStatus.IN_PROGRESS,
                notes: partialNotes,
              },
            });
            await this.prisma.taskEvent.create({
              data: {
                taskId: task.id,
                userId,
                eventType: 'STATUS_CHANGED',
                previousStatus: task.status,
                newStatus: TaskStatus.IN_PROGRESS,
                metadata: {
                  source: 'AUTOMATED_FOLLOW_UP',
                  progressPercent: body.progressPercent || 50,
                  notes: body.notes,
                },
              },
            });
            break;

          case 'STILL_WORKING':
            const newEndTime = body.revisedEndTime
              ? new Date(body.revisedEndTime)
              : new Date(now.getTime() + 30 * 60 * 1000);

            await this.prisma.task.update({
              where: { id: task.id },
              data: {
                status: TaskStatus.IN_PROGRESS,
                scheduledEndTime: newEndTime,
              },
            });
            await this.prisma.taskEvent.create({
              data: {
                taskId: task.id,
                userId,
                eventType: 'RESCHEDULED',
                previousStatus: task.status,
                newStatus: TaskStatus.IN_PROGRESS,
                metadata: { source: 'AUTOMATED_FOLLOW_UP', newEndTime: newEndTime.toISOString() },
              },
            });
            break;

          case 'RESCHEDULE':
            const revisedStart = body.rescheduleDate ? new Date(body.rescheduleDate) : new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const revisedEnd = new Date(revisedStart.getTime() + (task.estimatedDurationMinutes || 30) * 60 * 1000);

            await this.prisma.task.update({
              where: { id: task.id },
              data: {
                scheduledStartTime: revisedStart,
                scheduledEndTime: revisedEnd,
              },
            });
            await this.prisma.taskEvent.create({
              data: {
                taskId: task.id,
                userId,
                eventType: 'RESCHEDULED',
                metadata: {
                  source: 'AUTOMATED_FOLLOW_UP',
                  scheduledStartTime: revisedStart.toISOString(),
                  scheduledEndTime: revisedEnd.toISOString(),
                },
              },
            });
            break;

          case 'SKIPPED':
            await this.prisma.task.update({
              where: { id: task.id },
              data: {
                status: TaskStatus.SKIPPED,
              },
            });
            await this.prisma.taskEvent.create({
              data: {
                taskId: task.id,
                userId,
                eventType: 'STATUS_CHANGED',
                previousStatus: task.status,
                newStatus: TaskStatus.SKIPPED,
                metadata: { source: 'AUTOMATED_FOLLOW_UP', reason: body.notes || 'Skipped by user' },
              },
            });
            break;

          default:
            throw new BadRequestException(`Unsupported follow-up action: ${body.action}`);
        }
      }

      // CASE B: Routine Follow-up
      if (body.routineId || body.occurrenceId) {
        let occ = body.occurrenceId
          ? await this.prisma.routineOccurrence.findUnique({ where: { id: body.occurrenceId } })
          : null;

        if (!occ && body.routineId) {
          const todayStr = now.toISOString().slice(0, 10);
          occ = await this.prisma.routineOccurrence.findUnique({
            where: { routineId_date: { routineId: body.routineId, date: todayStr } },
          });
        }

        if (occ) {
          if (occ.userId !== userId) {
            throw new ForbiddenException('You cannot modify another user\'s routine occurrence.');
          }

          if (body.action === 'COMPLETED') {
            await this.prisma.routineOccurrence.update({
              where: { id: occ.id },
              data: {
                status: TaskStatus.COMPLETED,
                completedAt: now,
                actualQuantity: body.actualQuantity || occ.actualQuantity,
              },
            });
            await this.prisma.routine.update({
              where: { id: occ.routineId },
              data: { streakCount: { increment: 1 } },
            });
          } else if (body.action === 'PARTIALLY_COMPLETED') {
            await this.prisma.routineOccurrence.update({
              where: { id: occ.id },
              data: {
                status: TaskStatus.IN_PROGRESS,
                actualQuantity: body.actualQuantity || occ.actualQuantity,
                notes: body.notes || occ.notes,
              },
            });
          } else if (body.action === 'SKIPPED') {
            await this.prisma.routineOccurrence.update({
              where: { id: occ.id },
              data: {
                status: TaskStatus.SKIPPED,
                notes: body.notes || 'Skipped by user',
              },
            });
          }
        }
      }

      // Mark associated In-App notification as read
      if (body.followUpId) {
        await this.prisma.inAppNotification.updateMany({
          where: {
            userId,
            actionUrl: { contains: body.followUpId },
            readAt: null,
          },
          data: { readAt: now },
        });
      }

      return {
        success: true,
        action: body.action,
        message: `Follow-up ${body.action.toLowerCase().replace('_', ' ')} recorded successfully.`,
        timestamp: now.toISOString(),
      };
    });
  }
}

