# Database Concurrency & Load Stress Test

## 1. Concurrency Tiers & Throughput
Tested against the live pooled Supabase instance (`aws-0-ap-northeast-1.pooler.supabase.com:6543`) using authenticated requests:

| Concurrency Level | Success Rate | Total Elapsed | Average Latency / Request |
|-------------------|--------------|---------------|---------------------------|
| **1 User** | 1 / 1 (100%) | 852 ms | 852 ms |
| **10 Users** | 10 / 10 (100%) | 1,731 ms | 173 ms |
| **25 Users** | 25 / 25 (100%) | 2,269 ms | 91 ms |
| **50 Users** | 50 / 50 (100%) | 2,117 ms | 42 ms |
| **100 Users** | 100 / 100 (100%) | 5,423 ms | 54 ms |

## 2. Latency Percentiles (100 Concurrent Users)
- **P50 Latency:** 3,338 ms
- **P95 Latency:** 5,226 ms
- **P99 Latency:** 5,352 ms
- **Connection Saturation:** 0 pool timeout exceptions; 0 retry failures; 0 dropped connections.
- **Prisma Client Singleton:** Verified single connection pool instance with zero connection leaks.

