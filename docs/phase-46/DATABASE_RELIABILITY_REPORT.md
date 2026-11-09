# Database Reliability & Pooler Saturation Report

## 1. Supabase Connection Architecture
- **Host:** `aws-0-ap-northeast-1.pooler.supabase.com:6543`
- **Driver:** Prisma Client Singleton with Jittered Exponential Backoff.
- **Fail-Safe Filter:** Graceful HTTP 503 response if pooler reaches hard timeout.

## 2. Multi-User Concurrency Test Results
- **1 User:** 1/1 (100% success) — 852 ms
- **10 Users:** 10/10 (100% success) — 1,731 ms (173 ms / req)
- **25 Users:** 25/25 (100% success) — 2,269 ms (91 ms / req)
- **50 Users:** 50/50 (100% success) — 2,117 ms (42 ms / req)
- **100 Users:** 100/100 (100% success) — 5,423 ms total; P50: 3,338 ms, P95: 5,226 ms, P99: 5,352 ms.
- **Status:** **PASS** (Zero dropped connections or connection pool exhausts).

