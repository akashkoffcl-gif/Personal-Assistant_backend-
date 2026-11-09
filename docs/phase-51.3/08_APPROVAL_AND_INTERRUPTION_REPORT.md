# PHASE 51.3 — APPROVAL, INTERRUPTION & CANCELLATION REPORT

## 1. Executive Summary

This report analyzes spoken confirmation, vocal cancellation, active task interruption, and fail-closed safety mechanics within the Nova voice orchestration layer.

## 2. Spoken Confirmation & Approval Engine

### 2.1 Vocal Confirmation Intercept
When an action or multi-step workflow proposal is awaiting approval (`awaiting_approval` state), Nova listens for explicit affirmative commands:
- **Affirmative Utterances:** "confirm", "proceed", "yes", "approve", "do it", "execute".
- **Execution Guard:**
  - In `AIAssistantExperience.tsx`, affirmative words immediately invoke `handleConfirmAction` or the workflow approval mutation.
  - Server-side validation requires a valid canonical hash match and authenticated user ownership before transition from `PROPOSED` to `CONFIRMED`.

### 2.2 Vocal Cancellation & Rollback Intercept
When the user utters a cancellation command at any point:
- **Cancellation Utterances:** "cancel", "cancel that", "stop", "abort", "never mind", "reject".
- **Immediate Interruption Actions:**
  1. Stops native speech synthesis (`window.speechSynthesis.cancel()`).
  2. Clears pending action proposals (`setPendingAction(null)`).
  3. Rejects pending workflow proposal via `WorkflowPlannerService.rejectWorkflow(workflowId, 'User vocal cancel')`.
  4. Returns assistant avatar state to `idle`.
  5. Plays a brief audio acknowledgment: *"Cancelled."*

## 3. Fail-Closed Safety Guarantees

1. **Silence / Timeout:**
   - If the user goes silent after a proposal card is shown, Nova does not execute automatically.
   - The proposal remains in `PROPOSED` status until explicitly approved or until the 30-minute approval TTL expires.
2. **Ambiguous or Unrecognized Speech:**
   - If spoken speech matches neither affirmative nor cancellation keywords, Nova remains in `awaiting_approval` and articulates: *"I need your explicit confirmation. Say 'confirm' to execute or 'cancel' to dismiss."*
3. **Emergency Interruption:**
   - If an emergency or high-risk tool is triggered (`report_emergency`, `delete_task`), approval cannot be bypassed under any circumstances.

## 4. Verification Evidence

- Unit tests in `test/voice-workspace-orchestration.spec.ts`:
  - `confirms pending workflow only when exact matching vocal confirmation is received`: Passed.
  - `rejects confirmation if workflow ownership does not match authenticated user`: Passed.
  - `cancels pending workflow cleanly upon vocal cancel command`: Passed.

