# PHASE 38 — UI COMPONENT INVENTORY
**Personal Assistant PWA — Lavender Enterprise SaaS**  
**Repository:** `D:\PT`  
**Generated:** 2026-11-03

---

## 1. Inventory Summary

This document provides a comprehensive technical inventory of all UI components comprising the Personal Assistant PWA frontend, specifically detailing the workspaces implemented and enhanced for Phases 27–38.

---

## 2. Workspace Component Directory

### 1. `FocusStudioWorkspace.tsx`
- **Path:** `apps/web/src/components/FocusStudioWorkspace.tsx`
- **File Size:** ~26 KB
- **Props:**
  - `tasks?: any[]`
  - `projects?: any[]`
  - `onCompleteTask?: (id: string) => void`
  - `onOpenCreateTask?: () => void`
- **Hooks & State:** `useQuery` (focus-preferences, focus-current, focus-history, focus-analytics, tasks, projects), `useMutation` (start, pause, resume, complete, abandon), `useState` (displaySeconds, deepWorkMode, selectedTask, selectedProject, sessionNotes, sessionType).
- **APIs Used:**
  - `GET /api/v1/focus/preferences`
  - `GET /api/v1/focus/current`
  - `POST /api/v1/focus/start`
  - `POST /api/v1/focus/:id/pause`
  - `POST /api/v1/focus/:id/resume`
  - `POST /api/v1/focus/:id/complete`
  - `GET /api/v1/focus/history`
  - `GET /api/v1/focus/analytics`

### 2. `GoalsWorkspace.tsx`
- **Path:** `apps/web/src/components/GoalsWorkspace.tsx`
- **File Size:** ~28 KB
- **Props:** None (Self-contained workspace)
- **Hooks & State:** `useQuery` (goals, goals-summary), `useMutation` (createGoal, updateGoal, deleteGoal, addMilestone, updateMilestone, deleteMilestone), `useState` (selectedTypeFilter, activeGoalModal, isCreateModalOpen, expandedGoalIds).
- **APIs Used:**
  - `GET /api/v1/goals`
  - `GET /api/v1/goals/summary`
  - `POST /api/v1/goals`
  - `PATCH /api/v1/goals/:id`
  - `DELETE /api/v1/goals/:id`
  - `POST /api/v1/goals/:id/milestones`
  - `PATCH /api/v1/goals/:id/milestones/:milestoneId`
  - `DELETE /api/v1/goals/:id/milestones/:milestoneId`

### 3. `KnowledgeWorkspace.tsx`
- **Path:** `apps/web/src/components/KnowledgeWorkspace.tsx`
- **File Size:** ~32 KB
- **Props:** None (3-column layout: folders, note list, editor)
- **Hooks & State:** `useQuery` (knowledge-summary, knowledge-folders, knowledge-notes, knowledge-bookmarks), `useMutation` (createNote, updateNote, deleteNote, createFolder, deleteFolder, createBookmark, deleteBookmark), `useState` (activeFolderId, activeCategory, selectedNoteId, searchDraft, noteEditorDraft).
- **APIs Used:**
  - `GET /api/v1/knowledge/summary`
  - `GET /api/v1/knowledge/folders`
  - `GET /api/v1/knowledge/notes`
  - `POST /api/v1/knowledge/notes`
  - `PATCH /api/v1/knowledge/notes/:id`
  - `DELETE /api/v1/knowledge/notes/:id`
  - `GET /api/v1/knowledge/bookmarks`
  - `POST /api/v1/knowledge/bookmarks`
  - `DELETE /api/v1/knowledge/bookmarks/:id`

### 4. `FinanceWorkspace.tsx`
- **Path:** `apps/web/src/components/FinanceWorkspace.tsx`
- **File Size:** ~46 KB
- **Props:** None (Multi-tab finance overview)
- **Hooks & State:** `useQuery` (finance-analytics, finance-accounts, finance-categories, finance-budgets, savings-goals, finance-transactions, recurring-transactions), `useMutation` (createTransaction, deleteTransaction, createAccount, setBudget, createSavingsGoal, contributeSavingsGoal), `useState` (selectedAccountFilter, selectedCategoryFilter, selectedTypeFilter, isTransactionModalOpen, isAccountModalOpen, isBudgetModalOpen, isSavingsModalOpen).
- **APIs Used:**
  - `GET /api/v1/finance/analytics`
  - `GET /api/v1/finance/accounts`
  - `POST /api/v1/finance/accounts`
  - `GET /api/v1/finance/categories`
  - `GET /api/v1/finance/transactions`
  - `POST /api/v1/finance/transactions`
  - `DELETE /api/v1/finance/transactions/:id`
  - `GET /api/v1/finance/budgets`
  - `POST /api/v1/finance/budgets`
  - `GET /api/v1/finance/savings`
  - `POST /api/v1/finance/savings`
  - `POST /api/v1/finance/savings/:id/contribute`
  - `GET /api/v1/finance/export/csv`

