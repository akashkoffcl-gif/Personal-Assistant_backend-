import { z } from 'zod';
import {
  TaskCategory,
  TaskStatus,
  SchedulingMode,
  Priority,
  RecurrenceFrequency,
  WellnessMetricType,
} from './enums';

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  category: z.nativeEnum(TaskCategory),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  schedulingMode: z.nativeEnum(SchedulingMode).default(SchedulingMode.FLEXIBLE),
  estimatedDurationMinutes: z.number().int().min(5).max(720).default(30),
  scheduledStartTime: z.string().datetime().optional().nullable(),
  scheduledEndTime: z.string().datetime().optional().nullable(),
  earliestStartTime: z.string().datetime().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  maxDelayMinutes: z.number().int().min(0).optional().nullable(),
  canSplit: z.boolean().default(false),
  bufferMinutes: z.number().int().min(0).max(120).default(5),
  routineId: z.string().uuid().optional().nullable(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.nativeEnum(TaskStatus).optional(),
});

export const SnoozeTaskSchema = z.object({
  minutes: z.number().int().min(5).max(1440).default(15),
  reason: z.string().max(200).optional(),
});

export const RescheduleTaskSchema = z.object({
  scheduledStartTime: z.string().datetime(),
  scheduledEndTime: z.string().datetime().optional(),
});

export const CreateEmergencyTaskSchema = z.object({
  title: z.string().min(1, 'Emergency title is required').max(200),
  description: z.string().max(2000).optional(),
  estimatedDurationMinutes: z.number().int().min(5).max(480).default(60),
  deadline: z.string().datetime().optional(),
  earliestStartTime: z.string().datetime().optional(),
  bufferMinutes: z.number().int().min(0).default(10),
  autoRescheduleFlexible: z.boolean().default(true),
});

export const CreateRoutineSchema = z.object({
  title: z.string().min(1, 'Routine title is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  frequency: z.nativeEnum(RecurrenceFrequency).default(RecurrenceFrequency.DAILY),
  customDays: z.array(z.number().int().min(0).max(6)).optional(),
  targetTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format HH:MM').optional().nullable(),
  timeWindowStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  timeWindowEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  durationMinutes: z.number().int().min(1).max(360).default(15),
  targetQuantity: z.number().positive().optional().nullable(),
  unit: z.string().max(20).optional().nullable(),
});

export const RecordOccurrenceSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  actualQuantity: z.number().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const CreateWellnessMetricSchema = z.object({
  type: z.nativeEnum(WellnessMetricType),
  value: z.number().positive(),
  unit: z.string().min(1).max(20),
  notes: z.string().max(500).optional().nullable(),
  recordedAt: z.string().datetime().optional(),
});

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  deviceType: z.string().optional(),
  userAgent: z.string().optional(),
});

export const UserSettingsSchema = z.object({
  workStartHour: z.number().int().min(0).max(23).default(9),
  workEndHour: z.number().int().min(1).max(24).default(18),
  quietHoursStart: z.number().int().min(0).max(23).default(22),
  quietHoursEnd: z.number().int().min(0).max(23).default(7),
  maxFollowUps: z.number().int().min(0).max(10).default(3),
  followUpIntervalMinutes: z.number().int().min(5).max(120).default(15),
  enablePush: z.boolean().default(true),
  enableGentleReminders: z.boolean().default(true),
  autoRescheduleOnEmergency: z.boolean().default(true),
  defaultBufferMinutes: z.number().int().min(0).max(60).default(10),
});

