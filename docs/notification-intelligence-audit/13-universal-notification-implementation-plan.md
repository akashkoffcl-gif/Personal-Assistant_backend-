# 13 — Universal Multi-Application Notification Intelligence Implementation Plan

**Date:** 2026-11-15  
**Auditor/Architect:** Principal Android Engineer, Senior NestJS Architect, Next.js & Mobile Security Lead  
**Branch:** `feature/unified-android-apk`  
**Baseline Commit:** `5764b9d`  
**Physical Test Device:** iQOO I2305 (Android 16 / API 36)  

---

## 1. Executive Summary & Defect Verification

A rigorous audit of the current codebase and live physical device confirms:
1. **The physical device (`I2305`) is connected, paired via ADB, and currently running the NOVA companion.**
2. **Defect 1 Verified:** `NovaNotificationListenerService.kt` captures notifications from any allowed package, but line 33 is an empty comment with zero dispatch or persistence code.
3. **Defect 2 Verified:** `NovaApiService.kt` is a blank interface. No Retrofit/OkHttp client is constructed.
4. **Defect 3 Verified:** Device pairing has never been initiated from the mobile app; the backend database contains 0 paired devices.
5. **Defect 4 Verified:** Missing dynamic application approval registry (`AppApprovalRegistry.kt`). All non-sensitive apps currently pass default filtering without user consent.
6. **Defect 5 Verified:** No offline queue or retry mechanism (Room database or WorkManager).
7. **Defect 6 Verified:** The frontend settings and notification center lack application-level allowlist management and app-based filtering.

---

## 2. Architecture & Design Specification

### 2.1 Android Application Architecture (`apps-mobile/nova-android/`)
1. **`AppApprovalRegistry.kt`**:
   - Queries `PackageManager` for installed launchable packages (`Intent(Intent.ACTION_MAIN, Intent.CATEGORY_LAUNCHER)`).
   - Enforces default-deny: Any discovered application defaults to `isApproved = false`.
   - Hardcodes mandatory security exclusions: Banking, UPI (`com.phonepe.app`, `in.org.npci.upiapp`, `com.google.android.apps.nbu.paisa.user`), authenticators (`com.authy.authy`, `com.google.android.apps.authenticator2`), and password managers. These can NEVER be enabled by user toggle.
   - Stores approved package sets in `nova_app_approval_prefs` SharedPreferences.
2. **`NovaApiService.kt` & Retrofit Client**:
   - Define Retrofit endpoints:
     - `POST /api/v1/mobile/pair/initiate`
     - `POST /api/v1/mobile/pair/confirm`
     - `POST /api/v1/mobile/events`
     - `POST /api/v1/mobile/permissions`
   - Create singleton `NovaApiClient` with OkHttpClient attaching `Authorization: Bearer <token>` from `SecureSessionManager`.
3. **Room Database & Offline Queue (`data/local/` & `worker/`)**:
   - `NotificationEventEntity`: `id`, `deviceId`, `sourceApp`, `appName`, `category`, `title`, `summary`, `occurredAt`, `isSynced`.
   - `NotificationEventDao`: Insert, query unsynced, mark synced.
   - `NotificationSyncWorker`: Extends `CoroutineWorker`. Reads unsynced events, posts to backend with exponential backoff and network constraints.
4. **`NovaNotificationListenerService.kt`**:
   - In `onNotificationPosted(sbn)`:
     1. Verify `AppApprovalRegistry.isApproved(sbn.packageName)` (returns false for unapproved or blocked apps).
     2. Apply `PrivacyFilter.sanitizeText()` to title and body (redacting OTPs/CCs).
     3. Insert into Room DB.
     4. Enqueue WorkManager `NotificationSyncWorker` (with immediate execution if online).
5. **`NovaNativeBridge.kt`**:
   - Expose `getInstalledEligibleApps()` (returns JSON array of installed apps with icons, names, and approval states).
   - Expose `setAppApproval(packageName, approved)`.
   - Expose `autoRegisterAndPairDevice(authToken, userId)` to automatically complete device pairing handshake.

### 2.2 Backend Architecture (`apps/api/`)
1. **Existing Endpoints Reused**:
   - `POST /api/v1/mobile/pair/initiate`
   - `POST /api/v1/mobile/pair/confirm`
   - `POST /api/v1/mobile/events`
   - `GET /api/v1/mobile/events`
   - `POST /api/v1/mobile/permissions`
2. **Database Schema**:
   - `MobileDevice`, `MobileEvent`, `MobilePermission` already exist in `schema.prisma`. No destructive migrations required.
3. **AI Context & Tool Integration**:
   - `get_phone_notifications` in `jarvis-tool-registry.service.ts` already supports filtering by `appName`.
   - Update prompt grounding to present multi-app notification summaries.

### 2.3 Next.js Frontend Architecture (`apps/web/`)
1. **Notification Settings / App Allowlist Management**:
   - Under Settings / Mobile Companion, show installed apps discovered from the native bridge.
   - User toggle to approve/revoke apps immediately.
2. **Notification Center (`NotificationCenterModal.tsx`)**:
   - Dynamic application filter pills (`All`, `WhatsApp`, `Telegram`, `Amazon Music`, `YouTube`, etc.).
   - Search by notification content.
   - Application-specific notification timeline.

---

## 3. Step-by-Step Implementation Sequence

1. **Step 1: Android Local Storage & Approval Registry**:
   - Create `AppApprovalRegistry.kt`.
   - Create Room database `NotificationDatabase.kt` and `NotificationEventDao.kt`.
2. **Step 2: Android Networking & Synchronization**:
   - Implement `NovaApiService.kt` and `NovaApiClient.kt`.
   - Implement `NotificationSyncWorker.kt`.
   - Update `NovaNotificationListenerService.kt` to bind the complete pipeline.
3. **Step 3: Android Native Bridge & Automatic Device Pairing**:
   - Update `NovaNativeBridge.kt` with app discovery, approval toggles, and automatic device pairing.
4. **Step 4: Frontend UI Enhancements**:
   - Add App Allowlist Manager to `apps/web/src/components/NotificationCenterModal.tsx` and Settings.
   - Add dynamic app pills in Notification Center.
5. **Step 5: Testing & Verification**:
   - Compile Android APK via GitHub Actions.
   - Deploy/Install on connected physical device (`I2305`).
   - Trigger live notifications from multiple apps and verify end-to-end ingestion and AI retrieval.
