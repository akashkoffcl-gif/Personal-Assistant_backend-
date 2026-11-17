# 63-01 — Historical Reconciliation and Baseline Report

**Execution Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  
**Actual Git HEAD Commit:** `a816f72d34740e306bbd3bc52e86343ce5d7f7de`  
**Remote Provenance:** Verified synchronized on both `backend` and `frontend` remotes (`a816f72`).  
**Physical Verification Device:** Vivo / iQOO I2305 (`I2305i`), Android 16 / API 36  

---

## 1. Resolution of Master Registry Git & Phase Discrepancy

- **Historical Registry Discrepancy:** The master registry at `docs/nova-next-generation/architecture-reconciliation/NOVA_MASTER_ARCHITECTURE_AND_PHASE_REGISTRY.md` previously logged an earlier commit (`03c07c8`) and held intermediate status before Phase 62.1 final corrections.
- **Git Commit Provenance Trace:**
  - `03c07c8`: Phase 61 physical notification certification (10/10 stages PASS).
  - `e674f56`: Phase 62 initial Android runtime health & telemetry heartbeat implementation.
  - `e2fddf9`: Phase 62.1 periodic heartbeat scheduling via `DeviceHeartbeatWorker`.
  - `a816f72` (Current True HEAD): Phase 62.1 final correction enforcing decoupled telemetry semantics (`lastSeenAt` vs. `lastSuccessfulSyncAt`) and validating Redis rate-limiting (HTTP 201 → HTTP 429).
- **Master Registry Update:** The master architecture registry has been reconciled with this true sequence.

---

## 2. Audio & Voice Baseline Status

- **Browser Voice Pipeline:** Implemented via Web Speech API (`useVoiceInteraction.ts`) in `@assistant/web`, providing hands-free barge-in and speech synthesis within the browser shell.
- **Native Android Baseline:** 
  - `AndroidManifest.xml` already declares `RECORD_AUDIO`, `FOREGROUND_SERVICE`, and `FOREGROUND_SERVICE_MICROPHONE`.
  - Physical iQOO I2305 has `android.permission.RECORD_AUDIO: granted=true`.
  - Android features `android.hardware.microphone`, `android.hardware.audio.low_latency`, and `android.software.voice_recognizers` verified present.
  - Native Android foreground service (`NovaVoiceForegroundService`), wake-word engine, audio focus management, and speech synthesis manager are currently **not implemented** in Kotlin.
  - Phase 63 implementation will build this native subsystem additively without disturbing the Web Speech API or the certified Phase 61/62 pipeline.
