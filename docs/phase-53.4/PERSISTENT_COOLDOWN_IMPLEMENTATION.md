# Persistent Cooldown Implementation

**Phase:** 53.4  
**Target:** Transition proactive opportunity cooldowns to durable, shared storage.

---

## 1. Durable Storage Architecture

Cooldowns are now persisted via Redis with atomic TTL keys:
- **Key Schema:** `proactive:suppress:${userId}:${opportunityKey}`
- **TTL Duration:**
  - Standard cooldown: `14,400 seconds` (4 hours)
  - `SNOOZED` action: `7,200 seconds` (2 hours)
  - `DISMISSED` action: `14,400 seconds` (4 hours)

## 2. Multi-Worker & Restart Resilience

1. **Backend Restart:**
   - When the backend restarts, Redis retains the suppression keys. Consecutive calls within the 4-hour window continue to be suppressed.
2. **Local Fallback:**
   - If Redis is disconnected, `ProactiveIntelligenceService` falls back to `localSuppressionFallback` Map, logging a warning while preserving process stability.
3. **Multi-Worker Safety:**
   - Multiple worker processes querying Redis share identical suppression states, preventing duplicate proactive suggestions.

