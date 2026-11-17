# 63-03 — Audio Capture, AudioFocus & Speech Synthesis Implementation

**Project:** NOVA Personal AI Companion  
**Phase:** 63 — Native Android Voice Subsystem  

---

### 1. Audio Focus Coordination (`NovaAudioFocusManager.kt`)
The audio focus manager handles interactions with background media (e.g., Spotify, YouTube, podcasts) during assistant vocal interactions:
- **Usage Category:** `AudioAttributes.USAGE_ASSISTANT`
- **Content Type:** `AudioAttributes.CONTENT_TYPE_SPEECH`
- **Focus Gain Mode:** `AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`
- **Behavior:** Background audio volume is gracefully attenuated (ducked) while NOVA speaks, and automatically restored upon utterance completion or session termination.

### 2. Speech Synthesis (`NovaSpeechSynthesisManager.kt`)
- Wraps Android's native `android.speech.tts.TextToSpeech`.
- Markdown and technical symbol sanitization (strips `*`, `#`, `` ` ``, and code snippets for clean auditory presentation).
- Language negotiation: prioritizes `Locale.US` with seamless fallback to `Locale.getDefault()`.
- Implements `UtteranceProgressListener` to trigger audio focus abandonment immediately when speech finishes.

### 3. Speech Recognition & AI Streaming Pipeline (`VoiceSessionManager.kt`)
- Configured with `RecognizerIntent.ACTION_RECOGNIZE_SPEECH` and `EXTRA_PARTIAL_RESULTS`.
- Captures interim utterances in real-time for immediate UI feedback.
- Upon final silence detection, automatically dispatches prompt to `NovaApiClient.getApiService().sendChatMessage()`.
- Routes AI response text directly to `NovaSpeechSynthesisManager` while updating the state machine.
