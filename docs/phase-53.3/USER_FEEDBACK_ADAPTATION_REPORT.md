# User Feedback Adaptation Report

**Phase:** 53.3  
**Target:** Evidence-based learning from user feedback on proactive suggestions.

---

## 1. Feedback Loop Endpoints

In [`AIController`](file:///D:/PT/apps/api/src/modules/ai/ai.controller.ts):
- `POST /ai/proactive/feedback`:
  - `opportunityId`: ID of the proactive suggestion.
  - `action`: `ACCEPTED` | `DISMISSED` | `SNOOZED`.

## 2. Adaptation Behavior

- **ACCEPTED:** Confirms recommendation accuracy, reinforcing similar suggestion weights.
- **DISMISSED:** Suppresses opportunity immediately and activates the 4-hour cooldown debounce.
- **SNOOZED:** Postpones opportunity evaluation by 2 hours.
- **Silence:** Silence is never interpreted as agreement. No unsolicited mutations occur.

