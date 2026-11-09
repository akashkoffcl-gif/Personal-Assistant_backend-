# Voice Experience Validation

**Phase:** 53.2  
**Target:** Validate speech recognition, speech synthesis delivery, pause segmentation, and continuous conversational listening.

---

## 1. Web Speech API Voice Lifecycle

The implementation in [`useVoiceInteraction.ts`](file:///D:/PT/apps/web/src/hooks/useVoiceInteraction.ts) maintains a 12-state conversation engine:
`IDLE` -> `LISTENING` -> `PROCESSING` -> `GENERATING_RESPONSE` -> `SPEAKING` -> `WAITING_FOR_FOLLOWUP` -> `LISTENING`.

### 1.1 Barge-In Interruption
- When the user starts speaking while `state === 'SPEAKING'`, `handleBargeIn()` cancels `window.speechSynthesis` instantly and resets state to `LISTENING`.

### 1.2 Audio Feedback Protection
- During TTS playback, speech recognition is temporarily stopped to prevent the microphone from picking up NOVA's own audio output (half-duplex arbitration).
- Upon `utterance.onend`, recognition restarts after a 400ms buffer.

---

## 2. Speech Preprocessing & Prosody

1. **Markdown Stripping:** Backticks, asterisks, headers, and code blocks are stripped prior to delivery.
2. **Breath Pauses:** Bullet lists (`- `) are converted into distinct sentences with period pauses (`. `) to ensure the browser speech engine pauses naturally.
3. **Dynamic Pacing:**
   - Urgent / Hurried: `1.15x` rate.
   - Normal / Balanced: `1.05x` rate.
   - Reflective: `0.95x` rate.

---

## 3. Honest Evaluation of Voice Limitations

> [!WARNING]
> Native browser `window.speechSynthesis` does not support SSML pitch inflections or emotional voice acting.  
> While the tiered voice selection prioritizes high-quality natural voices (Google, Natural, Samantha, Karen), the speech remains synthetic. For studio-grade human emotional voice inflection, a future server-side neural TTS provider (e.g. ElevenLabs or Google Cloud TTS) would be required.

