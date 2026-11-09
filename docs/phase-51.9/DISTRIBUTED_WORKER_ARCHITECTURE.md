# PHASE 51.9: DISTRIBUTED WORKER ARCHITECTURE REPORT

## 1. Architectural Topology
The production background execution topology separates HTTP API ingress from asynchronous job processing:

```
[ Next.js PWA Client ]
         │ (HTTPS / WSS)
         ▼
[ Cloudflare / ALB / WAF ]
         │ (Reverse Proxy)
         ▼
[ NestJS API Nodes ] (DISABLE_WORKER=true, Stateless)
         │
         ├─── (Enqueues Jobs) ───► [ Redis Cluster / BullMQ ]
         │                                    │
         └─── (Transactional Reads)           ▼
                    │           [ Dedicated Worker Nodes ] (BullMQ Consumers)
                    │                         │
                    └───────────┬─────────────┘
                                ▼
                   [ PostgreSQL Cluster (Prisma) ]
```

## 2. Distributed Worker Requirements & Coordination
1. **Separation of Concerns:**
   - API instances run with `DISABLE_WORKER="true"`, ensuring no CPU-intensive background DAG orchestrations compete with HTTP request threads.
   - Background worker processes run dedicated BullMQ consumers with bounded concurrency (`concurrency: 5`).
2. **Worker Heartbeat & Lease Renewal:**
   - Long-running multi-step DAG workflows maintain a heartbeat loop extending `leaseExpiresAt` in PostgreSQL every 10 seconds.
   - If a worker crashes, the heartbeat ceases and the lease expires after 30 seconds.
3. **Dead-Letter Queue (DLQ) & Exponential Backoff:**
   - Unhandled runtime failures transition through BullMQ retry policy: 3 attempts with exponential backoff (`delay: 1000 * 2^attempt`).
   - Terminal failures are moved to the DLQ (`failed-workflows`) with error stack traces and compensation logs.
4. **Graceful Shutdown Protocol:**
   - On `SIGTERM` / `SIGINT`, worker processes stop accepting new queue jobs, finish active in-flight atomic transactions, release leases, and exit cleanly within 15 seconds.
5. **Local Lock Isolation:**
   - `ALLOW_LOCAL_LOCK="true"` is strictly restricted to single-node staging environments. Production clusters enforce distributed Redis Redlock algorithms.

