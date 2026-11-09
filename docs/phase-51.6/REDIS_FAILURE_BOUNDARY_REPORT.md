# Phase 51.6 — Redis Failure Boundary Report

**Application:** Nova Personal Assistant PWA  
**Service:** `RedisService` (`apps/api/src/common/redis.service.ts`)

---

## 1. Architectural Boundary Separation

In Phase 51.6, the Redis failure boundary was audited to guarantee that process-local in-memory fallbacks never compromise distributed coordination:

```mermaid
flowchart TD
    Req[Incoming Redis Operation] --> CheckOp{Operation Type?}
    CheckOp -- Cache Read/Write --> Caching[get / set / invalidate]
    CheckOp -- Distributed Lock --> Coordination[acquireLock / lease]
    
    Caching --> ConnCheck1{Redis Connected?}
    ConnCheck1 -- Yes --> RedisCache[ioredis Cache]
    ConnCheck1 -- No --> MemCache[In-Process Map Fallback]
    
    Coordination --> ConnCheck2{Redis Connected?}
    ConnCheck2 -- Yes --> RedisLock[ioredis SET NX EX]
    ConnCheck2 -- No --> TopoCheck{Single-Worker Mode?}
    TopoCheck -- Yes --> MemLock[In-Process Atomic Map]
    TopoCheck -- No --> FailClosed[FAIL CLOSED: Throw ServiceUnavailable]
```

---

## 2. Distributed Lock Fail-Closed Policy

In multi-process deployments, failing closed prevents two worker processes from executing identical scheduled cron jobs or database reconciliations:
```typescript
// Fail-closed for multi-process safety
this.logger.error(`Distributed lock requested for ${lockKey} but Redis is unavailable. Failing closed.`);
return false;
```

### PostgreSQL Authoritative State
For critical workflow execution and worker lease tracking, Nova does not rely on Redis as an authoritative state store. PostgreSQL (`ai_actions` table) remains the sole authoritative source of truth for workflow state, worker ownership tokens, and lease timestamps. Redis outages therefore cannot cause workflow state corruption.

