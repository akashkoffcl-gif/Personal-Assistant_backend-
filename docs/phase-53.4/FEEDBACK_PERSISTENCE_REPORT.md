# Feedback Persistence Report

**Phase:** 53.4  
**Target:** Durable persistence of user feedback across backend lifecycles.

---

## 1. Dual-Layer Persistence

When a user responds to a proactive suggestion via `POST /api/v1/ai/proactive/feedback`:
1. **Redis Suppression Layer:**
   - Registers TTL-based suppression (`proactive:suppress:${userId}:${opportunityId}`).
   - Controls immediate opportunity re-evaluation timing across all workers.
2. **PostgreSQL Relational Layer:**
   - Stores the feedback payload in `KnowledgeNote` rows titled `[PROACTIVE_FEEDBACK] ${opportunityId}`.
   - Retains permanent audit evidence: `action`, `timestamp`, and `opportunityId`.

## 2. Evidence of Resilience

- Restarted API server and verified that feedback submissions survive process restarts.
- Confirmed that dismissed opportunities remain suppressed upon server boot.

