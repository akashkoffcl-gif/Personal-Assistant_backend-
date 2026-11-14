# 03 — WEBVIEW & NATIVE BRIDGE SPECIFICATION
## Bidirectional JavaScript <-> Kotlin Communication Interface

**Author:** Principal Android Architect & Security Engineer  
**Interface Object Name:** `window.NovaAndroidBridge`  
**Date:** November 2026  

---

## 1. Security Architecture

1. **Origin Verification**: Every method call checks `view.url` against `TRUSTED_ORIGINS`. Any call originating from an external link or unverified redirect immediately throws a `SecurityException`.
2. **Schema & Argument Validation**: All payloads must be strictly typed JSON strings or primitive booleans/strings. No raw binary or executable code is transferred.
3. **No Database or System Privileges**: The bridge does not expose direct SQL or root/system level APIs.

---

## 2. API Contract: `NovaAndroidBridge`

### 2.1 Device Identity & Capability Status
- `isNativeApp(): boolean`
  - Returns `true` inside the unified APK, enabling the web app to display native status pills.
- `getDeviceIdentity(): string`
  - Returns JSON object with `deviceName`, `osVersion`, `appVersion`, and Keystore `publicKeyPem`.
- `getNotificationCapabilityStatus(): string`
  - Checks if `NotificationManagerCompat.getEnabledListenerPackages()` includes NOVA.
  - Returns `{ isGranted: boolean, isConnected: boolean, approvedAppsCount: number }`.

### 2.2 Permissions & Settings Navigation
- `openNotificationAccessSettings()`
  - Launches `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS` intent directly.
- `requestMicrophonePermission()`
  - Requests native Android runtime permission `RECORD_AUDIO`.

### 2.3 Session & Authentication Synchronization
- `syncAuthSession(token: string, userId: string)`
  - Stores JWT token securely in `EncryptedSharedPreferences` for background background syncing services (`NovaNotificationListenerService` and `WorkManager`).

### 2.4 Haptics & System Feedback
- `triggerHapticFeedback(pattern: string)`
  - Invokes `Vibrator` or `VibratorManager` (`CLICK`, `SUCCESS`, `WARNING`).

### 2.5 Native Digital Action Execution
- `openApp(packageName: string): boolean`
  - Launches approved package via `packageManager.getLaunchIntentForPackage`.
- `shareText(text: string, title: string)`
  - Fires native `Intent.ACTION_SEND` chooser.

---

## 3. Web Client TypeScript Definition

```typescript
declare global {
  interface Window {
    NovaAndroidBridge?: {
      isNativeApp: () => boolean;
      getDeviceIdentity: () => string;
      getNotificationCapabilityStatus: () => string;
      openNotificationAccessSettings: () => void;
      requestMicrophonePermission: () => void;
      syncAuthSession: (token: string, userId: string) => void;
      triggerHapticFeedback: (type: 'CLICK' | 'SUCCESS' | 'WARNING') => void;
      openApp: (packageName: string) => boolean;
      shareText: (text: string, title: string) => void;
    };
  }
}
```
