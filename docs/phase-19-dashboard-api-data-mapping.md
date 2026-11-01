# Phase 19 — Dashboard API Data Mapping Specification
## Aggregated Endpoints, Database Schema Mapping & Real-Time Calculation Logic

---

## 1. Architectural Overview

To deliver instantaneous dashboard rendering and avoid excessive client-side network roundtrips, Phase 19 introduces a dedicated backend aggregation endpoint:

```http
GET /api/v1/analytics/command-center?date={YYYY-MM-DD}&range={7|30|90}
```

This endpoint executes parallel queries against the authoritative Supabase PostgreSQL database using Prisma ORM, applies tenant scoping via authenticated `user.id`, computes analytical aggregations in memory, and caches the result in Redis with a 30-second TTL.

---

## 2. API Contract & Response Structure

### 2.1 Request Headers & Query Parameters
- **Headers:** `Authorization: Bearer <supabase_jwt>` (Cryptographically verified by `SupabaseAuthGuard`).
- **Query `date` (string):** ISO date string `YYYY-MM-DD` (Defaults to current server date in UTC).
- **Query `range` (number):** Lookback interval in days (`7`, `30`, or `90`, defaults to `7`).

### 2.2 Aggregated JSON Response Schema

```json
{
  "success": true,
  "data": {
    "kpi": {
      "taskCompletion": {
        "completed": 6,
        "total": 8,
        "percentage": 75,
        "trend": "+12% vs last week"
      },
      "routineAdherence": {
        "completed": 4,
        "total": 5,
        "percentage": 80,
        "trend": "+8% vs last week"
      },
      "upcomingActivities": {
        "count": 5,
        "nextActivity": "10:00 AM - Team Meeting"
      },
      "overdueItems": {
        "count": 2,
        "detail": "1 task • 1 reminder"
      },
      "activeProjects": {
        "count": 3,
        "detail": "2 in progress • 1 on track"
      },
      "focusTime": {
        "hoursText": "4.5h",
        "trend": "+28% vs last week"
      }
    },
    "overviewChart": [
      {
        "date": "2026-10-26",
        "dayLabel": "Mon",
        "dateLabel": "Oct 26",
        "tasksScheduled": 8,
        "tasksCompleted": 6,
        "completionRate": 75
      }
    ],
    "taskDistribution": {
      "total": 39,
      "segments": [
        { "name": "Work", "count": 16, "percent": 41, "color": "#8B45F5" },
        { "name": "Personal", "count": 11, "percent": 28, "color": "#3B82F6" },
        { "name": "Projects", "count": 7, "percent": 18, "color": "#F59E0B" },
        { "name": "Other", "count": 5, "percent": 13, "color": "#10B981" }
      ]
    },
    "recentActivity": [
      {
        "id": "act-1",
        "icon": "check",
        "title": "Task completed",
        "description": "Website design mockups",
        "time": "2m ago"
      }
    ],
    "wellnessInsights": {
      "exercise": { "days": 4, "targetDays": 5, "percent": 80 },
      "water": { "cups": 6, "targetCups": 8, "percent": 75 },
      "sleep": { "durationText": "7h 15m", "quality": "Good" },
      "mood": "Good",
      "trendPoints": [60, 68, 72, 70, 75, 74, 78],
      "overallConsistency": 78
    },
    "analyticsFooter": {
      "totalFocusTime": "32h 45m",
      "focusTrend": "+18%",
      "avgCompletionRate": 78,
      "completionTrend": "+12%",
      "mostProductiveDay": "Tuesday",
      "activeDays": "6/7"
    }
  },
  "timestamp": "2026-11-01T21:40:00.000Z"
}
```

---

## 3. Database Schema & Data Mapping Matrix

