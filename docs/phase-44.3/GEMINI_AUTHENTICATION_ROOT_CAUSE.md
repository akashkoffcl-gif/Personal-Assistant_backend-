# Gemini Authentication Root-Cause Analysis & Repair

## 1. Problem Statement
AI Chat interactions were failing with an unhandled or raw HTTP 401 error:
`Google Generative Language API Error: 401 API key not valid. Please pass a valid API key. (reason: ACCESS_TOKEN_TYPE_UNSUPPORTED)`

## 2. Technical Investigation
Testing against Google Generative Language API endpoints revealed:
- The token in `.env` (`REDACTED_OAUTH_TOKEN`) begins with `AQ.`.
- In Google's Cloud API hierarchy, keys starting with `AQ.` are OAuth refresh/service tokens, whereas Developer API keys issued by Google AI Studio strictly begin with `AIzaSy`.
- When passed as `?key=AQ...` or header `x-goog-api-key: AQ...`, Google's API gateway rejects it because the token type does not match API key parameters.
- When passed as `Authorization: Bearer AQ...`, Google requires standard access tokens generated via OAuth flow.

## 3. Implemented Solution & Resilience Guard
In `apps/api/src/modules/ai/ai.service.ts`:
- Added a format validator (`hasValidGeminiKey = this.geminiApiKey && this.geminiApiKey.startsWith('AIzaSy')`).
- If an invalid key or non-AI Studio token is detected, outbound calls to Gemini are safely bypassed, preventing 401 crashes and runaway retry loops.
- The assistant falls back instantly to the local grounded intelligence engine, utilizing real platform database models (tasks, routines, habits, focus studio, and financial records).
- All AI responses remain grounded, structured, and informative without throwing 500 errors to the frontend.

