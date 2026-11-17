# 62-01 — Phase 62 Baseline Audit

**Execution Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  
**Git HEAD:** `03c07c89458dabc50187594e6ea23d079c8207f2`  
**Physical Device:** Vivo / iQOO I2305 (Android 16 / API Level 36)  
**Package:** `com.nova.companion` (Version 1.0.0, Code 1)  

---

## 1. Initial Baseline Verification

1. **Git State:** Clean working tree on `feature/unified-android-apk`, commit `03c07c8`, synchronized to `backend` and `frontend` remotes.
2. **Physical Device State:** Connected via wireless ADB (`192.168.0.3:41639`), Notification Listener granted and active, running unified APK.
3. **Database Schema State:** `mobile_devices`, `mobile_events`, `mobile_permissions`, and `mobile_push_tokens` tables verified active in PostgreSQL via Prisma.
4. **Backend Services Active:** NestJS server running on `http://localhost:3001/api/v1` with `MobileController`, `MobileService`, `NotificationCapabilityService`, and `WorkerService` (BullMQ/Redis).
5. **Phase 61 Regression Baseline:**
   - Universal capture: Operational (`YouTube` and `WhatsApp` captured).
   - Local Room persistence: Operational (`nova_notification_db`).
   - WorkManager dispatch: Operational (`NotificationSyncWorker`).
   - Authenticated Ingestion: Operational (`POST /api/v1/mobile/events`).
   - AI Retrieval: Operational (`get_phone_notifications` tool grounded).

---

## 2. Telemetry Gaps Identified & Implementation Plan

- **Gap 1 (Heartbeat Endpoint):** `MobileController` currently has no dedicated `/heartbeat` endpoint. Device relies on sporadic sync events or capability checks to update `lastSeenAt`.
  - *Remediation:* Implement `POST /api/v1/mobile/heartbeat` in `MobileController` and `MobileService`.
- **Gap 2 (Structured Diagnostic Metrics):** The existing capability endpoint only reports basic permission booleans. It lacks queue backlog metrics, battery optimization state, and sync failure reasons.
  - *Remediation:* Extend `MobilePermission` and diagnostic payload structures to track `BATTERY_OPTIMIZATION_EXEMPTION`, Room queue depth, oldest unsynced event timestamp, and last error.
- **Gap 3 (Android Companion Diagnostic Manager):** Android client currently lacks a unified health collector that aggregates listener status, queue depth, and battery state into a single telemetry packet.
  - *Remediation:* Implement `NovaDeviceDiagnosticsManager.kt` in `apps-mobile/nova-android/app/src/main/java/com/nova/companion/health/`.
- **Gap 4 (Frontend Runtime Health View):** Frontend has `AppAllowlistManager.tsx` but lacks a dedicated `Runtime Health` view in `Settings → Mobile Companion`.
  - *Remediation:* Implement a dedicated Runtime Health tab in `AppAllowlistManager.tsx` with live diagnostic polling.
