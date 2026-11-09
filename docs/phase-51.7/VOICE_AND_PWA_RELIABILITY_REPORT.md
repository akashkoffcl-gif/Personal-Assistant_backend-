# Phase 51.7 — Voice & PWA Reliability Report

## 1. PWA Voice Assistant Architecture

Nova implements an in-browser voice interface powered by Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) coupled with SpeechSynthesis:
- **Speech-to-Text (STT):** Local client browser audio recognition with continuous streaming intent detection.
- **Text-to-Speech (TTS):** Browser synthesis with speech cancellation and audio lifecycle guards.
- **Visual Feedback:** 3D Three.js avatar reactive to listening, thinking, speaking, and error states.

## 2. Failure Mode Analysis & Edge Case Handling

| Edge Case / Failure Condition | System Behavior | Visual & Voice Feedback | Reliability Status |
| :--- | :--- | :--- | :--- |
| **Microphone Permission Denied** | Gracefully falls back to text input | Warning toast: "Microphone access blocked; text input active." | **HANDLED** |
| **Speech Interruption** | User speaking during TTS aborts speech | `speechSynthesis.cancel()` called immediately | **HANDLED** |
| **False-Positive Voice Intent** | High-risk confirmation voice prompts | Explicit confirmation step required; cannot trigger mutations casually | **HANDLED** |
| **Voice Cancellation Mid-Flight** | User says "Cancel workflow" | Client dispatches `/ai/workflows/:id/cancel` via SSE | **HANDLED** |
| **Network Interruption / Offline** | ServiceWorker caches shell; requests queue | Offline indicator; voice communicates local status | **HANDLED** |
| **SSE Stream Disconnect** | Automatic EventSource reconnection | Exponential backoff (1s, 2s, 4s); state refreshed via GET | **HANDLED** |
| **Tab Backgrounding** | Audio streams paused cleanly | Re-synced on visibilitychange event | **HANDLED** |
| **Wake-Word Limitation** | Clearly communicated in UI | Not falsely claimed as continuous background listening | **HANDLED** |

