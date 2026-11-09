# Phase 49 — Continuous Multi-Turn Voice Operating System Report

**Phase:** Phase 49 — Section 9 JARVIS Voice Experience  
**Date:** 2026-11-06  
**Auditor:** Antigravity  
**Component:** `AIAssistantExperience.tsx`

---

## 1. Multi-Turn Voice Operating Lifecycle

The continuous voice interface implements an 8-state state machine:

```
[IDLE] ◄────────────────────────────────────────┐
   │                                            │
   ▼ User tap / Foreground Wake Word           │
[LISTENING]                                     │
   │ Final speech utterance detected            │
   ▼                                            │
[PROCESSING] (LLM Streaming & Context Assembly) │ Inactivity Auto-Dismiss (30s)
   │                                            │
   ▼ Consequential mutation proposal           │
[AWAITING_APPROVAL]                             │
   │ User confirms / Speech ready               │
   ▼                                            │
[SPEAKING] (Waveform Reacting)                  │
   │ Utterance onend event + 350ms Audio Guard  │
   ▼                                            │
[LISTENING] ────────────────────────────────────┘
```

---

## 2. Audio Mutex & Hardware Release Guard

1. **Hardware Release Guard (350ms)**: Ensures that speaker output audio tracks completely release the system audio pipeline before `SpeechRecognition` begins capture.
2. **Foreground Recognition Mutex**: Shuts down the background wake-word listener prior to starting request recognition, eliminating concurrent microphone device acquisition conflicts.
3. **Speech Interruption**: User can tap the waveform or speech toggle to cancel TTS instantly (`synth.cancel()`) and regain input control.

