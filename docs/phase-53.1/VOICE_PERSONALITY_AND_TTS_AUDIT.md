# Voice Personality & TTS Audit

## 1. Web Speech API Limitations
- Native browser speech synthesis lacks fine-grained SSML emotional markup.
- Pacing, sentence segmentation, and natural pause insertion must be performed client-side.
- Voice selection must gracefully fall back from high-quality cloud voices (`Google`, `Natural`, `Samantha`) to native system voices (`Karen`, `Daniel`).

## 2. Dynamic Pacing Controls
- Normal turns: `1.05x` rate.
- Urgent / hurried turns: `1.15x` rate.
- Reflective / complex guidance: `0.95x` rate.

