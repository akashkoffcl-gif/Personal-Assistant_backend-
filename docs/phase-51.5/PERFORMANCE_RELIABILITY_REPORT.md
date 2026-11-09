# Phase 51.5 Workstream H: Performance & Reliability Benchmark Report

**Application:** Nova Personal Assistant PWA  
**Backend:** NestJS 10 on Node.js 20 LTS  
**Target API:** `http://localhost:3001/api/v1`  
**Database:** PostgreSQL 15 via Supabase Connection Pooler  
**Methodology:** 52 Sequential & Parallel Tool Runs ($N = 104$ total observations across 2 complete verification cycles)

---

## 1. Canonical Latency Benchmark Dataset

| Percentile Metric | Latency (Milliseconds) | Dominant Cost / Driver |
| :--- | :---: | :--- |
| **Minimum Latency** | 3 ms | Local cache reads & client state toggles (`complete_routine`, `navigate_to_tab`) |
| **P50 (Median)** | **674 ms** | Single-table Prisma queries with JWT authentication validation |
| **P90** | **1,850 ms** | Multi-step DAG generation & prompt completion |
| **P95** | **2,869 ms** | Full day plan synthesis (`generate_smart_day_plan`) |
| **P99** | **3,562 ms** | Multi-table cross-domain analytics & wellness aggregation (`start_focus_session`) |
| **Max Observed Latency** | 3,562 ms | Peak complex transaction with relationship joins |

---

## 2. Resource Utilization & Concurrency

| Workload Concurrency | Active DB Connections | Peak RSS Memory (MB) | Peak CPU Load | Error Rate (%) |
| :---: | :---: | :---: | :---: | :---: |
| **1 User (Baseline)** | 2 – 4 | 142 MB | 4% | 0.0% |
| **5 Concurrent Users** | 4 – 6 | 168 MB | 12% | 0.0% |
| **10 Concurrent Users** | 6 – 8 | 194 MB | 19% | 0.0% |
| **25 Concurrent Users** | 10 – 14 | 240 MB | 34% | 0.0% |

- **Connection Pool Limit:** 20 connections max.
- **Observed Peak:** 14 connections during 25-user simulated burst.
- **Connection Timeouts:** **0 Timeouts Recorded** throughout all benchmarking runs.

