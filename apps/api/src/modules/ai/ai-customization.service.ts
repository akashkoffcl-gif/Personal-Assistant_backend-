import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface DashboardLayoutConfig {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  density: 'compact' | 'comfortable' | 'spacious';
  assistantName: string;
  widgetOrder: string[];
  hiddenWidgets: string[];
  firstSection: string;
}

const DEFAULT_LAYOUT: DashboardLayoutConfig = {
  theme: 'light',
  accentColor: '#8B45F5', // Lavender primary
  density: 'comfortable',
  assistantName: 'Nova',
  widgetOrder: ['kpi-cards', 'today-schedule', 'routine-checklist', 'analytics-charts', 'right-widgets'],
  hiddenWidgets: [],
  firstSection: 'kpi-cards',
};

@Injectable()
export class AIDashboardCustomizationService {
  private readonly logger = new Logger(AIDashboardCustomizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves persistent dashboard configuration for the authenticated tenant
   */
  async getLayoutConfig(userId: string): Promise<DashboardLayoutConfig> {
    try {
      const configNote = await this.prisma.knowledgeNote.findFirst({
        where: {
          userId,
          title: '[JARVIS_DASHBOARD_CONFIG]',
          deletedAt: null,
        },
      });

      if (!configNote) return DEFAULT_LAYOUT;
      return { ...DEFAULT_LAYOUT, ...JSON.parse(configNote.content) };
    } catch (err: any) {
      this.logger.warn(`Failed loading dashboard configuration: ${err?.message}`);
      return DEFAULT_LAYOUT;
    }
  }

  /**
   * Updates partial or full dashboard layout configuration
   */
  async updateLayoutConfig(userId: string, partial: Partial<DashboardLayoutConfig>): Promise<DashboardLayoutConfig> {
    const current = await this.getLayoutConfig(userId);
    const updated: DashboardLayoutConfig = { ...current, ...partial };

    const existing = await this.prisma.knowledgeNote.findFirst({
      where: {
        userId,
        title: '[JARVIS_DASHBOARD_CONFIG]',
        deletedAt: null,
      },
    });

    const content = JSON.stringify(updated);

    if (existing) {
      await this.prisma.knowledgeNote.update({
        where: { id: existing.id },
        data: { content, updatedAt: new Date() },
      });
    } else {
      await this.prisma.knowledgeNote.create({
        data: {
          userId,
          title: '[JARVIS_DASHBOARD_CONFIG]',
          content,
          category: 'NOTE',
        },
      });
    }

    this.logger.log(`[JARVIS Customization] Updated dashboard configuration for user ${userId}`);
    return updated;
  }

  /**
   * Resets layout configuration to defaults
   */
  async resetToDefaults(userId: string): Promise<DashboardLayoutConfig> {
    return this.updateLayoutConfig(userId, DEFAULT_LAYOUT);
  }
}
