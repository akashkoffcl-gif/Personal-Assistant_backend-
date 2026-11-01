# Phase 12 — Application Usage Analytics Specification

## 1. Executive Summary & Domain Separation
Phase 12 introduces authoritative **Application Usage Analytics** (Domain B) into the Personal Assistant PWA, establishing strict architectural separation between personal habit/task productivity metrics and real platform operational telemetry.

```
┌────────────────────────────────────────────────────────┐
│                   ANALYTICS DOMAINS                    │
├───────────────────────────┬────────────────────────────┤
│ DOMAIN A: PRODUCTIVITY    │ DOMAIN B: APPLICATION USAGE│
├───────────────────────────┼────────────────────────────┤
│ • Task completion counts  │ • Total platform events    │
│ • Routine streak tracking │ • Active user sessions     │
│ • Calendar adherence      │ • Module usage breakdown   │
│ • Hydration & sleep logs  │ • Feature catalog adoption │
│ • Emergency replan count  │ • Automation rule runs     │
│                           │ • Push delivery outcomes   │
│                           │ • Operational failures     │
└───────────────────────────┴────────────────────────────┘
```

---

## 2. Database Schema & Persistence
Backed by Supabase PostgreSQL via the indexed `UsageEvent` model in `apps/api/prisma/schema.prisma`:

```prisma
model UsageEvent {
  id             String    @id @default(uuid())
  userId         String
  sessionId      String?
  eventName      String    // e.g. "task.created", "routine.logged", "day_plan.generated"
  module         String    // e.g. "tasks", "routines", "planning", "automation"
  feature        String    // e.g. "task_create", "smart_checkin", "emergency_replan"
  action         String?   // e.g. "create", "complete", "snooze", "replan"
  status         String    @default("success") // "success" | "failed"
  occurredAt     DateTime  @default(now())
  idempotencyKey String?   @unique
  metadata       Json?

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, occurredAt])
  @@index([userId, module, occurredAt])
  @@index([userId, feature])
  @@index([userId, eventName])
}
```

Migrations deployed to Supabase PostgreSQL using `npx prisma db push`.

---

## 3. Backend API Contract (`apps/api/src/modules/analytics`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/analytics/usage/overview` | Returns total interactions, active days, most-used module/feature, adoption %, automation %, reminder %, failure count, and period comparison. |
| `GET` | `/api/v1/analytics/usage/trends` | Returns daily interaction volume comparing successful vs failed operations over 7, 14, or 30 days. |
| `GET` | `/api/v1/analytics/usage/modules` | Computes percentage share of user activity across all 9 application modules. |
| `GET` | `/api/v1/analytics/usage/features` | Evaluates adoption status for all 13 core platform features in the feature catalog. |
| `GET` | `/api/v1/analytics/usage/automation` | Aggregates automation rule executions, success rate, cooldown skips, and top rules. |
| `GET` | `/api/v1/analytics/usage/reminders` | Reports push reminder attempts, delivered status, retry counts, and failure rates. |
| `GET` | `/api/v1/analytics/usage/events` | Paginated raw event audit log with filters for module, status, and search terms. |
| `POST` | `/api/v1/analytics/usage/events` | Client-side and server-side authoritative telemetry ingest with deduplication. |

---

## 4. Feature Adoption Catalog
The platform tracks 13 core capabilities across the lifecycle:
1. `task_create` (Tasks) — Direct task scheduling and priority definition
2. `task_complete` (Tasks) — Task resolution and progress advancement
3. `task_reschedule` (Tasks) — Inline snoozing and deadline shifts
4. `routine_create` (Routines) — Recurring habit specification
5. `routine_checkin` (Routines) — Quantitative habit check-in and streak logging
6. `day_planner` (Planning) — Time-blocked schedule generation
7. `calendar_views` (Calendar) — Multi-day and agenda calendar review
8. `emergency_replan` (Emergency) — Conflict resolution and automated replanning
9. `wellness_log` (Wellness) — Hydration, exercise, and sleep tracking
10. `smart_checkin` (Assistant) — Proactive modal check-ins on expired slots
11. `automation_rules` (Automation) — Rule configuration and manual evaluations
12. `push_notifications` (System) — Web push subscription and delivery confirmations
13. `data_export` (System) — Full JSON GDPR/CCPA user archive export

---

## 5. UI Implementation (`apps/web/src/components/ApplicationUsageAnalytics.tsx`)
- **Executive KPI Cards:** 8 cards displaying interaction totals, active days, top module, top feature, feature adoption %, automation success %, reminder delivery %, and failed actions.
- **Section A (Trends):** Bar chart visualization comparing daily successful events vs operational failures with hover tooltips and Saturday active focus pill.
- **Section B (Module Distribution):** Color-coded progress meters showing relative telemetry share across modules.
- **Section C (Feature Adoption):** 13-feature grid with Adopted (`#16A36A`) or Pending (`#74738A`) status badges, interaction counts, and last used timestamps.
- **Section D & E (Operational Reliability):** Automation engine evaluation breakdown (total, success, cooldown skips) and web push delivery metrics.
- **Section F (Event Audit Log):** Paginated, filterable event log with module dropdown, status filter, search input, and JSON export button.

