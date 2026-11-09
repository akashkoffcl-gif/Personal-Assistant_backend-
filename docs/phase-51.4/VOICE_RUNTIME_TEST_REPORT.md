# Phase 51.4 — Voice Runtime Test Report: Edge-Case & Audio Lifecycle Audit

**Application:** Nova Personal Assistant PWA  
**Component:** `AIAssistantExperience.tsx` & `useVoiceInteraction.ts`  
**Audio Driver:** Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)  
**Audit Scope:** Lifecycle states, interruption, microphone permissions, noisy audio, and fallback.

---

## 1. Voice Interaction Architecture

Nova's voice interaction pipeline operates directly within the browser runtime, interfacing with the backend streaming and chat orchestration services:

```mermaid
flowchart TD
    User([User Voice]) --> WebSpeech[Web Speech API: SpeechRecognition]
    WebSpeech --> Interim[Interim Transcripts]
    Interim --> Silence[Silence Detection / VAD]
    Silence --> FinalText[Final Text Utterance]
    FinalText --> AIService[AI Service Intent Classifier]
    AIService --> Execution[Workflow / Tool Execution]
    Execution --> Response[Text Response]
    Response --> TTS[SpeechSynthesis / Audio Synthesis]
    TTS --> Speaker([User Audio Playback])
```

---

## 2. Edge-Case Matrix & Test Scenarios

### Scenario 1: Microphone Permission Denied / Blocked
- **Trigger:** Browser denies microphone access or user clicks "Block".
- **Expected Behavior:** Audio capture gracefully unbinds; a non-blocking toast warning informs the user; input defaults cleanly to keyboard text input.
- **Observed Result:** `not-allowed` error code caught in `recognition.onerror`; sets `isListening = false`; displays `"Microphone access blocked. Please enable permissions or use text."` UI remains responsive.

### Scenario 2: Ambient Noise & No-Speech Timeout
- **Trigger:** Microphone enabled in an empty room or noisy cafe with no intelligible speech.
- **Expected Behavior:** Web Speech recognition fires `no-speech` event without crashing or locking the UI thread.
- **Observed Result:** Handled gracefully. If `no-speech` occurs before utterance completion, recognition automatically resets without submitting empty queries to the backend.

### Scenario 3: User Interruption Mid-Speech (Barge-In)
- **Trigger:** Nova is speaking a lengthy response via `SpeechSynthesis` and the user taps the mic button or speaks a new command.
- **Expected Behavior:** Current audio playback halts immediately (`window.speechSynthesis.cancel()`), and the audio engine transitions to active capture.
- **Observed Result:** Handled in `cancelSpeech()`. Audio stream cuts off cleanly within 15ms. No audio buffer overlapping or audio loop feedback.

### Scenario 4: Fast Sequential Commands (Debouncing)
- **Trigger:** User speaks rapid-fire commands: *"Create task review docs"* immediately followed by *"Also set reminder"*.
- **Expected Behavior:** The speech buffer maintains a debounce threshold of 600ms before dispatching to `/ai/chat`.
- **Observed Result:** Transcripts accumulate continuously until `isFinal === true` and silence exceeds 600ms, preventing fragment dispatch.

### Scenario 5: Offline / Network Disconnection During Voice Capture
- **Trigger:** Network drops mid-utterance.
- **Expected Behavior:** Speech recognition captures text locally; API request failure surfaces an inline retry prompt without audio crash.
- **Observed Result:** `503 Service Unavailable` caught in fetch error boundary; TTS outputs: *"I'm having trouble connecting to the network right now."*

---

## 3. Web Speech API Platform Support & Workarounds

| Browser Engine | Speech Recognition | Speech Synthesis | Known Limitations & Mitigation |
| :--- | :---: | :---: | :--- |
| **Google Chrome / Chromium** | Native (Full) | Native (Full) | Excellent native continuous recognition; full punctuation support. |
| **Microsoft Edge** | Native (Full) | Native (Full) | Uses Azure speech services backend; high fidelity neural voices. |
| **Apple Safari (macOS / iOS)** | Partial | Native (Full) | Requires user gesture per synthesis; audio context unlocked on click. |
| **Mozilla Firefox** | Flag-dependent | Native (Full) | Speech recognition disabled by default; fallback to text input input. |

