# 63-05 — NovaVoiceForegroundService & Android 14–16 Lifecycle Management

**Project:** NOVA Personal AI Companion  
**Phase:** 63 — Native Android Voice Subsystem  

---

### 1. Foreground Service Architecture (`NovaVoiceForegroundService.kt`)
- **Service Type:** Declared with `android:foregroundServiceType="microphone"`.
- **Channel ID:** `nova_voice_service_channel` with `NotificationManager.IMPORTANCE_LOW` (non-intrusive).
- **Service Actions:**
  - `ACTION_START_VOICE`: Launches microphone capture and registers ongoing notification.
  - `ACTION_STOP_VOICE`: Halts audio pipelines, releases audio focus, and terminates service via `stopForeground(STOP_FOREGROUND_REMOVE)` and `stopSelf()`.
  - `ACTION_TOGGLE_WAKEWORD`: Toggles active acoustic keyword spotting.

### 2. Notification UX & Privacy
- Displays real-time voice state in notification text (`Listening...`, `Processing...`, `Speaking...`).
- Includes one-tap `Stop Voice` action for immediate user termination.
- Complies fully with Android 16 background execution rules.
