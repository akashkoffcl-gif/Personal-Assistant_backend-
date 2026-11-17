# 02 — Unified Device Permissions & Capabilities Implementation

**Project:** NOVA Personal AI Companion  
**Document:** Phase B & C Native Capability Controls  
**Target Platform:** Android 16 / API 36  
**Date:** 2026-11-17  

---

### 1. Unified Permission Center Component (`DevicePermissionsManager.tsx`)
Created a dedicated diagnostic and permission control center located in:
**Settings → Device Permissions & Capabilities**

#### Features Implemented:
1. **Microphone (`RECORD_AUDIO`):**
   - Displays real-time permission status: `Granted` vs `Denied`.
   - Triggers native `requestMicrophonePermission()` bridge callback.
   - Provides deep link to system App Settings (`openAppSettings()`) if permanently denied.
   - Restricts voice service activation until microphone permission is satisfied.

2. **Notifications (`POST_NOTIFICATIONS`):**
   - Implements Android 13+ (API 33-36) runtime permission inspection.
   - Triggers `requestNotificationPermission()` via native activity launcher.
   - Distinguishes system notification delivery from Web Push subscriptions.

3. **Notification Listener Service (`NotificationListenerService`):**
   - Inspects `NotificationManagerCompat.getEnabledListenerPackages()`.
   - Displays real-time connection state (`Active & Synced` vs `Access Needed`).
   - One-tap button to open system `ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS`.

4. **Battery Optimization (Doze):**
   - Inspects `PowerManager.isIgnoringBatteryOptimizations()`.
   - Direct shortcut to `ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`.

5. **Native Voice Foreground Service Controller:**
   - Reports exact state: `DISABLED`, `READY`, `LISTENING`, `PROCESSING`, `RESPONDING`, `ERROR`.
   - Single-tap `Start Voice Foreground Service` and `Stop Voice Service`.
   - Independent `Wake-Word Spotting` toggle for `"Hey Nova"` / `"Jarvis"`.
   - Truthful OS architecture callout documenting software keyword spotting and Android 16 Doze boundaries.

---

### 2. Notification Center Remediation (`NotificationCenterModal.tsx`)
- Renamed "Foreground Voice Announcements" to "In-App Spoken Announcements" with clear badge "TTS Preference".
- Added dedicated row for "Native Voice Foreground Service" with direct one-tap navigation to the **Permission Center**.
- Resolved false-positive "Active" badge when underlying microphone service is halted.
- Preserved privacy filtering: Sensitive financial figures (`allowFinanceVoice: false`) remain muted by default.
