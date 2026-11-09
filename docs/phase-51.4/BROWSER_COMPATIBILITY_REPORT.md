# Phase 51.4 — Browser Compatibility Report: Web Speech API & Mobile PWA

**Application:** Nova Personal Assistant PWA  
**Frontend Framework:** Next.js 14 (App Router) + TailwindCSS  
**Audio Drivers:** Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)  
**PWA Target:** Desktop & Mobile Browsers

---

## 1. Browser Platform Capability Matrix

| Platform / Browser | `SpeechRecognition` Support | `SpeechSynthesis` Support | PWA Installation | Full Compatibility Rating |
| :--- | :---: | :---: | :---: | :---: |
| **Google Chrome (Desktop/Android)** | Full (Native continuous) | Full (Multi-voice) | Full (Web App Manifest) | **100% (Tier 1)** |
| **Microsoft Edge (Desktop/Mobile)** | Full (Azure backed) | Full (Neural voices) | Full (Web App Manifest) | **100% (Tier 1)** |
| **Brave Browser (Desktop)** | Full (When Google Services enabled) | Full | Full | **95% (Tier 1)** |
| **Apple Safari (macOS / iOS)** | Partial (`webkitSpeechRecognition`) | Full (Gesture required) | Full (Add to Home Screen) | **90% (Tier 2)** |
| **Mozilla Firefox (Desktop/Android)** | Flag Disabled (`media.webspeech.recognition`) | Full | Partial | **75% (Tier 3 - Text Fallback)** |

---

## 2. Platform Nuances & Graceful Degradation Strategies

### Apple iOS Safari Nuances
- **User Gesture Requirement for Audio:** iOS WebKit requires an explicit user touch event before `SpeechSynthesis.speak()` or Web Audio playback can initialize.
- **Handling in Nova:** The mic button or assistant toggle directly satisfies the user gesture requirement, priming the audio context prior to voice response streaming.
- **Continuous Recognition Cutoff:** Safari closes `webkitSpeechRecognition` after ~10 seconds of silence. Nova automatically attaches an `onend` listener that re-arms the recognition engine if the user is in continuous conversation mode.

### Mozilla Firefox Recognition Absence
- **Nuance:** Firefox supports `SpeechSynthesis` natively, but `SpeechRecognition` is gated behind an experimental flag (`media.webspeech.recognition.enable`).
- **Graceful Fallback:** When `window.SpeechRecognition || window.webkitSpeechRecognition` is undefined:
  1. The microphone icon indicates "Voice input unavailable in this browser".
  2. The input box autofocuses on the text input.
  3. Audio responses via `SpeechSynthesis` remain fully active.

---

## 3. Responsive Layout & Mobile Touch Ergonomics

- **PWA Viewport:** Configured with `viewport-fit=cover` and dynamic viewport units (`100dvh`) to prevent iOS address bar layout jumps.
- **Floating Action Mic (FAM):** Positioned within the bottom thumb zone for one-tap voice interaction on both mobile and tablet form factors.
- **Offline Service Worker:** Caches application shell assets, allowing the voice UI shell to render immediately even when offline.

