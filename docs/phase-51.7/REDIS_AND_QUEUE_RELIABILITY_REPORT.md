# Phase 51.7 — Redis & Queue Reliability Report

## 1. Redis Topology & Connection Architecture

- **Deployment Model:** Remote Redis Cloud (`sonic-botanical-cacao-25084.db.redis.io:19767`).
- **Connection Configuration:** Configured in `apps/api/src/common/redis.service.ts` with retry strategy and automated fallback.
- **Worker Configuration:** In single-worker API daemon mode (`DISABLE_WORKER="true"`, `ALLOW_LOCAL_LOCK="true"`), BullMQ background consumers are skipped to prevent redundant lease fights.

## 2. In-Memory Fallback Boundaries & Guarantees

- **Cache Degradation:** When Redis is disconnected or during network glitches, caching operations gracefully fall back to an internal Node.js `LRUCache`.
- **Distributed Coordination Boundary:** Local in-memory caching is strictly prohibited from replacing distributed locks or lease ownership. When distributed multi-worker coordination is required, the system fails closed at the PostgreSQL database boundary (`SELECT ... FOR UPDATE`).
- **Reconnection Resilience:** On network recovery, `ioredis` automatically re-establishes TCP session and resynchronizes active pub/sub channels.

