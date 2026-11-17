# 04 — Physical Device Verification & Regression Audit

**Project:** NOVA Personal AI Companion  
**Document:** Phase G Testing & Certification  
**Target Hardware:** Vivo / iQOO I2305 (Android 16 / API Level 36)  
**Date:** 2026-11-17  

---

### 1. Granular Test Evidence Matrix

| Test ID | Test Description | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **T-01** | Permission Status Query | `getDevicePermissionStatus()` returns real boolean flags | Verified JSON structure with `recordAudioGranted`, `postNotificationsGranted`, etc. | **PASS** |
| **T-02** | Runtime Microphone Grant | Prompt user and grant `RECORD_AUDIO` | System permission verified `granted=true` on device | **PASS** |
| **T-03** | Runtime Notification Grant | Prompt user and grant `POST_NOTIFICATIONS` | System permission verified `granted=true` on device | **PASS** |
| **T-04** | Recovery via App Settings | Open `ACTION_APPLICATION_DETAILS_SETTINGS` | `openAppSettings()` launches application details activity | **PASS** |
| **T-05** | Notification Listener Query | Check `NotificationManagerCompat` | Verified `notificationListenerGranted=true` | **PASS** |
| **T-06** | Battery Optimization Toggle | Launch Doze ignore settings | `openBatteryOptimizationSettings()` functional | **PASS** |
| **T-07** | Start Voice FG Service | Launch with `microphone` type | Service starts with ongoing notification; state -> `LISTENING` / `READY` | **PASS** |
| **T-08** | Stop Voice FG Service | One-tap stop via notification / UI | Service stops; audio resources released; state -> `READY` | **PASS** |
| **T-09** | Mic Denied Boundary | Attempt service start without mic | UI flags error and prompts for microphone before service start | **PASS** |
| **T-10** | Window Focus Auto-Refresh | Return from system settings | Focus event triggers `inspectDeviceState()`; UI updates automatically | **PASS** |
| **T-11** | Web Push Separation | Toggle push independently | Web push handles browser service worker; native notifications handled separately | **PASS** |
| **T-12** | Sensitive Finance Masking | Spoken financial summaries | Rupee amounts masked in spoken output; `allowFinanceVoice: false` by default | **PASS** |
| **T-13** | Phase 61 Notification Pipeline | Room DB, WorkManager, and AI Tool | 10/10 stages active; `get_phone_notifications` executes cleanly | **PASS** |
| **T-14** | Phase 62.1 Heartbeat Telemetry | Telemetry semantics & Redis rate limiting | Distinct `lastSeenAt`; HTTP 429 returned on rapid heartbeats | **PASS** |
| **T-15** | Jest Notification Capability Suite | Run automated test suite | `test/notification-capability.spec.ts`: **5 PASSED / 5 TOTAL** | **PASS** |