| Dashboard Component | Data Source (Table / Model) | Filter Condition | Calculation / Aggregation Formula |
| :--- | :--- | :--- | :--- |
| **Welcome Header: Today's Progress** | `tasks` | `userId = :sub AND scheduledStartTime BETWEEN :start AND :end` | `completedTasks = count(status == 'COMPLETED')`, `totalTasks = count()`, `percent = Math.round((completed / total) * 100)` |
| **KPI 1: Task Completion** | `tasks` | Same as above | `percentage = (completed / total) * 100`, trend calculated against prior 7-day baseline |
| **KPI 2: Routine Adherence** | `routine_occurrences` | `userId = :sub AND date = :date` | `completedOccurrences = count(status == 'COMPLETED')`, `adherence = (completed / total) * 100` |
| **KPI 3: Upcoming Activities** | `tasks` | `userId = :sub AND scheduledStartTime BETWEEN :now AND :now + 24h` | `count()`, next activity string formatted from earliest upcoming task title + start time |
| **KPI 4: Overdue Items** | `tasks`, `reminders` | `tasks.deadline < :now AND tasks.status != 'COMPLETED'`, `reminders.triggerTime < :now AND reminders.status == 'SCHEDULED'` | `sum(overdueTasks.length + overdueReminders.length)`, detail formatted as `X task • Y reminder` |
| **KPI 5: Active Projects** | `projects` | `userId = :sub` | `count()`, detail computed from task statuses within project relations |
| **KPI 6: Focus Time** | `tasks` | `userId = :sub AND category = 'WORK' AND status = 'COMPLETED'` | `sum(actualDurationMinutes || estimatedDurationMinutes || 45) / 60` (rounded to 1 decimal place) |
| **Productivity Overview Chart** | `tasks` | `userId = :sub AND scheduledStartTime BETWEEN :startInterval AND :endInterval` | Grouped by calendar day: `tasksScheduled = count()`, `tasksCompleted = count(status == 'COMPLETED')`, `rate = (comp / sched) * 100` |
| **Task Distribution Donut** | `tasks` | `userId = :sub` | Grouped by `category` (`WORK`, `PERSONAL_ROUTINE`, `DAY_PLAN`) and `projectId != null` for Projects |
| **Today's Schedule Timeline** | `tasks`, `routine_occurrences` | `userId = :sub AND date = :date` | Sorted ascending by `scheduledStartTime`. Includes priority badges, duration tags, and interactive checkboxes |
| **Routine Tracker** | `routines`, `routine_occurrences` | `userId = :sub AND date = :date` | Progress calculated from `actualQuantity / targetQuantity * 100` with status tags (`Done`, `Missed`, `Upcoming`) |
| **Wellness & Habit Insights** | `wellness_daily_summaries`, `wellness_logs` | `userId = :sub AND date = :date` | Hydration glasses (`ml / 250`), sleep hours, mood scores, and 7-day moving consistency average |
| **Recent Activity Feed** | `task_events` | `userId = :sub ORDER BY createdAt DESC LIMIT 5` | Mapped to user-friendly titles (`Task completed`, `Routine completed`, etc.) with relative timestamps |
| **Analytics Summary Footer** | Historical `tasks` & `wellness_logs` | `userId = :sub AND completedAt >= :startOfWeek` | Multi-day summation of focus hours, mean completion rate, modal day calculation for most productive day |

---

## 4. Caching & Performance Architecture

### 4.1 Redis Cache Key Strategy
- **Key Pattern:** `dashboard:{userId}:command-center:{date}:{rangeDays}`
- **Example Key:** `dashboard:00000000-0000-0000-0000-000000000001:command-center:2026-11-01:7`
- **TTL:** 30 seconds (Balances low latency with near real-time reactivity).

### 4.2 Cache Invalidation Lifecycle
Whenever a user mutates their workspace:
- Task completed / created / deleted -> Invalidation pattern: `dashboard:{userId}:command-center:*`
- Routine checked-in / updated -> Invalidation pattern: `dashboard:{userId}:command-center:*`
- Project created / modified -> Invalidation pattern: `dashboard:{userId}:command-center:*`

This ensures zero stale metric reads immediately after any user interaction.

---

## 5. Security & Multi-Tenant Isolation

All queries enforce tenant boundaries via:
1. **Application Layer:** Explicit `where: { userId }` parameter injection in every Prisma query.
2. **Database Layer:** Supabase PostgreSQL Row Level Security (RLS) policies (`auth.uid() = user_id`) across all 20 tables preventing any cross-tenant data leakage even in raw SQL queries.
3. **Cache Layer:** Cache keys are strictly prefixed with `{userId}`, guaranteeing no cross-account cache collisions.

