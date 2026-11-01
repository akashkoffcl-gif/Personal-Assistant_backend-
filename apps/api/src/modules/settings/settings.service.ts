import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface UserSettingsPayload {
  workStartHour?: number;
  workEndHour?: number;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  maxFollowUps?: number;
  followUpIntervalMinutes?: number;
  enablePush?: boolean;
  enableGentleReminders?: boolean;
  autoRescheduleOnEmergency?: boolean;
  defaultBufferMinutes?: number;
  preferredWorkDays?: number[];
  defaultTaskDurationMinutes?: number;
  defaultReminderLeadMinutes?: number;
  weekStartDay?: number;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves user settings, safely initializing defaults if missing.
   * Guarantees strict user data isolation.
   */
  async getSettings(userId: string) {
    if (!userId) {
      throw new InternalServerErrorException('User ID must be provided to retrieve settings');
    }

    try {
      return await this.prisma.withRetry(async () => {
        // 1. Look for existing settings
        let settings = await this.prisma.userSettings.findUnique({
          where: { userId },
        });

        if (settings) {
          return settings;
        }

        // 2. Settings missing: Ensure User entity exists before creating settings
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          this.logger.log(`User ${userId} not found in database. Initializing User record...`);
          await this.prisma.user.create({
            data: {
              id: userId,
              email: `${userId}@assistant.local`,
              timezone: 'UTC',
            },
          });
        }

        // 3. Create default settings for this user
        this.logger.log(`Initializing default UserSettings for user ${userId}...`);
        settings = await this.prisma.userSettings.create({
          data: {
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
            preferredWorkDays: [1, 2, 3, 4, 5],
            defaultTaskDurationMinutes: 30,
            defaultReminderLeadMinutes: 15,
            weekStartDay: 1,
          },
        });

        return settings;
      });
    } catch (err: any) {
      this.logger.error(`Failed to retrieve or initialize settings for user ${userId}: ${err?.message}`, err?.stack);
      throw new InternalServerErrorException(`Database error while fetching settings: ${err?.message || 'Unknown error'}`);
    }
  }

  /**
   * Updates user settings safely with field sanitization.
   */
  async updateSettings(userId: string, data: UserSettingsPayload) {
    if (!userId) {
      throw new InternalServerErrorException('User ID must be provided to update settings');
    }

    // Whitelist only allowed settings fields
    const sanitized: UserSettingsPayload = {};
    if (data.workStartHour !== undefined) sanitized.workStartHour = Number(data.workStartHour);
    if (data.workEndHour !== undefined) sanitized.workEndHour = Number(data.workEndHour);
    if (data.quietHoursStart !== undefined) sanitized.quietHoursStart = Number(data.quietHoursStart);
    if (data.quietHoursEnd !== undefined) sanitized.quietHoursEnd = Number(data.quietHoursEnd);
    if (data.maxFollowUps !== undefined) sanitized.maxFollowUps = Number(data.maxFollowUps);
    if (data.followUpIntervalMinutes !== undefined) sanitized.followUpIntervalMinutes = Number(data.followUpIntervalMinutes);
    if (data.enablePush !== undefined) sanitized.enablePush = Boolean(data.enablePush);
    if (data.enableGentleReminders !== undefined) sanitized.enableGentleReminders = Boolean(data.enableGentleReminders);
    if (data.autoRescheduleOnEmergency !== undefined) sanitized.autoRescheduleOnEmergency = Boolean(data.autoRescheduleOnEmergency);
    if (data.defaultBufferMinutes !== undefined) sanitized.defaultBufferMinutes = Number(data.defaultBufferMinutes);
    if (Array.isArray(data.preferredWorkDays)) sanitized.preferredWorkDays = data.preferredWorkDays.map(Number);
    if (data.defaultTaskDurationMinutes !== undefined) sanitized.defaultTaskDurationMinutes = Number(data.defaultTaskDurationMinutes);
    if (data.defaultReminderLeadMinutes !== undefined) sanitized.defaultReminderLeadMinutes = Number(data.defaultReminderLeadMinutes);
    if (data.weekStartDay !== undefined) sanitized.weekStartDay = Number(data.weekStartDay);

    try {
      return await this.prisma.withRetry(async () => {
        // Ensure user exists first
        await this.getSettings(userId);

        return await this.prisma.userSettings.update({
          where: { userId },
          data: sanitized,
        });
      });
    } catch (err: any) {
      this.logger.error(`Failed to update settings for user ${userId}: ${err?.message}`, err?.stack);
      throw new InternalServerErrorException(`Database error while updating settings: ${err?.message || 'Unknown error'}`);
    }
  }

  /**
   * Exports all personal user data for GDPR / data portability compliance.
   */
  async exportUserData(userId: string) {
    if (!userId) {
      throw new InternalServerErrorException('User ID must be provided');
    }

    try {
      return await this.prisma.withRetry(async () => {
        const tasks = await this.prisma.task.findMany({ where: { userId } });
        const routines = await this.prisma.routine.findMany({ where: { userId } });
        const routineOccurrences = await this.prisma.routineOccurrence.findMany({ where: { userId } });
        const wellnessMetrics = await this.prisma.wellnessMetric.findMany({ where: { userId } });
        const wellnessCheckIns = await this.prisma.wellnessCheckIn.findMany({ where: { userId } });
        const taskEvents = await this.prisma.taskEvent.findMany({ where: { userId } });
        const scheduleChanges = await this.prisma.scheduleChange.findMany({ where: { userId } });
        const settings = await this.prisma.userSettings.findUnique({ where: { userId } });

        return {
          userId,
          exportTimestamp: new Date().toISOString(),
          settings,
          tasks,
          routines,
          routineOccurrences,
          wellnessMetrics,
          wellnessCheckIns,
          taskEvents,
          scheduleChanges,
        };
      });
    } catch (err: any) {
      this.logger.error(`Failed to export data for user ${userId}: ${err?.message}`, err?.stack);
      throw new InternalServerErrorException('Failed to export user data from database');
    }
  }

  /**
   * Permanently deletes all personal user data.
   */
  async deleteUserData(userId: string) {
    if (!userId) {
      throw new InternalServerErrorException('User ID must be provided');
    }

    try {
      return await this.prisma.withRetry(async () => {
        await this.prisma.user.delete({ where: { id: userId } });
        return { success: true, message: 'All personal data deleted permanently.' };
      });
    } catch (err: any) {
      this.logger.error(`Failed to delete account for user ${userId}: ${err?.message}`, err?.stack);
      throw new InternalServerErrorException('Failed to delete user account');
    }
  }
}
