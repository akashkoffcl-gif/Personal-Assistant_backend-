# 01 — EXISTING UI INVENTORY & ARCHITECTURAL MAPPING

**Audit Date:** 2026-11-14  
**Scope:** `@assistant/web` Frontend Component Topology  

---

### 1. Route & Screen Inventory

| Route | Primary Component | Purpose & State |
|---|---|---|
| `/` | `ModernDribbbleDashboard.tsx` | Main application shell routing through 22 workspace tabs. |
| `/login` | `src/app/login/page.tsx` | Authenticated entry point (Email, Password, Demo session). |
| `/register` | `src/app/register/page.tsx` | Tenant onboarding & account creation. |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | Password recovery workflow. |
| `/reset-password` | `src/app/reset-password/page.tsx` | Password reset handler. |
| `/verify-email` | `src/app/verify-email/page.tsx` | Email confirmation gate. |

---

### 2. Workspace View Modules (`apps/web/src/components/`)

1. **Core Workspaces:**
   - `ModernDribbbleDashboard.tsx`: High-level command center displaying KPI summary cards, today's schedule, active projects, routine checklist, and daily focus.
   - `TasksWorkspace.tsx`: Multi-tier task backlog with filter bars, status columns, priority badges, and quick-add modal.
   - `ProjectsWorkspace.tsx`: Active project grid, milestone progress, and target deadline indicators.
   - `RoutineChecklist.tsx`: Daily routine completion timeline and streak tracking.
   - `MyDayTimelineWorkspace.tsx`: Chronological day schedule blending tasks and routine occurrences.
   - `SmartDayPlannerWorkspace.tsx`: AI-assisted automated schedule proposal generator.
   - `CalendarPlanningWorkspace.tsx`: Calendar grid view with drag-and-drop time slots.
2. **Specialized Intelligence & Wellness Workspaces:**
   - `FocusStudioWorkspace.tsx`: Deep work session timer with audio masking preferences.
   - `GoalsWorkspace.tsx`: Long-term milestone tracking and dependency chains.
   - `KnowledgeWorkspace.tsx`: Note capture, tag categorization, and memory item inspection.
   - `FinanceWorkspace.tsx`: Budgeting, accounts, and income/expense breakdown.
   - `LifeBalanceWorkspace.tsx`: Radar-chart distribution across work, health, and personal routines.
   - `ActivityTimelineWorkspace.tsx`: Unified chronological event log.
   - `PredictiveProductivityWorkspace.tsx`: Proactive risk analysis and schedule delay forecasts.
   - `AIChatWorkspace.tsx`: Dedicated full-canvas conversational interface.
3. **Companion & Device Integration:**
   - `MobileCompanionPanel.tsx`: Paired Android device status, pairing challenge triggers, and permission reviews.

---

### 3. Modals & Drawers Inventory

- `AIAssistantDrawer.tsx` / `AIAssistantExperience.tsx`: Multi-state floating right drawer containing Three.js 3D avatar, speech waveform, and action confirmation cards.
- `VoiceAssistantModal.tsx`: Dedicated voice-only modal with animated pulsing orb.
- `NotificationCenterDrawer.tsx` / `NotificationCenterModal.tsx`: Real-time notification feed with feedback buttons (Dismiss, Snooze, Acknowledge).
- `CreateTaskModal.tsx`: Task creation form with natural language task parser integration.
- `CreateRoutineModal.tsx`: Routine frequency, target time, and duration configuration.
- `ProjectModal.tsx`: Project name, target date, and color picker.
- `EmergencyModal.tsx`: One-click emergency schedule rescheduling dialog.
- `SmartCheckInModal.tsx` & `WellnessCheckInModal.tsx`: Daily energy, stress, and mood recording.
- `FollowUpPromptModal.tsx`: AI-prompted check-in on unattended overdue tasks.

---

### 4. Component Duplications & Inconsistencies Discovered

1. **Dual AI Assistant Interfaces:**
   - `AIAssistantDrawer.tsx` (complex Three.js 3D sphere) vs. `VoiceAssistantModal.tsx` (simple 2D pulsating orb) vs. `AIChatWorkspace.tsx` (full-page chat view). These represent three disconnected interaction paradigms for the same assistant.
2. **Duplicate Notification Modals:**
   - Both `NotificationCenterDrawer.tsx` and `NotificationCenterModal.tsx` exist in parallel with overlapping responsibilities.
3. **Inconsistent Border Radius Scales:**
   - Tailwind config defines `card: 24px` and `4xl: 32px`, while custom workspaces mix `rounded-xl (12px)`, `rounded-2xl (18px)`, and `rounded-3xl (24px)` arbitrarily.