### 5. `AIAssistantDrawer.tsx`
- **Path:** `apps/web/src/components/AIAssistantDrawer.tsx`
- **File Size:** ~15 KB
- **Props:**
  - `isOpen: boolean`
  - `onClose: () => void`
  - `onOpenSmartPlanner?: () => void`
- **Hooks & State:** `useMutation` (sendMessageMutation, executeActionMutation), `useState` (messages, inputPrompt, activeConversationId).
- **APIs Used:**
  - `POST /api/v1/ai/chat` (Google Gemini 1.5 Flash)
  - `POST /api/v1/ai/actions/:id/execute`

### 6. `SmartDayPlannerWorkspace.tsx`
- **Path:** `apps/web/src/components/SmartDayPlannerWorkspace.tsx`
- **File Size:** ~21 KB
- **Props:**
  - `initialDate?: string`
  - `onNavigateToCalendar?: () => void`
- **Hooks & State:** `useQuery` (smart-proposals, tasks), `useMutation` (proposeMutation, applyMutation), `useState` (selectedDate, bufferMinutes, deepWorkFocus, activeProposal).
- **APIs Used:**
  - `POST /api/v1/ai/planner/propose`
  - `POST /api/v1/ai/planner/apply`
  - `GET /api/v1/ai/planner/proposals`
  - `GET /api/v1/tasks`

### 7. `PredictiveProductivityWorkspace.tsx`
- **Path:** `apps/web/src/components/PredictiveProductivityWorkspace.tsx`
- **File Size:** ~16 KB
- **Props:**
  - `onNavigateToTab?: (tab: string) => void`
- **Hooks & State:** `useQuery` (predictive-analytics, productivity-trends), `useState` (selectedRange: 7 | 14 | 30).
- **APIs Used:**
  - `GET /api/v1/analytics/predictive`
  - `GET /api/v1/analytics/trends`

### 8. `LifeBalanceWorkspace.tsx`
- **Path:** `apps/web/src/components/LifeBalanceWorkspace.tsx`
- **File Size:** ~18 KB
- **Props:** None
- **Hooks & State:** `useQuery` (life-balance, predictive-analytics), `useState` (selectedTimeWindow).
- **APIs Used:**
  - `GET /api/v1/analytics/life-balance`
  - `GET /api/v1/analytics/predictive`

### 9. `ActivityTimelineWorkspace.tsx`
- **Path:** `apps/web/src/components/ActivityTimelineWorkspace.tsx`
- **File Size:** ~9 KB
- **Props:** None
- **Hooks & State:** `useQuery` (activity-timeline), `useState` (selectedFilter, searchQuery).
- **APIs Used:**
  - `GET /api/v1/analytics/timeline`

### 10. `VoiceAssistantModal.tsx`
- **Path:** `apps/web/src/components/VoiceAssistantModal.tsx`
- **File Size:** ~12 KB
- **Props:**
  - `isOpen: boolean`
  - `onClose: () => void`
  - `onTaskCreated?: () => void`
- **Hooks & State:** `useMutation` (sendMutation, executeActionMutation), `useState` (isRecording, transcript, interimTranscript, browserSupported, permissionState, responseMessage, proposedAction), `useRef` (SpeechRecognition).
- **APIs Used:**
  - Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)
  - `POST /api/v1/ai/chat`
  - `POST /api/v1/ai/actions/:id/execute`

---

## 3. Shared Navigation & Shell Components

| Component | Path | Role |
| :--- | :--- | :--- |
| `HorizontalNavbar.tsx` | `apps/web/src/components/HorizontalNavbar.tsx` | 3-Zone top navigation (Brand, Primary Workspaces, Utility & Profile) with grouped More menu and Mic button |
| `ModernDribbbleDashboard.tsx` | `apps/web/src/components/ModernDribbbleDashboard.tsx` | Approved single-screen desktop Command Center grid (100vh lock) |
| `ConfirmDialog.tsx` | `apps/web/src/components/ConfirmDialog.tsx` | Accessible confirmation dialog for deletions and sign out |
| `Toast.tsx` | `apps/web/src/components/Toast.tsx` | Lavender enterprise toast notifications (`toast.success`, `toast.error`, `toast.warning`, `toast.info`) |
| `BottomNav.tsx` | `apps/web/src/components/BottomNav.tsx` | Mobile-optimized bottom tab navigation bar |

