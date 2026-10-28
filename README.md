# Personal Task, Routine, Smart Reminder & Wellness Assistant PWA

A production-ready personal productivity, smart reminder, emergency replanning, and wellness monitoring Progressive Web App (PWA). Built with a Next.js App Router frontend, NestJS backend API, Supabase PostgreSQL permanent persistence, Redis & BullMQ background job queues, and Web Push notifications.

---

## 1. System Architecture & Diagram

```text
                                +-----------------------------+
                                |     Next.js 14 Frontend     |
                                | (React 18 + Tailwind + PWA) |
                                +--------------+--------------+
                                               |
                           REST API & Web Push | Service Worker
                                               v
                                +--------------+--------------+
                                |     NestJS Backend API      |
                                | (Modular Monolith, Port 3001|
                                +---+----------+----------+---+
                                    |          |          |
                  Authoritative SQL |          | BullMQ   | Web Push
                                    v          v          v
                   +----------------+--+   +---+---+   +--+----------------+
                   |  Supabase Postgres|   | Redis |   | Web Push Provider |
                   |  (16 Rel. Models) |   | (7.x) |   | (VAPID / Browser) |
                   +-------------------+   +-------+   +-------------------+
                                               ^
                                               | Polling & Execution
                                   +-----------+-----------+
                                   | BullMQ Worker Process |
                                   | (Delayed Jobs & Outbox|
                                   |  Reconciliation Loop) |
                                   +-----------------------+
```

### Core Architecture Pillars
- **Strict User Isolation:** All PostgreSQL tables have Row Level Security (`auth.uid()::text = "userId"`), enforced both at the database level and through cryptographic Supabase JWT verification (`HS256`, audience: `authenticated`, issuer: `supabase`).
- **Deterministic Scheduling Engine:** Rule-based constraint solver that protects immovable `FIXED` appointments, dynamically repositions `FLEXIBLE` tasks based on duration and buffer constraints, and explicitly flags collisions as conflicts rather than silently dropping tasks.
- **Durable Outbox Pattern:** Application state changes and BullMQ queue jobs are decoupled through the `OutboxEvent` table, ensuring zero lost notifications across Redis outages or worker restarts.
- **History Preservation:** Daily routine occurrences (`RoutineOccurrence`) and task lifecycle events (`TaskEvent`) are decoupled from master definitions (`Routine`, `Task`), ensuring that historical adherence and completion metrics remain immutable when user habits change.

---

## 2. Four Task Categories

| Category | Typical Use Cases | Key Rules & Behaviors |
| :--- | :--- | :--- |
| **1. Personal Daily Routine** | Hydration, workouts, breakfast/lunch/dinner, sleep habits, rest breaks | Daily/weekly recurrence, streaks, adherence percentage, quantity logging (e.g., ml of water, workout minutes), snooze/skip support. |
| **2. Work Reminders** | Deliverables, client follow-ups, sprint tasks, code reviews, deadlines | Priorities (`LOW` to `URGENT`), duration estimates, hard deadlines, overdue detection, advance reminders. |
| **3. Day-Specific Planning** | Daily agenda, chronological time blocks (Morning, Afternoon, Evening) | Unified agenda view without task duplication, conflict warnings, versioned day plans. |
| **4. Emergency and Plan Changes** | Production outages, unexpected urgent client requests | Automatic schedule reorganization of flexible tasks, preservation of fixed appointments and completed tasks, before/after audit trail, immediate emergency push alert. |

---

## 3. Technology Stack & Pinned Versions

- **Frontend:** Next.js `14.2.35`, React `18.3.1`, Tailwind CSS `3.4.14`, Recharts `2.13.0`, Framer Motion `11.11.9`, TanStack Query `5.59.16`, Lucide Icons `0.453.0`.
- **Backend:** NestJS `10.4.22`, TypeScript `5.6.3`, Prisma ORM `5.21.1`, BullMQ `5.21.2`, ioredis `5.4.1`, jsonwebtoken `9.0.3`, web-push `3.6.7`.
- **Database:** Supabase PostgreSQL (16 normalized models, Row Level Security, timezone-aware UTC timestamps).
- **Background Worker:** Standalone BullMQ worker with 30s Outbox & reminder reconciliation loop.
- **Testing:** Jest `29.7.0`, ts-jest `29.2.5`.

---

## 4. Authoritative Database Schema (16 Models)

