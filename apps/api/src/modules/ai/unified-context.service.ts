import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { NotificationCapabilityService } from '../mobile/notification-capability.service';

export interface UnifiedContextSnapshot {
  timestamp: string;
  user: {
    id: string;
    email?: string;
  };
  operational: {
    activeTasksCount: number;
    topTasks: Array<{ id: string; title: string; priority: string; status: string; deadline?: string | null }>;
    todayRoutines: Array<{ id: string; title: string; isCompleted: boolean; targetTime?: string }>;
    activeProjects: Array<{ id: string; name: string; progress: number }>;
  };
  mobileIntelligence: {
    pairedDevicesCount: number;
    capabilityState: string;
    isNotificationAccessGranted: boolean;
    isListenerConnected: boolean;
    recentEvents: Array<{
      id: string;
      sourceApp: string;
      appName?: string | null;
      category: string;
      title?: string | null;
      summary?: string | null;
      occurredAt: string;
    }>;
    aiDirective: string;
  };
  memories: Array<{
    category: string;
    key: string;
    value: string;
    source: string;
  }>;
  summaryPrompt: string;
}

@Injectable()
export class UnifiedContextService {
  private readonly logger = new Logger(UnifiedContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly capabilityService: NotificationCapabilityService,
  ) {}

  /**
   * Assembles a bounded, relevance-ranked context snapshot for a specific user tenant.
   * Pulls from tasks, routines, projects, mobile events, capability status, and personal memory.
   */
  async assembleContext(userId: string, query?: string): Promise<UnifiedContextSnapshot> {
    const now = new Date();

    const [tasks, routines, projects, capabilityStatus, memoryNotes] = await Promise.all([
      // 1. Active Tasks (Top priority, non-completed)
      this.prisma.task.findMany({
        where: {
          userId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
        orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
        take: 5,
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          deadline: true,
        },
      }),

      // 2. Active Routines
      this.prisma.routine.findMany({
        where: { userId, isActive: true },
        take: 5,
        select: {
          id: true,
          title: true,
          targetTime: true,
        },
      }),

      // 3. Active Projects
      this.prisma.project.findMany({
        where: { userId, status: 'ACTIVE' },
        take: 3,
        select: {
          id: true,
          title: true,
          color: true,
        },
      }),

      // 4. Real-time Android Notification Capability Status
      this.capabilityService.getCapabilityStatus(userId),

      // 5. Explicit & Inferred Personal Memories
      this.prisma.knowledgeNote.findMany({
        where: {
          userId,
          title: { startsWith: '[JARVIS_MEMORY]' },
          isArchived: false,
          deletedAt: null,
        },
        take: 10,
        select: { title: true, content: true },
      }),
    ]);

    // Parse memories safely
    const parsedMemories = memoryNotes.map((note) => {
      try {
        const parsed = JSON.parse(note.content);
        return {
          category: parsed.category || 'PREFERENCE',
          key: parsed.key || note.title.replace('[JARVIS_MEMORY] ', ''),
          value: parsed.value || '',
          source: parsed.source || 'USER_EXPLICIT',
        };
      } catch {
        return {
          category: 'PREFERENCE',
          key: note.title.replace('[JARVIS_MEMORY] ', ''),
          value: note.content,
          source: 'USER_EXPLICIT',
        };
      }
    });

    // Construct bounded prompt summary representation
    const operationalLines: string[] = [];
    if (tasks.length > 0) {
      operationalLines.push(
        `Active Tasks (${tasks.length}): ` +
          tasks.map((t) => `${t.title} [${t.priority}]`).join(', '),
      );
    }
    if (routines.length > 0) {
      operationalLines.push(
        `Routines: ` + routines.map((r) => `${r.title} (${r.targetTime || 'anytime'})`).join(', '),
      );
    }
    if (projects.length > 0) {
      operationalLines.push(`Projects: ` + projects.map((p) => p.title).join(', '));
    }

    const mobileLines: string[] = [
      `Android Notification Integration: ${capabilityStatus.state} (Device: ${capabilityStatus.deviceName || 'None'}, Listener: ${capabilityStatus.isListenerConnected ? 'Connected' : 'Disconnected'})`,
      `AI Guidance: ${capabilityStatus.aiDirective}`,
    ];

    if (capabilityStatus.recentEvents.length > 0) {
      mobileLines.push(
        `Recent Phone Notifications (${capabilityStatus.recentEvents.length}): ` +
          capabilityStatus.recentEvents
            .map((e) => `[${e.appName || e.sourceApp}] ${e.title || ''}: ${e.summary || ''}`)
            .join(' | '),
      );
    }

    const memoryLines = parsedMemories
      .map((m) => `${m.key}: ${m.value} (${m.source})`)
      .join('; ');

    const summaryPrompt = [
      `=== UNIFIED PERSONAL CONTEXT ===`,
      operationalLines.join('\n'),
      mobileLines.join('\n'),
      memoryLines ? `User Preferences & Memory: ${memoryLines}` : '',
      `=================================`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      timestamp: now.toISOString(),
      user: { id: userId },
      operational: {
        activeTasksCount: tasks.length,
        topTasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          status: t.status,
          deadline: t.deadline?.toISOString() || null,
        })),
        todayRoutines: routines.map((r) => ({
          id: r.id,
          title: r.title,
          isCompleted: false,
          targetTime: r.targetTime || undefined,
        })),
        activeProjects: projects.map((p) => ({
          id: p.id,
          name: p.title,
          progress: 50,
        })),
      },
      mobileIntelligence: {
        pairedDevicesCount: capabilityStatus.hasPairedDevice ? 1 : 0,
        capabilityState: capabilityStatus.state,
        isNotificationAccessGranted: capabilityStatus.isPermissionGranted,
        isListenerConnected: capabilityStatus.isListenerConnected,
        recentEvents: capabilityStatus.recentEvents,
        aiDirective: capabilityStatus.aiDirective,
      },
      memories: parsedMemories,
      summaryPrompt,
    };
  }
}
