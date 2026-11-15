# 07 — Root Cause & Defect Register

**Date:** 2026-11-15  
**Audit Scope:** End-to-End Android Notification Pipeline  

---

## Defect Register

| Defect ID | Severity | Component | Location | Description & Root Cause |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | **P0 (Critical)** | Android Companion | `NovaNotificationListenerService.kt:33` | **Missing Notification Dispatch Logic:** The service captures notifications and runs `PrivacyFilter`, but line 33 is an empty comment. No network call or worker is ever executed to transmit events. |
| **DEF-02** | **P0 (Critical)** | Android Companion | `apps-mobile/nova-android/` | **Missing Networking Stack & Client:** `NovaApiService.kt` is an empty interface with 0 methods. No Retrofit/OkHttp client exists to call `POST /api/v1/mobile/events`. |
| **DEF-03** | **P0 (Critical)** | Architecture | Mobile Companion Pairing | **Unpaired Device State:** Backend `ingestEvent()` requires a `PAIRED` device in PostgreSQL. The physical device has never executed `initiatePairing` and `confirmPairing`, so any incoming event would be rejected with `401 Unauthorized`. |
| **DEF-04** | **P1 (High)** | Android Companion | `NovaNotificationListenerService.kt` | **Missing Lifecycle Callbacks:** `onListenerConnected()` and `onListenerDisconnected()` are not implemented, leaving the system unable to track listener connectivity state. |
| **DEF-05** | **P1 (High)** | Web / Deployment | `apps/web/` | **Production Frontend Drift:** The active Render deployment does not include `window.NovaAndroidBridge.syncAuthSession()` bindings, so the Android app never receives the user's auth token in `SecureSessionManager`. |
| **DEF-06** | **P2 (Medium)** | Android Companion | `apps-mobile/nova-android/` | **No Offline Queueing:** No Room database or WorkManager worker is implemented for offline buffering when the device is disconnected from the network. |
