# 02 — SCREEN-BY-SCREEN UI/UX AUDIT & FINDINGS REGISTER

**Audit Date:** 2026-11-14  
**Evidence Artifacts:** Captured via Playwright Chromium automation (`artifacts/ui-ux-audit/`)  

---

### Finding 1: Horizontal Navigation Overcrowding (P0 — Major UX Flaw)
- **Screen:** Global Application Shell (`HorizontalNavbar.tsx`)
- **Evidence:** `artifacts/ui-ux-audit/01-dashboard-view.png`
- **Current Behavior:** 22 workspace tabs rendered in a single horizontal header bar. At viewport widths below 1600px, 12+ tabs collapse into an unwieldy "More" dropdown.
- **Problem:** Breaks information architecture. Essential intelligence workspaces (Knowledge, Goals, Finance, Predictive) are hidden behind a secondary menu.
- **Why It Matters:** Users cannot build muscle memory; primary personal assistant tasks require excessive hunting and clicking.
- **Recommendation:** Implement a modernized collapsible Left Command Sidebar or grouped 4-tier Navigation Model:
  1. **Core Work:** Dashboard, Today, Tasks, Projects.
  2. **Intelligence:** AI Chat, Smart Planner, Predictive, Knowledge.
  3. **Personal Systems:** Routines, Focus, Wellness, Finance.
  4. **Device & Integrations:** Android Companion, Integrations, Settings.

---

### Finding 2: AI Assistant Backdrop Pointer-Events Interception (P0 — Usability Bug)
- **Screen:** AIAssistantDrawer / AppShell
- **Evidence:** Playwright test log (`TimeoutError: <div class="fixed inset-0 z-50 ..."> intercepts pointer events`).
- **Current Behavior:** When the AI Assistant Drawer is closed or dismissed via keyboard `Escape`, the transparent backdrop layer remains in the DOM or fails to clear its z-index overlay instantaneously.
- **Problem:** Users clicking on underlying workspace tabs (such as "Tasks") find clicks blocked by an invisible overlay.
- **Why It Matters:** Creates the illusion that the application has frozen or navigation is broken.
- **Recommendation:** Refactor drawer unmounting to guarantee `pointer-events: none` on inactive backdrops and clean state reconciliation in `AppShell.tsx`.

---

### Finding 3: Palette Conflict Between Dashboard and AI Assistant (P1 — Visual Dissonance)
- **Screen:** Main Dashboard vs. AIAssistantDrawer
- **Evidence:** `artifacts/ui-ux-audit/01-dashboard-view.png` vs. `artifacts/ui-ux-audit/02-ai-assistant-modal.png`
- **Current Behavior:** Dashboard uses a light pastel lavender theme (`#EAE9FF` background, `#FFFFFF` cards, `#8B45F5` buttons). The AI Assistant drawer abruptly introduces a dark obsidian/cyber theme (`#121024`, `#2D1266` Three.js sphere).
- **Problem:** Visually disjointed product identity. It feels like two different applications stitched together.
- **Why It Matters:** Destroys enterprise cohesion and creates cognitive fatigue when switching between ambient chat and productivity work.
- **Recommendation:** Migrate the entire product to a unified **Premium Dark Intelligence** system (Direction A) where both workspace cards and the assistant share identical dark slate and luminous purple tokens.

---

### Finding 4: Empty State & Zero-Data Feedback (P2 — Usability Polish)
- **Screen:** Tasks Workspace (`TasksWorkspace.tsx`)
- **Evidence:** `artifacts/ui-ux-audit/03-tasks-workspace.png`
- **Current Behavior:** When zero tasks exist in the workspace, a generic grey card states "No tasks found: Try adjusting your search or active filters."
- **Problem:** Passive empty state offering no immediate accelerated action.
- **Why It Matters:** First-time onboarding experience feels stark and unhelpful.
- **Recommendation:** Provide an active conversational prompt: "Your task board is clear. Speak or type to NOVA to schedule your first project or routine milestone." Include 1-click starter template chips.

---

### Finding 5: Mobile Viewport Data Squashing (P1 — Mobile Ergonomics)
- **Screen:** Mobile Viewport 390×844
- **Evidence:** `artifacts/ui-ux-audit/04-mobile-viewport-390x844.png`
- **Current Behavior:** On smaller mobile viewports, the metric summary filters ("Total Tasks", "To Do", "In Progress", "Completed", "Overdue") stack horizontally into microscopic pills with cut-off labels.
- **Problem:** Violates mobile touch target sizing (minimum 44×44px Apple/Android guidelines).
- **Recommendation:** Convert desktop metric bars into a swipeable carousel or segmented control on mobile viewports.
