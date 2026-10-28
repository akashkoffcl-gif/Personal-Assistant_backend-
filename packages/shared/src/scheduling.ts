import { Priority, SchedulingMode, TaskCategory, TaskStatus } from './enums';

export interface SchedulableTask {
  id: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: Priority;
  schedulingMode: SchedulingMode;
  estimatedDurationMinutes: number;
  bufferMinutes: number;
  scheduledStartTime?: Date | null;
  scheduledEndTime?: Date | null;
  earliestStartTime?: Date | null;
  deadline?: Date | null;
  maxDelayMinutes?: number | null;
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface ScheduleConflict {
  taskId: string;
  taskTitle: string;
  conflictingTaskId?: string;
  conflictingTaskTitle?: string;
  reason: string;
}

export interface ScheduleAssignment {
  taskId: string;
  taskTitle: string;
  startTime: Date;
  endTime: Date;
  isModified: boolean;
  originalStartTime?: Date | null;
  originalEndTime?: Date | null;
}

export interface SchedulingResult {
  success: boolean;
  assignments: ScheduleAssignment[];
  conflicts: ScheduleConflict[];
  emergencyPlaced?: ScheduleAssignment;
  unresolvedTasks: SchedulableTask[];
}

