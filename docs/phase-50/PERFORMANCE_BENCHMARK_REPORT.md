# Phase 50 — Performance & Load Benchmark Report

**Environment:** Local Staging (`http://localhost:3001/api/v1`)  
**Timestamp:** 2026-11-06T05:02:45+05:30  
**Test Suite:** Autonomous Intelligence Concurrency Benchmark  
**Status:** FULL PASS  

---

## 1. Concurrency Benchmarks Matrix

| Concurrency Level | Total Requests | Success Rate | Latency P50 | Latency P95 | Latency P99 | Total Wall Time |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1 Request** | 1 | 100% (1/1) | 1,455ms | 1,455ms | 1,455ms | 1,455ms |
| **5 Concurrent** | 5 | 100% (5/5) | 2,849ms | 3,232ms | 3,232ms | 3,233ms |
| **10 Concurrent** | 10 | 100% (10/10) | 3,627ms | 4,268ms | 4,268ms | 4,279ms |
| **25 Concurrent** | 25 | 100% (25/25) | 6,545ms | 11,380ms | 11,815ms | 11,826ms |

---

## 2. Key Observations
1. **Zero Drops / Timeouts:** Across all load batches up to 25 parallel requests, 100% of requests resolved successfully without triggering client-side timeouts.
2. **Concurrency Limiter Efficacy:** NestJS event-loop and Prisma connection pooling handled parallel analytics and AI evaluations without memory exhaustion or socket errors.
3. **Response Clamp Compliance:** All responses under high load remained well below the 90s AI timeout clamp implemented in `apps/web/src/lib/api.ts`.

