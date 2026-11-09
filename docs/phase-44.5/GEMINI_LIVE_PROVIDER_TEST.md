# Gemini Live Provider Stress Test & Verification

## 1. Provider Target & Authentication Mode
- **Provider Gateway:** `generativelanguage.googleapis.com/v1beta`
- **Model Target:** `gemini-1.5-flash`
- **Configured Environment Variable:** `GEMINI_API_KEY` in `apps/api/.env` and `.env`

## 2. Authentication Test Evidence & Findings
- **Raw API Key Testing:**
  - Invocation: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=REDACTED_OAUTH_TOKEN`
  - HTTP Return: `401 UNAUTHENTICATED`
  - Error Reason: `ACCESS_TOKEN_TYPE_UNSUPPORTED`
  - Cause: The key starts with `AQ.`, designating an OAuth refresh or Google internal token rather than a Developer API Key (`AIzaSy...`).
- **Bearer Token Testing:**
  - Invocation: `GET https://generativelanguage.googleapis.com/v1beta/models` with `Authorization: Bearer REDACTED_OAUTH_TOKEN`
  - HTTP Return: `401 UNAUTHENTICATED` (`API_KEY_SERVICE_BLOCKED`)

## 3. Resilience & Fallback Transparency
- **Provider Status API:** `GET /api/v1/ai/provider-status` verified returning:
  ```json
  {
    "status": "INVALID_CREDENTIAL",
    "model": "gemini-1.5-flash",
    "source": "GROUNDED_FALLBACK",
    "message": "Configured token is an OAuth/Cloud credential ('AQ...'). Google Generative Language API requires an 'AIzaSy...' developer API key from Google AI Studio. Operating in grounded local intelligence mode."
  }
  ```
- **Transparency:** The assistant never falsely claims local grounded outputs originate from remote Gemini models. The `source` field explicitly identifies `GROUNDED_FALLBACK`.

