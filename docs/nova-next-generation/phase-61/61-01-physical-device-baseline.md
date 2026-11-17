# 61-01 — Physical Device & Runtime Baseline Report

**Execution Date:** 2026-11-17T11:00:50+05:30  
**Target Branch:** `feature/unified-android-apk`  
**Git HEAD Commit:** `a65bd76ff1159bd2256bb6ab3740c212b8bb378c`  
**Certification Engineer:** Principal Android Systems Engineer & Mobile QA Lead  

---

## 1. Physical Device Specifications

- **Device Model:** Vivo / iQOO I2305 (`I2305i`)
- **Android OS Version:** Android 16 (`ro.build.version.release = 16`)
- **SDK / API Level:** API Level 36 (`ro.build.version.sdk = 36`)
- **ADB Connection Mode:** Wireless Debugging (`_adb-tls-connect._tcp`) over local subnet
- **Endpoint Address:** `192.168.0.3:41639`
- **Transport ID:** `15`

---

## 2. Package Installation & Verification

- **Package Name:** `com.nova.companion`
- **Installed APK Artifact:** `nova-unified-debug-apk` from GitHub Actions Run `43724591594` (Head SHA `a65bd76`)
- **Version Code:** `1` (`targetSdk = 35`, `minSdk = 26`)
- **Version Name:** `1.0.0`
- **Installation Status:** Verified on device via `pm list packages` and `dumpsys package com.nova.companion`:
  - `firstInstallTime: 2026-11-17 11:00:50`
  - `lastUpdateTime: 2026-11-17 11:00:50`

---

## 3. OS Permission & Notification Listener Binding State

- **System Setting:** `enabled_notification_listeners`
- **Command Output:**
  ```text
  com.nova.companion/com.nova.companion.service.NovaNotificationListenerService
  ```
- **Live Logcat Confirmation:**
  ```text
  11-17 11:03:20.532 13747 13747 I NovaNotificationListener: NotificationListenerService connected and active
  ```
