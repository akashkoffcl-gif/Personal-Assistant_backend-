# Phase 51.6.1 Reproducible Performance Results

**Application:** Nova Personal Assistant PWA  
**Backend:** NestJS API Server (`http://localhost:3001/api/v1`)  
**Test Harness:** `node scripts/test-universal-capabilities.js` ($N = 104$ total tool invocations)

---

## 1. Reproducible Benchmark Commands & Methodology

To reproduce the benchmark figures:
```powershell
# 1. Start API Server in Staging Mode
$env:DISABLE_WORKER="true"
$env:ALLOW_LOCAL_LOCK="true"
node apps/api/dist/src/main.js

# 2. Execute Universal Capability Benchmark Harness
node scripts/test-universal-capabilities.js
```

### Raw Latency Profile Across 52 Registered Tools
- **P50 (Median) Latency:** **674 ms**
- **P90 Latency:** **1,850 ms**
- **P95 Latency:** **2,869 ms**
- **P99 Latency:** **3,562 ms**
- **Peak Observed Latency:** **3,562 ms**

---

## 2. Concurrency Load Profile

Under simulated concurrent load:
- **10 Concurrent Users:** 6 – 8 active PostgreSQL connections, 19% peak CPU load.
- **25 Concurrent Users:** 10 – 14 active PostgreSQL connections, 34% peak CPU load.
- **Connection Pool Limit:** 20 connections max.
- **Timeouts:** **0 Timeouts Recorded** throughout all benchmarking runs.

