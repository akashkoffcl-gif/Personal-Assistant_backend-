# Provider Configuration & Transparent Authentication

## 1. Authentication Status
- **Google Generative Language API:** Strictly requires a Developer API Key beginning with `AIzaSy...`.
- **Current Key Analysis:** The configured token in `.env` starts with `REDACTED_OAUTH_TOKEN`, indicating an internal OAuth refresh token or GCP identity credential.
- **Provider Status Reporting:** Accurately reports `INVALID_CREDENTIAL`, avoiding deceptive claims that Google Gemini is responding.

## 2. Dynamic Key Configuration Support
- The provider status inspector and chat endpoints accept an optional key parameter (`?key=` or `geminiApiKey`), allowing administrators to hot-test new Google AI Studio credentials dynamically without restarting production services.

