# Enterprise Personal Assistant PWA — Implementation Plan

**Date:** 2026-10-29  
**Version:** 2.0.0-enterprise  
**Author:** Software Architect & QA Lead  

---

## 1. Roadmap Overview

```text
┌──────────────────────────────────────────────────────────────┐
│ Phase 0: Baseline Discovery & Audit (COMPLETE)               │
├──────────────────────────────────────────────────────────────┤
│ Phase 1: Architecture & Shared Domain Contracts              │
│   • Projects, Subtasks, Automation Rules in Prisma & Shared  │
│   • Safe migration & live Supabase deployment                │
├──────────────────────────────────────────────────────────────┤
│ Phase 2: Enterprise UI Design System                         │
│   • Replace prompt(), alert(), confirm() with modals/drawers │
│   • Accessible Toast system, Confirmation dialogs, Shell     │
├──────────────────────────────────────────────────────────────┤
│ Phase 3: Modular Workspaces                                  │
│   • Command Center (unified view, quick actions, conflict UI)│
│   • Task Management (full CRUD, duration/end auto-calc)      │
│   • Work & Projects (projects workspace, progress, linked)   │
│   • Routines (custom modal, recurrence, streak/adherence)    │
│   • Calendar & Planning (Day/Week/Month/Agenda views)        │
│   • Wellness & Analytics (custom check-in modal, Recharts)   │
│   • Settings (work/quiet hours, duration, export)            │
├──────────────────────────────────────────────────────────────┤
│ Phase 4: Advanced Rule-Driven Automation                     │
│   • Automation rules service (overdue, break, conflict)      │
│   • Cooldowns, execution limits, history tracking            │
├──────────────────────────────────────────────────────────────┤
│ Phase 5: Reminder & Worker Reliability Verification          │
│   • Idempotency, Outbox event processing, quiet hours        │
├──────────────────────────────────────────────────────────────┤
│ Phase 6: API Contracts & Security Hardening                  │
│   • Projects CRUD, Subtask nesting, Rate limiting, DTOs      │
├──────────────────────────────────────────────────────────────┤
│ Phase 7: Comprehensive Testing Strategy                      │
│   • Unit, Integration, Worker, E2E workflow tests            │
├──────────────────────────────────────────────────────────────┤
│ Phase 8: Production Release Readiness                        │
│   • Zero lint errors, full TypeScript check, clean builds    │
├──────────────────────────────────────────────────────────────┤
│ Phase 9: Deliverables & Documentation                        │
│   • 5 comprehensive audit and architecture documents in docs/│
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Phase-by-Phase Execution Details

### Phase 1: Domain Entities & Database Migration
- Models to add/enhance:
  - `Project`: `id`, `userId`, `title`, `description`, `color`, `status`, `targetDate`, `createdAt`, `updatedAt`.
  - `Task`: Add `projectId`, `parentTaskId` self-relation for subtasks.
  - `AutomationRule`: `id`, `userId`, `name`, `ruleType`, `condition`, `action`, `cooldownMinutes`, `lastExecutedAt`, `isEnabled`.
  - `AutomationRuleExecution`: `id`, `ruleId`, `userId`, `triggeredBy`, `actionTaken`, `status`, `details`, `executedAt`.
  - `Routine`: Add `startDate`, `endDate`, `isPaused`.
  - `UserSettings`: Add `preferredWorkDays`, `defaultTaskDurationMinutes`, `defaultReminderLeadMinutes`, `weekStartDay`.
- Generate and deploy non-destructive Prisma migration.

### Phase 2: Enterprise UI System
- Build reusable UI primitives:
  - `ToastProvider` / `useToast` to eliminate all `alert()`.
  - `ConfirmDialog` to eliminate all `confirm()`.
  - `CreateRoutineModal` to eliminate `prompt('Enter routine habit title:')`.
  - `WellnessCheckInModal` to eliminate `prompt()` for mood/energy check-ins.
  - `TaskDetailDrawer` for full task metadata, subtasks, notes, event history.
  - `ProjectModal` for project creation and editing.

### Phase 3: Modular Workspaces
- Transform `page.tsx` into an enterprise Command Center + Modular Workspace architecture:
  - Workspace 1: **Command Center** (Daily Context, Today/Prev/Next stepper, Unified timeline, Conflict warnings, Quick Add, KPI links).
  - Workspace 2: **Task Management** (List & Grid, search, filters by status/priority/category/project, bulk actions, duration/end auto-sync).
  - Workspace 3: **Projects** (Project cards with progress bars, overdue indicators, linked tasks).
  - Workspace 4: **Routines** (Habit list, active streaks, target quantities, pause/resume, occurrences).
  - Workspace 5: **Calendar & Planning** (Day timeline, Week grid, Month view, Agenda, time blocks).
  - Workspace 6: **Emergency Replanning** (Urgent task creation, preview, conflict list, confirm/cancel).
  - Workspace 7: **Wellness** (Water, workout, sleep, meals, mood/energy check-in with sliders).
  - Workspace 8: **Analytics** (All 5 Recharts feeds, 7/14/30 day filters, empty states).
  - Workspace 9: **Automation Rules** (Rule list, enable/disable toggle, execution logs).
  - Workspace 10: **Settings** (Timezone, work hours, quiet hours, data export).

### Phase 4: Automation Rules Engine
- Implement `AutomationService` in `apps/api`:
  - Evaluates rules: Overdue alerts, Upcoming reminder lead-times, Break suggestions after continuous focus, Conflict suggestions.
  - Enforces cooldowns and execution limits to prevent infinite loops.
  - Records execution logs in `AutomationRuleExecution`.

### Phase 5 & 6: Reliability, Security & API Enhancements
- Projects Controller & Service (`/projects`).
- Automation Controller & Service (`/automation/rules`).
- Duration & End time recalculation helper.

### Phase 7 & 8: Testing & Release Readiness
- Add automated tests for projects, subtasks, and automation rules.
- Run complete test suite and production builds.
- Prepare Phase 9 deliverables.

