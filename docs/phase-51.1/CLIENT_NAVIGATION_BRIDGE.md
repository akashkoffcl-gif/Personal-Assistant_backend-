# Phase 51.1 — Client Navigation Bridge Specification

## 1. Objective
Allow the voice and text assistant (Nova) to steer the user interface directly without forcing the user to touch navigation menus or buttons.

## 2. Event Contract Specification

### 2.1 Tab Navigation Event (`ai-assistant:navigate`)
- **Event Name:** `ai-assistant:navigate`
- **Detail Interface:**
  ```typescript
  interface AINavigateDetail {
    tab: 'dashboard' | 'timeline' | 'tasks' | 'projects' | 'routines' | 'focus' | 'wellness' | 'goals' | 'knowledge' | 'finance' | 'settings' | 'planner' | 'analytics';
  }
  ```
- **Triggered By:**
  1. Tool `navigate_to_tab` returned by the AI response.
  2. Structured backend payload containing `clientAction: 'NAVIGATE_TAB'` and `tab: '<tab_name>'`.

### 2.2 Modal Opening Event (`ai-assistant:open-modal`)
- **Event Name:** `ai-assistant:open-modal`
- **Detail Interface:**
  ```typescript
  interface AIOpenModalDetail {
    modal: 'create-task' | 'create-routine' | 'create-project' | 'emergency' | 'smart-planner' | 'wellness-checkin' | 'notifications';
  }
  ```
- **Triggered By:**
  1. Backend response payload containing `clientAction: 'OPEN_MODAL'` and `modal: '<modal_id>'`.

## 3. Implementation Verification
- In `AIAssistantExperience.tsx`: Dispatches `window.dispatchEvent(new CustomEvent('ai-assistant:navigate', ...))` upon processing an assistant turn with navigation metadata.
- In `page.tsx`: Subscribes to `ai-assistant:navigate` and `ai-assistant:open-modal`, updating state (`setCurrentTab`, `setIsCreateTaskModalOpen`, etc.) seamlessly.
- Tested: Voice command "Take me to focus studio" or tool call `navigate_to_tab({ tab: "focus" })` dispatches in < 15ms.

