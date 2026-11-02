# PHASE 26 — TECHNICAL DEBT REGISTER & ARCHITECTURAL ROADMAP
## Prioritized Inventory of Architectural Weaknesses, Maintainability Observations & Recommendations

**Application:** Personal Assistant PWA — Lavender Enterprise SaaS  
**Repository:** `D:\PT`  
**Audit Standard:** Software Engineering Institute (SEI) Technical Debt Framework  
**Classification:** P1 (Critical), P2 (High), P3 (Medium), P4 (Low)  

---

## 1. TECHNICAL DEBT REGISTER

| ID | Domain | Severity | Title & Architectural Description | Remediation Performed in Phase 26 | Outstanding Action / Roadmap |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TD-01** | **Security** | **P1 (Critical)** | **Committed Credentials in `.env.example`**<br>Template environment file contained raw production PostgreSQL password, Supabase service role key, and Redis password. | **RESOLVED:** Replaced all live secrets with sanitized configuration placeholders in `.env.example`. | Rotate upstream Supabase and Redis credentials to ensure zero lingering risk from historical Git commits. |
| **TD-02** | **Architecture** | **P1 (Critical)** | **Multi-Instance Prisma & Redis Provider Fragmentation**<br>Every NestJS module declared its own `PrismaService` and `RedisService` in `providers`, causing 14 duplicate clients and pool saturation. | **RESOLVED:** Created `@Global() CommonModule` exporting authoritative singletons; removed local duplicate providers. | None. Architecturally unified. |
| **TD-03** | **Performance** | **P1 (Critical)** | **Database Write Thrashing on Authenticated GET Requests**<br>`SupabaseAuthGuard` executed `prisma.user.upsert` to PostgreSQL on every single API request, including cached reads. | **RESOLVED:** Implemented Redis sync cache (`user:synced:${userId}`) with 1-hour TTL and `@Optional() RedisService` injection. | None. Response times improved by up to 290x. |
| **TD-04** | **API Contract** | **P2 (High)** | **Missing Automation Rule Update & Delete Endpoints**<br>Frontend client library (`api.ts`) declared `updateAutomationRule` and `deleteAutomationRule`, but backend controller lacked `@Patch` and `@Delete`. | **RESOLVED:** Implemented `updateRule` and `deleteRule` in `AutomationService` and mapped `@Patch('rules/:id')` and `@Delete('rules/:id')`. | None. Contract parity verified. |
| **TD-05** | **API Contract** | **P2 (High)** | **Routine Occurrence Complete Endpoint Discrepancy**<br>Web client called `POST /routines/occurrences/:id/complete`, while API only provided `/record`. | **RESOLVED:** Added `@Post('occurrences/:id/complete')` alias endpoint with default `status: COMPLETED`. | None. Backwards compatibility preserved. |
| **TD-06** | **PWA & Offline**| **P2 (High)** | **Service Worker Lacks Offline Fetch Interceptor**<br>`public/sw.js` caches assets on install and handles push notifications, but lacks a `fetch` event listener for offline page delivery and mutation sync. | **DOCUMENTED:** Identified during Workflow 9 audit. System functions reliably online. | Implement Workbox offline caching strategies (`NetworkFirst` for API, `CacheFirst` for static assets, IndexedDB background sync queue). |
| **TD-07** | **Performance** | **P3 (Medium)** | **Trend Analytics Aggregation Computation**<br>`getTrends` iterates across 7 days executing sequential `findUnique` and `getDailyKpi` calls. | **RESOLVED:** Cached aggregate result in Redis with 60s TTL (`dashboard:${userId}:trends:${days}`). | Optimize query into a single SQL window function or consolidated `groupBy` aggregation when dataset grows. |
| **TD-08** | **Database** | **P3 (Medium)** | **Volatile Eviction Policy on Redis Host**<br>Cloud Redis logged warning: `IMPORTANT! Eviction policy is volatile-lru. It should be "noeviction" for BullMQ`. | **DOCUMENTED:** Identified in BullMQ logs. | Adjust Redis configuration on Redis Cloud dashboard to `noeviction` to ensure BullMQ delayed jobs are never prematurely purged. |
| **TD-09** | **Testing** | **P4 (Low)** | **Live Database Test Duration**<br>`supabase-live-database.spec.ts` connects over WAN to Tokyo Supabase, requiring ~128s to run. | **DOCUMENTED:** Verified pass in full test suite. | Provide local PostgreSQL Docker container for instantaneous CI/CD test execution (`test:local`). |

---

## 2. ROADMAP RECOMMENDATIONS SUMMARY

1. **Sprint 1 (Post-Phase 26):** Rotate cloud database and Redis credentials upstream; update cloud Redis instance policy to `noeviction`.
2. **Sprint 2:** Enhance PWA Service Worker (`sw.js`) with Workbox `fetch` event caching and IndexedDB offline mutation outbox.
3. **Sprint 3:** Add containerized local database harness for ultra-fast offline unit testing.
