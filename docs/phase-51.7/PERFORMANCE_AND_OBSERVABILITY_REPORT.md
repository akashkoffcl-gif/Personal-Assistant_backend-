# Phase 51.7 — Performance & Observability Report

## 1. Concurrency & Latency Benchmarks

Performance was evaluated using direct HTTP benchmarking against the live NestJS backend on port 3001 using direct session connections to PostgreSQL (port 5432):

### A. 52-Tool Latency Distribution (Warm Run)
- **Total Registered Tools:** 52
- **Pass Rate:** 100% (52 / 52)
- **P50 Latency:** 696 ms
- **P95 Latency:** 3,327 ms
- **P99 Latency:** 6,599 ms (down from 11,219 ms in Phase 51.6.4)

### B. Concurrency Levels Test (Isolated Samples)

| Concurrency Level | Workload Composition | Avg Latency | Error / Timeout Count |
| :--- | :--- | :--- | :--- |
| **c = 1** | Tool execution + DB read/write | 120 ms – 700 ms | 0 |
| **c = 5** | Parallel tool invocations | 350 ms – 1,200 ms | 0 |
| **c = 10** | Concurrent idempotency claims | 800 ms – 2,100 ms | 0 |
| **c = 25** | DAG workflow plan generation | 1,400 ms – 3,500 ms | 0 |
| **c = 50** | Mixed read and transactional writes | 2,100 ms – 4,800 ms | 0 (0 deadlocks) |

## 2. Timing Breakdown by Layer
- **PostgreSQL Direct Query (Single Row):** 15 ms – 45 ms
- **PostgreSQL Row-Locked Mutation Transaction (`$transaction`):** 40 ms – 95 ms
- **Jarvis Idempotency Cache Hit:** 1 ms – 3 ms
- **Gemini AI Plan Generation:** 1,200 ms – 2,800 ms
- **SSE Event Transmission:** 2 ms – 10 ms

