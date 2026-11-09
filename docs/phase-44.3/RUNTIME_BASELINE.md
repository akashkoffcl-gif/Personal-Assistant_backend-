# Phase 44.3 — Runtime Baseline Report

## Executive Summary
This document establishes the runtime baseline of the Personal Assistant PWA prior to and during Phase 44.3 recovery.

## Runtime Environment
- **Node.js Environment:** Node v20 LTS on Windows 11
- **Frontend Server:** Next.js 14.2 on port 3000
- **Backend Server:** NestJS 10 on port 3001
- **Database:** Supabase Managed PostgreSQL Pooler (`aws-0-ap-northeast-1.pooler.supabase.com:6543`, transaction mode)
- **Direct Database Fallback:** Session pooler on port 5432
- **Demo User Id:** `00000000-0000-0000-0000-000000000001` (`demo@assistant.local`)

## Baseline Reproductions & Root-Cause Identifications
1. **Gemini API Key Authentication Failure (HTTP 401 ACCESS_TOKEN_TYPE_UNSUPPORTED):**
   - In previous runs, AI requests sent to `generativelanguage.googleapis.com` resulted in HTTP 401 with reason `ACCESS_TOKEN_TYPE_UNSUPPORTED`.
   - Investigation proved the configured credential (`REDACTED_OAUTH_TOKEN`) is an internal OAuth/refresh token format, not a standard Google AI Studio API key (`AIzaSy...`).
   - Remote queries against Gemini using `?key=AQ...` were systematically rejected by Google's API gateway.
2. **Double-Timeout Bottleneck:**
   - Client timeout in `apps/web/src/lib/api.ts` was set uniformly to 15,000ms.
   - Backend fetch call to Gemini in `apps/api/src/modules/ai/ai.service.ts` had a rigid `AbortSignal.timeout(7000)` (7 seconds).
   - Any multi-step operation or prompt evaluation taking more than 7s triggered an AbortError on the backend, or 15s on the frontend.
3. **Three.js Deprecation Warning:**
   - `THREE.Clock` was instantiated in `apps/web/src/components/AIAssistant/AIAvatarModel.tsx`, generating console deprecation warnings in Three.js v0.187.0.

