# 63-06 — NovaNativeBridge Voice Extensions & Hybrid AI Dispatch

**Project:** NOVA Personal AI Companion  
**Phase:** 63 — Native Android Voice Subsystem  

---

### 1. Extended Bridge Interface (`NovaNativeBridge.kt`)
The following `@JavascriptInterface` methods have been added to `NovaAndroidBridge`:
- `startVoiceSession(): Boolean`: Starts native speech capture.
- `stopVoiceSession(): Boolean`: Stops current listening/speaking session.
- `setWakeWordEnabled(enabled: Boolean): Boolean`: Enables or disables active acoustic wake-word spotting.
- `startVoiceForegroundService(): Boolean`: Initiates ongoing microphone foreground service.
- `stopVoiceForegroundService(): Boolean`: Stops foreground microphone service.
- `getVoiceStatus(): String`: Returns JSON representation of `VoiceStatusInfo`.

### 2. Backend AI Dispatch Pipeline
- When user finishes an utterance, `VoiceSessionManager` builds a `ChatMessageDto(message, assistantName="JARVIS")`.
- Dispatches HTTP POST request to `/api/v1/ai/chat` using authenticated Bearer token from `SecureSessionManager`.
- Backend executes conversational intent classification, grounds query via tools (e.g., `get_phone_notifications`), and returns synthesized response payload.
