# PHASE 51.3 — CONTEXT-AWARE COMMAND & ANAPHORA RESOLUTION REPORT

## 1. Executive Summary

This report evaluates Nova's contextual command and anaphora resolution capability. Spoken user commands often reference active items implicitly (e.g. "complete this task", "archive this project", "reschedule this reminder"). Nova resolves these references deterministically by synchronizing client UI state with the backend AI intent resolver.

## 2. Context Transmission Architecture

When a user speaks or submits a request to the assistant, `AIAssistantExperience.tsx` captures ambient UI context from the active workspace:
```typescript
const uiContext = {
  activeTab: activeTab, // e.g. "work" or "projects"
  selectedTaskId: activeFocusedTaskId, // Active item in task list or drawer
  selectedProjectId: activeFocusedProjectId, // Active item in project hub
  selectedDate: new Date().toISOString(),
};
```
This payload is transmitted inside `SendMessageDto` to the backend `/api/v1/ai/chat` and `/api/v1/ai/chat/stream` endpoints.

## 3. Anaphora Resolution Logic

### 3.1 Task Operations ("Complete this task", "Delete this task")
- **Context Present:** If `selectedTaskId` is provided, Nova constructs `COMPLETE_TASK` or `DELETE_TASK` proposal with the exact ID:
  ```json
  {
    "type": "COMPLETE_TASK",
    "description": "Complete task task-active-99",
    "payload": { "taskId": "task-active-99" }
  }
  ```
- **Context Missing:** If `selectedTaskId` is null or undefined (e.g. user is on `dashboard` with nothing selected), Nova avoids guessing. It prompts the user for clarification: *"Which task would you like to complete? Please select a task or specify its name."*

### 3.2 Project Operations ("Archive this project", "Mark this project as complete")
- Uses `selectedProjectId` to generate `ARCHIVE_PROJECT` or `UPDATE_PROJECT` with `status: 'COMPLETED'`.
- Validates user ownership on the server side prior to action staging or proposal execution.

### 3.3 Strict Ownership & Boundary Validation
- All resolved contextual actions undergo database ownership checks during execution (`userId: authenticatedUser.id`). A forged or mismatched `selectedTaskId` from another user results in an immediate `403 Forbidden` rejection.

## 4. Verification Evidence

- Verified in `apps/api/test/voice-workspace-orchestration.spec.ts`:
  - `resolves "complete this task" when selectedTaskId is present in uiContext`: Passed.
  - `requests clarification when "complete this task" is spoken without selectedTaskId context`: Passed.
  - `resolves "archive this project" using selectedProjectId from uiContext`: Passed.

