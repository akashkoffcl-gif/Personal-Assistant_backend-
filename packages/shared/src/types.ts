import {
  TaskCategory,
  TaskStatus,
  SchedulingMode,
  Priority,
  RecurrenceFrequency,
  ReminderStatus,
  ScheduleChangeReason,
  WellnessMetricType,
} from './enums';

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettingsDto {
  id: string;
  userId: string;
  workStartHour: number; // e.g. 9
  workEndHour: number;   // e.g. 18
  quietHoursStart: number; // e.g. 22
  quietHoursEnd: number;   // e.g. 7
  maxFollowUps: number;
  followUpIntervalMinutes: number;
  enablePush: boolean;
  enableGentleReminders: boolean;
  autoRescheduleOnEmergency: boolean;
  defaultBufferMinutes: number;
  preferredWorkDays?: number[];
  defaultTaskDurationMinutes?: number;
  defaultReminderLeadMinutes?: number;
  weekStartDay?: number;
}

export interface ProjectDto {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  color: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  targetDate?: string | null;
  tasksCount?: number;
  completedTasksCount?: number;
  progressPercent?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDto {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  notes?: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: Priority;
  schedulingMode: SchedulingMode;
  estimatedDurationMinutes: number;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  earliestStartTime?: string | null;
  deadline?: string | null;
  maxDelayMinutes?: number | null;
  canSplit: boolean;
  bufferMinutes: number;
  isOverdue?: boolean;
  completedAt?: string | null;
  routineId?: string | null;
  projectId?: string | null;
  parentTaskId?: string | null;
  project?: ProjectDto | null;
  subtasks?: TaskDto[];
  createdAt: string;
  updatedAt: string;
}

export interface RoutineDto {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  frequency: RecurrenceFrequency;
  customDays?: number[]; // 0=Sunday, 1=Monday...
  targetTime?: string | null; // e.g. "08:00"
  timeWindowStart?: string | null;
  timeWindowEnd?: string | null;
  durationMinutes: number;
  targetQuantity?: number | null;
  unit?: string | null;
  isActive: boolean;
  isPaused?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  streakCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineOccurrenceDto {
  id: string;
  routineId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: TaskStatus;
  actualQuantity?: number | null;
  completedAt?: string | null;
  notes?: string | null;
  routine?: RoutineDto;
}

export interface SchedulePlanDto {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  version: number;
  isLocked: boolean;
  tasks: TaskDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleChangeDto {
  id: string;
  userId: string;
  planId: string;
  taskId: string;
  reason: ScheduleChangeReason;
  originalStartTime?: string | null;
  originalEndTime?: string | null;
  revisedStartTime?: string | null;
  revisedEndTime?: string | null;
  createdAt: string;
  taskTitle?: string;
}

export interface ReminderDto {
  id: string;
  userId: string;
  taskId: string;
  triggerTime: string;
  status: ReminderStatus;
  attemptCount: number;
  lastAttemptAt?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  task?: TaskDto;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceType?: string;
  userAgent?: string;
}

export interface WellnessMetricDto {
  id: string;
  userId: string;
  type: WellnessMetricType;
  value: number;
  unit: string;
  notes?: string | null;
  recordedAt: string;
}

export interface WellnessSummaryDto {
  date: string;
  hydrationTotalMl: number;
  exerciseDurationMinutes: number;
  sleepHours: number;
  mealsLogged: number;
  breaksLogged: number;
  averageMood?: number | null;
  averageEnergy?: number | null;
  routineAdherencePercent: number;
  adherenceTrendLabel: 'Consistent' | 'Improving' | 'Needs attention' | 'Insufficient data';
}

export interface DailyKpiSummary {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionRatePercent: number;
  routinesTotal: number;
  routinesCompleted: number;
  routineAdherencePercent: number;
  workTasksTotal: number;
  workTasksCompleted: number;
  overdueTasksCount: number;
}

export interface AutomationRuleDto {
  id: string;
  userId: string;
  name: string;
  ruleType: string;
  condition: Record<string, any>;
  action: Record<string, any>;
  cooldownMinutes: number;
  lastExecutedAt?: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRuleExecutionDto {
  id: string;
  ruleId: string;
  userId: string;
  triggeredBy: string;
  actionTaken: string;
  status: string;
  details?: Record<string, any> | null;
  executedAt: string;
}

// Application Usage Analytics Domain
export interface UsageEventDto {
  id: string;
  userId: string;
  sessionId?: string | null;
  eventName: string;
  module: string;
  feature: string;
  action?: string | null;
  status: string;
  occurredAt: string;
  metadata?: Record<string, any> | null;
}

export interface UsageOverviewDto {
  totalInteractions: number;
  activeDays: number;
  mostUsedModule: string;
  mostUsedFeature: string;
  featuresAdoptedCount: number;
  totalTrackedFeaturesCount: number;
  featuresAdoptedPercent: number;
  automationExecutionsCount: number;
  automationSuccessRatePercent: number;
  reminderSuccessRatePercent: number;
  failedActionsCount: number;
  periodComparisonPercent: number;
}

export interface UsageTrendPoint {
  date: string;
  interactions: number;
  successful: number;
  failed: number;
}

export interface ModuleUsagePoint {
  module: string;
  displayName: string;
  interactions: number;
  percent: number;
  color: string;
}

export interface FeatureAdoptionPoint {
  feature: string;
  displayName: string;
  module: string;
  interactions: number;
  activeDays: number;
  isAdopted: boolean;
  lastUsedAt: string | null;
}

export interface AutomationUsageSummary {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  cooldownSkips: number;
  successRatePercent: number;
  ruleBreakdown: Array<{ ruleId: string; name: string; count: number; successCount: number }>;
}

export interface ReminderOutcomeSummary {
  scheduled: number;
  attempted: number;
  confirmed: number;
  failed: number;
  retryCount: number;
  deliveryRatePercent: number;
}



