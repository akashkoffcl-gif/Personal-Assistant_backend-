# 63-04 — Wake-Word Engine & Voice Activation State Machine

**Project:** NOVA Personal AI Companion  
**Phase:** 63 — Native Android Voice Subsystem  

---

### 1. Finite State Machine (`VoiceState.kt`)
The voice interaction lifecycle is governed by an explicit finite state machine:
- `DISABLED`: Voice subsystem uninitialized or permissions denied.
- `READY`: Initialized, waiting for user trigger or wake-word.
- `LISTENING`: Active microphone capture and speech recognition.
- `PROCESSING`: Utterance finalized, awaiting backend AI reasoning and tool-calling execution.
- `RESPONDING`: Synthesizing speech response via Android TTS with transient audio focus.
- `ERROR`: Recoverable or unrecoverable error state with diagnostic message.

### 2. Wake-Word Engine (`WakeWordEngine.kt`)
- Actively evaluates phoneme candidates against registered hotwords: `"hey nova"`, `"nova"`, and `"jarvis"`.
- Features continuous loop restart logic with exponential backoff on recognition timeouts.
- Instantly halts spotting upon keyword match to transfer microphone control to the `VoiceSessionManager`.

### 3. Orchestrator (`VoiceActivationManager.kt`)
- Manages mutual exclusion between speech recognition and text-to-speech (prevents assistant from hearing its own voice).
- Coordinates `NovaAudioFocusManager`, `WakeWordEngine`, `VoiceSessionManager`, and `NovaSpeechSynthesisManager`.
- Publishes atomic `VoiceStatusInfo` updates to native bridge and foreground notifications.
