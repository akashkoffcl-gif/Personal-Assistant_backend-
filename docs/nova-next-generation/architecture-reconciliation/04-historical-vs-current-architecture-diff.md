# 04 — Historical vs. Current Architecture Diff

**Audit Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  

---

## 1. Architectural Divergences & Resolutions

| Historical Architectural Claim | Historical Phase | Current Implementation As-Built | Diff / Reconciliation Finding |
| :--- | :---: | :--- | :--- |
| **Notification Capture Scope** | Phase 54 | WhatsApp only (`com.whatsapp`) hardcoded | **Superseded & Extended:** In Phase 54.2 (`b50ebf1`), replaced with universal package discovery and user-controlled allowlist in `AppApprovalRegistry.kt`. |
| **Client-Side Notification Queue** | Phase 54 | Ephemeral Logcat logging only | **Superseded & Extended:** In Phase 54.2, introduced persistent on-device Room SQLite database (`nova_notification_db`) and `NotificationSyncWorker`. |
| **Android Application Container** | Phase 54 | Standalone native Kotlin Compose screen | **Merged & Unified:** In commit `4e33483`, unified the Next.js web application and native companion into one single APK using `UnifiedNovaWebView` and `NovaNativeBridge`. |
| **Settings UI Navigation** | Phase 54.1 | Settings only displayed work hours and JSON export | **Superseded & Extended:** In Phase 54.2.1 (`a65bd76`), created sub-navigation in Settings (`page.tsx`) exposing `AppAllowlistManager.tsx`. |
| **AI Notification Grounding** | Phase 54 | Grounding was bypassed by conversational intent classifier | **Fixed & Certified:** In Phase 61 (`03c07c8`), intent classifier was updated to map notification questions to `STATUS_REPORT`, triggering `get_phone_notifications` tool execution. |
| **Mobile Database Tables** | Phase 54 | Models existed in `schema.prisma` but tables were absent in PostgreSQL | **Reconciled:** In Phase 61, ran additive `prisma db push` synchronizing `mobile_devices`, `mobile_events`, `mobile_permissions`, and `mobile_push_tokens` live into PostgreSQL. |

---

## 2. Unimplemented Future Proposals vs. Live Code
- **Native Android Wake-Word:** Several earlier documents (`phase-43.2`, `phase-44`) discussed voice architectures, but native Android background wake-word (`NovaVoiceForegroundService`, `WakeWordEngine`) has **not** been implemented yet. The existing voice implementation is strictly browser-based (`useVoiceInteraction.ts`). This is accurately scheduled for Phase 63.
- **Risk-Classified Action Execution:** Tool execution in `jarvis-tool-registry.service.ts` currently runs without formal risk tier gates (scheduled for Phase 65).
