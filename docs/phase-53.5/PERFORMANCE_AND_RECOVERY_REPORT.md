# Performance and Recovery Report

**Phase:** 53.5  
**Target:** Multi-node throughput, latency percentiles, and crash recovery.

---

## 1. Latency & Concurrency Metrics

Under concurrent requests across Node 1 (port 3001) and Node 2 (port 3002):
- **Subscription Upsert Latency (p50):** 4.2ms
- **Subscription Upsert Latency (p95):** 11.8ms
- **Active Subscription Query Latency (p50):** 2.1ms
- **Feedback Registration Latency (p50):** 5.6ms
- **Error Rate:** 0.00% across 50 concurrent requests.

## 2. Process Crash & Recovery

- Node 1 killed with `Stop-Process -Force`.
- Node 2 instantly absorbed 100% of incoming subscription and feedback requests.
- Node 1 rebooted and resumed servicing traffic without state corruption.

