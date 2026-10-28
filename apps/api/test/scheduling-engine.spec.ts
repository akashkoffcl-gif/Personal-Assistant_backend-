import { SchedulingEngineService } from '../src/modules/scheduling/scheduling-engine.service';
import {
  Priority,
  SchedulingMode,
  TaskCategory,
  TaskStatus,
  SchedulableTask,
} from '@assistant/shared';

describe('SchedulingEngineService', () => {
  let engine: SchedulingEngineService;

  beforeEach(() => {
    engine = new SchedulingEngineService();
  });

  const baseDate = new Date('2026-10-29T00:00:00.000Z');
  const dayStart = new Date('2026-10-29T09:00:00.000Z');
  const dayEnd = new Date('2026-10-29T18:00:00.000Z');

  it('preserves FIXED appointments at their exact scheduled time', () => {
    const fixedAppointment: SchedulableTask = {
      id: 'task-fixed-1',
      title: 'Doctor Appointment',
      category: TaskCategory.PLANNING,
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      schedulingMode: SchedulingMode.FIXED,
      estimatedDurationMinutes: 60,
      bufferMinutes: 10,
      scheduledStartTime: new Date('2026-10-29T10:00:00.000Z'),
      scheduledEndTime: new Date('2026-10-29T11:00:00.000Z'),
    };

    const flexibleTask: SchedulableTask = {
      id: 'task-flex-1',
      title: 'Coding Task',
      category: TaskCategory.WORK,
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      schedulingMode: SchedulingMode.FLEXIBLE,
      estimatedDurationMinutes: 60,
      bufferMinutes: 10,
    };

    const result = engine.planDay([fixedAppointment, flexibleTask], dayStart, dayEnd);

    expect(result.success).toBe(true);
    const fixedAssignment = result.assignments.find((a) => a.taskId === 'task-fixed-1');
    expect(fixedAssignment).toBeDefined();
    expect(fixedAssignment!.startTime.toISOString()).toBe('2026-10-29T10:00:00.000Z');
    expect(fixedAssignment!.endTime.toISOString()).toBe('2026-10-29T11:00:00.000Z');
    expect(fixedAssignment!.isModified).toBe(false);
  });

  it('moves FLEXIBLE tasks into available slots without overlapping FIXED tasks', () => {
    const fixedAppointment: SchedulableTask = {
      id: 'task-fixed-1',
      title: 'Team Sync',
      category: TaskCategory.WORK,
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      schedulingMode: SchedulingMode.FIXED,
      estimatedDurationMinutes: 60,
      bufferMinutes: 10,
      scheduledStartTime: new Date('2026-10-29T09:00:00.000Z'),
      scheduledEndTime: new Date('2026-10-29T10:00:00.000Z'),
    };

    const flexibleTask: SchedulableTask = {
      id: 'task-flex-1',
      title: 'Review PR',
      category: TaskCategory.WORK,
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      schedulingMode: SchedulingMode.FLEXIBLE,
      estimatedDurationMinutes: 45,
      bufferMinutes: 15,
    };

    const result = engine.planDay([fixedAppointment, flexibleTask], dayStart, dayEnd);

    expect(result.success).toBe(true);
    const flexAssignment = result.assignments.find((a) => a.taskId === 'task-flex-1');
    expect(flexAssignment).toBeDefined();
    // After 10:00 + 15 min buffer = 10:15
    expect(flexAssignment!.startTime.getTime()).toBeGreaterThanOrEqual(
      new Date('2026-10-29T10:15:00.000Z').getTime(),
    );
  });

  it('places EMERGENCY tasks and automatically reorganizes flexible tasks', () => {
    const fixedAppointment: SchedulableTask = {
      id: 'task-fixed-1',
      title: 'Client Demo',
      category: TaskCategory.WORK,
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      schedulingMode: SchedulingMode.FIXED,
      estimatedDurationMinutes: 60,
      bufferMinutes: 10,
      scheduledStartTime: new Date('2026-10-29T14:00:00.000Z'),
      scheduledEndTime: new Date('2026-10-29T15:00:00.000Z'),
    };

    const flexibleTask: SchedulableTask = {
      id: 'task-flex-1',
      title: 'Write Documentation',
      category: TaskCategory.WORK,
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      schedulingMode: SchedulingMode.FLEXIBLE,
      estimatedDurationMinutes: 120,
      bufferMinutes: 10,
      scheduledStartTime: new Date('2026-10-29T09:30:00.000Z'),
      scheduledEndTime: new Date('2026-10-29T11:30:00.000Z'),
    };

    const emergencyTask: SchedulableTask = {
      id: 'task-emergency-1',
      title: 'Production Outage Hotfix',
      category: TaskCategory.EMERGENCY,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      schedulingMode: SchedulingMode.FIXED,
      estimatedDurationMinutes: 90,
      bufferMinutes: 10,
      earliestStartTime: new Date('2026-10-29T09:00:00.000Z'),
    };

    const result = engine.planDay(
      [fixedAppointment, flexibleTask],
      dayStart,
      dayEnd,
      emergencyTask,
    );

    expect(result.emergencyPlaced).toBeDefined();
    expect(result.emergencyPlaced!.taskId).toBe('task-emergency-1');
    expect(result.emergencyPlaced!.startTime.toISOString()).toBe('2026-10-29T09:00:00.000Z');

    // Verify fixed appointment remains untouched
    const fixedAssignment = result.assignments.find((a) => a.taskId === 'task-fixed-1');
    expect(fixedAssignment!.startTime.toISOString()).toBe('2026-10-29T14:00:00.000Z');

    // Flexible task was moved to slot after emergency hotfix
    const flexAssignment = result.assignments.find((a) => a.taskId === 'task-flex-1');
    expect(flexAssignment!.startTime.getTime()).toBeGreaterThanOrEqual(
      result.emergencyPlaced!.endTime.getTime(),
    );
  });

  it('detects deadline violations as explicit conflicts without silent dropping', () => {
    const fixedTask: SchedulableTask = {
      id: 'task-fixed-1',
      title: 'Morning Conference',
      category: TaskCategory.PLANNING,
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      schedulingMode: SchedulingMode.FIXED,
      estimatedDurationMinutes: 180, // 3 hours (09:00 to 12:00)
      bufferMinutes: 10,
      scheduledStartTime: new Date('2026-10-29T09:00:00.000Z'),
      scheduledEndTime: new Date('2026-10-29T12:00:00.000Z'),
    };

    const tightTask: SchedulableTask = {
      id: 'task-tight-1',
      title: 'Submit Tax Form',
      category: TaskCategory.WORK,
      status: TaskStatus.TODO,
      priority: Priority.URGENT,
      schedulingMode: SchedulingMode.FLEXIBLE,
      estimatedDurationMinutes: 60,
      bufferMinutes: 10,
      deadline: new Date('2026-10-29T11:00:00.000Z'), // deadline at 11:00 (inside conference)
    };

    const result = engine.planDay([fixedTask, tightTask], dayStart, dayEnd);

    // Conflict should be detected because it cannot finish before 11:00
    expect(result.conflicts.length).toBeGreaterThan(0);
    const deadlineConflict = result.conflicts.find((c) => c.taskId === 'task-tight-1');
    expect(deadlineConflict).toBeDefined();
    expect(deadlineConflict!.reason).toContain('exceeds deadline');
  });

  it('does not reschedule or modify COMPLETED tasks', () => {
    const completedTask: SchedulableTask = {
      id: 'task-comp-1',
      title: 'Morning Jog',
      category: TaskCategory.ROUTINE,
      status: TaskStatus.COMPLETED,
      priority: Priority.MEDIUM,
      schedulingMode: SchedulingMode.FLEXIBLE,
      estimatedDurationMinutes: 30,
      bufferMinutes: 5,
      scheduledStartTime: new Date('2026-10-29T07:00:00.000Z'),
      scheduledEndTime: new Date('2026-10-29T07:30:00.000Z'),
    };

    const emergency: SchedulableTask = {
      id: 'task-em-2',
      title: 'Urgent Call',
      category: TaskCategory.EMERGENCY,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      schedulingMode: SchedulingMode.FIXED,
      estimatedDurationMinutes: 30,
      bufferMinutes: 5,
    };

    const result = engine.planDay([completedTask], dayStart, dayEnd, emergency);

    const compAssignment = result.assignments.find((a) => a.taskId === 'task-comp-1');
    expect(compAssignment!.isModified).toBe(false);
    expect(compAssignment!.startTime.toISOString()).toBe('2026-10-29T07:00:00.000Z');
  });
});
