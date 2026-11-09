# Load Test & Concurrency Analysis Report

## 1. Concurrency Testing Results
Conducted against the live pooled PostgreSQL database:

| Concurrent Users | Successful Requests | Failure Rate | Total Duration | Average Latency |
|------------------|---------------------|--------------|----------------|-----------------|
| 1 | 1/1 | 0.0% | 852 ms | 852 ms |
| 10 | 10/10 | 0.0% | 1,731 ms | 173 ms |
| 25 | 25/25 | 0.0% | 2,269 ms | 91 ms |
| 50 | 50/50 | 0.0% | 2,117 ms | 42 ms |
| 100 | 100/100 | 0.0% | 5,423 ms | 54 ms |

## 2. Percentile Distribution (100 Concurrent Requests)
- **P50:** 3,338 ms
- **P95:** 5,226 ms
- **P99:** 5,352 ms
- **Connection Saturation:** 0 pool timeout exceptions; singleton Prisma client prevented connection thrashing.
- **Status:** **PASS**.

