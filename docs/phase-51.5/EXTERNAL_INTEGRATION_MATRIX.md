# Phase 51.5 Workstream D: External Integration Matrix

**Application:** Nova Personal Assistant PWA  
**Backend:** NestJS Modular Monolith (`http://localhost:3001/api/v1`)  
**Scope:** Inventory, authentication mechanisms, token expiry behavior, rate limits, and synchronization certification.

---

## 1. External Integration Capability Matrix

| Integration / Provider | Supported Operations | Authentication Mechanism | Credential Storage | Sync Status | Real Verification / Limitation |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Google Gemini API** (`@google/genai`) | Intent classification, prompt completion, DAG planning | API Key (`GEMINI_API_KEY`) | Server `.env` | **ACTIVE** | Live API calls verified; rate-limited at 15 RPM on shared staging keys. |
| **Web Push / VAPID** (`web-push`) | Browser push notifications | VAPID Keypair (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) | Server `.env` & user subscriptions table | **ACTIVE** | Real payload generation and subscription registry functional. |
| **Google Calendar** (`sync_calendar_external`) | Bidirectional calendar event sync | OAuth 2.0 (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) | Encrypted database table (`Integration`) | **CONFIGURED / STAGING** | In staging, simulated upstream provider adapter executes. Live OAuth requires external consent screen verification. |
| **Outlook / Microsoft 365** | Calendar & task sync | Microsoft Graph OAuth 2.0 | Encrypted database table (`Integration`) | **PLANNED** | Staging stub registered; production client not configured. |
| **Email / SMTP** | Transactional alerts & summaries | SMTP Transport (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`) | Server `.env` | **OPTIONAL** | Disabled by default in staging; logged to console in development. |

---

## 2. External Provider Reliability & Idempotency Safeguards

1. **Deterministic Request Idempotency:**
   - All outgoing external push and sync requests pass an outbox event ID or canonical hash to prevent duplicate deliveries upon retry.
2. **Exponential Backoff & Dead-Letter Isolation:**
   - Network timeouts and 5xx errors from external providers are retried with exponential backoff ($2^n \times 500\text{ms}$).
   - After 5 consecutive failures, the payload is directed to dead-letter storage for administrative review rather than crashing the worker thread.
3. **Transparent Capability Transparency:**
   - The UI distinguishes between operational providers (Gemini, Web Push) and staging-only integrations (Google Calendar OAuth), informing the user when an external account connection is required before synchronization.

