# Phase 15: Multi-User Data Isolation Audit

**Repository:** `D:\PT`  
**Application:** Personal Assistant PWA  
**Database:** Supabase PostgreSQL with Row Level Security (RLS)  
**ORM:** Prisma 5  

---

## 1. Table-by-Table Ownership & Isolation Matrix

Every entity containing personal, schedule, habit, or operational data is strictly scoped by `userId`.

| # | PostgreSQL Table | Foreign Key Column | RLS Status | Cross-Tenant Validation Policy |
|---|---|---|---|---|
| 1 | `users` | `id` | ENABLED | `id = auth.uid()::text` |
| 2 | `user_settings` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 3 | `tasks` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 4 | `projects` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 5 | `automation_rules` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 6 | `automation_rule_executions` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 7 | `routines` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 8 | `routine_occurrences` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 9 | `schedule_plans` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 10 | `schedule_changes` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 11 | `reminders` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 12 | `reminder_attempts` | `reminderId` | ENABLED | Parent reminder owned by `auth.uid()::text` |
| 13 | `push_subscriptions` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 14 | `task_events` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 15 | `wellness_metrics` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 16 | `wellness_check_ins` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 17 | `wellness_daily_summaries` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 18 | `daily_summaries` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 19 | `usage_events` | `userId` | ENABLED | `"userId" = auth.uid()::text` |
| 20 | `in_app_notifications` | `userId` | ENABLED | `"userId" = auth.uid()::text` |

---

## 2. Parent-Child Relationship Cross-Tenant Boundary Enforcement

A common security vulnerability in multi-tenant SaaS applications is "Foreign Key Hijacking" (e.g. User B associates their new task with User A's project or parent task ID).

In the NestJS backend, explicit ownership checks are implemented in `TasksService.create` and `TasksService.update`:

### 2.1 Project Association Check
```typescript
if (dto.projectId) {
  const project = await this.prisma.project.findFirst({
    where: { id: dto.projectId, userId },
  });
  if (!project) {
    throw new ForbiddenException('Cannot assign task to a project you do not own.');
  }
}
```

### 2.2 Parent Task Hierarchy Check
```typescript
if (dto.parentTaskId) {
  const parentTask = await this.prisma.task.findFirst({
    where: { id: dto.parentTaskId, userId },
  });
  if (!parentTask) {
    throw new ForbiddenException('Cannot assign parent task that you do not own.');
  }
}
```

### 2.3 Routine Occurrence Check
```typescript
if (dto.routineId) {
  const routine = await this.prisma.routine.findFirst({
    where: { id: dto.routineId, userId },
  });
  if (!routine) {
    throw new ForbiddenException('Cannot assign routine that you do not own.');
  }
}
```

---

## 3. Background Job & Worker Isolation
1. BullMQ redis jobs for reminders and replanning serialize payload with explicit `{ userId, taskId }`.
2. Notification workers verify that the targeted task or reminder belongs to the recipient user before dispatching web push payloads.
3. System jobs (service role) bypass RLS using database superuser credentials only for global event synchronization.
