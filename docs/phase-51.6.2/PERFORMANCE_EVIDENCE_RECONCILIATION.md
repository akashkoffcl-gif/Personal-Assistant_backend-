# Performance Evidence & Benchmark Reconciliation Report

## 1. Benchmarking Environment & Conditions
- **Target Host:** `http://localhost:3001/api/v1`
- **Database:** Supabase PostgreSQL with pooled Prisma connection
- **Cache/Queue:** Upstash Redis with resilient memory fallback
- **Concurrency Level:** Single-worker API daemon (`DISABLE_WORKER="true"`, `ALLOW_LOCAL_LOCK="true"`)
- **Node Runtime:** Node.js v24.20.0 (x64 Windows)

## 2. Universal Tool Execution Latency Benchmarks
From 52/52 registered tools tested via `scripts/test-universal-capabilities.js`:
- **Total Registered Tools:** 52
- **Pass Rate:** 100% (52 / 52)
- **Latency Distribution:**
  - **P50 (Median):** 939 ms
  - **P95:** 3,591 ms
  - **P99:** 4,673 ms
- **Read Latencies:** ~40ms - 80ms (e.g. `complete_task`: 50ms, `update_task`: 53ms, `navigate_to_tab`: 70ms)
- **Mutation / AI Analysis Latencies:** ~1,000ms - 4,500ms (e.g. `generate_smart_day_plan`: 3,939ms, `get_wellness_summary`: 4,673ms)

## 3. Workflow Engine Performance & CAS Throughput
From `scripts/test-state-concurrency.js` and `scripts/test-domain-idempotency-crash.js`:
- **Domain Idempotency Replay Latency:** 1 ms (cached entity retrieved directly without duplicate database writes)
- **CAS State Transition Latency:** 8 ms - 22 ms
- **Recovery Lease Claim Latency:** 11 ms - 18 ms
- **Worker Fencing Rejection Latency:** 4 ms (rejected at boundary before hitting domain service)

## 4. Reproducible Command Reference
To reproduce all performance metrics and evidence:
```powershell
# 1. Capabilities and tool latency audit
node scripts/test-universal-capabilities.js

# 2. Domain-level idempotency and crash recovery
node scripts/test-domain-idempotency-crash.js

# 3. State-transition concurrency race verification
node scripts/test-state-concurrency.js

# 4. Worker lease fencing race verification
node scripts/test-worker-fencing-race.js

# 5. Jest unit test suite
npm --prefix apps/api test test/multi-step-workflow.spec.ts
```

