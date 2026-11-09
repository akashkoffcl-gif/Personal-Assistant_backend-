# AI Timeout Inventory & Differentiated Lifecycle Policies

## 1. Inventory of Pre-Phase 44.3 Timeouts
- **Frontend Fetcher (`apps/web/src/lib/api.ts`):** Fixed 15,000ms (`timeoutMs || 15000`) across all HTTP operations, regardless of complexity or nature.
- **Backend Gemini Fetch (`apps/api/src/modules/ai/ai.service.ts`):** Fixed 7,000ms (`AbortSignal.timeout(7000)`).

## 2. Updated Differentiated Timeout Policies
To eliminate arbitrary time-based blockers, the system implements three distinct timeout tiers:

| Tier | Scope | Timeout Duration | Policy & Behavior |
|------|-------|------------------|-------------------|
| **Tier 1: Bounded CRUD** | Settings, Tasks, Routines, Goals, Analytics queries | 15,000 ms | Strict abort to prevent connection hoarding; auto-retries idempotent requests (up to 2 times). |
| **Tier 2: Interactive AI & Planning** | AI Chat (`/ai/chat`), Smart Planner (`/ai/planner/propose`, `/ai/planner/apply`), Action Execution (`/ai/actions/:id/execute`) | 60,000 ms | Elevated limit accommodating complex LLM token generation, multi-tool aggregations, and chain-of-thought processing. Backend fetch timeout increased to 30,000 ms. |
| **Tier 3: Streaming & Long-Running Operations** | Streaming endpoints, background queue tasks | Signal-driven / Unlimited | Relies on explicit caller-provided `AbortSignal` (e.g. user clicking "Stop Generating" or closing view). |

