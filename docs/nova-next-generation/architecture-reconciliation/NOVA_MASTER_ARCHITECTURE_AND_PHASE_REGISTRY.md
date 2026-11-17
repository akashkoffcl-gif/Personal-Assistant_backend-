# NOVA — Master Architecture & Phase Registry

**Authoritative System Record**  
**Last Updated:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  
**Current HEAD Commit:** `03c07c8`  
**Physical Verification Platform:** iQOO I2305 (Android 16 / API Level 36)  

---

## 1. Master Phase Registry

| Phase ID | Phase Title | Status | Primary Modules | Git Commit / Hash | Next Required Action |
| :---: | :--- | :---: | :--- | :---: | :--- |
| **P-01 to P-42** | Foundational Personal Assistant Core | **INTEGRATION TESTED** | `tasks`, `routines`, `projects`, `finance`, `knowledge`, `web` | `2e63848` | Maintain backward compatibility |
| **P-43 to P-44.5** | Browser Voice & Audio Pipeline | **INTEGRATION TESTED** | `web` (`useVoiceInteraction.ts`, Web Speech API) | `95cd919` | Preserve for desktop browsers |
| **P-45 to P-50** | Second Brain, Focus Studio & Finance | **INTEGRATION TESTED** | `focus`, `knowledge`, `finance`, `wellness` | `15af64f` | Maintain additive data contracts |
| **P-51.1 to P-53.5** | NL Workspace Navigation & Autonomous Workflows | **INTEGRATION TESTED** | `ai` (`ai.service.ts`, `worker.service.ts`) | `1bd6e9b` | Preserve regex tab dispatch |
| **P-54** | Android JARVIS Companion (Native Prototype) | **SUPERSEDED** | `apps-mobile/nova-android` | `137e375` | Unified into single hybrid APK |
| **P-54.1** | Unified Android Consolidation (WebView + Bridge) | **COMPILED & VERIFIED** | `apps-mobile`, `NovaNativeBridge.kt` | `4e33483` | Maintain JS bridge contracts |
| **P-54.2** | Universal Multi-App Notification Pipeline | **PHYSICAL DEVICE VERIFIED** | `NovaNotificationListenerService.kt`, Room, WorkManager | `b50ebf1` | Retain mandatory security exclusions |
| **P-54.2.1** | Mobile Companion Settings & App Allowlist UI | **COMPILED & VERIFIED** | `apps/web` (`AppAllowlistManager.tsx`, `page.tsx`) | `a65bd76` | Maintain Settings sub-navigation |
| **P-55 to P-60** | Personal Intelligence, Reasoning & Action Orchestrator | **INTEGRATION TESTED** | `ai` (`reasoning-engine`, `behavioral-context`) | `57e9910` | Extend into Phase 64 & 65 |
| **P-61** | Live Physical Notification Certification | **CERTIFIED** | Full 10-Stage Pipeline on iQOO I2305 | `03c07c8` | Baseline certified; ready for P-62 |
| **P-62** | Android Runtime Health & Telemetry | **CERTIFIED** | `mobile.service.ts`, `NovaNativeBridge.kt`, `AppAllowlistManager.tsx` | `a816f72` | Certified; baseline established |
| **P-63** | Native Android Voice Subsystem | **IMPLEMENTED** | `NovaVoiceForegroundService`, `WakeWordEngine`, `VoiceActivationManager`, `NovaAudioFocusManager`, `NovaSpeechSynthesisManager` | `c953f26` | Code complete; verified in Phase 63.1 |
| **P-63.1** | Native Voice Evidence Closure & Certification Audit | **AUDITED & VERIFIED** | 10 Audit Evidence Reports | Current HEAD | IMPLEMENTED — PHYSICAL CERTIFICATION PENDING |
| **P-64** | Unified Context & Event Processing | **NOT STARTED** | `unified-context.service.ts` | Pending | Blocked by P-63.1 sign-off |
| **P-65** | High-Autonomy Action Policy Boundary | **NOT STARTED** | `jarvis-tool-registry.service.ts`, Policy Executor | Pending | Blocked by P-64 completion |
| **P-66** | Proactive Intelligence & Dispatch Engine | **NOT STARTED** | `proactive-intelligence.service.ts`, BullMQ | Pending | Blocked by P-65 completion |
| **P-67** | Cross-Platform End-to-End Integration | **NOT STARTED** | Full system regression suite | Pending | Blocked by P-66 completion |
| **P-68** | Production Hardening & Final 2.0 Certification | **NOT STARTED** | Release hardening & sign-off | Pending | Blocked by P-67 completion |

---

## 2. Permanent Architectural Invariants

1. **Strict Preservation of Existing Baseline:** All 25 baseline components identified in `NOVA_CURRENT_ARCHITECTURE_AUDIT.md` are permanent. No module, endpoint, or database table may be deleted or deprecated.
2. **Unified Android Model:** The application runs as a unified hybrid Android client using `UnifiedNovaWebView.kt` and `NovaNativeBridge.kt`. The web shell and mobile native companion must never be split back into separate APKs.
3. **Mandatory Security Exclusions:** Banking, UPI, payment, and authenticator applications are hardcoded as excluded by native policy in `PrivacyFilter.kt` and cannot be overridden by user or AI requests.
4. **Offline Resilience:** All captured status bar notifications must pass through local on-device Room SQLite persistence (`NotificationDatabase`) before network transmission via `WorkManager`.
5. **Single Authoritative Context Builder:** `UnifiedContextService` (`apps/api/src/modules/ai/unified-context.service.ts`) is the sole context builder in the backend; all future contextual extensions must extend this service additively.
