# Proactive Decision Engine Design

**Phase:** 53.3  
**Target:** Architecture and decision gating for proactive suggestions.

---

## 1. The 5-Gate Decision Framework

Before emitting any suggestion or alert, NOVA evaluates five gates:
1. **Relevance:** Is the insight pertinent to the active life/work domain?
2. **Currentness:** Is the data verified and recent, or has the status changed?
3. **Utility:** Does proactive communication offer genuine value, or is it trivial noise?
4. **Timing:** Is the user currently in quiet hours, deep focus, or an active meeting?
5. **Action Policy:** Should NOVA `NOTIFY`, `SUGGEST`, `ASK`, or remain in `SILENCE`?

## 2. Safety Boundaries & Anti-Mutation Invariant

- Proactive suggestions **never automatically execute database mutations**.
- High-risk operations (e.g. task deletions, bulk reschedules) require explicit user authorization.

