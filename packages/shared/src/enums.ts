export enum TaskCategory {
  PERSONAL_ROUTINE = 'PERSONAL_ROUTINE',
  WORK = 'WORK',
  DAY_PLAN = 'DAY_PLAN',
  EMERGENCY = 'EMERGENCY',
  ROUTINE = 'PERSONAL_ROUTINE',
  PLANNING = 'DAY_PLAN',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

export const VALID_TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.SKIPPED, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.TODO, TaskStatus.SKIPPED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
  [TaskStatus.SKIPPED]: [TaskStatus.TODO],
  [TaskStatus.CANCELLED]: [TaskStatus.TODO],
};

export function isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return VALID_TASK_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export enum SchedulingMode {
  FIXED = 'FIXED',
  FLEXIBLE = 'FLEXIBLE',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKDAYS = 'WEEKDAYS',
  WEEKENDS = 'WEEKENDS',
  WEEKLY = 'WEEKLY',
  CUSTOM = 'CUSTOM',
}

export enum ReminderStatus {
  SCHEDULED = 'SCHEDULED',
  ENQUEUED = 'ENQUEUED',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  DISMISSED = 'DISMISSED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ScheduleChangeReason {
  EMERGENCY_INSERTION = 'EMERGENCY_INSERTION',
  MANUAL_RESCHEDULE = 'MANUAL_RESCHEDULE',
  CONFLICT_RESOLVED = 'CONFLICT_RESOLVED',
  EMERGENCY_CANCELLED = 'EMERGENCY_CANCELLED',
  PLAN_OPTIMIZATION = 'PLAN_OPTIMIZATION',
}

export enum WellnessMetricType {
  HYDRATION = 'HYDRATION',
  EXERCISE = 'EXERCISE',
  MEAL = 'MEAL',
  SLEEP = 'SLEEP',
  BREAK = 'BREAK',
  MOOD = 'MOOD',
  ENERGY = 'ENERGY',
}

export enum OutboxEventStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

