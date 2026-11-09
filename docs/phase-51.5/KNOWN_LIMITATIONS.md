# Phase 51.5: Known Limitations & Constraints

**Application:** Nova Personal Assistant PWA  
**Environment:** Local Staging Only  
**Audit Scope:** Operational boundaries, provider quotas, and deployment restrictions.

---

## 1. Upstream AI Rate Limiting & Provider Boundaries

1. **Google Gemini Free/Shared Tier Quota:**
   - Free or shared development API keys are capped at 15 Requests Per Minute (RPM) for Gemini 1.5 Flash.
   - High-concurrency automated test runs with >15 immediate back-to-back LLM calls must incorporate intentional backoff pauses to prevent HTTP 429 errors.
2. **External OAuth Provider Verification:**
   - In the local staging environment, external calendar synchronization (`sync_calendar_external`) uses a local staging adapter. Live synchronization against production Google/Microsoft accounts requires published OAuth consent credentials.

---

## 2. Infrastructure & Single-Worker Constraints

1. **Single-Worker Execution Architecture:**
   - The API process must maintain `DISABLE_WORKER="true"` in local staging to keep active Prisma pool connections within Supabase pooler constraints ($\le 20$ connections).
2. **Browser Audio Backgrounding:**
   - Mobile browsers (Safari iOS / Chrome Android) pause the Web Speech recognition stream when the browser tab is minimized or the screen locks. Nova operates on an active-session voice interaction model rather than background listening.

