# Phase 12 — Baseline Inspection Report

**Project:** Personal Task, Routine, Smart Reminder & Wellness Assistant PWA  
**Workspace:** `D:\PT`  
**Phase:** 12 — Lavender Enterprise Design System + Application Usage Analytics  
**Date:** October 31, 2026  
**Status:** Baseline Audited — Implementation Plan Established  

---

## 1. Executive Summary

This report establishes the baseline inspection of the repository before executing Phase 12. 
Phase 12 unifies the entire application around the Lavender Enterprise Design System inspired by the reference design and introduces a dedicated **Application Usage Analytics** module with persistent PostgreSQL event tracking, distinct from Personal Productivity Analytics.

---

## 2. Current Architecture & State Inspection

### A. Database Models (`apps/api/prisma/schema.prisma`)
The schema currently contains 19 models:
1. `User` — Authentication identity & relations.
2. `UserSettings` — Working hours, buffer, push & reminder preferences.
3. `Task` — Work, routine, emergency, and planning tasks with subtask hierarchy.
4. `Project` — Workspaces, color labels, milestones, target dates.
5. `AutomationRule` — Triggers, conditions, actions, cooldowns.
6. `AutomationRuleExecution` — Audit history of rule runs.
7. `Routine` — Recurring habit definitions, target quantity, unit, target time.
8. `RoutineOccurrence` — Daily occurrences, actual logged quantities, completion status.
9. `SchedulePlan` — Daily plans and versioning.
10. `ScheduleChange` — Schedule audit trail for emergency replanning & moves.
11. `Reminder` — Scheduled and enqueued notification records.
12. `ReminderAttempt` — Delivery attempts, HTTP status codes, error messages.
13. `PushSubscription` — Web Push browser endpoints and VAPID keys.
14. `TaskEvent` — Historical task lifecycle state transitions.
15. `WellnessMetric` — Hydration, meals, breaks, sleep, exercise.
16. `WellnessCheckIn` — Energy, mood, stress, fatigue scores (1–5).
17. `WellnessDailySummary` — Aggregated daily wellness metrics.
18. `DailySummary` — Historical task and routine completion rates.
19. `OutboxEvent` — Durable transactional outbox for BullMQ dispatch.

**Observation:**
No dedicated model exists for generic **Application Usage Analytics** (module navigation, feature interactions, UI actions, operational failure rates). 
*Requirement:* Add `UsageEvent` model with indexes on `(userId, occurredAt)`, `(userId, module, occurredAt)`, `(userId, feature)`, and `(userId, eventName)`.

### B. Current Analytics Module (`apps/api/src/modules/analytics`)
- `AnalyticsController`:
  - `GET /analytics/daily` — Daily task & routine completion KPIs.
  - `GET /analytics/trends` — 7/14/30-day productivity velocity, adherence, category breakdown.
- Domain Scope: Strictly **Personal Productivity Analytics** (Domain A).
- Missing Scope: **Application Usage Analytics** (Domain B) measuring user engagement with application modules, feature adoption rates, automation reliability, and reminder delivery outcomes.

### C. Frontend Architecture (`apps/web/src`)
- Framework: Next.js 14 App Router, React 18, TanStack Query v5.
- Visualizations: Recharts (`ResponsiveContainer`, `BarChart`, `LineChart`, `PieChart`, `AreaChart`).
- Design System:
  - Previous Phase 11 implemented a light enterprise theme (`#F8FAFC`, `#2563EB`).
  - Reference design requires the **Lavender Enterprise Design System**:
    - Application background: `#EAE9FF`
    - Secondary surface: `#F4F3FF`
    - Card surface: `#FFFFFF`
    - Primary purple: `#8B45F5`
    - Deep purple: `#6935C8`
    - Primary text: `#202033`
    - Secondary text: `#74738A`
    - Border: `#E5E2F5`
    - Success: `#16A36A`, Warning: `#E5A12A`, Critical: `#E05268`
  - Navigation: Compact responsive grouped sidebar (Overview, Productivity, Intelligence, Wellness, System) + compact top header.

### D. Test Baseline
- Total test suites: 8
- Total automated tests: 50
- Current pass rate: 100% (50 passed, 0 failed against live Supabase PostgreSQL).

---

## 3. Implementation Roadmap

1. **Database & Backend Event Store (Domain B)**:
   - Add `UsageEvent` model to Prisma schema.
   - Run `prisma db push` / migration to Supabase PostgreSQL.
   - Implement `UsageAnalyticsService` with aggregation methods:
     - Overview KPI summary & trend lines.
     - Module interaction distribution.
     - Feature adoption calculations (`distinct_features_used / total_tracked_features`).
     - Automation execution analytics (success, failed, cooldown skips).
     - Reminder delivery outcome analytics (scheduled, attempted, confirmed, failed).
     - Filterable interaction history table with pagination.
   - Add `UsageAnalyticsController` with authenticated endpoints:
     - `GET /analytics/usage/overview`
     - `GET /analytics/usage/trends`
     - `GET /analytics/usage/modules`
     - `GET /analytics/usage/features`
     - `GET /analytics/usage/automation`
     - `GET /analytics/usage/reminders`
     - `GET /analytics/usage/events`
     - `POST /analytics/usage/events` (batch or single client event tracking with idempotency).
   - Hook server-side tracking into core services (Tasks, Routines, Projects, Scheduling, Emergency, Wellness, Automation, Notifications).

2. **Lavender Enterprise Design System**:
   - Update `tailwind.config.ts` and `globals.css` with exact `#EAE9FF`, `#F4F3FF`, `#FFFFFF`, `#8B45F5`, `#6935C8`, `#202033`, `#74738A`, `#E5E2F5`.
   - Update `Sidebar.tsx` with compact grouped navigation:
     - `OVERVIEW`: Command Center, My Day
     - `PRODUCTIVITY`: Work & Tasks, Projects, Habits & Routines, Day Planning, Calendar
     - `INTELLIGENCE`: Personal Analytics, Application Usage Analytics, Automation Rules
     - `WELLNESS`: Health & Wellness
     - `SYSTEM`: Notifications, Settings
   - Update `Header.tsx` to be compact with Page Title, Search (`⌘K`), Notifications, Sync status, Quick Add (`+`), Emergency Replan, and Profile.

3. **Frontend Workspaces Redesign**:
   - Redesign Command Center with reference-inspired balanced multi-column grid, clickable KPIs, purple velocity chart, schedule strip, habits with step counters, and quick actions.
   - Build dedicated **Application Usage Analytics** workspace with Recharts visualizations, adoption progress meters, and filterable event audit table.
   - Apply uniform card, typography, and button styling to Work & Tasks, Projects, Habits & Routines, Calendar, Planning, Emergency, Wellness, Personal Analytics, Automation Rules, and Settings.

4. **Testing, Verification & Deliverables**:
   - Add `usage-analytics.spec.ts` test suite.
   - Verify all 8 existing test suites pass.
   - Build Next.js web application (`npm --workspace=@assistant/web run build`).
   - Capture desktop and mobile screenshots.
   - Author full documentation reports.

