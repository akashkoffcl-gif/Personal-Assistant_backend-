# Phase 51.4 — Known Limitations & Operational Constraints

**Application:** Nova Personal Assistant PWA  
**Environment:** Local Staging Only  
**Scope:** Architecture boundaries, external quota constraints, and browser environmental factors.

---

## 1. Upstream AI Rate Limits & LLM Token Quotas

1. **Google Gemini API Quota Limits:**
   - In local staging, free-tier or shared Gemini API keys are subject to strict requests-per-minute (RPM) limits (15 RPM for Gemini 1.5 Flash/Pro).
   - High-frequency test suites that issue 50+ back-to-back LLM calls must enforce intentional delays between requests (e.g., 200–500ms) to avoid HTTP `429 Too Many Requests`.
   - **Mitigation:** Unit tests mock external Gemini responses, and staging integration scripts use exponential backoff retry wrappers.

2. **Context Window Sizing in Multi-Step Planning:**
   - Massive DAG plans with more than 15 sequential steps may experience context truncation when summarizing overall plan status.
   - **Mitigation:** Plans are strictly validated to limit DAG depth to $\le 10$ steps per proposal.

---

## 2. Process Architecture & Single-Worker Constraint

1. **Single-Worker Execution Architecture:**
   - To avoid database connection pool exhaustion against Supabase pooler constraints (20 connections maximum), the API process must run with `DISABLE_WORKER="true"`.
   - Running both a background BullMQ worker and the API server simultaneously without coordination risks connection timeouts (`Current connection pool timeout: 30, connection limit: 20`).
   - **Mitigation:** Enforced single-worker architecture with centralized reconciliation.

2. **Redis Eviction Policies:**
   - Redis instances configured with `noeviction` will throw memory errors if non-TTL keys accumulate under extreme load.
   - **Mitigation:** All cache entries managed by `RedisService` include an explicit TTL (defaulting to 300–3600 seconds).

---

## 3. Browser-Specific Audio Limitations

1. **Firefox Speech Recognition:**
   - Native `SpeechRecognition` is disabled by default in Firefox (`media.webspeech.recognition.enable` about:config flag).
   - **Mitigation:** The UI automatically falls back to text input with full keyboard shortcuts and keeps `SpeechSynthesis` active for audio responses.

2. **Mobile Background Audio Suspension:**
   - When the PWA is minimized or the screen is locked on mobile operating systems (iOS/Android), the browser pauses microphone capture.
   - **Mitigation:** Nova operates as an on-demand voice assistant with quick wake-up upon returning to the foreground rather than a continuous 24/7 background listener.

