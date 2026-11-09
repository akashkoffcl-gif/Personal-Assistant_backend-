# Phase 48 — Continuous Voice Assistant Reliability Report

**Module:** Module F — Voice Interaction & Speech Runtime  
**Date:** 2026-11-06  
**Environment:** Next.js PWA Client  
**Components:** `AIAssistantExperience`, `AIAvatarStage`, `AIWaveform`, `AIFloatingCommandBar`

---

## 1. Architecture & Half-Duplex State Machine

The voice assistant implements a robust half-duplex turn-taking state machine to prevent acoustic feedback, mic looping, and speech truncation:

```
[HIDDEN / INACTIVE]
       │
       ▼ (User tap or Wake Word "Nova")
  [LISTENING] ──(Silence Timer / Final Speech)──► [PROCESSING]
       ▲                                               │
       │                                               ▼
  [AWAITING_INPUT] ◄──(TTS onend)────────────── [SPEAKING]
```

---

## 2. Audio Subsystem Features

1. **Wake-Word Detection & Speech Recognition**:
   - Leverages standard Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) with graceful browser fallback.
   - Distinct wake-word instance monitors continuously for the assistant's name ("Nova") when enabled in settings.
2. **Dynamic Waveform Visualization**:
   - Audio volume analyzer creates reactive lavender waveforms matching speech amplitude.
3. **Inactivity Safeguards**:
   - Automated 30-second inactivity auto-dismiss shuts down microphone listeners and audio contexts if the user steps away.
4. **Quiet Hours Enforcement**:
   - Respects user-configured quiet hours (default: 10:00 PM – 7:00 AM), automatically suppressing speech output in favor of silent textual responses.

