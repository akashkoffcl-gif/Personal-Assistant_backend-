# Phase 51.5 Workstream C: Redis Failure Boundary Report

**Application:** Nova Personal Assistant PWA  
**Service:** `RedisService` (`apps/api/src/common/redis.service.ts`)  
**Scope:** Strict boundary separation between non-critical caching and critical multi-process coordination.

---

## 1. Redis Usage Classification Inventory

| Category | Usage Purpose | Operation Keys | Criticality | Permitted Failure Behavior |
| :--- | :--- | :--- | :---: | :--- |
| **User State Cache** | AI prompt & conversational context caching | `user:*`, `prompt:*` | Non-Critical | Transparent fallback to process-local `memoryCache` Map. |
| **Analytics Cache** | Aggregated command center & daily metrics | `analytics:*` | Non-Critical | Transparent fallback to memory or re-computation. |
| **Response Cache** | Briefing & schedule change suggestions | `briefing:*` | Non-Critical | Degrades gracefully; direct query fallback. |
| **Distributed Locks** | Multi-process reconciliation & job scheduling | `lock:*` | **Critical** | **Strict Fail-Closed:** NEVER fall back to process-local Map in multi-worker mode. |
| **Worker Leases** | Authoritative workflow step execution lease | `lease:*` | **Critical** | Backed by authoritative PostgreSQL row locks & monotonic expiration. |

---

## 2. Hardened Coordination Boundary Implementation

In multi-process or clustered environments, acquiring an "in-memory" lock inside one process while another worker process runs concurrently leads to split-brain double-execution.

To prevent this vulnerability, `RedisService.acquireLock()` was hardened with an explicit fail-closed boundary:

```typescript
async acquireLock(lockKey: string, ttlSeconds: number): Promise<boolean> {
  const key = `lock:${lockKey}`;
  if (this.isConnected && this.client) {
    try {
      const res = await this.client.set(key, 'LOCKED', 'EX', ttlSeconds, 'NX');
      return res === 'OK';
    } catch (err: any) {
      this.logger.warn(`Failed acquiring distributed lock via Redis: ${err?.message}`);
      return false; // Fail closed on connection error
    }
  }

  // Single-process fallback ONLY if explicitly allowed via configuration flag
  if (process.env.DISABLE_WORKER === 'true' || process.env.ALLOW_LOCAL_LOCK === 'true') {
    const now = Date.now();
    const existing = this.memoryCache.get(key);
    if (existing && existing.expiresAt && existing.expiresAt > now) {
      return false; // lock held
    }
    this.memoryCache.set(key, { value: 'LOCKED', expiresAt: now + ttlSeconds * 1000 });
    return true;
  }

  // Fail-closed for multi-process safety
  this.logger.error(`Distributed lock requested for ${lockKey} but Redis is unavailable. Failing closed.`);
  return false;
}
```

---

## 3. Resilience Audit Under Disconnection

1. **API Server Startup Without Redis:**
   - Server boots with a single warning: `Redis connection unavailable at redis://localhost:6379. Using in-memory fallback cache for local operation.`
   - Non-critical queries, chat prompts, and navigation remain operational.
2. **Idle Disconnection / Socket Close:**
   - Calls to `get()` and `set()` catch the ioredis disconnection gracefully without throwing uncaught 500 errors to callers.
3. **Multi-Worker Reconciliation Protection:**
   - In a multi-worker environment without Redis, background reconciliation fails closed rather than running duplicate competing workloads.

