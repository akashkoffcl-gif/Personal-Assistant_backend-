# Phase 48.1 — API Timeout & AbortController Repair Report

**Phase:** Phase 48.1 — Stage Two  
**Date:** 2026-11-06  
**Auditor:** Antigravity  
**Target:** `apps/web/src/lib/api.ts`

---

## 1. Problem Identification

Previously, `src/lib/api.ts:81` applied a uniform 15,000ms timeout across all requests.
When heavy multi-entity queries (such as `/analytics/command-center` or `/ai/chat`) exceeded 15 seconds, the internal `AbortController` aborted the request with `new ApiTimeoutError(timeoutMs)`. The Next.js client runtime intercepted this as an unhandled rejection, presenting the Red Screen runtime overlay and stalling the user interface.

---

## 2. Changes Implemented in `apps/web/src/lib/api.ts`

1. **Categorical Request Timeout Resolver (`resolveTimeout`)**:
   - Explicit caller-provided timeouts are honored first.
   - Heavy AI generation & day planning routes (`/ai/chat`, `/ai/planner`): **90 seconds**.
   - Multi-day analytical aggregations (`/analytics/`): **45 seconds**.
   - Personal context queries (`/ai/briefing`, `/ai/conversations`, `/wellness/summary`, `/plans/`): **30 seconds**.
   - Standard CRUD operations: **15 seconds**.
2. **Idle-Based SSE Streaming Timeout**:
   - Refactored `streamAIChatMessage` to implement a rolling idle timer (60 seconds) that resets each time a new token chunk arrives. This prevents active, multi-sentence responses from being prematurely killed.
3. **External Signal & Memory Leak Cleanup**:
   - Guarantees removal of `abort` event listeners and clears timers inside `finally` blocks, preventing memory leaks during component unmounts.
4. **Crash Prevention**:
   - `ApiTimeoutError` and `ApiAbortError` are cleanly surfaced through standard React Query error boundaries rather than throwing unhandled global runtime exceptions.

