import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    if (!this.prisma.isConnected) {
      return {
        id: 'mock-settings',
        userId,
        workStartHour: 9,
        workEndHour: 18,
        quietHoursStart: 22,
        quietHoursEnd: 7,
        maxFollowUps: 3,
        followUpIntervalMinutes: 15,
        enablePush: true,
        enableGentleReminders: true,
        autoRescheduleOnEmergency: true,
        defaultBufferMinutes: 10,
      };
    }

    return this.prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async updateSettings(userId: string, data: any) {
    if (!this.prisma.isConnected) {
      return { id: 'mock-settings', userId, ...data };
    }

    return this.prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async exportUserData(userId: string) {
    if (!this.prisma.isConnected) {
      return { userId, tasks: [], routines: [], exportTimestamp: new Date().toISOString() };
    }

    const [tasks, routines, routineOccurrences, wellnessMetrics, wellnessCheckIns, taskEvents, scheduleChanges] =
      await Promise.all([
        this.prisma.task.findMany({ where: { userId } }),
        this.prisma.routine.findMany({ where: { userId } }),
        this.prisma.routineOccurrence.findMany({ where: { userId } }),
        this.prisma.wellnessMetric.findMany({ where: { userId } }),
        this.prisma.wellnessCheckIn.findMany({ where: { userId } }),
        this.prisma.taskEvent.findMany({ where: { userId } }),
        this.prisma.scheduleChange.findMany({ where: { userId } }),
      ]);

    return {
      userId,
      exportTimestamp: new Date().toISOString(),
      tasks,
      routines,
      routineOccurrences,
      wellnessMetrics,
      wellnessCheckIns,
      taskEvents,
      scheduleChanges,
    };
  }

  async deleteUserData(userId: string) {
    if (!this.prisma.isConnected) return { success: true };
    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true, message: 'All personal data deleted permanently.' };
  }
}

