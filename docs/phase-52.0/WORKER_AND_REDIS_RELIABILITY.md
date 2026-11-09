# PHASE 52.0: WORKER AND REDIS RELIABILITY REPORT

## 1. Reliability Architecture
The production worker topology separates stateless HTTP API instances from background worker consumers:
- **API Nodes:** Run with `DISABLE_WORKER="true"`, delegating CPU-intensive operations.
- **Worker Consumers:** Dedicated BullMQ workers consuming from named queues (`default`, `workflow-execution`).
- **Distributed Coordination:** Redis cluster provides distributed rate limiting, cache synchronization, and pub/sub streaming.
- **Staging Mode Isolation:** In local staging, in-memory emulators (`ALLOW_LOCAL_LOCK="true"`) are utilized when external Redis instances experience network drops.

## 2. Heartbeat & Lease Recovery
- In multi-step workflow execution, workers hold leases with 30-second TTLs.
- Active workers emit a heartbeat renewing `leaseExpiresAt`.
- If an unhandled exception or worker process terminates abruptly, the heartbeat stops, the lease expires, and a recovery worker reclaims the execution slot via atomic CAS checks.

