# PHASE 52.0: KNOWN ISSUES AND RISK REGISTER

## 1. Risk Register

| Risk ID | Domain | Description | Severity | Impact | Mitigation / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RISK-01** | Voice | Acoustic echo loop on devices without hardware AEC | Medium | Assistant could potentially hear its own speech | Half-duplex pause: speech recognition is suspended during TTS playback and reactivated on speech end. |
| **RISK-02** | Voice | Firefox lack of native speech recognition | Low | Voice recognition unavailable on standard Firefox | Graceful fallback banner directing users to text input while preserving TTS playback. |
| **RISK-03** | Database | Remote pooler connection drops over WAN | Medium | Occasional 503 errors during rapid consecutive pool queries | Client retry logic with exponential backoff; production recommendation is VPC peering. |
| **RISK-04** | PWA | Background tab microphone termination | Low | Browser OS suspends microphone when PWA is hidden | Documented in browser compatibility report; foreground use required for continuous voice. |

## 2. Technical Debt
1. **Wake-Word Engine:** Evaluate on-device WASM wake-word models (e.g. Porcupine) for offline local wake-word triggering without continuous Web Speech API streaming.

