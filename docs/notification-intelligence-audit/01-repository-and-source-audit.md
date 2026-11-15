# 01 — Repository Discovery & Source Code Audit Report

**Date:** 2026-11-15  
**Auditor:** Principal Android Engineer, NestJS Backend Architect & Mobile Security Auditor  
**Branch:** `feature/unified-android-apk`  
**Commit:** `5f3c056`  
**Target Repository:** NOVA Personal AI Companion  

---

## 1. Executive Summary

This audit investigates the end-to-end Android notification intelligence pipeline of NOVA.
The user has granted Android Notification Access on the physical Android device (`I2305`, Android 16 / API 36).
However, NOVA does not process or expose phone notifications through the AI assistant or Notification Center.

Through direct source-code inspection and physical-device verification via ADB:
1. **The Android OS Notification Access listener is active, connected, and capturing notifications.**
2. **The notification listener service (`NovaNotificationListenerService.kt`) only logs the notification to Logcat with `Log.i()` and DOES NOT transmit it anywhere.**
3. **There is no HTTP client, no Retrofit/OkHttp network call, no WorkManager worker, and no Room database queue in the Android app.**
4. **Device pairing has never occurred between the physical device and the backend.** The backend database has zero paired devices for the user.
5. **The backend `MobileService.ingestEvent()` requires a `PAIRED` device record.** Without a paired `deviceId`, even if events were sent, the backend would return `401 Unauthorized`.
6. **The deployed production frontend on Render is an older build** that does not contain the native bridge sync calls.

---

## 2. Source-Code Inventory

### 2.1 Android Application (`apps-mobile/nova-android/`)
| Component | Declared / Exists | Actual Implementation Status |
| :--- | :--- | :--- |
| `AndroidManifest.xml` | Yes | Declares `NovaNotificationListenerService` with `BIND_NOTIFICATION_LISTENER_SERVICE` |
| `NovaNotificationListenerService.kt` | Yes | Implements `onNotificationPosted`. Calls `PrivacyFilter`, logs to Logcat. **Zero network calls or storage.** |
| `PrivacyFilter.kt` | Yes | Redacts OTPs, credit cards, blocks banks/authenticators. |
| `NovaApiService.kt` | Yes | **Empty placeholder interface (6 lines). No HTTP client.** |
| `SecureSessionManager.kt` | Yes | SharedPreferences helper for `auth_token` and `user_id`. Never populated. |
| `KeyStoreManager.kt` | Yes | Generates EC KeyPair in AndroidKeyStore for challenge signing. |
| `NovaNativeBridge.kt` | Yes | Exposes `getDeviceIdentity()`, `getNotificationCapabilityStatus()`, `syncAuthSession()`. |
| Room Entities / DAO | No | **Missing completely.** |
| WorkManager Worker | No | **Missing completely.** |

### 2.2 Backend (`apps/api/src/modules/mobile/`)
| Component | Status | Details |
| :--- | :--- | :--- |
| `mobile.controller.ts` | Complete | Endpoints: `POST /mobile/events`, `GET /mobile/events`, `POST /mobile/pair/initiate`, `POST /mobile/pair/confirm` |
| `mobile.service.ts` | Complete | Enforces device pairing check, duplicate suppression (60s), Prisma insertion into `MobileEvent` |
| `notification-capability.service.ts` | Complete | Evaluates `NO_DEVICE_PAIRED`, `PERMISSION_NOT_GRANTED`, `SYNC_FAILING`, `FULLY_CONNECTED` |
| `jarvis-tool-registry.service.ts` | Complete | Exposes `get_phone_notifications` tool querying `prisma.mobileEvent` |
| `ai.service.ts` | Complete | Maps notification queries to `get_phone_notifications` tool |

---

## 3. Physical Device Verification Evidence

- **Device Model:** `I2305`
- **Android OS:** Android 16 (API Level 36)
- **Package:** `com.nova.companion`
- **Active Dumpsys Notification:**
  ```text
  ComponentInfo{com.nova.companion/com.nova.companion.service.NovaNotificationListenerService} (user 0): android.service.notification.INotificationListener$Stub$Proxy@34af71b
  ```
- **Real-time Notification Captured in Logcat:**
  ```text
  11-15 16:03:37.912 I/NovaNotificationListener( 3502): Permitted Notification: [com.amazon.mp3] Galatta (From "Aavesham") - Sushin Shyam, PAAL DABBA & Vinayak Sasikumar
  ```
