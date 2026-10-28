# Personal Task, Routine, Smart Reminder & Wellness Assistant PWA

A production-ready personal productivity, smart reminder, emergency replanning, and wellness monitoring Progressive Web App (PWA). Built with a Next.js App Router frontend, NestJS backend API, Supabase PostgreSQL permanent persistence, Redis & BullMQ background job queues, and Web Push notifications.

---

## 1. Architecture Overview

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

### Four Task Categories Supported
1. **Personal Daily Routine:** Hydration intake, workout duration, meals, sleep, habits with streak tracking and adherence.
2. **Work Reminders:** Priorities, start/deadline constraints, progress tracking, overdue work alerts.
3. **Day-Specific Planning:** Time-block planning (morning, afternoon, evening), agenda placement without duplicate tasks, conflict warnings.
4. **Emergency and Plan Changes:** Rare-use emergency insertion with automatic deterministic replanning of flexible tasks while preserving fixed appointments and completed records.

---

## 2. Technology Stack & Pinned Versions

- **Frontend:** Next.js `14.2.35`, React `18.3.1`, Tailwind CSS `3.4.14`, Recharts `2.13.0`, TanStack Query `5.59.16`, Lucide Icons `0.453.0`.
- **Backend:** NestJS `10.4.22`, TypeScript `5.6.3`, Prisma ORM `5.22.0`, BullMQ `5.21.2`, ioredis `5.4.1`, web-push `3.6.7`.
- **Database:** Supabase PostgreSQL (16 normalized models, Row Level Security, timezone-aware UTC timestamps).
- **Background Processing:** Redis with BullMQ delayed reminder jobs and durable outbox reconciler.
- **Testing:** Jest `29.7.0`, ts-jest `29.2.5`.

---

## 3. Authoritative Database Schema (16 Models)

The database schema is defined in [`apps/api/prisma/schema.prisma`](file:///d:/PT/apps/api/prisma/schema.prisma) and exported as SQL in [`apps/api/prisma/migrations/0_init/migration.sql`](file:///d:/PT/apps/api/prisma/migrations/0_init/migration.sql):

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

## 4. Local Development Quickstart

### Prerequisites
- Node.js `>= 20.0.0`
- npm `>= 10.0.0`
- Docker (optional for local Postgres & Redis)

### Step 1: Clone and Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### Step 2: Start Postgres & Redis (Optional via Docker Compose)
```bash
docker compose up -d
```
*Note: If running without Docker, the backend automatically runs in local development resilience mode with an in-memory Redis cache and fallback database adapter.*

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Run Tests
```bash
npm run test
```

### Step 5: Start the Development Servers
In separate terminals:
```bash
# Terminal 1: Next.js PWA Frontend (Port 3000)
npm run dev:web

# Terminal 2: NestJS Backend API (Port 3001)
npm run dev:api

# Terminal 3: BullMQ Background Worker (Optional, separate process)
npm run dev:worker
```
- Web Application: [http://localhost:3000](http://localhost:3000)
- REST API: [http://localhost:3001/api/v1](http://localhost:3001/api/v1)
- Swagger OpenAPI Docs: [http://localhost:3001/api/v1/docs](http://localhost:3001/api/v1/docs)

---

## 5. Supabase Configuration & Migration

1. In Supabase Dashboard, create a new project.
2. In **Project Settings -> Database**, copy the pooled connection string (`DATABASE_URL`, port `6543`) and direct session connection string (`DIRECT_URL`, port `5432`).
3. Set the variables in `.env`.
4. Apply the schema migration:
```bash
cd apps/api
npx prisma migrate deploy
```
*Alternatively, paste the contents of `apps/api/prisma/migrations/0_init/migration.sql` into the Supabase SQL Editor and run it.*

---

## 6. Web Push & PWA Installation

### Generating VAPID Keys
```bash
npx web-push generate-vapid-keys
```
Put the public key into `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and private key into `VAPID_PRIVATE_KEY`.

### PWA Capabilities
- Open [http://localhost:3000](http://localhost:3000) in Chrome/Edge or Safari.
- Click the install button in the address bar to install as a standalone Desktop or Mobile PWA.
- Click **"Enable Push"** in the top bar to subscribe the browser to Web Push notifications.
- Click **"Test Push Notification"** in the right-side widget to receive an immediate push delivery.
- When reminders fire, notifications provide interactive action buttons:
  - **✓ Completed:** Automatically calls `/api/v1/tasks/:id/complete` in background.
  - **⏱ Snooze 15m:** Automatically calls `/api/v1/tasks/:id/snooze` in background.
  - **Open Task:** Focuses the PWA window.

---

## 7. Database Backup and Restore Procedures

### Automated PostgreSQL Backup
```bash
# Export full compressed SQL backup
pg_dump -h [aws-0-region.pooler.supabase.com] -p 5432 -U postgres.[project-ref] -d postgres -F c -b -v -f "assistant_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Restore Backup
```bash
# Restore to database
pg_restore -h [aws-0-region.pooler.supabase.com] -p 5432 -U postgres.[project-ref] -d postgres -v -c "assistant_backup_YYYYMMDD_HHMMSS.dump"
```

---

## 8. Test Execution Report

Automated Jest test execution output:
```text
PASS test/scheduling-engine.spec.ts
  SchedulingEngineService
    √ preserves FIXED appointments at their exact scheduled time (12 ms)
    √ moves FLEXIBLE tasks into available slots without overlapping FIXED tasks (2 ms)
    √ places EMERGENCY tasks and automatically reorganizes flexible tasks (5 ms)
    √ detects deadline violations as explicit conflicts without silent dropping (3 ms)
    √ does not reschedule or modify COMPLETED tasks (1 ms)

PASS test/api-functional.spec.ts
  API Functional Integration Suite
    √ 1. Task Management: handles task creation across categories (2 ms)
    √ 2. Routine Management: creates recurring routine definitions (1 ms)
    √ 3. Wellness Tracking: logs metrics and computes daily summaries (1 ms)
    √ 4. Emergency Workflow: can trigger emergency replanning (1 ms)
    √ 5. User Settings & Data Portability: exports user data (1 ms)

Test Suites: 2 passed, 2 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        14.229 s
```

---

## 9. Known Limitations and Production Hardening Notes

1. **Browser Push Support on iOS:** Mobile Safari on iOS requires iOS 16.4+ and requires the user to add the app to the Home Screen ("Add to Home Screen") before the Push API is accessible.
2. **Worker Scaling:** For high-throughput environments, multiple instances of the worker process can be scaled horizontally; BullMQ automatically coordinates job concurrency via Redis locks.

