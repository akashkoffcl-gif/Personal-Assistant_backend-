import { TasksService } from '../src/modules/tasks/tasks.service';
import {
  TaskCategory,
  TaskStatus,
  Priority,
  SchedulingMode,
} from '@assistant/shared';

describe('Tasks CRUD & Persistent History Unit Tests', () => {
  let tasksService: TasksService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockReminders: any;
  let mockOutbox: any;

  const testUserId = '00000000-0000-0000-0000-000000000001';
  let memoryTasks: any[] = [];
  let memoryEvents: any[] = [];

  beforeEach(() => {
    memoryTasks = [];
    memoryEvents = [];

    mockPrisma = {
      isConnected: true,
      task: {
        create: jest.fn(async ({ data }) => {
          const record = { id: `task-${Date.now()}-${Math.random()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          memoryTasks.push(record);
          return record;
        }),
        findFirst: jest.fn(async ({ where }) => {
          return memoryTasks.find((t) => t.id === where.id && t.userId === where.userId) || null;
        }),
        findMany: jest.fn(async ({ where }) => {
          return memoryTasks.filter((t) => {
            if (t.userId !== where.userId) return false;
            if (where.category && t.category !== where.category) return false;
            if (where.status && t.status !== where.status) return false;
            return true;
          });
        }),
        update: jest.fn(async ({ where, data }) => {
          const index = memoryTasks.findIndex((t) => t.id === where.id);
          if (index === -1) throw new Error('Not found');
          memoryTasks[index] = { ...memoryTasks[index], ...data, updatedAt: new Date() };
          return memoryTasks[index];
        }),
        delete: jest.fn(async ({ where }) => {
          const index = memoryTasks.findIndex((t) => t.id === where.id);
          if (index !== -1) memoryTasks.splice(index, 1);
          return { success: true };
        }),
      },
      taskEvent: {
        create: jest.fn(async ({ data }) => {
          const record = { id: `event-${Date.now()}`, ...data, createdAt: new Date() };
          memoryEvents.push(record);
          return record;
        }),
        findMany: jest.fn(async ({ where }) => {
          return memoryEvents.filter((e) => e.taskId === where.taskId && e.userId === where.userId);
        }),
      },
    };

    mockRedis = {
      invalidatePattern: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    mockReminders = {
      scheduleReminderForTask: jest.fn(),
      invalidateTaskReminders: jest.fn(),
    };

    mockOutbox = {
      publish: jest.fn(),
    };

    tasksService = new TasksService(mockPrisma, mockRedis, mockReminders, mockOutbox);
  });

  it('creates tasks across all four categories with valid defaults', async () => {
    const workTask = await tasksService.create(testUserId, {
      title: 'Review Sprint Deliverables',
      category: TaskCategory.WORK,
      priority: Priority.HIGH,
      schedulingMode: SchedulingMode.FLEXIBLE,
      estimatedDurationMinutes: 45,
    });
    expect(workTask.id).toBeDefined();
    expect(workTask.category).toBe(TaskCategory.WORK);
    expect(workTask.status).toBe(TaskStatus.TODO);

    const routineTask = await tasksService.create(testUserId, {
      title: 'Morning Hydration',
      category: TaskCategory.PERSONAL_ROUTINE,
      priority: Priority.MEDIUM,
      estimatedDurationMinutes: 5,
    });
    expect(routineTask.category).toBe(TaskCategory.PERSONAL_ROUTINE);

    const planningTask = await tasksService.create(testUserId, {
      title: 'Weekly Retrospective Agenda',
      category: TaskCategory.DAY_PLAN,
      priority: Priority.LOW,
      estimatedDurationMinutes: 30,
    });
    expect(planningTask.category).toBe(TaskCategory.DAY_PLAN);

    const emergencyTask = await tasksService.create(testUserId, {
      title: 'Database Outage Escalation',
      category: TaskCategory.EMERGENCY,
      priority: Priority.URGENT,
      estimatedDurationMinutes: 60,
    });
    expect(emergencyTask.category).toBe(TaskCategory.EMERGENCY);

    // Verify task events were recorded for each creation
    expect(memoryEvents.length).toBe(4);
    expect(memoryEvents[0].eventType).toBe('CREATED');
  });

  it('updates task properties and records status change events', async () => {
    const task = await tasksService.create(testUserId, {
      title: 'Write Documentation',
      category: TaskCategory.WORK,
    });

    const updated = await tasksService.update(testUserId, task.id, {
      title: 'Write Documentation & Guides',
      status: TaskStatus.IN_PROGRESS,
    });

    expect(updated.title).toBe('Write Documentation & Guides');
    expect(updated.status).toBe(TaskStatus.IN_PROGRESS);

    // Check status change event
    const statusEvent = memoryEvents.find((e) => e.eventType === 'STATUS_CHANGED');
    expect(statusEvent).toBeDefined();
    expect(statusEvent.previousStatus).toBe(TaskStatus.TODO);
    expect(statusEvent.newStatus).toBe(TaskStatus.IN_PROGRESS);
  });

  it('completes a task and records completedAt timestamp and event', async () => {
    const task = await tasksService.create(testUserId, {
      title: 'Walk the dog',
      category: TaskCategory.PERSONAL_ROUTINE,
    });

    const completed = await tasksService.complete(testUserId, task.id);
    expect(completed.status).toBe(TaskStatus.COMPLETED);
    expect(completed.completedAt).toBeDefined();

    // Verify pending reminders were invalidated
    expect(mockReminders.invalidateTaskReminders).toHaveBeenCalledWith(task.id);

    // Verify completion event
    const compEvent = memoryEvents.find((e) => e.eventType === 'COMPLETED');
    expect(compEvent).toBeDefined();
  });

  it('snoozes a task by extending start/end times and logging snooze metadata', async () => {
    const initialStart = new Date('2026-10-29T10:00:00Z');
    const task = await tasksService.create(testUserId, {
      title: 'Follow-up Call',
      category: TaskCategory.WORK,
      scheduledStartTime: initialStart.toISOString(),
      estimatedDurationMinutes: 30,
    });

    const snoozed = await tasksService.snooze(testUserId, task.id, 15, 'Meeting ran over');

    const newStartTime = new Date(snoozed.scheduledStartTime);
    expect(newStartTime.getTime()).toBe(initialStart.getTime() + 15 * 60 * 1000);

    const snoozeEvent = memoryEvents.find((e) => e.eventType === 'SNOOZED');
    expect(snoozeEvent).toBeDefined();
    expect(snoozeEvent.metadata.minutes).toBe(15);
    expect(snoozeEvent.metadata.reason).toBe('Meeting ran over');
  });

  it('reschedules a task and updates reminders', async () => {
    const task = await tasksService.create(testUserId, {
      title: 'Dentist Checkup',
      category: TaskCategory.DAY_PLAN,
      scheduledStartTime: '2026-10-29T14:00:00Z',
    });

    const newTime = '2026-10-29T16:00:00.000Z';
    const rescheduled = await tasksService.reschedule(testUserId, task.id, newTime);

    expect(new Date(rescheduled.scheduledStartTime).toISOString()).toBe(newTime);
    expect(mockReminders.scheduleReminderForTask).toHaveBeenCalledWith(
      testUserId,
      task.id,
      new Date(newTime),
      expect.anything(),
    );
  });

  it('retrieves persistent history events for a task in chronological order', async () => {
    const task = await tasksService.create(testUserId, {
      title: 'Quarterly Review',
      category: TaskCategory.WORK,
    });

    await tasksService.update(testUserId, task.id, { status: TaskStatus.IN_PROGRESS });
    await tasksService.snooze(testUserId, task.id, 20);
    await tasksService.complete(testUserId, task.id);

    const history = await tasksService.getEvents(testUserId, task.id);
    expect(history.length).toBe(4);
    const eventTypes = history.map((h) => h.eventType);
    expect(eventTypes).toContain('CREATED');
    expect(eventTypes).toContain('STATUS_CHANGED');
    expect(eventTypes).toContain('SNOOZED');
    expect(eventTypes).toContain('COMPLETED');
  });

  it('deletes a task and clears associated reminders', async () => {
    const task = await tasksService.create(testUserId, {
      title: 'Temporary Task',
      category: TaskCategory.WORK,
    });

    await tasksService.remove(testUserId, task.id);
    expect(memoryTasks.length).toBe(0);
    expect(mockReminders.invalidateTaskReminders).toHaveBeenCalledWith(task.id);
  });
});

