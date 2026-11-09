import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { TaskStatus, Priority, SchedulingMode } from '@prisma/client';
import { addMinutes, format, parseISO } from 'date-fns';

export interface ScheduleSlotProposal {
  taskId: string;
  title: string;
  priority: Priority;
  durationMinutes: number;
  originalStartTime: string | null;
  proposedStartTime: string;
  proposedEndTime: string;
  rationale: string;
  isDeepWork: boolean;
}

@Injectable()
export class SmartPlannerService {
  private readonly logger = new Logger(SmartPlannerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async proposeDayPlan(userId: string, date: string, preferences?: { deepWorkFocus?: boolean; bufferMinutes?: number }) {
    const bufferMinutes = preferences?.bufferMinutes || 10;

    // 1. Fetch user settings for working hours
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const startHour = settings?.workStartHour || 9;
    const endHour = settings?.workEndHour || 18;

    // 2. Fetch tasks for target date & backlog tasks
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const scheduledTasks = await this.prisma.task.findMany({
      where: {
        userId,
        status: { not: TaskStatus.COMPLETED },
        scheduledStartTime: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { scheduledStartTime: 'asc' },
    });

    const flexibleBacklog = await this.prisma.task.findMany({
      where: {
        userId,
        status: TaskStatus.TODO,
        OR: [
          { scheduledStartTime: null },
          { schedulingMode: SchedulingMode.FLEXIBLE },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 8,
    });

    // 3. Collect all candidate tasks (scheduled + top flexible items)
    const combinedTasksMap = new Map<string, any>();
    for (const t of scheduledTasks) combinedTasksMap.set(t.id, t);
    for (const t of flexibleBacklog) {
      if (!combinedTasksMap.has(t.id)) combinedTasksMap.set(t.id, t);
    }
    const allCandidates = Array.from(combinedTasksMap.values());

    // Sort candidates: URGENT first, then HIGH, then others
    allCandidates.sort((a, b) => {
      const priorityWeights: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (priorityWeights[b.priority] || 2) - (priorityWeights[a.priority] || 2);
    });

    // 4. Time-blocking algorithm starting from startHour:00
    let currentSlot = new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00.000Z`);
    const dayEnd = new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00.000Z`);

    const proposedSlots: ScheduleSlotProposal[] = [];
    let conflictsResolved = 0;

    for (const task of allCandidates) {
      if (currentSlot >= dayEnd) break;

      const duration = task.estimatedDurationMinutes || 30;
      const endSlot = addMinutes(currentSlot, duration);

      const isDeep = duration >= 45 || task.priority === Priority.HIGH || task.priority === Priority.URGENT;
      const rationale =
        task.priority === Priority.URGENT
          ? 'Scheduled during morning peak focus window due to critical urgency.'
          : isDeep
          ? 'Deep work block positioned before afternoon fatigue.'
          : 'Standard productivity block with buffer time.';

      if (task.scheduledStartTime && task.scheduledStartTime.toISOString() !== currentSlot.toISOString()) {
        conflictsResolved++;
      }

      proposedSlots.push({
        taskId: task.id,
        title: task.title,
        priority: task.priority,
        durationMinutes: duration,
        originalStartTime: task.scheduledStartTime ? task.scheduledStartTime.toISOString() : null,
        proposedStartTime: currentSlot.toISOString(),
        proposedEndTime: endSlot.toISOString(),
        rationale,
        isDeepWork: isDeep,
      });

      // Move forward with buffer
      currentSlot = addMinutes(endSlot, bufferMinutes);
    }

    const explanation = `Optimized schedule for ${date}. Sequenced ${proposedSlots.length} tasks matching high-energy focus slots between ${startHour}:00 AM and ${endHour > 12 ? endHour - 12 : endHour}:00 PM with ${bufferMinutes}m cognitive recovery buffers.`;

    // 5. Store PlanningProposal in database
    const proposal = await this.prisma.planningProposal.create({
      data: {
        userId,
        date,
        status: 'DRAFT',
        explanation,
        originalSchedule: scheduledTasks.map((t) => ({
          id: t.id,
          title: t.title,
          scheduledStartTime: t.scheduledStartTime,
        })) as any,
        proposedSchedule: proposedSlots as any,
        diffMetrics: {
          totalTasks: proposedSlots.length,
          conflictsResolved,
          deepWorkBlocksCount: proposedSlots.filter((s) => s.isDeepWork).length,
          totalFocusMinutes: proposedSlots.reduce((acc, s) => acc + s.durationMinutes, 0),
        } as any,
      },
    });

    return proposal;
  }

  async applyDayPlan(userId: string, proposalId: string) {
    const proposal = await this.prisma.planningProposal.findFirst({
      where: { id: proposalId, userId },
    });
    if (!proposal) throw new NotFoundException(`Proposal ${proposalId} not found`);

    const slots = (proposal.proposedSchedule as unknown as ScheduleSlotProposal[]) || [];

    // Apply scheduledStartTimes in a Prisma transaction
    await this.prisma.$transaction(async (tx) => {
      for (const slot of slots) {
        await tx.task.update({
          where: { id: slot.taskId },
          data: {
            scheduledStartTime: new Date(slot.proposedStartTime),
            schedulingMode: SchedulingMode.FIXED,
          },
        });
      }

      await tx.planningProposal.update({
        where: { id: proposalId },
        data: {
          status: 'APPLIED',
          appliedAt: new Date(),
        },
      });
    });

    return {
      success: true,
      message: `Successfully applied schedule: ${slots.length} tasks positioned.`,
      slotsAppliedCount: slots.length,
    };
  }

  async getProposals(userId: string, date?: string) {
    const where: any = { userId };
    if (date) where.date = date;

    return this.prisma.planningProposal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }
}

