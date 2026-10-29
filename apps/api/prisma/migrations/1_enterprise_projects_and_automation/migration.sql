-- Migration 1: Enterprise Projects, Subtasks & Automation Rules

-- AlterTable UserSettings
ALTER TABLE "user_settings" 
ADD COLUMN IF NOT EXISTS "preferredWorkDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5],
ADD COLUMN IF NOT EXISTS "defaultTaskDurationMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS "defaultReminderLeadMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS "weekStartDay" INTEGER NOT NULL DEFAULT 1;

-- AlterTable Routines
ALTER TABLE "routines"
ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "isPaused" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable Projects
CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#142B4A',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "targetDate" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- AlterTable Tasks for Projects & Subtasks
ALTER TABLE "tasks"
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "projectId" TEXT,
ADD COLUMN IF NOT EXISTS "parentTaskId" TEXT;

-- CreateTable AutomationRules
CREATE TABLE IF NOT EXISTS "automation_rules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "condition" JSONB NOT NULL DEFAULT '{}',
    "action" JSONB NOT NULL DEFAULT '{}',
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "lastExecutedAt" TIMESTAMPTZ,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable AutomationRuleExecutions
CREATE TABLE IF NOT EXISTS "automation_rule_executions" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB,
    "executedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_rule_executions_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "projects_userId_status_idx" ON "projects"("userId", "status");
CREATE INDEX IF NOT EXISTS "tasks_userId_projectId_idx" ON "tasks"("userId", "projectId");
CREATE INDEX IF NOT EXISTS "tasks_parentTaskId_idx" ON "tasks"("parentTaskId");
CREATE INDEX IF NOT EXISTS "automation_rules_userId_isEnabled_idx" ON "automation_rules"("userId", "isEnabled");
CREATE INDEX IF NOT EXISTS "automation_rule_executions_userId_executedAt_idx" ON "automation_rule_executions"("userId", "executedAt");
CREATE INDEX IF NOT EXISTS "automation_rule_executions_ruleId_idx" ON "automation_rule_executions"("ruleId");

-- Foreign Keys
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_userId_fkey') THEN
        ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_projectId_fkey') THEN
        ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_parentTaskId_fkey') THEN
        ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'automation_rules_userId_fkey') THEN
        ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'automation_rule_executions_ruleId_fkey') THEN
        ALTER TABLE "automation_rule_executions" ADD CONSTRAINT "automation_rule_executions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'automation_rule_executions_userId_fkey') THEN
        ALTER TABLE "automation_rule_executions" ADD CONSTRAINT "automation_rule_executions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Enable Row Level Security (RLS) on newly added tables
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_rule_executions" ENABLE ROW LEVEL SECURITY;

-- Apply Row Level Security Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'projects_user_isolation') THEN
        CREATE POLICY "projects_user_isolation" ON "projects" FOR ALL USING (auth.uid()::text = "userId");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'automation_rules_user_isolation') THEN
        CREATE POLICY "automation_rules_user_isolation" ON "automation_rules" FOR ALL USING (auth.uid()::text = "userId");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'automation_rule_executions_user_isolation') THEN
        CREATE POLICY "automation_rule_executions_user_isolation" ON "automation_rule_executions" FOR ALL USING (auth.uid()::text = "userId");
    END IF;
END $$;

