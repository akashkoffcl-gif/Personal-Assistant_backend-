import fs from 'fs';

const filePath = 'apps/api/src/modules/analytics/analytics.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

const methodSnippet = `
  // ==========================================================================
  // PHASE 43.2: INTELLIGENT DAILY CHRONOLOGICAL EXECUTION TIMELINE
  // ==========================================================================
  async getDayTimelineData(userId: string, date: string) {
    const startOfDay = new Date(\`\${date}T00:00:00.000Z\`);
    const endOfDay = new Date(\`\${date}T23:59:59.999Z\`);
    const now = new Date();

    if (!this.prisma.isConnected) {
      return {
        date,
        summary: { total: 0, completed: 0, inProgress: 0, overdue: 0, pending: 0, completionPercentage: 0, isAllCompleted: false },
        currentActiveItem: null,
        nextRecommendedItem: null,
        timeline: [],
        unscheduledTasks: [],
      };
    }

    try {
      const scheduledTasks = await this.prisma.task.findMany({
        where: {
          userId,
          OR: [
            { scheduledStartTime: { gte: startOfDay, lte: endOfDay } },
            { deadline: { gte: startOfDay, lte: endOfDay } },
          ],
        },
        include: { project: true, subtasks: true },
        orderBy: [{ scheduledStartTime: 'asc' }, { priority: 'desc' }],
      });

      const unscheduledTasks = await this.prisma.task.findMany({
        where: {
          userId,
          scheduledStartTime: null,
          OR: [
            { deadline: { gte: startOfDay, lte: endOfDay } },
            { createdAt: { gte: startOfDay, lte: endOfDay } },
          ],
          status: { not: TaskStatus.COMPLETED },
        },
        include: { project: true, subtasks: true },
        take: 10,
      });

      const routineOccurrences = await this.prisma.routineOccurrence.findMany({
        where: { userId, date },
        include: { routine: true },
        orderBy: { createdAt: 'asc' },
      });

      const focusSessions = await this.prisma.focusSession.findMany({
        where: {
          userId,
          startedAt: { gte: startOfDay, lte: endOfDay },
        },
        include: { task: true },
        orderBy: { startedAt: 'asc' },
      });

      const reminders = await this.prisma.reminder.findMany({
        where: {
          userId,
          triggerTime: { gte: startOfDay, lte: endOfDay },
        },
        include: { task: true },
        orderBy: { triggerTime: 'asc' },
      });

      const timelineItems: Array<any> = [];

      for (const t of scheduledTasks) {
        const isPast = t.scheduledStartTime ? new Date(t.scheduledStartTime) < now : false;
        const isDeadlinePast = t.deadline ? new Date(t.deadline) < now : false;

        let status = 'PENDING';
        if (t.status === TaskStatus.COMPLETED) {
          status = 'COMPLETED';
        } else if (t.status === TaskStatus.IN_PROGRESS) {
          status = 'IN_PROGRESS';
        } else if (t.status === TaskStatus.CANCELLED) {
          status = 'CANCELLED';
        } else if (t.status === TaskStatus.SKIPPED) {
          status = 'SKIPPED';
        } else if (isDeadlinePast || (isPast && t.status === TaskStatus.TODO)) {
          status = 'OVERDUE';
        } else if (t.scheduledStartTime && new Date(t.scheduledStartTime) > now) {
          status = 'UPCOMING';
        }

        const scheduledTimeStr = t.scheduledStartTime
          ? t.scheduledStartTime.toISOString()
          : t.deadline
          ? t.deadline.toISOString()
          : \`\${date}T09:00:00.000Z\`;

        timelineItems.push({
          id: \`task-\${t.id}\`,
          sourceId: t.id,
          itemType: 'TASK',
          title: t.title,
          description: t.notes || undefined,
          scheduledTime: scheduledTimeStr,
          endTime: t.scheduledEndTime ? t.scheduledEndTime.toISOString() : undefined,
          durationMinutes: t.actualDurationMinutes || t.estimatedDurationMinutes || 30,
          status,
          priority: t.priority,
          project: t.project ? { id: t.project.id, title: t.project.title, color: t.project.color } : undefined,
          progressPercent: t.subtasks?.length
            ? Math.round((t.subtasks.filter((s: any) => s.isCompleted).length / t.subtasks.length) * 100)
            : t.status === TaskStatus.COMPLETED
            ? 100
            : 0,
          canComplete: t.status !== TaskStatus.COMPLETED,
          canStart: t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.IN_PROGRESS,
        });
      }

      for (const r of routineOccurrences) {
        const routineTime = \`\${date}T08:00:00.000Z\`;
        timelineItems.push({
          id: \`routine-\${r.id}\`,
          sourceId: r.id,
          itemType: 'ROUTINE',
          title: r.routine.title,
          description: \`Target: \${r.routine.targetQuantity} \${r.routine.unit || 'units'}\`,
          scheduledTime: routineTime,
          status: r.status === TaskStatus.COMPLETED ? 'COMPLETED' : r.status === TaskStatus.SKIPPED ? 'SKIPPED' : 'PENDING',
          priority: 'MEDIUM',
          progressPercent: r.status === TaskStatus.COMPLETED ? 100 : Math.round((r.actualQuantity / Math.max(1, r.routine.targetQuantity)) * 100),
          canComplete: r.status !== TaskStatus.COMPLETED,
          canStart: false,
        });
      }

      for (const f of focusSessions) {
        timelineItems.push({
          id: \`focus-\${f.id}\`,
          sourceId: f.id,
          itemType: 'FOCUS',
          title: \`Focus Session: \${f.task?.title || 'Deep Work'}\`,
          description: f.notes || undefined,
          scheduledTime: f.startedAt.toISOString(),
          endTime: f.endedAt ? f.endedAt.toISOString() : undefined,
          durationMinutes: Math.round(f.durationSeconds / 60),
          status: f.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
          priority: 'HIGH',
          project: f.task?.projectId ? { id: f.task.projectId, title: 'Project Focus' } : undefined,
          progressPercent: f.status === 'COMPLETED' ? 100 : 50,
          canComplete: f.status !== 'COMPLETED',
          canStart: false,
        });
      }

      for (const rem of reminders) {
        timelineItems.push({
          id: \`reminder-\${rem.id}\`,
          sourceId: rem.id,
          itemType: 'REMINDER',
          title: \`Reminder: \${rem.task?.title || 'Personal Alert'}\`,
          description: \`Delivery state: \${rem.status}\`,
          scheduledTime: rem.triggerTime.toISOString(),
          status: rem.status === 'TRIGGERED' || rem.status === 'ACKNOWLEDGED' ? 'COMPLETED' : 'UPCOMING',
          priority: rem.task?.priority || 'HIGH',
          progressPercent: rem.status === 'TRIGGERED' ? 100 : 0,
          canComplete: rem.status !== 'ACKNOWLEDGED' && rem.status !== 'TRIGGERED',
          canStart: false,
        });
      }

      timelineItems.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

      const total = timelineItems.length;
      const completed = timelineItems.filter((i) => i.status === 'COMPLETED').length;
      const inProgress = timelineItems.filter((i) => i.status === 'IN_PROGRESS').length;
      const overdue = timelineItems.filter((i) => i.status === 'OVERDUE').length;
      const pending = timelineItems.filter((i) => i.status === 'PENDING' || i.status === 'UPCOMING').length;
      const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      const currentActiveItem = timelineItems.find((i) => i.status === 'IN_PROGRESS') || null;
      const nextRecommendedItem =
        currentActiveItem ||
        timelineItems.find((i) => i.status === 'UPCOMING' || i.status === 'PENDING' || i.status === 'OVERDUE') ||
        null;

      return {
        date,
        summary: {
          total,
          completed,
          inProgress,
          overdue,
          pending,
          completionPercentage,
          isAllCompleted: total > 0 && completed === total,
        },
        currentActiveItem,
        nextRecommendedItem,
        timeline: timelineItems,
        unscheduledTasks: unscheduledTasks.map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          estimatedDurationMinutes: t.estimatedDurationMinutes || 30,
          project: t.project ? { id: t.project.id, title: t.project.title, color: t.project.color } : null,
        })),
      };
    } catch (err: any) {
      this.logger.error(\`Failed to get Day Timeline: \${err?.message}\`);
      throw err;
    }
  }
}
`;

const lastBrace = content.lastIndexOf('}');
if (lastBrace !== -1) {
  const updated = content.slice(0, lastBrace) + methodSnippet;
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully written getDayTimelineData to analytics.service.ts!');
} else {
  console.error('Could not find class closing brace');
}

