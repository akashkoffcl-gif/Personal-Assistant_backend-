# Phase 48.1 — Comprehensive Root Cause Analysis Report

**Phase:** Phase 48.1 — Critical AI Assistant Runtime Repair  
**Date:** 2026-11-06  
**Auditor:** Antigravity  
**Status:** Root Causes Isolated & Verified via Execution Traces

---

## 1. Executive Summary of Root Causes

Our stage-one audit tested and isolated the exact root causes for all three critical issues:

1. **Issue A (`ApiTimeoutError: Request timed out after 15000ms` at `src/lib/api.ts:92`)**:
   - **Root Cause**: In `apps/web/src/lib/api.ts`, lines 81 and 90–93, `fetcher<T>` implemented a uniform default fallback timeout:
     ```ts
     const timeoutMs = options?.timeoutMs || 15000;
     ```
   - When the dashboard mounts or the user opens the analytics workspace, multiple heavy analytics endpoints (`/analytics/command-center` taking 21,769ms, `/analytics/trends` taking 11,679ms, and `/ai/chat` taking 14,559ms–18,200ms) exceed the arbitrary 15,000ms ceiling.
   - When any request exceeds 15,000ms, `setTimeout` aborts the `AbortController` by throwing `new ApiTimeoutError(timeoutMs)` into the browser runtime, triggering the Next.js runtime error overlay and leaving the UI in an unhandled, permanently hung state.

2. **Issue B (Assistant Responds Only Once & Fails to Resume Listening)**:
   - **Root Cause**: In `apps/web/src/components/AIAssistant/AIAssistantExperience.tsx`:
     a. **Dual Recognition Conflict**: The background wake-word `SpeechRecognition` instance and the foreground `requestRecognition` instance conflicted on microphone device acquisition.
     b. **Fragile Unconditional 200ms Timeout in `utterance.onend`**:
        ```ts
        utterance.onend = () => {
          ...
          if (lifecycleState !== 'HIDDEN' && settings.autoVoiceResponse) {
            setTimeout(() => { startRequestListening(); }, 200);
          }
        }
        ```
        In Chromium/WebKit, calling `recognition.start()` within 200ms of TTS finishing often throws `DOMException: recognition has already started` or fails silently because the audio output device has not released the audio bus.
     c. **Stale Closure on `lifecycleState`**: When `utterance.onend` fires asynchronously, the enclosing closure captures an outdated `lifecycleState`, evaluating to false or failing to transition the avatar back to `REQUEST_LISTENING`.
     d. **Missing Re-arm Guard**: `recognition.onerror` immediately disabled the listener without a state-machine recovery loop.

3. **Issue C (Slow Response Generation Bottlenecks)**:
   - **Root Cause**: The complete end-to-end request trace revealed two compound bottlenecks:
     - **Database Roundtrip Overhead**: Supabase transaction pooler in Tokyo (`aws-0-ap-northeast-1.pooler.supabase.com:6543`) incurs ~750ms–950ms per roundtrip. Sequential queries in `/analytics/command-center` compound this to >20 seconds.
     - **AI Non-Streaming Mode (`POST /api/v1/ai/chat`)**: The voice assistant experience utilized synchronous blocking `api.sendAIChatMessage(...)` which waits for the entire LLM generation, tool formatting, and persistence to finish (taking 14.5s) before returning a single token, whereas `/ai/chat/stream` can emit the first token within <2.5s.

---

## 2. Quantitative Endpoint Latency Traces

Live execution trace from actual local runtime against remote Supabase PostgreSQL database:

| HTTP Method | Endpoint | Measured Latency | Default Timeout | Result Under 15s Limit |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/tasks` | 847 ms | 15,000 ms | SUCCESS |
| `GET` | `/api/v1/projects` | 1,265 ms | 15,000 ms | SUCCESS |
| `GET` | `/api/v1/routines` | 1,741 ms | 15,000 ms | SUCCESS |
| `GET` | `/api/v1/follow-ups/pending` | 1,855 ms | 15,000 ms | SUCCESS |
| `GET` | `/api/v1/notifications?limit=10`| 1,366 ms | 15,000 ms | SUCCESS |
| `GET` | `/api/v1/wellness/summary` | 6,096 ms | 15,000 ms | SUCCESS |
| `GET` | `/api/v1/plans/2026-11-06` | 4,750 ms | 15,000 ms | SUCCESS |
| `GET` | `/api/v1/ai/briefing` | 2,354 ms | 15,000 ms | SUCCESS |
| `POST`| `/api/v1/ai/chat` | **14,559 ms** | 15,000 ms | **MARGINAL / TIMEOUT RISK** |
| `GET` | `/api/v1/analytics/trends?days=7`| **11,679 ms** | 15,000 ms | **MARGINAL / TIMEOUT RISK** |
| `GET` | `/api/v1/analytics/command-center`| **21,769 ms** | 15,000 ms | **FATAL TIMEOUT (ABORTED)** |

---

## 3. Systematic Action Plan

- **Stage 2**: Implement categorical request timeouts in `apps/web/src/lib/api.ts` with no global 15s clamp, add idle streaming timeouts, and suppress unhandled promise crashes.
- **Stage 3**: Overhaul `AIAssistantExperience.tsx` with a finite state machine (`IDLE`, `LISTENING`, `PROCESSING`, `SPEAKING`, `RECOVERING`), single-owner microphone lifecycle, and robust speech synthesis event coordination.
- **Stage 4 & 5**: Transition conversational interactions to progressive streaming chunks and optimize context engine retrieval with bounded caching.

