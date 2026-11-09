# PHASE 51.3 — BASELINE VOICE & WORKSPACE ORCHESTRATION AUDIT

## 1. Executive Summary

This baseline audit evaluates the existing speech recognition, text-to-speech, avatar 3D rendering, workspace routing, and multi-step workflow execution infrastructure in the Nova Personal Assistant PWA to prepare for universal voice control.

---

## 2. Component Inventory & Audit Findings

| Component / Layer | Source Path | Existing State | Missing / Gaps for Universal Voice Control | Integration Risk |
|---|---|---|---|---|
| **AI Assistant Experience** | `apps/web/src/components/AIAssistant/AIAssistantExperience.tsx` | Implements Web Speech API, floating bar, 3D avatar, quick suggestions, transcript cards, and basic action proposal confirmation. | Lacks direct streaming of multi-step workflow execution (SSE), lacks explicit voice-driven workspace command parser (contextual actions like "complete this task"), lacks vocal cancellation ("cancel that"). | Medium: Complex UI state with multiple timers; requires clean consolidation. |
| **Voice State Machine** | `apps/web/src/components/AIAssistant/types.ts` | Uses `AssistantInvocationState`: `[HIDDEN, WAKE_LISTENING, ACTIVATING, REQUEST_LISTENING, THINKING, SPEAKING, EXECUTING_ACTION, AWAITING_CONFIRMATION, ERROR, CLOSING]`. | Missing explicit formal states: `IDLE`, `TRANSCRIBING`, `UNDERSTANDING`, `PLANNING`, `AWAITING_APPROVAL`, `EXECUTING`, `INTERRUPTED`, `CANCELLED`. | Low: Typed state expansion. |
| **Avatar States** | `apps/web/src/components/AIAssistant/AIAvatarModel.tsx` | 3D canvas rendering with states: `idle`, `listening`, `thinking`, `speaking`, `executing`, `success`, `error`. | Missing `planning`, `warning` states. Needs direct binding to real workflow progress events. | Low. |
| **Workspace Navigation Registry** | `apps/web/src/components/HorizontalNavbar.tsx`, `apps/web/src/app/page.tsx` | 22 navigable tabs: `dashboard`, `my-day`, `projects`, `routines`, `work`, `planning`, `emergency`, `wellness`, `analytics`, `usage-analytics`, `calendar`, `automation`, `settings`, `focus`, `goals`, `knowledge`, `finance`, `life-balance`, `timeline`, `predictive`, `smart-planner`, `ai-chat`. | Voice navigation aliases (e.g. "show today's tasks" -> `my-day` or `work`, "open spending" -> `finance`) need robust client-side resolution. | Low: Clean alias map. |
| **Context-Aware Record Operations** | Backend `ai.service.ts` & Domain Services | LLM receives tools and memory. | Anaphora resolution ("complete this task", "move this project") requires passing the user's active workspace and selected record IDs from frontend to backend. | Medium: Requires passing UI context in `sendAIChatMessage`. |
| **Workflow Voice Integration** | `apps/api/src/modules/ai/workflow/*` | Phase 51.2.2 workflow planner, orchestrator, leases, and DAG validator. | Frontend `AIAssistantExperience.tsx` only supported single `AIAction` execution; needed multi-step workflow SSE streaming integration with step progress and voice announcements. | High: Core integration target. |
| **Spoken Safety & Confirmation** | Frontend Confirmation Cards | Visual modal confirmation for actions. | Lacks spoken readback of action parameters and spoken confirmation parsing ("confirm", "proceed", "cancel"). | Medium. |

---

## 3. Architecture Action Plan

1. **Step 1: Extend Types & Voice State Machine** (`types.ts`).
2. **Step 2: Universal Workspace Navigation Service & Alias Engine** (`apps/web/src/lib/workspace-navigation.ts`).
3. **Step 3: Context-Enriched AI Chat Endpoint** (`apps/web/src/lib/api.ts` & `apps/api/src/modules/ai/ai.controller.ts`).
4. **Step 4: Hardened AIAssistantExperience** integrating voice workflow planning, approval, SSE streaming, vocal confirmation, interruption, and avatar synchronization.
5. **Step 5: Automated & Live Verification**.

