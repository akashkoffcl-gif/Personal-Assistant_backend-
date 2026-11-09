# PHASE 50.1: ROOT CAUSE ANALYSIS REPORT
## Supabase Connection Pool Exhaustion, Redis LRU Eviction & Runtime Instability

**Date:** 6 November 2026  
**System:** Personal Assistant PWA (Local Staging)  
**Components Analyzed:** NestJS Backend (`apps/api`), Next.js Web Frontend (`apps/web`), Supabase PostgreSQL, Redis (BullMQ), Worker Lifecycle.

---

## 1. Executive Summary

During Phase 50 live runtime execution, the application encountered three severe categories of runtime failures:
1. **Prisma / Supabase Connection Timeouts & Resets:**
   - Error: `Timed out fetching a new connection from the connection pool (Current connection pool timeout: 30, connection limit: 20)`
   - Error: `Can't reach database server at aws-0-ap-northeast-1.pooler.supabase.com:6543 (code: 10054, An existing connection was forcibly closed by the remote host)`
2. **Worker Process Duplication & Reconciliation Contention:**
   - Both the main NestJS API HTTP server (`main.ts`) and the standalone worker script (`worker.main.ts`) loaded `WorkerModule`, running competing BullMQ consumers and overlapping 30s interval outbox reconciliation loops.
3. **Redis LRU Policy & BullMQ Eviction Warnings:**
   - `[ioredis] volatile-lru eviction policy is active on Redis instance`, risking premature eviction of delayed reminder jobs and queue metadata.
4. **API Proxy & Frontend Assets:**
   - `GET /api/proxy/v1/health` returning 404 due to route rewrite discrepancy (`/api/v1/:path*` was the actual rule).
   - `GET /api/v1/analytics/command-center` timing out (>21s) due to uncached complex 7-day multi-model aggregation.
   - Next.js 500 error on `/favicon.ico` due to duplicate files in `public/favicon.ico` and `src/app/favicon.ico`.
5. **Nova UI Overlay Occlusion:**
   - The on-demand assistant overlay lacked minimize controls and an ESC key dismiss handler, occluding the Today's Schedule and Productivity Overview widgets.

---

## 2. Root Cause Analysis by Component

### A. Database Connection Pool Limits & Process Duplication
- **Investigation:** Supabase PostgreSQL was queried via `SHOW max_connections`. The total server limit is **60 connections**.
- **Issue:** The default `.env` configured `connection_limit=20` per process. When running the API server and worker concurrently, the two processes opened 40 connections simultaneously. Additionally, each process launched a 30s `reconcileOutboxAndReminders` interval querying `outboxEvent`, `reminder`, `task`, and `userSettings` without distributed coordination.
- **Result:** Connection contention quickly exceeded pooler capacity on port 6543, leading to remote socket closures (`OS code 10054`) and Prisma pool exhaustion.

### B. Redis Eviction Policy Limitations
- **Investigation:** Inspection of `INFO memory` revealed Redis was running with `maxmemory_policy: volatile-lru`.
- **Constraint Test:** Executing `CONFIG SET maxmemory-policy noeviction` resulted in `ERR Unsupported CONFIG parameter: maxmemory-policy` because the hosted Redis provider (Redis Cloud / Upstash) locks this setting.
- **Remediation Strategy:** Since the policy is immutable at the provider level, queue durability was reinforced through persistent PostgreSQL Outbox events (`OutboxEvent`) and scheduled reconciliation intervals with distributed Redis locking.

### C. Analytics Endpoint Latency & Proxy Hang-ups
- **Investigation:** `getCommandCenterData` aggregates scheduled tasks, completions, routine adherence, project progress, recent activity, and wellness metrics across a 7-day range. Uncached execution required **21.68 seconds**.
- **Result:** Upstream Node.js HTTP keep-alive sockets timed out, manifesting as `socket hang up` (`ECONNRESET`) in Next.js.
- **Remediation:** Added user-scoped Redis caching (`dashboard:${userId}:command-center:${date}:${range}`) with a 120s TTL and cache invalidation on task mutations, cutting response times to < 50ms.

### D. Next.js Favicon Conflict
- Duplicate files existed at `apps/web/public/favicon.ico` and `apps/web/src/app/favicon.ico`. Next.js 14 App Router throws a build/runtime conflict when both exist simultaneously, causing HTTP 500 errors.

---

## 3. Corrective Measures Implemented

| Issue | Remediation Action | Status |
|---|---|---|
| Process Duplication | Added `DISABLE_WORKER=true` single-worker architecture enforcement | Verified |
| Connection Budget | Clamped `connection_limit=5` per process (10 total vs 60 max) | Verified |
| Outbox Overlap | Implemented Redis distributed lock `outbox-reconciliation-lock` | Verified |
| Database Failures | Wrapped Outbox and Reminder reconciliation in `prisma.withRetry()` | Verified |
| Analytics Latency | Added 120s user-scoped caching to command center | Verified (< 50ms on warm) |
| Health Probes | Added `/health/live` (Liveness) and `/health/ready` (Readiness) | Verified (200 OK) |
| Favicon Conflict | Removed conflicting `apps/web/src/app/favicon.ico` | Verified (200 OK) |
| UI Overlap | Added Minimize/Restore toggle and ESC key dismiss handler | Verified |

---

## 4. Conclusion

All identified root causes have been isolated, addressed at the architectural and code level, and validated under local staging conditions. No remote schemas were altered, and no production deployments were attempted.

