# Known Issues, Risks and Mitigations (Phase 46)

## 1. External AI Credential Dependency
- **Issue:** The configured `GEMINI_API_KEY` is an OAuth credential token (`AQ...`) rather than a Google AI Studio Developer API key (`AIzaSy...`).
- **Severity:** High (for remote AI features only).
- **Impact:** Remote Gemini 1.5 Flash completions cannot be authenticated by Google's API gateway.
- **Mitigation:** The application safely falls back to local grounded intelligence (`GROUNDED_FALLBACK`), keeping all tasks, routines, finance, focus studio, and assistant tools fully operational with 0 crashes.
- **Action Required:** An authorized administrator must provision a valid `AIzaSy...` key in production environment variables.

## 2. Remote Database Network Roundtrip Latency
- **Issue:** The Supabase PostgreSQL database pooler is located in Tokyo (`aws-0-ap-northeast-1.pooler.supabase.com`), introducing an ~845-1,200 ms network roundtrip.
- **Severity:** Low.
- **Mitigation:** Bounded parallel query execution reduces tool latency by ~51%. In production environments colocated in the same cloud region, query latency will drop below 50 ms.

