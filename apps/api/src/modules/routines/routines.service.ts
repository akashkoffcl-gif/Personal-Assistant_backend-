import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { RecurrenceFrequency, TaskStatus } from '@assistant/shared';

@Injectable()
export class RoutinesService {
  private readonly logger = new Logger(RoutinesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(userId: string) {
    if (!this.prisma.isConnected) return [];

    return this.prisma.routine.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    if (!this.prisma.isConnected) {
      throw new NotFoundException(`Routine with ID ${id} not found.`);
    }

    const routine = await this.prisma.routine.findFirst({
      where: { id, userId },
      include: {
        occurrences: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!routine) {
      throw new NotFoundException(`Routine with ID ${id} not found.`);
    }

    return routine;
  }

  async create(userId: string, data: any) {
    if (!this.prisma.isConnected) {
      return { id: 'mock-routine-id', userId, ...data, streakCount: 0, isActive: true };
    }

    const routine = await this.prisma.routine.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        frequency: data.frequency || RecurrenceFrequency.DAILY,
        customDays: data.customDays || [],
        targetTime: data.targetTime,
        timeWindowStart: data.timeWindowStart,
        timeWindowEnd: data.timeWindowEnd,
        durationMinutes: data.durationMinutes || 15,
        targetQuantity: data.targetQuantity,
        unit: data.unit,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);
    return routine;
  }

  async update(userId: string, id: string, data: any) {
    await this.findOne(userId, id);

    const updated = await this.prisma.routine.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        frequency: data.frequency,
        customDays: data.customDays,
        targetTime: data.targetTime,
        timeWindowStart: data.timeWindowStart,
        timeWindowEnd: data.timeWindowEnd,
        durationMinutes: data.durationMinutes,
        targetQuantity: data.targetQuantity,
        unit: data.unit,
        isActive: data.isActive,
      },
    });

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);
    return updated;
  }

  async getOccurrencesForDate(userId: string, date: string) {
    if (!this.prisma.isConnected) return [];

    // Fetch active routines
    const routines = await this.prisma.routine.findMany({
      where: { userId, isActive: true },
    });

    const occurrences: any[] = [];
    const dateObj = new Date(`${date}T12:00:00Z`);
    const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 1 = Monday...

    for (const routine of routines) {
      // Check if routine is scheduled for this day
      let isScheduled = false;
      if (routine.frequency === RecurrenceFrequency.DAILY) {
        isScheduled = true;
      } else if (routine.frequency === RecurrenceFrequency.WEEKDAYS) {
        isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
      } else if (routine.frequency === RecurrenceFrequency.WEEKENDS) {
        isScheduled = dayOfWeek === 0 || dayOfWeek === 6;
      } else if (routine.frequency === RecurrenceFrequency.CUSTOM) {
        isScheduled = routine.customDays.includes(dayOfWeek);
      }

      if (!isScheduled) continue;

      // Upsert occurrence for this date so it's permanently recorded
      const occurrence = await this.prisma.routineOccurrence.upsert({
        where: {
          routineId_date: {
            routineId: routine.id,
            date,
          },
        },
        update: {},
        create: {
          routineId: routine.id,
          userId,
          date,
          status: TaskStatus.TODO,
        },
        include: {
          routine: true,
        },
      });

      occurrences.push(occurrence);
    }

    return occurrences;
  }

  async recordOccurrence(
    userId: string,
    occurrenceId: string,
    data: {
      status: TaskStatus;
      actualQuantity?: number;
      notes?: string;
    },
  ) {
    if (!this.prisma.isConnected) {
      return { id: occurrenceId, ...data, completedAt: new Date() };
    }

    const occurrence = await this.prisma.routineOccurrence.findFirst({
      where: { id: occurrenceId, userId },
      include: { routine: true },
    });

    if (!occurrence) {
      throw new NotFoundException(`Routine occurrence ${occurrenceId} not found.`);
    }

    const updated = await this.prisma.routineOccurrence.update({
      where: { id: occurrenceId },
      data: {
        status: data.status,
        actualQuantity: data.actualQuantity,
        notes: data.notes,
        completedAt: data.status === TaskStatus.COMPLETED ? new Date() : null,
      },
    });

    // Recalculate streak if marked completed
    if (data.status === TaskStatus.COMPLETED) {
      const recentOccurrences = await this.prisma.routineOccurrence.findMany({
        where: { routineId: occurrence.routineId },
        orderBy: { date: 'desc' },
        take: 30,
      });

      let currentStreak = 0;
      for (const occ of recentOccurrences) {
        if (occ.status === TaskStatus.COMPLETED) {
          currentStreak++;
        } else {
          break;
        }
      }

      await this.prisma.routine.update({
        where: { id: occurrence.routineId },
        data: { streakCount: currentStreak },
      });
    }

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);
    return updated;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.routine.delete({ where: { id } });
    await this.redis.invalidatePattern(`dashboard:${userId}:*`);
    return { success: true };
  }
}
