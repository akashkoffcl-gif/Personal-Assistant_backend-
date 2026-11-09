# Interruption and Timing Policy

**Phase:** 53.3  
**Target:** Rules governing quiet hours, focus blocks, and notification suppression.

---

## 1. Interruption Boundaries

1. **Quiet Hours (10:00 PM – 7:00 AM):**
   - Non-critical alerts are completely suppressed to `SILENCE`.
   - Only `CRITICAL` emergency alerts may bypass quiet hours.
2. **Active Deep Focus Session:**
   - When a `FocusSession` row has `status === 'ACTIVE'`, all proactive notifications are silenced to protect user concentration.
3. **Repetition Cooldown:**
   - Cooldown period: 4 hours per opportunity key to prevent repetitive nagging.

## 2. Preference for Silence

NOVA explicitly prefers silence over low-value interruptions. If an opportunity does not cross the utility threshold, no notification is dispatched.

