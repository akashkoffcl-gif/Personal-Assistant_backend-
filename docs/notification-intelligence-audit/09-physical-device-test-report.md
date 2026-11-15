# 09 — Physical-Device Live Test & Diagnostic Evidence Report

**Date:** 2026-11-15  
**Auditor:** Principal Android Engineer & QA Automation Lead  
**Physical Device:** `I2305` (Android 16 / API Level 36)  
**Package:** `com.nova.companion` (Version 1.0.0)  

---

## 1. ADB Connection & Package Verification

```powershell
d:\PT\platform-tools\adb.exe devices -l
# List of devices attached
# adb-10BF2413RD003BT-1KXSF1._adb-tls-connect._tcp device product:I2305i model:I2305 device:I2305 transport_id:2
```

```powershell
d:\PT\platform-tools\adb.exe shell pm list packages | findstr /i "nova"
# package:com.nova.companion
```

---

## 2. Notification Listener Permission & Registration

Executed command:
```powershell
d:\PT\platform-tools\adb.exe shell dumpsys notification --noredact | findstr /i "com.nova.companion"
```

Verified Output:
```text
AppSettings: com.nova.companion (10296) importance=DEFAULT userSet=true moreNotificationsEnabled=false isShowHeadsUp=true isShowKeyguard=true keyguardDetailsType=3
com.google.android.projection.gearhead/...:com.nova.companion/com.nova.companion.service.NovaNotificationListenerService:... (user: 0 isPrimary: true)
userId=0 value={..., com.nova.companion/com.nova.companion.service.NovaNotificationListenerService, ...}
ComponentInfo{com.nova.companion/com.nova.companion.service.NovaNotificationListenerService} (user 0): android.service.notification.INotificationListener$Stub$Proxy@34af71b
```
**Conclusion:** The Android OS recognizes `com.nova.companion` as an authorized notification listener and has established an active IPC binder proxy to `NovaNotificationListenerService`.

---

## 3. Real-Time Notification Extraction in Logcat

Executed command:
```powershell
d:\PT\platform-tools\adb.exe logcat -d -v time -s NovaNotificationListener:*
```

Captured Live Evidence:
```text
11-15 15:55:22.497 I NovaNotificationListener: Permitted Notification: [com.amazon.mp3] Aeroplane (From "Scene") - Sushin Shyam, Gana Bala & Rajpriyan
11-15 15:55:34.404 I NovaNotificationListener: Permitted Notification: [com.google.android.youtube]  - Moondru Mudichu - Best Scenes 1 | 14 Nov [CODE_REDACTED] | Tamil Serial | Sun TV
11-15 16:03:37.912 I NovaNotificationListener: Permitted Notification: [com.amazon.mp3] Galatta (From "Aavesham") - Sushin Shyam, PAAL DABBA & Vinayak Sasikumar
```

**Observation:**
- The listener actively catches notifications from installed applications.
- Privacy filtering is executing in real time.
- Redaction of numeric codes (`[CODE_REDACTED]`) is functioning properly.
- **Defect confirmed:** No network logs appear following these events because no transmission code exists.
