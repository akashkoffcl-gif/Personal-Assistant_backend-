# Known Issues and Limitations

**Phase:** 53.3  
**Target:** Document operational constraints of proactive intelligence.

---

1. **In-Memory Cooldown State:**
   - The repetition suppression cooldown cache is maintained in memory. If the backend process restarts, suppression timestamps are cleared, falling back to standard recency decay.
2. **Third-Party Calendar Sync:**
   - External Google Calendar / Outlook events are evaluated via local database `SchedulePlan` and `Task` entities; direct bidirectional OAuth calendar polling is subject to external rate limits.
3. **Push Notification Delivery:**
   - Desktop and mobile push notifications require an active ServiceWorker and valid Web Push subscription (`PushSubscription` row).

