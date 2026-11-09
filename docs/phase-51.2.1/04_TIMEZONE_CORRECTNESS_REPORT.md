# PHASE 51.2.1 — TIMEZONE PARSING & TEMPORAL CORRECTNESS REPORT

## 1. Executive Summary

Autonomous workflow planning frequently converts human temporal language (such as *"remind me tomorrow at 4 PM"*, *"schedule sprint next Monday morning"*) into database timestamps. Without timezone awareness, standard JS date parsing defaults to the host server's local time or UTC, producing substantial scheduling offsets.

Phase 51.2.1 introduced a dedicated, zero-dependency `TimezoneService` that leverages ECMAScript's standard `Intl` API to parse and convert relative dates in the user's specific IANA timezone to UTC ISO instants.

---

## 2. Implementation Details

### 2.1 The `TimezoneService` Architecture
Located at `apps/api/src/modules/ai/workflow/timezone.service.ts`:
- Resolves user timezone from `UserSettings.timezone` or `User.timezone` (defaults to `UTC` if unset).
- Calculates the exact UTC offset for the target timezone on a specific date using `Intl.DateTimeFormat`.
- Computes wall-clock target time (e.g. 16:00:00 on target date) and inverts the offset to produce the exact UTC epoch instant.

### 2.2 Relative Parsing Pipeline
When an instruction contains a time phrase such as *"tomorrow at 4 PM"*:
1. `WorkflowPlannerService` identifies the relative expression.
2. The user's timezone is queried (for demo user: `Asia/Kolkata`, which is UTC+05:30).
3. The parser extracts hour `16`, minute `0`, and targets the next calendar day (`2026-11-07`).
4. `TimezoneService.localTimeToUTC(2026, 11, 7, 16, 0, 0, 'Asia/Kolkata')` computes the exact instant:
   - 4:00 PM IST is 16:00 - 5:30 = **10:30 AM UTC**.
   - Resulting ISO string: `2026-11-07T10:30:00.000Z`.

---

## 3. Database Persistence Verification

During the live end-to-end benchmark run, a reminder workflow step was executed:
- **Instruction:** *"Create a project called Benchmark Sprint, add three tasks, schedule a focus session and remind me tomorrow at 4 PM"*
- **User Timezone:** `Asia/Kolkata`
- **Database Query Result:**
  ```text
  Reminder triggerTime (UTC): 2026-11-07T10:30:00.000Z
  Expected: 2026-11-07T10:30:00.000Z (which is 4:00 PM IST)
  ```
- **Verification:** The persisted PostgreSQL timestamp matches the exact expected UTC instant.

