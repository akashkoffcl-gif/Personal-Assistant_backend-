# PHASE 51.9: DATABASE PERFORMANCE REPORT

## 1. Latency Profile Investigation
During Phase 51.8 and Phase 51.9 benchmarking on local staging connected to Supabase:
- **Read P50:** ~380ms - 750ms
- **Read P95:** ~1,100ms
- **Write P50:** ~1.1s - 1.8s
- **Write P95:** ~6.5s - 18s (during pooler handshake reconnection)

## 2. Root Cause Analysis
1. **Cross-Continental WAN Latency:**
   - Staging server running locally on Windows connects to AWS Tokyo (`ap-northeast-1`) Supabase pooler over public Internet with ~180ms RTT per TCP roundtrip.
2. **Interactive Transaction Roundtrips:**
   - A standard domain transaction executes 4 sequential statements:
     1. `tx.$queryRawUnsafe('SELECT ... FOR UPDATE')` [Workflow lock]
     2. `tx.$queryRawUnsafe('SELECT ... FOR UPDATE')` [Claim lock]
     3. `tx.<domain>.create(...)` [Entity insert]
     4. `tx.aIAction.update(...)` [Idempotency commit]
   - Over WAN, 4 sequential roundtrips plus transaction begin/commit incur 6 * 180ms = ~1.08s baseline overhead.
3. **Pooler Multiplexing Contention:**
   - Supabase connection pooler in session mode can queue connections during concurrent stress tests.

## 3. Recommended Production Architecture Optimization
1. **Co-located VPC Hosting:**
   - Deploy backend API and BullMQ worker nodes in the same AWS region (`ap-northeast-1`) with direct VPC peering to PostgreSQL. This drops single roundtrip latency from ~180ms to <1.5ms, reducing write P50 from ~1.1s to <15ms.
2. **Batch Query Consolidation:**
   - Combine workflow lease validation and idempotency claim verification into a single compound CTE query to eliminate one network roundtrip per transaction.
3. **Redis Read Caching:**
   - Hot read queries (`getProfile`, `get_dashboard_layout`, `settings`) are fronted with Redis caching with 60-300s TTL.

