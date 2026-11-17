# 63-02 — Native Voice Architecture & OS Boundary Specification
## Android 14–16 Audio Engine, AudioFocus, and Wake-Word Strategy

**Project:** NOVA Personal AI Companion  
**Phase:** 63 — Native Android Voice Subsystem  
**Target Platform:** Android 16 / API 36 (Physical device: Vivo/iQOO I2305)  
**Security Model:** User-Initiated Foreground Service & Privacy Enforced  

---

### 1. Architectural Scope & Principles
Phase 63 introduces a fully integrated native voice intelligence subsystem directly into the unified NOVA Android companion (`apps-mobile/nova-android`), adhering strictly to the architecture preservation directives:
- **No replacement of browser Web Speech API:** Web Speech API remains operational for standalone browser sessions.
- **Native Android Audio Stack:** Utilizes Android `SpeechRecognizer`, `TextToSpeech`, `AudioManager` (AudioFocus), and `ForegroundService`.
- **Hybrid Offline/Online Topology:**
  - Local keyword/hotword spotting ("Hey Nova" / "Jarvis").
  - On-device speech capture and recognition with fallback to online recognition when network permits.
  - Streaming conversation and tool-calling reasoning routed to NOVA's existing NestJS backend (`/api/v1/ai/chat`).
  - Native Text-to-Speech synthesis with dynamic audio focus ducking/pause.

---

### 2. Android 14–16 (API 34–36) Foreground Service Constraints
Under Android 14+ and Android 16:
1. **Microphone Type Declaration:** Any background audio capture requires `android:foregroundServiceType="microphone"` in `AndroidManifest.xml` alongside `RECORD_AUDIO` and `FOREGROUND_SERVICE_MICROPHONE`.
2. **User Visibility & Privacy:** A persistent foreground notification with `PRIORITY_LOW` and a clear "Stop Voice" action must be visible whenever the microphone service is engaged.
3. **Background Start Restrictions:** Android 14+ prohibits starting a microphone foreground service from the background without user interaction or ongoing task context. All voice activations must be explicitly initialized by user gesture or in-app trigger.

---

### 3. Wake-Word Hardware Feasibility & Truthful Disclosure
- **Physical Device Audit (iQOO I2305, Snapdragon/OriginOS, Android 16):**
  - Always-on ultra-low-power DSP audio spotting is strictly restricted by Vivo/OriginOS to the OEM assistant (`com.vivo.assistant`).
  - Third-party applications without system-level signatures cannot bind directly to DSP hotword registers.
  - **Truthful Engineering Decision:** NOVA implements active acoustic spotting (`WakeWordEngine`) during active foreground sessions and ongoing foreground services. When the service is stopped, wake-word gracefully transitions to ready standby without falsely reporting continuous zero-power battery performance.
