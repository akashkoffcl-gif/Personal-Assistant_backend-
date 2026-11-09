# Phase 48.1 — Continuous Conversation Recovery & State Machine Report

**Phase:** Phase 48.1 — Stage Three  
**Date:** 2026-11-06  
**Auditor:** Antigravity  
**Target:** `apps/web/src/components/AIAssistant/AIAssistantExperience.tsx`

---

## 1. Problem Identification

Previously, users reported that the AI assistant could only process a single user message before stalling or disconnecting. After answering the first query, the voice conversation would not reliably return to the `LISTENING` state.

### Root Causes Discovered
1. **Asynchronous Closure Capture**: When `utterance.onend` executed, the enclosing closure evaluated an outdated snapshot of `lifecycleState`. Because it was evaluated as `HIDDEN` or stale, the recursive transition to `startRequestListening()` failed silently.
2. **Audio Device Contention**: Calling `recognition.start()` within an arbitrary 200ms window after TTS often collided with the browser's audio output bus before it had fully released the input microphone channel.
3. **Dual Recognition Mutex Conflict**: The background wake-word `SpeechRecognition` listener and the interactive prompt `requestRecognition` listener simultaneously competed for audio capture, throwing unhandled DOM exceptions.

---

## 2. Implemented Finite State Machine & Mutex Architecture

We refactored `AIAssistantExperience.tsx` with a reliable state machine:

```
[HIDDEN]
   │  User Tap / Wake Word
   ▼
[REQUEST_LISTENING] (Single mic ownership, wake-word aborted)
   │  User Speech + Silence Detection
   ▼
[THINKING / STREAMING] (Mic released, LLM generating)
   │  Response Ready
   ▼
[SPEAKING] (TTS active, waveform reacting)
   │  Utterance onend event + 350ms Audio Hardware Release Guard
   ▼
[REQUEST_LISTENING] (Re-arms automatically via lifecycleRef without state staleness)
```

### Key Technical Improvements:
- **`lifecycleRef` Mutable Ref**: Mirrors `lifecycleState` synchronously on every render, ensuring that asynchronous TTS `onend` and `onerror` callbacks evaluate the exact, up-to-date state.
- **Hardware Bus Release Guard (350ms)**: Allows the OS audio subsystem to transition cleanly from output speaker playback to microphone recording before `SpeechRecognition.start()` is invoked.
- **Microphone Mutex Guard**: Explicitly halts the background wake-word listener and terminates any active foreground instances before initializing a new recognition instance.
- **Guarded Error Recovery**: If an interaction fails, the state machine smoothly resets to `ACTIVATING` without unhandled exceptions or UI crashes.

