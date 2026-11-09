# PHASE 51.8: KNOWN ISSUES AND RISK REGISTER

## 1. Risk Register

| Risk ID | Category | Description | Severity | Impact | Mitigation / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RISK-01** | Infrastructure | Supabase Pooler WAN network latency on multi-statement transactions | Medium | P95 transaction latency up to 10s | Transaction timeouts tuned to 15s (`timeout: 15000`); pool limit set to 5. |
| **RISK-02** | Concurrency | Concurrent execution in multi-node setups without distributed Redis lock | Medium | Race conditions if multiple standalone workers active | `ALLOW_LOCAL_LOCK` restricted to single-worker staging. Multi-node requires Redis Redlock. |
| **RISK-03** | AI Quota | Gemini API rate limits on high-frequency workflow planning | Low | Temporary 429 from LLM API | Fallback deterministic DAG planner heuristics and exponential backoff retry. |
| **RISK-04** | Client PWA | Browser speech recognition compatibility variations across engines | Low | Voice assistant fallback to text in unsupported browsers | Voice modal checks for `webkitSpeechRecognition` and renders text fallback gracefully. |

## 2. Technical Debt Items
1. **Interactive Transaction Refactoring:** Optimize domain transactions into smaller batch statements to minimize row-lock durations.
2. **Schema Alignment:** Standardize date-time serialization across older legacy models and newer ISO-8601 timestamps.

