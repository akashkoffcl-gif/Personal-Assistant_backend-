# 01 — Native Permission & Capability Management Technical Audit

**Project:** NOVA Personal AI Companion  
**Document:** Phase A Architecture & Root Cause Audit  
**Target Hardware:** Vivo / iQOO I2305 (Android 16 / API 36)  
**Package:** `com.nova.companion`  
**Date:** 2026-11-17  

---

### 1. Root Cause Analysis of Permission & Capability State

A comprehensive audit of `MainActivity.kt`, `NovaNativeBridge.kt`, `NotificationCenterModal.tsx`, and `AIAssistantSettings.tsx` identified the following concrete root causes:

#### A. Missing Bridge Query for Comprehensive Runtime Permissions
- `NovaNativeBridge.kt` provided `getNotificationCapabilityStatus()` (which only checked `NotificationManagerCompat.getEnabledListenerPackages()`) and `getDeviceDiagnostics()`, but did **not** expose a unified method returning:
  1. `RECORD_AUDIO` permission status (Granted vs Denied vs Blocked).
  2. `POST_NOTIFICATIONS` runtime permission status (Android 13+ / API 33-36).
  3. `FOREGROUND_SERVICE_MICROPHONE` state.
  4. Battery optimization ignore state.
- Consequently, the Web UI had no mechanism to inspect actual device runtime permissions without polling fragmented endpoints.

#### B. Incomplete Permission Launcher Callbacks in `MainActivity.kt`
- `MainActivity.kt` only registered an activity result launcher for `RECORD_AUDIO`.
- `POST_NOTIFICATIONS` was never requested via runtime permission dialogs; on Android 13-16, notification permission was left in whatever default state the installer assigned without an in-app trigger.
- `MainActivity` did not pass a permission request callback for notifications into `UnifiedNovaWebView` and `NovaNativeBridge`.

#### C. Notification Center Semantic Disconnect
- In `NotificationCenterModal.tsx`:
  - "Web Push Notifications" checked browser service-worker push registration, not Android native notifications.
  - "Foreground Voice Announcements" inspected local storage key `assistant_voice_notifs.voiceEnabled`, displaying "Active" even when the native voice foreground service was stopped and microphone permission was denied.
  - User Settings lacked a dedicated "Device Permissions & Capabilities" tab, forcing users to rely solely on the "Mobile Companion" allowlist without direct diagnostic controls.

---

### 2. Required Architectural Remediation Plan

1. **Native Bridge Interface Expansion (`NovaNativeBridge.kt`):**
   - Add `getDevicePermissionStatus(): String`: Returns JSON containing boolean states for `RECORD_AUDIO`, `POST_NOTIFICATIONS`, `NOTIFICATION_LISTENER`, `BATTERY_OPTIMIZATIONS_IGNORED`, and can-request flags.
   - Add `requestNotificationPermission()`: Triggers runtime prompt on Android 13+ (API 33-36).
   - Add `openAppSettings()`: Deep-links to Android system Application Info (`Settings.ACTION_APPLICATION_DETAILS_SETTINGS`) when permissions are permanently denied.

2. **Android Activity Updates (`MainActivity.kt` & `UnifiedNovaWebView.kt`):**
   - Register permission launchers for both `RECORD_AUDIO` and `POST_NOTIFICATIONS`.
   - Wire launchers into `NovaNativeBridge` so JavaScript calls trigger real Android system permission dialogues.

3. **Unified Permission Center in Web UI (`DevicePermissionsManager.tsx`):**
   - Create a clean, authoritative component placed in **Settings → Device Permissions & Capabilities**.
   - Reflect real-time states: Microphone, Notifications, Listener Access, Battery Optimization, and Native Voice Foreground Service.
   - Include auto-refresh on window focus (when returning from system settings).

4. **Notification Center Modal Correction (`NotificationCenterModal.tsx`):**
   - Clearly distinguish between Android System Permissions, Native Foreground Voice Service runtime status, and in-browser Text-to-Speech preferences.
   - Prevent displaying "Active" when underlying native service is stopped or permissions are absent.