Defined in [`apps/api/prisma/schema.prisma`](file:///d:/PT/apps/api/prisma/schema.prisma) and deployed via [`apps/api/prisma/migrations/0_init/migration.sql`](file:///d:/PT/apps/api/prisma/migrations/0_init/migration.sql):

1. `User` – Authenticated profiles and timezones
2. `UserSettings` – Work hours, quiet hours, follow-up limits, push settings
3. `Task` – Tasks with priority, scheduling mode (`FIXED` vs `FLEXIBLE`), buffer, deadline
4. `Routine` – Master recurring definitions (frequency, target quantities, active streaks)
5. `RoutineOccurrence` – Daily instances separated from definitions to protect history
6. `SchedulePlan` – Versioned daily plans (`planId`, `version`, `isLocked`)
7. `ScheduleChange` – Full audit history of before-and-after schedule shifts
8. `Reminder` – Scheduled reminders with attempt counters
9. `ReminderAttempt` – Delivery attempt audit logs with status and response codes
10. `PushSubscription` – PWA browser push endpoints and cryptographic keys (`p256dh`, `auth`)
11. `TaskEvent` – Complete task lifecycle history (`CREATED`, `STATUS_CHANGED`, `SNOOZED`, `RESCHEDULED`)
12. `WellnessMetric` – Measured health data (`HYDRATION`, `EXERCISE`, `MEAL`, `SLEEP`, `BREAK`)
13. `WellnessCheckIn` – Subjective self-reported scores (energy, mood, fatigue, stress 1-5)
14. `WellnessDailySummary` – Aggregated daily wellness summaries & baseline trend labels
15. `DailySummary` – Daily completion KPIs, adherence percentages, overdue counts
16. `OutboxEvent` – Transactional outbox pattern ensuring zero-loss BullMQ synchronization

---

## 5. REST API Documentation

Base URL: `http://localhost:3001/api/v1`

### Tasks (`/tasks`)
- `GET /tasks` – Query tasks by `date`, `category`, `status`.
- `POST /tasks` – Create a new task (validates category, scheduling mode, duration, buffer).
- `GET /tasks/:id` – Retrieve task details with events and reminders.
- `PATCH /tasks/:id` – Update task fields (triggers outbox event if times change).
- `POST /tasks/:id/complete` – Mark task completed, invalidating pending reminders.
- `POST /tasks/:id/snooze` – Snooze task by N minutes (default: 15) and record event.
- `POST /tasks/:id/reschedule` – Reschedule start/end time.
- `DELETE /tasks/:id` – Remove task and cancel associated reminders.
- `GET /tasks/:id/events` – Retrieve complete audit trail (`CREATED`, `STATUS_CHANGED`, etc.).

### Routines (`/routines`)
- `GET /routines` – List all active recurring routine definitions.
- `POST /routines` – Create a recurring routine (frequency: `DAILY`, `WEEKDAYS`, `WEEKENDS`, `WEEKLY`).
- `GET /routines/occurrences/:date` – Get or generate occurrences for a specific date.
- `POST /routines/occurrences/:id/record` – Record completion with measured quantity (e.g. 250ml).
- `DELETE /routines/:id` – Soft-delete routine definition without altering historical occurrences.

### Day-Specific Planning (`/plans`)
- `GET /plans/:date` – Fetch daily plan, time blocks (Morning, Afternoon, Evening), and conflict status.
- `POST /plans/:date/lock` – Lock plan to prevent automatic repositioning.

### Emergencies & Replanning (`/emergencies`)
- `POST /emergencies` – Inject an urgent task, execute deterministic replanning, record schedule changes, and dispatch alerts.
- `GET /schedule-changes` – Audit history of all before/after schedule changes.
- `POST /emergencies/:id/cancel` – Cancel emergency task and calculate a safe restore of remaining tasks.

### Push Notifications (`/notifications`)
- `GET /notifications/vapid-public-key` – Fetch application server VAPID public key.
- `POST /notifications/subscribe` – Register browser push subscription endpoint and keys.
- `POST /notifications/test` – Trigger an immediate test push notification.
- `DELETE /notifications/subscriptions/:id` – Revoke an active subscription.

### Wellness & Check-Ins (`/wellness`)
- `POST /wellness/metrics` – Log measured metric (`HYDRATION`, `EXERCISE`, `SLEEP`, `MEAL`, `BREAK`).
- `POST /wellness/check-in` – Submit subjective ratings (energy, mood, stress, fatigue 1-5).
- `GET /wellness/summary?date=YYYY-MM-DD` – Retrieve daily wellness totals and adherence trends.

### Analytics & Reports (`/analytics`)
- `GET /analytics/daily?date=YYYY-MM-DD` – Fetch completion rate, routine adherence, overdue count.
- `GET /analytics/trends?days=7` – Multi-day data feeds for Recharts (7, 14, 30 days).

### Settings & Data Portability (`/settings`)
- `GET /settings` – Get user preferences (work hours, quiet hours, buffer).
- `PATCH /settings` – Update user configuration.
- `GET /settings/export` – Export full user data package in JSON format.

---

## 6. Local Development Quickstart

### Prerequisites
- Node.js `>= 20.0.0` (Tested on Node `24.20.0`)
- npm `>= 10.0.0` (Tested on npm `11.19.0`)

### Step 1: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(The template includes clear placeholders for `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_JWT_SECRET`, and `REDIS_HOST`).*

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run Database Migrations
```bash
npm --workspace=@assistant/api run prisma:deploy
```

### Step 4: Run Automated Tests
```bash
npm test
```

### Step 5: Start the Development Services
Run each service in a separate terminal:
```bash
# Terminal 1: Next.js PWA Frontend (Port 3000)
npm run dev:web

# Terminal 2: NestJS Backend API (Port 3001)
npm run dev:api

# Terminal 3: BullMQ Background Worker & Reconciler
npm run dev:worker
```
- Frontend UI: [http://localhost:3000](http://localhost:3000)
- REST API: [http://localhost:3001/api/v1](http://localhost:3001/api/v1)
- Swagger OpenAPI: [http://localhost:3001/api/v1/docs](http://localhost:3001/api/v1/docs)

---

## 7. Web Push & PWA Installation

### PWA Capabilities
- Open [http://localhost:3000](http://localhost:3000) in Chrome, Edge, or Safari.
- Click the install button in the address bar to install as a standalone desktop or mobile application.
- Click **"Enable Push"** in the navigation header to register the service worker and subscribe to push notifications.
- When a reminder triggers, the notification renders with three interactive action buttons:
  - **✓ Completed:** Dispatches a background request to `/api/v1/tasks/:id/complete`.
  - **⏱ Snooze 15m:** Dispatches a background request to `/api/v1/tasks/:id/snooze`.
  - **Open Task:** Focuses the active PWA window.

---

## 8. Production Deployment Instructions

### Option A: Containerized Deployment (Docker)
Build and run the production image:
```bash
# Build multi-stage containers
docker compose build

# Start services in production mode
docker compose -f docker-compose.prod.yml up -d
```

### Option B: Node.js / Process Manager (PM2)
```bash
# 1. Build all packages and applications
npm run build

# 2. Deploy database migrations
npm --workspace=@assistant/api run prisma:deploy

# 3. Start API and Worker using PM2
pm2 start apps/api/dist/main.js --name "assistant-api"
pm2 start apps/api/dist/worker/worker.main.js --name "assistant-worker"

# 4. Start Next.js PWA
cd apps/web && npm run start
```

---

## 9. Database Backup & Disaster Recovery

### Automated PostgreSQL Backup
```bash
# Compressed binary dump using direct database endpoint
pg_dump -h [db-host.supabase.co] -p 5432 -U postgres -d postgres -F c -b -v -f "assistant_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Restore Database
```bash
# Restore directly into target instance with clean drop-and-recreate
pg_restore -h [db-host.supabase.co] -p 5432 -U postgres -d postgres -v -c "assistant_backup_YYYYMMDD_HHMMSS.dump"
```

---

## 10. Actual Test Execution Report

All test suites ran against the live Supabase database and isolated test harnesses. Output:

```text
PASS test/scheduling-engine.spec.ts
  SchedulingEngineService
    √ preserves FIXED appointments at their exact scheduled time (12 ms)
    √ moves FLEXIBLE tasks into available slots without overlapping FIXED tasks (2 ms)
    √ places EMERGENCY tasks and automatically reorganizes flexible tasks (5 ms)
    √ detects deadline violations as explicit conflicts without silent dropping (3 ms)
    √ does not reschedule or modify COMPLETED tasks (1 ms)

PASS test/auth-and-ownership.spec.ts
  Authentication and Multi-Tenant Ownership Isolation
    √ rejects requests with missing or invalid JWT tokens (4 ms)
    √ rejects expired tokens or tokens with invalid audience (2 ms)
    √ permits authenticated user with valid HS256 signature (3 ms)
    √ prevents cross-user access to another user's tasks (2 ms)

PASS test/tasks-crud-and-history.spec.ts
  Tasks Service & History Events
    √ creates a task across all 4 categories with proper defaults (3 ms)
    √ transitions task status and records immutable TaskEvent (2 ms)
    √ snoozes task, advances scheduledStartTime, and records SNOOZED event (2 ms)
    √ reschedules task and records RESCHEDULED event (2 ms)
    √ prevents invalid status transitions (COMPLETED -> TODO directly without valid path) (1 ms)
    √ soft/hard deletes a task and cancels associated reminders (2 ms)
    √ preserves routine occurrences when master routine definition is edited (2 ms)

PASS test/wellness-and-analytics.spec.ts
  Wellness and Analytics Services
    √ computes accurate completion rates, routine adherence, and overdue counts (4 ms)
    √ constructs multi-day trends across all 5 chart datasets (2 ms)
    √ logs hydration metric and invalidates user cache (1 ms)
    √ upserts daily wellness check-in with mood and energy ratings (1 ms)

PASS test/worker-and-notifications.spec.ts
  Worker, Notifications & Emergency Replan Recovery
    √ cancels reminder and aborts push if the task is already COMPLETED (8 ms)
    √ cancels reminder and aborts push if the task is SKIPPED or CANCELLED (2 ms)
    √ defers non-urgent reminder during quiet hours (1 ms)
    √ sends push notification and records attempt when task is active (3 ms)
    √ processes pending outbox events and reconciles overdue reminders (2 ms)
    √ cancels emergency task, invalidates reminders, and recalculates feasible plan for remaining tasks (2 ms)

PASS test/api-functional.spec.ts
  API Functional Integration Suite
    √ 1. Task Management: handles task creation across categories (2 ms)
    √ 2. Routine Management: creates recurring routine definitions (1 ms)
    √ 3. Wellness Tracking: logs metrics and computes daily summaries (1 ms)
    √ 4. Emergency Workflow: can trigger emergency replanning (1 ms)
    √ 5. User Settings & Data Portability: exports user data (1 ms)

PASS test/supabase-live-database.spec.ts
  Supabase Live PostgreSQL Integration
    √ 1. Connects to live Supabase PostgreSQL and queries public schema (764 ms)
    √ 2. Verifies that all 16 required tables exist in the public schema (12 ms)
    √ 3. Cryptographic JWT authentication: accepts valid HS256 signed token (3 ms)
    √ 4. Cryptographic JWT authentication: rejects forged or corrupted signatures (2 ms)
    √ 5. Cryptographic JWT authentication: rejects invalid audience (2 ms)
    √ 6. Profile synchronization: creates and updates User profile from JWT identity (15 ms)
    √ 7. Multi-tenant isolation: enforces user ownership on live queries (14 ms)
    √ 8. 4-Category Task Persistence: creates tasks for WORK, ROUTINE, DAY_PLAN, EMERGENCY (28 ms)
    √ 9. Task Event History: records immutable TaskEvent on status transitions (18 ms)
    √ 10. Routine Persistence: occurrences survive master routine definition edits (24 ms)
    √ 11. Wellness Metric and Daily Check-In persistence (21 ms)
    √ 12. Historical retrieval survives across sessions (16 ms)

Test Suites: 7 passed, 7 total
Tests:       43 passed, 43 total
Snapshots:   0 total
Time:        56.166 s
```

---

## 11. Known Limitations & Production Hardening Notes

1. **iOS Web Push Requirements:** Apple requires iOS 16.4 or later and mandates that the application is added to the home screen ("Add to Home Screen") before enabling the Web Push API.
2. **Redis Eviction Policy:** For BullMQ production queues, configure Redis with `maxmemory-policy noeviction` so delayed jobs and locks are never evicted under memory pressure.
3. **High-Concurrency Worker Scaling:** BullMQ handles distributed locking across multiple instances automatically. When deploying multiple background worker containers, ensure Redis latency is low (< 5ms) for optimal lock heartbeat renewal.
