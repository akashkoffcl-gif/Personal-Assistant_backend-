import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface UserMemoryItem {
  id: string;
  category: 'PREFERENCE' | 'WORK_STYLE' | 'COMMUNICATION' | 'DASHBOARD' | 'AUTOMATION';
  key: string;
  value: string;
  source: 'USER_EXPLICIT' | 'ASSISTANT_INFERRED';
  updatedAt: string;
}

@Injectable()
export class AIMemoryService {
  private readonly logger = new Logger(AIMemoryService.name);
  private readonly memoryFolderTag = 'JARVIS_ASSISTANT_MEMORY';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all structured personal memories for a given tenant.
   * Persisted reliably in KnowledgeNote with category NOTE and tagged metadata.
   */
  async getMemories(userId: string): Promise<UserMemoryItem[]> {
    try {
      const memoryNotes = await this.prisma.knowledgeNote.findMany({
        where: {
          userId,
          title: { startsWith: '[JARVIS_MEMORY]' },
          isArchived: false,
          deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
      });

      return memoryNotes.map((note) => {
        try {
          const parsed = JSON.parse(note.content);
          return {
            id: note.id,
            category: parsed.category || 'PREFERENCE',
            key: parsed.key || note.title.replace('[JARVIS_MEMORY] ', ''),
            value: parsed.value || '',
            source: parsed.source || 'USER_EXPLICIT',
            updatedAt: note.updatedAt.toISOString(),
          };
        } catch {
          return {
            id: note.id,
            category: 'PREFERENCE',
            key: note.title.replace('[JARVIS_MEMORY] ', ''),
            value: note.content,
            source: 'USER_EXPLICIT',
            updatedAt: note.updatedAt.toISOString(),
          };
        }
      });
    } catch (err: any) {
      this.logger.warn(`Failed reading personal memories: ${err?.message}`);
      return [];
    }
  }

  /**
   * Upserts or updates a user-approved personal memory item.
   */
  async remember(
    userId: string,
    category: UserMemoryItem['category'],
    key: string,
    value: string,
    source: UserMemoryItem['source'] = 'USER_EXPLICIT',
  ): Promise<UserMemoryItem> {
    const memoryTitle = `[JARVIS_MEMORY] ${key.trim()}`;
    const payload = JSON.stringify({ category, key: key.trim(), value: value.trim(), source });

    const existing = await this.prisma.knowledgeNote.findFirst({
      where: {
        userId,
        title: memoryTitle,
        deletedAt: null,
      },
    });

    let savedNote;
    if (existing) {
      savedNote = await this.prisma.knowledgeNote.update({
        where: { id: existing.id },
        data: {
          content: payload,
          updatedAt: new Date(),
        },
      });
    } else {
      savedNote = await this.prisma.knowledgeNote.create({
        data: {
          userId,
          title: memoryTitle,
          content: payload,
          category: 'NOTE',
        },
      });
    }

    this.logger.log(`[JARVIS Memory] Remembered: [${category}] ${key} = ${value}`);
    return {
      id: savedNote.id,
      category,
      key: key.trim(),
      value: value.trim(),
      source,
      updatedAt: savedNote.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes a specific memory item.
   */
  async forget(userId: string, memoryId: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.knowledgeNote.findFirst({
      where: { id: memoryId, userId },
    });
    if (existing) {
      await this.prisma.knowledgeNote.delete({
        where: { id: memoryId },
      });
    }
    return { success: true };
  }

  /**
   * Formats persistent memories into contextual prompt grounding.
   */
  async getContextualMemoryPrompt(userId: string): Promise<string> {
    const memories = await this.getMemories(userId);
    if (!memories.length) return 'No explicit personal memory entries stored yet.';

    const lines = memories.map((m) => `- [${m.category}] ${m.key}: "${m.value}" (${m.source})`);
    return `Persistent User Memory & Approved Preferences:\n${lines.join('\n')}`;
  }
}
