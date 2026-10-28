-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('ROUTINE', 'WORK', 'PLANNING', 'EMERGENCY');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED');
CREATE TYPE "SchedulingMode" AS ENUM ('FIXED', 'FLEXIBLE');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKDAYS', 'WEEKENDS', 'WEEKLY', 'CUSTOM');
CREATE TYPE "ReminderStatus" AS ENUM ('SCHEDULED', 'ENQUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'DISMISSED', 'FAILED', 'CANCELLED');
CREATE TYPE "ScheduleChangeReason" AS ENUM ('EMERGENCY_INSERTION', 'MANUAL_RESCHEDULE', 'CONFLICT_RESOLVED', 'EMERGENCY_CANCELLED', 'PLAN_OPTIMIZATION');
CREATE TYPE "WellnessMetricType" AS ENUM ('HYDRATION', 'EXERCISE', 'MEAL', 'SLEEP', 'BREAK', 'MOOD', 'ENERGY');
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- 1. Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- 2. User Settings
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workStartHour" INTEGER NOT NULL DEFAULT 9,
    "workEndHour" INTEGER NOT NULL DEFAULT 18,
    "quietHoursStart" INTEGER NOT NULL DEFAULT 22,
    "quietHoursEnd" INTEGER NOT NULL DEFAULT 7,
    "maxFollowUps" INTEGER NOT NULL DEFAULT 3,
    "followUpIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "enablePush" BOOLEAN NOT NULL DEFAULT true,
    "enableGentleReminders" BOOLEAN NOT NULL DEFAULT true,
    "autoRescheduleOnEmergency" BOOLEAN NOT NULL DEFAULT true,
    "defaultBufferMinutes" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- 3. Tasks
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "TaskCategory" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "schedulingMode" "SchedulingMode" NOT NULL DEFAULT 'FLEXIBLE',
    "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "scheduledStartTime" TIMESTAMPTZ,
    "scheduledEndTime" TIMESTAMPTZ,
    "earliestStartTime" TIMESTAMPTZ,
    "deadline" TIMESTAMPTZ,
    "maxDelayMinutes" INTEGER,
    "canSplit" BOOLEAN NOT NULL DEFAULT false,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 5,
    "completedAt" TIMESTAMPTZ,
    "routineId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "tasks_userId_category_idx" ON "tasks"("userId", "category");
CREATE INDEX "tasks_userId_status_idx" ON "tasks"("userId", "status");
CREATE INDEX "tasks_userId_scheduledStartTime_idx" ON "tasks"("userId", "scheduledStartTime");

-- 4. Routines
CREATE TABLE "routines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "RecurrenceFrequency" NOT NULL DEFAULT 'DAILY',
    "customDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "targetTime" TEXT,
    "timeWindowStart" TEXT,
    "timeWindowEnd" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "targetQuantity" DOUBLE PRECISION,
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "routines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "routines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "routines_userId_isActive_idx" ON "routines"("userId", "isActive");

-- Add Routine Foreign Key to Tasks
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Routine Occurrences
CREATE TABLE "routine_occurrences" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "actualQuantity" DOUBLE PRECISION,
    "completedAt" TIMESTAMPTZ,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "routine_occurrences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "routine_occurrences_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "routine_occurrences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "routine_occurrences_routineId_date_key" ON "routine_occurrences"("routineId", "date");
CREATE INDEX "routine_occurrences_userId_date_idx" ON "routine_occurrences"("userId", "date");

-- 6. Schedule Plans
CREATE TABLE "schedule_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "schedule_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "schedule_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "schedule_plans_userId_date_version_key" ON "schedule_plans"("userId", "date", "version");
CREATE INDEX "schedule_plans_userId_date_idx" ON "schedule_plans"("userId", "date");

-- 7. Schedule Changes
CREATE TABLE "schedule_changes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "reason" "ScheduleChangeReason" NOT NULL,
    "originalStartTime" TIMESTAMPTZ,
    "originalEndTime" TIMESTAMPTZ,
    "revisedStartTime" TIMESTAMPTZ,
    "revisedEndTime" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "schedule_changes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "schedule_changes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedule_changes_planId_fkey" FOREIGN KEY ("planId") REFERENCES "schedule_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "schedule_changes_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "schedule_changes_userId_planId_idx" ON "schedule_changes"("userId", "planId");
CREATE INDEX "schedule_changes_taskId_idx" ON "schedule_changes"("taskId");

-- 8. Reminders
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "triggerTime" TIMESTAMPTZ NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMPTZ,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reminders_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "reminders_userId_status_idx" ON "reminders"("userId", "status");
CREATE INDEX "reminders_triggerTime_status_idx" ON "reminders"("triggerTime", "status");

-- 9. Reminder Attempts
CREATE TABLE "reminder_attempts" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "responseCode" INTEGER,
    "errorMessage" TEXT,
    "attemptedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reminder_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reminder_attempts_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "reminder_attempts_reminderId_idx" ON "reminder_attempts"("reminderId");

-- 10. Push Subscriptions
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "deviceType" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_userId_isActive_idx" ON "push_subscriptions"("userId", "isActive");

-- 11. Task Events
CREATE TABLE "task_events" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "previousStatus" "TaskStatus",
    "newStatus" "TaskStatus",
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "task_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "task_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "task_events_taskId_idx" ON "task_events"("taskId");
CREATE INDEX "task_events_userId_createdAt_idx" ON "task_events"("userId", "createdAt");

-- 12. Wellness Metrics
CREATE TABLE "wellness_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WellnessMetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "recordedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wellness_metrics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wellness_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "wellness_metrics_userId_type_recordedAt_idx" ON "wellness_metrics"("userId", "type", "recordedAt");

-- 13. Wellness Check-ins
CREATE TABLE "wellness_check_ins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "energyScore" INTEGER,
    "moodScore" INTEGER,
    "fatigueScore" INTEGER,
    "stressScore" INTEGER,
    "notes" TEXT,
    "checkInDate" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wellness_check_ins_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wellness_check_ins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "wellness_check_ins_userId_checkInDate_key" ON "wellness_check_ins"("userId", "checkInDate");

-- 14. Wellness Daily Summaries
CREATE TABLE "wellness_daily_summaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "hydrationTotalMl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exerciseDurationMinutes" INTEGER NOT NULL DEFAULT 0,
    "sleepHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mealsLogged" INTEGER NOT NULL DEFAULT 0,
    "breaksLogged" INTEGER NOT NULL DEFAULT 0,
    "routineAdherencePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adherenceTrendLabel" TEXT NOT NULL DEFAULT 'Insufficient data',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "wellness_daily_summaries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wellness_daily_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "wellness_daily_summaries_userId_date_key" ON "wellness_daily_summaries"("userId", "date");
CREATE INDEX "wellness_daily_summaries_userId_date_idx" ON "wellness_daily_summaries"("userId", "date");

-- 15. Daily Summaries
CREATE TABLE "daily_summaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "completionRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "routinesTotal" INTEGER NOT NULL DEFAULT 0,
    "routinesCompleted" INTEGER NOT NULL DEFAULT 0,
    "routineAdherencePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workTasksTotal" INTEGER NOT NULL DEFAULT 0,
    "workTasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "overdueTasksCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "daily_summaries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "daily_summaries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "daily_summaries_userId_date_key" ON "daily_summaries"("userId", "date");
CREATE INDEX "daily_summaries_userId_date_idx" ON "daily_summaries"("userId", "date");

-- 16. Outbox Events
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ,
    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "outbox_events_status_createdAt_idx" ON "outbox_events"("status", "createdAt");

-- Supabase Row Level Security (RLS) Configuration
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routine_occurrences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wellness_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wellness_check_ins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wellness_daily_summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_summaries" ENABLE ROW LEVEL SECURITY;

-- Sample RLS policy: users can only view and update their own records
CREATE POLICY "Users can only access their own profile" ON "users"
    FOR ALL USING (auth.uid()::text = id);

CREATE POLICY "Users can only access their own tasks" ON "tasks"
    FOR ALL USING (auth.uid()::text = "userId");

CREATE POLICY "Users can only access their own routines" ON "routines"
    FOR ALL USING (auth.uid()::text = "userId");

CREATE POLICY "Users can only access their own routine occurrences" ON "routine_occurrences"
    FOR ALL USING (auth.uid()::text = "userId");

CREATE POLICY "Users can only access their own wellness metrics" ON "wellness_metrics"
    FOR ALL USING (auth.uid()::text = "userId");
