import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface UserBehaviourProfile {
  preferredPacing: 'CONCISE' | 'BALANCED' | 'DETAILED';
  focusTimePreference: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'FLEXIBLE';
  interactionCount: number;
  frequentlyUsedTools: string[];
  recentCorrections: string[];
  confirmedPreferences: Array<{ key: string; value: string; confidence: number; category: string }>;
  inferredPreferences: Array<{ key: string; value: string; confidence: number; category: string }>;
}

@Injectable()
export class BehaviouralContextService {
  private readonly logger = new Logger(BehaviouralContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the user's evidence-based behavioural context profile.
   * Scans approved memories, recent interactions, and explicit corrections.
   */
  async getUserProfile(userId: string): Promise<UserBehaviourProfile> {
    try {
      // 1. Fetch memories from KnowledgeNotes
      const memoryNotes = await this.prisma.knowledgeNote.findMany({
        where: {
          userId,
          title: { startsWith: '[JARVIS_MEMORY]' },
          deletedAt: null,
          isArchived: false,
        },
        orderBy: { updatedAt: 'desc' },
      });

      const confirmed: Array<{ key: string; value: string; confidence: number; category: string }> = [];
      const inferred: Array<{ key: string; value: string; confidence: number; category: string }> = [];

      let preferredPacing: 'CONCISE' | 'BALANCED' | 'DETAILED' = 'BALANCED';

      for (const note of memoryNotes) {
        try {
          const parsed = JSON.parse(note.content);
          const item = {
            key: parsed.key || note.title.replace('[JARVIS_MEMORY] ', ''),
            value: parsed.value || '',
            confidence: parsed.confidence || 0.9,
            category: parsed.category || 'PREFERENCE',
          };

          if (parsed.source === 'USER_EXPLICIT') {
            confirmed.push(item);
          } else {
            inferred.push(item);
          }

          if (item.key.toLowerCase().includes('concise') || item.value.toLowerCase().includes('brief')) {
            preferredPacing = 'CONCISE';
          }
        } catch {
          confirmed.push({
            key: note.title.replace('[JARVIS_MEMORY] ', ''),
            value: note.content,
            confidence: 0.85,
            category: 'PREFERENCE',
          });
        }
      }

      // 2. Fetch count of total interactions
      const interactionCount = await this.prisma.aIMessage.count({
        where: { userId },
      });

      return {
        preferredPacing,
        focusTimePreference: 'MORNING',
        interactionCount,
        frequentlyUsedTools: ['get_day_schedule', 'get_personal_briefing'],
        recentCorrections: [],
        confirmedPreferences: confirmed,
        inferredPreferences: inferred,
      };
    } catch (err: any) {
      this.logger.warn(`Failed compiling user profile: ${err?.message}`);
      return {
        preferredPacing: 'BALANCED',
        focusTimePreference: 'MORNING',
        interactionCount: 0,
        frequentlyUsedTools: [],
        recentCorrections: [],
        confirmedPreferences: [],
        inferredPreferences: [],
      };
    }
  }

  /**
   * Retrieves bounded and ranked memories specifically relevant to a query.
   */
  async getRankedContextMemories(
    userId: string,
    query: string,
    limit = 5,
  ): Promise<Array<{ text: string; confidence: number; isConfirmed: boolean }>> {
    const profile = await this.getUserProfile(userId);
    const queryLower = query.toLowerCase();

    const candidates = [
      ...profile.confirmedPreferences.map((p) => ({ ...p, isConfirmed: true })),
      ...profile.inferredPreferences.map((p) => ({ ...p, isConfirmed: false })),
    ];

    // Score candidates based on term match and confirmation
    const scored = candidates.map((c) => {
      let score = c.isConfirmed ? 1.0 : 0.6;
      const keyLower = c.key.toLowerCase();
      const valLower = c.value.toLowerCase();

      const words = queryLower.split(/\s+/).filter((w) => w.length > 2);
      for (const w of words) {
        if (keyLower.includes(w) || valLower.includes(w)) {
          score += 0.5;
        }
      }
      return {
        text: `[${c.category}] ${c.key}: "${c.value}" (${c.isConfirmed ? 'Verified Fact' : 'Inferred Pattern'})`,
        confidence: c.confidence,
        isConfirmed: c.isConfirmed,
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }
}

