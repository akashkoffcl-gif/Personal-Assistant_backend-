# 03 — Native Android Bridge Contracts & Permissions Architecture

**Project:** NOVA Personal AI Companion  
**Document:** Phase E Native Bridge & Lifecycle Synchronization  
**Date:** 2026-11-17  

---

### 1. Updated `NovaNativeBridge` Contract
The following JavaScript interface methods are exposed to the WebView under `window.NovaAndroidBridge`:

| Bridge Method | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `getDevicePermissionStatus()` | None | JSON String | Returns `{recordAudioGranted, postNotificationsGranted, notificationListenerGranted, batteryOptimizationIgnored, sdkInt}` |
| `requestMicrophonePermission()` | None | void | Launches `ActivityResultContracts.RequestPermission()` for `Manifest.permission.RECORD_AUDIO` |
| `requestNotificationPermission()` | None | void | Launches `ActivityResultContracts.RequestPermission()` for `Manifest.permission.POST_NOTIFICATIONS` on API 33+ |
| `openAppSettings()` | None | void | Starts `ACTION_APPLICATION_DETAILS_SETTINGS` targeting `com.nova.companion` |
| `openNotificationAccessSettings()` | None | void | Starts `ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS` or general listener settings |
| `openBatteryOptimizationSettings()`| None | void | Starts `ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS` |
| `getVoiceStatus()` | None | JSON String | Returns `{state, isWakeWordActive, isTtsActive, isRecognitionAvailable, lastTranscript, lastError}` |
| `startVoiceForegroundService()` | None | boolean | Launches `NovaVoiceForegroundService` with `microphone` type and ongoing notification |
| `stopVoiceForegroundService()` | None | boolean | Halts foreground service and releases microphone resources |
| `setWakeWordEnabled(boolean)` | `enabled` | boolean | Toggles active acoustic keyword spotting loop |

---

### 2. Activity Lifecycle & Window Focus Synchronization
- `MainActivity.kt` registers distinct activity result launchers:
  - `requestAudioPermissionLauncher`
  - `requestNotificationPermissionLauncher`
- `DevicePermissionsManager.tsx` binds a `window.addEventListener('focus', ...)` listener in tandem with a 4-second polling timer.
- Returning from Android system Settings automatically triggers state re-inspection, reflecting updated permission grants in the UI within milliseconds without requiring an application reload.
