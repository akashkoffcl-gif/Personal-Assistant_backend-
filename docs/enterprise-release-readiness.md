# Enterprise Personal Assistant PWA — Release Readiness & Deployment Runbook

**Project:** Personal Task, Routine, Smart Reminder & Wellness Assistant  
**Platform:** Next.js 14 Frontend PWA + NestJS 10 API + Supabase PostgreSQL + Redis BullMQ  
**Document Type:** Production Release Readiness Checklist & Operations Runbook  
**Date:** October 2026  
**Status:** READY FOR PRODUCTION STAGING & DEPLOYMENT  

---

## 1. Release Readiness Scorecard

| Domain | Readiness Criteria | Status | Evidence / Verification |
|---|---|---|---|
| **Architecture** | Monorepo structure with independent buildable apps and shared packages | **READY** | `@assistant/shared`, `@assistant/api`, `@assistant/web` build cleanly |
| **Database** | 16 PostgreSQL models, Prisma migrations deployed, composite indexes | **READY** | Deployed to Supabase Tokyo pooler; 17 SQL statements executed |
| **Security** | Supabase Auth cryptographic JWT verification, RLS enabled, multi-tenant boundaries | **READY** | 4 JWT rejection tests passed; production fallback disabled |
| **Persistence** | Permanent audit trails for task lifecycle, routine edits, wellness logs | **READY** | All 14 live Supabase database tests passed |
| **Background Processing** | BullMQ queue with transactional outbox reconciler, quiet hours, state revalidation | **READY** | Worker suite passed 6/6 tests |
| **Automation Engine** | Deterministic rule evaluator with cooldown enforcement and execution history | **READY** | 5/5 automation tests passed; DB records verified |
| **Frontend UI/UX** | Accessible modals, toasts, drawers; zero `prompt()`, `alert()`, `confirm()` | **READY** | All dialogs replaced; Next.js production build succeeded |
| **Code Quality** | Strict TypeScript, zero ESLint warnings, 50 automated tests passing | **READY** | 50/50 tests passing; ESLint reports 0 warnings/errors |

---

## 2. Environment Variables & Secret Management

All sensitive credentials must be injected via secure environment variables or vault systems (e.g. AWS Secrets Manager, Vercel Environment Variables, Doppler). **No secrets are checked into source control.**

### Required Backend Variables (`apps/api/.env` / Container Environment)
```bash
# Server Configuration
PORT=3001
NODE_ENV=production
API_PREFIX=api/v1
CORS_ORIGIN=https://your-production-domain.com

# Authoritative Supabase Database Connections
# DATABASE_URL: Session pooler or transaction pooler (port 5432 or 6543)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5&pool_timeout=20"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Supabase Auth Cryptographic Validation
SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
SUPABASE_JWT_SECRET="<your-supabase-jwt-secret-at-least-32-chars>"

# Redis & Queue Configuration
REDIS_HOST="redis.production.internal"
REDIS_PORT=6379
REDIS_PASSWORD="<strong-redis-auth-token>"

# Web Push VAPID Configuration (Generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY="<base64-url-encoded-public-key>"
VAPID_PRIVATE_KEY="<base64-url-encoded-private-key>"
VAPID_SUBJECT="mailto:security@your-domain.com"
```

### Required Frontend Variables (`apps/web/.env.production`)
```bash
NEXT_PUBLIC_API_URL=https://api.your-production-domain.com/api/v1
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<matching-vapid-public-key>"
```

---

## 3. Production Deployment Runbook

### Step 1: Pre-Deployment Build & Verification
Run the verification pipeline from the repository root:
```bash
# 1. Install pinned dependencies across all workspaces
npm ci

# 2. Build shared contracts
npm --workspace=@assistant/shared run build

# 3. Generate Prisma client
npm --workspace=@assistant/api run prisma:generate

# 4. Run automated test suite
npm test

# 5. Build backend and frontend applications
npm --workspace=@assistant/api run build
npm --workspace=@assistant/web run build
npm --workspace=@assistant/web run lint
```

### Step 2: Database Migration Deployment
Apply pending Prisma migrations to the production Supabase database:
```bash
npm --workspace=@assistant/api run prisma:deploy
```
*Note: Do not run `prisma migrate dev` or `prisma db push` in production. Always deploy versioned migrations through `prisma migrate deploy`.*

### Step 3: Backend API Service Startup
Start the NestJS production server using a process manager (e.g., PM2, Docker, or Kubernetes):
```bash
# Standard Node command:
node apps/api/dist/src/main.js

# Or with PM2:
pm2 start apps/api/dist/src/main.js --name "assistant-api" -i max
```

### Step 4: Background Worker & Outbox Reconciler Startup
The background worker can run as an isolated worker process or in-process:
```bash
# Isolated worker process:
node apps/api/dist/src/worker/worker.main.js

# Or with PM2:
pm2 start apps/api/dist/src/worker/worker.main.js --name "assistant-worker"
```

### Step 5: Frontend PWA Deployment
Deploy `apps/web` to Next.js-compatible hosting (Vercel, AWS Amplify, Docker container, or Node.js server):
```bash
# Start standalone Next.js server:
cd apps/web && npm run start -p 3000
```

---

## 4. Monitoring, Health Checks & Operational Telemetry

### Health & Liveness Probes
- **API Health Endpoint:** `GET /api/v1/settings` (verifies API responsiveness and database query execution).
- **Worker Telemetry:** Check `reminders-queue` counts via BullMQ admin or Redis CLI:
  ```bash
  redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD DBSIZE
  ```
- **Outbox Recovery Monitoring:** Check `outbox_events` in Supabase:
  ```sql
  SELECT status, count(*) FROM outbox_events GROUP BY status;
  ```

### Rollback Plan
1. **Frontend:** Roll back CDN or container deployment to the previous immutable release hash.
2. **API:** Roll back Docker image or PM2 process to previous commit tag.
3. **Database:** Migrations are non-destructive and backward compatible; no columns or historical tables are dropped.

---

## 5. Security & Compliance Checklist

- [x] **Zero Credentials in Git:** `.env`, `.env.local`, and build artifacts are strictly ignored in `.gitignore`.
- [x] **Cryptographic Auth Validation:** HMAC-SHA256 signature, audience (`authenticated`), issuer, and expiration timestamps verified on all protected API routes.
- [x] **Zero Production Fallback:** Development bypasses are disabled when `NODE_ENV=production`.
- [x] **Row Level Security Active:** Supabase PostgreSQL RLS enforced on `projects`, `automation_rules`, `automation_rule_executions`, and core user data tables.
- [x] **CORS Scoping:** API restricts origin headers strictly to configured application domains.
- [x] **Data Portability Compliance (GDPR/CCPA):** Complete user data export (`/api/v1/settings/export`) extracts all tasks, routines, occurrences, events, wellness entries, and schedule plans.
- [x] **No Browser Native Dialogs:** Zero usage of blocking `window.prompt()`, `window.alert()`, or `window.confirm()`.

