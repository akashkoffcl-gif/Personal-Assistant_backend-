-- Phase 15: Multi-User Row Level Security (RLS) Policies
-- Enforces cryptographic and user-scoped tenant isolation across all tables in Supabase PostgreSQL

-- 1. Enable RLS on all user-scoped tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_rule_executions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routine_occurrences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminder_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wellness_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wellness_check_ins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wellness_daily_summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "in_app_notifications" ENABLE ROW LEVEL SECURITY;

-- 2. User Isolation Policies
-- users table: each user can only read/update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON "users";
CREATE POLICY "Users can view own profile" ON "users"
  FOR SELECT
  USING (id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own profile" ON "users";
CREATE POLICY "Users can update own profile" ON "users"
  FOR UPDATE
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

-- user_settings
DROP POLICY IF EXISTS "Users can manage own settings" ON "user_settings";
CREATE POLICY "Users can manage own settings" ON "user_settings"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- tasks
DROP POLICY IF EXISTS "Users can manage own tasks" ON "tasks";
CREATE POLICY "Users can manage own tasks" ON "tasks"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- projects
DROP POLICY IF EXISTS "Users can manage own projects" ON "projects";
CREATE POLICY "Users can manage own projects" ON "projects"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- automation_rules
DROP POLICY IF EXISTS "Users can manage own automation rules" ON "automation_rules";
CREATE POLICY "Users can manage own automation rules" ON "automation_rules"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- automation_rule_executions
DROP POLICY IF EXISTS "Users can manage own automation executions" ON "automation_rule_executions";
CREATE POLICY "Users can manage own automation executions" ON "automation_rule_executions"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- routines
DROP POLICY IF EXISTS "Users can manage own routines" ON "routines";
CREATE POLICY "Users can manage own routines" ON "routines"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- routine_occurrences
DROP POLICY IF EXISTS "Users can manage own routine occurrences" ON "routine_occurrences";
CREATE POLICY "Users can manage own routine occurrences" ON "routine_occurrences"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- schedule_plans
DROP POLICY IF EXISTS "Users can manage own schedule plans" ON "schedule_plans";
CREATE POLICY "Users can manage own schedule plans" ON "schedule_plans"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- schedule_changes
DROP POLICY IF EXISTS "Users can manage own schedule changes" ON "schedule_changes";
CREATE POLICY "Users can manage own schedule changes" ON "schedule_changes"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- reminders
DROP POLICY IF EXISTS "Users can manage own reminders" ON "reminders";
CREATE POLICY "Users can manage own reminders" ON "reminders"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- reminder_attempts
DROP POLICY IF EXISTS "Users can manage own reminder attempts" ON "reminder_attempts";
CREATE POLICY "Users can manage own reminder attempts" ON "reminder_attempts"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "reminders"
      WHERE "reminders"."id" = "reminder_attempts"."reminderId"
      AND "reminders"."userId" = auth.uid()::text
    )
  );

-- push_subscriptions
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON "push_subscriptions";
CREATE POLICY "Users can manage own push subscriptions" ON "push_subscriptions"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- task_events
DROP POLICY IF EXISTS "Users can manage own task events" ON "task_events";
CREATE POLICY "Users can manage own task events" ON "task_events"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- wellness_metrics
DROP POLICY IF EXISTS "Users can manage own wellness metrics" ON "wellness_metrics";
CREATE POLICY "Users can manage own wellness metrics" ON "wellness_metrics"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- wellness_check_ins
DROP POLICY IF EXISTS "Users can manage own wellness check-ins" ON "wellness_check_ins";
CREATE POLICY "Users can manage own wellness check-ins" ON "wellness_check_ins"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- wellness_daily_summaries
DROP POLICY IF EXISTS "Users can manage own wellness summaries" ON "wellness_daily_summaries";
CREATE POLICY "Users can manage own wellness summaries" ON "wellness_daily_summaries"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- daily_summaries
DROP POLICY IF EXISTS "Users can manage own daily summaries" ON "daily_summaries";
CREATE POLICY "Users can manage own daily summaries" ON "daily_summaries"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- usage_events
DROP POLICY IF EXISTS "Users can manage own usage events" ON "usage_events";
CREATE POLICY "Users can manage own usage events" ON "usage_events"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- in_app_notifications
DROP POLICY IF EXISTS "Users can manage own notifications" ON "in_app_notifications";
CREATE POLICY "Users can manage own notifications" ON "in_app_notifications"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- 3. Grants for service_role and postgres roles (background queue workers & pooler)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

