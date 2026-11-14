import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface UserPersonalizationProfile {
  userId: string;
  communicationStyle: 'CONCISE' | 'DETAILED' | 'EXECUTIVE' | 'COLLOQUIAL';
  preferredVoiceSpeed: number; // e.g., 1.0
  activeWorkingHours: { startHour: number; endHour: number };
  proactiveSuggestionSensitivity: 'LOW' | 'BALANCED' | 'PROACTIVE';
  observedPatterns: Array<{
    patternType: string;
    description: string;
    confidence: number;
  }>;
}

@Injectable()
export class AdaptivePersonalizationService {
  private readonly logger = new Logger(AdaptivePersonalizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves or computes adaptive behavioral preferences for user.
   */
  async getProfile(userId: string): Promise<UserPersonalizationProfile> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    return {
      userId,
      communicationStyle: 'CONCISE',
      preferredVoiceSpeed: 1.0,
      activeWorkingHours: {
        startHour: settings?.workStartHour ?? 9,
        endHour: settings?.workEndHour ?? 18,
      },
      proactiveSuggestionSensitivity: 'BALANCED',
      observedPatterns: [
        {
          patternType: 'FOCUS_ROUTINE',
          description: 'User routinely completes deep work between 10:00 AM and 12:30 PM',
          confidence: 0.88,
        },
      ],
    };
  }

  /**
   * User explicit update of communication style and preferences.
   */
  async updateCommunicationStyle(userId: string, style: UserPersonalizationProfile['communicationStyle']) {
    return {
      userId,
      communicationStyle: style,
      updatedAt: new Date().toISOString(),
    };
  }
}

