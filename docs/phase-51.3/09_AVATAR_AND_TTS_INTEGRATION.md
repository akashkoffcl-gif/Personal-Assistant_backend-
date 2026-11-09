# PHASE 51.3 — AVATAR & TTS INTEGRATION REPORT

## 1. Executive Summary

This report assesses the synchronization between Nova's 3D avatar visual presentation (`AIAvatarModel.tsx`, Three.js canvas), the native audio waveform visualizer (`AIWaveform.tsx`), and the speech synthesis system (`SpeechSynthesisUtterance`).

## 2. 3D Avatar State Mapping

The Three.js avatar reacts dynamically according to the Assistant Invocation FSM:

| Invocation State | Avatar Visual State | Animation Behavior | Eye / Halo Color |
| :--- | :--- | :--- | :--- |
| `IDLE` | `idle` | Gentle sinusoidal breathing oscillation | Calming Lavender / Indigo (#818CF8) |
| `LISTENING` | `listening` | Alert forward tilt, responsive to voice input | Cyan Pulse (#38BDF8) |
| `TRANSCRIBING` | `thinking` | Orbital gyroscopic ring rotation | Amber Glow (#F59E0B) |
| `UNDERSTANDING` | `thinking` | Rapid inner core rotation | Amber Glow (#F59E0B) |
| `PLANNING` | `planning` | Dual-axis orbital ring alignment | Emerald Geometric Pulse (#10B981) |
| `AWAITING_APPROVAL` | `awaiting_approval`| Steady forward hover with pulse ring | Gold / Amber Attention (#FBBF24) |
| `EXECUTING` | `executing` | Continuous particle vortex stream | Electric Violet (#A855F7) |
| `SPEAKING` | `speaking` | Harmonic frequency-modulated scale pulse | Lavender Bloom (#C084FC) |
| `ERROR` | `error` | Jittered dampening, red alert bloom | Ruby / Rose Alert (#EF4444) |

## 3. Text-to-Speech (TTS) Architecture

1. **Native Web Speech Synthesis:**
   - Synthesizes speech locally using `window.speechSynthesis`.
   - Strips internal metadata markers (e.g. `[ACTION:...]`, `[CLIENT_ACTION:...]`, JSON payloads) before dispatching to the speech synthesizer.
2. **Audio Waveform Coupling:**
   - While `speechSynthesis.speaking` is active, `AIWaveform.tsx` renders dynamic, audio-reactive frequency bars simulating harmonic voice modulation.
   - On utterance completion (`utterance.onend`), the waveform smoothly animates back to resting baseline levels.
3. **Voice Customization & Pitch Controls:**
   - User settings allow selecting preferred voice URI, pitch (0.5 - 1.5), and speech rate (0.8 - 1.4x).

## 4. Verification Evidence

- Verified avatar states compile without Three.js memory leaks or unmounted ref errors.
- Verified speech synthesis utterance cleanup upon modal dismissal and cancellation.
- Verified WebGL canvas fallback when hardware acceleration is disabled.

