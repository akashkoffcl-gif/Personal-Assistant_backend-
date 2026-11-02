# Phase 23 — Automated Follow-Up Engine Architecture

**Project:** Personal Assistant PWA  
**Repository:** `D:\PT`  
**Engine:** Durable Scheduling (BullMQ + Redis + PostgreSQL Reconciler)  
**Status:** Implemented & Verified

---

## 1. System Architecture & Workflow

```text
Scheduled Activity Created (Task / Routine)
                  |
                  v
       Persist to PostgreSQL
                  |
                  v
       BullMQ Delayed Job Queued
                  |
                  v
       Scheduled End Time Arrived
                  |
                  v
     Revalidate Status in Database
                  |
         +--------+--------+
         |                 |
     Completed?         Incomplete?
         |                 |
         v                 v
       [Stop]     Check Quiet Hours & Settings
                           |
                           v
              Create In-App Follow-Up Notification
                           |
              +------------+------------+
              |                         |
        App Active                App Inactive (Away)
              |                         |
              v                         v
     Interactive Dialog         Web Push Notification
     (FollowUpPromptModal)              |
              |                         v
              |               User Clicks Notification
              +------------<------------+
                           |
                           v
                    User Responds:
    [Completed | Partially Done | Still Working | Reschedule | Skipped]
                           |
                           v
              Enforce User Ownership Guard
                           |
                           v
             Persist Response to PostgreSQL
                           |
             +-------------+-------------+
             |                           |
     Update Task/Routine         Log TaskEvent
             |                           |
             +-------------+-------------+
                           |
                           v
        Refresh Dashboard KPIs & Invalidate Cache
```

---

## 2. Follow-Up Lifecycle States

The activity follow-up engine operates across an explicit, audited lifecycle:

| Lifecycle State | Description | Transition Trigger |
|:---|:---|:---|
| `SCHEDULED` | Task or routine occurrence has a future end time. | Activity created or rescheduled. |
| `DUE` | End time reached; worker begins evaluation. | BullMQ delayed job triggers or reconciler executes. |
| `FOLLOW_UP_PENDING` | Activity is verified incomplete; follow-up prompt prepared. | Database validation shows status is `TODO` or `IN_PROGRESS`. |
| `PROMPTED` | User presented with in-app dialog or Web Push notification. | App renders modal or VAPID push sent. |
| `IN_PROGRESS` | User indicates they are still working on the task. | User clicks "Still Working" (+15m, +30m, +1h). |
| `PARTIALLY_COMPLETED`| User recorded partial progress and remaining notes. | User clicks "Partially Done" with percentage slider. |
| `COMPLETED` | User confirms full task completion or habit target. | User clicks "Completed" (records `completedAt: now`). |
| `RESCHEDULED` | Activity moved to a revised start/end timestamp. | User picks revised date/time. |
| `SKIPPED` | User explicitly bypassed the activity with an optional reason. | User clicks "Skipped" and submits rationale. |
| `CANCELLED` | Activity was superseded or aborted. | User deletes task or cancels parent emergency plan. |

---

## 3. Endpoints & API Contract

### `GET /api/v1/follow-ups/pending`
Returns an array of pending follow-up items for the authenticated user:
```json
[
  {
    "id": "followup-task-101",
    "type": "TASK",
    "targetId": "task-101",
    "title": "Complete project proposal",
    "scheduledTimeText": "10:00 AM – 11:00 AM",
    "scheduledStartTime": "2026-11-01T10:00:00.000Z",
    "scheduledEndTime": "2026-11-01T11:00:00.000Z",
    "category": "WORK",
    "priority": "HIGH"
  }
]
```

### `POST /api/v1/follow-ups/respond`
Records the user's action with strict ownership validation:
```json
{
  "followUpId": "followup-task-101",
  "taskId": "task-101",
  "action": "PARTIALLY_COMPLETED",
  "progressPercent": 75,
  "notes": "Reviewed sections 1-3. Need final slide deck formatting."
}
```
**Response:**
```json
{
  "success": true,
  "action": "PARTIALLY_COMPLETED",
  "message": "Follow-up partially completed recorded successfully.",
  "timestamp": "2026-11-02T02:00:00.000Z"
}
```

---

## 4. Engineering Invariants & Safeguards

1. **Never Automatically Mark Completed:** Incomplete activities remain in their pending status until explicitly answered by the authenticated user.
2. **Never Silently Discard Work:** Rescheduling updates existing task records and logs an audited `TaskEvent` in PostgreSQL.
3. **Multi-Worker Idempotency:** Follow-up notifications are uniquely indexed by `userId`, `category: 'FOLLOW_UP'`, and `actionUrl`. Duplicate job runs or worker restarts detect the existing prompt and skip re-creation.
4. **Quiet Hours Enforcement:** Evaluates `userSettings.quietHoursStart` and `userSettings.quietHoursEnd`. During quiet hours, notifications for non-urgent tasks are suppressed until working hours resume.

