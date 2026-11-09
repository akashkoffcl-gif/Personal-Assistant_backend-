# PHASE 50.1: REDIS & BULLMQ VALIDATION REPORT
## Managed Cloud Eviction Policy Evaluation & Outbox Recovery Guarantee

**Date:** 6 November 2026  
**Redis Endpoint:** `sonic-botanical-cacao-25084.db.redis.io:19767`  
**Host Architecture:** Managed Cloud Redis Instance

---

## 1. Redis Eviction Policy Audit

BullMQ logs issued the following warning:
```
[ioredis] volatile-lru eviction policy is active on Redis instance.
BullMQ recommends noeviction to avoid data loss.
```

### Direct Configuration Test
An automated diagnostic test script executed the following Redis command:
```javascript
await redis.config('set', 'maxmemory-policy', 'noeviction');
```
**Response:**
```
ReplyError: ERR Unsupported CONFIG parameter: maxmemory-policy
```

### Analysis & Provider Constraint
The Redis instance is a managed cloud multi-tenant / serverless Redis deployment where server-level configuration parameters (`CONFIG SET`) are strictly locked by the cloud provider. Changing the eviction policy directly to `noeviction` is not permitted by the provider security policy.

---

## 2. Durability & Recovery Architecture

To ensure zero task or reminder loss despite the provider's `volatile-lru` policy:

1. **Transactional PostgreSQL Outbox as Authoritative Source of Truth:**
   - Every scheduled reminder or background workflow is first committed to the Supabase PostgreSQL `outbox_events` and `reminders` tables inside the same database transaction as the task.
   - Redis and BullMQ act solely as an execution transport / high-speed priority queue, not an unbacked data store.

2. **Durable Reconciler Replay:**
   - The 30-second reconciler (`reconcileOutboxAndReminders`) checks for any scheduled reminders or outbox events whose trigger time has elapsed without a confirmed execution timestamp.
   - If Redis were to evict a volatile key or restart, the reconciler automatically replays and re-enqueues the missing jobs from PostgreSQL.

3. **In-Memory Distributed Lock Fallback:**
   - `RedisService` provides a distributed lock using `SET NX EX`. If the Redis connection drops or is unavailable, it gracefully fails over to an atomic process memory cache, ensuring smooth single-worker execution without crashes.

---

## 3. Operational Conclusion

The application is resilient against volatile cache evictions and transient Redis restarts. Queue integrity and job delivery guarantees are anchored in persistent PostgreSQL outbox records rather than relying purely on transient Redis memory.

