# 02 — Android Notification Listener Service Audit Report

**Date:** 2026-11-15  
**Target Class:** `com.nova.companion.service.NovaNotificationListenerService`  
**Device:** Physical Device `I2305` (Android 16 / API 36)  

---

## 1. Service Declaration & Permissions

In `apps-mobile/nova-android/app/src/main/AndroidManifest.xml`:
```xml
<service
    android:name=".service.NovaNotificationListenerService"
    android:exported="false"
    android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
    <intent-filter>
        <action android:name="android.service.notification.NotificationListenerService" />
    </intent-filter>
</service>
```

**Verification:**
- Permission `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` is correctly declared on the service tag.
- The intent filter action `android.service.notification.NotificationListenerService` matches the Android framework requirement.
- Running `adb shell dumpsys notification` confirms the service is bound by system_server:
  ```text
  ComponentInfo{com.nova.companion/com.nova.companion.service.NovaNotificationListenerService} (user 0): android.service.notification.INotificationListener$Stub$Proxy@34af71b
  ```

---

## 2. Service Implementation & Lifecycle Audit

The entire implementation of `NovaNotificationListenerService.kt` consists of:
```kotlin
package com.nova.companion.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class NovaNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "NovaNotificationListener"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName ?: return

        // 1. Strict On-Device Privacy Filtering
        if (!PrivacyFilter.isAllowed(packageName)) {
            Log.d(TAG, "Notification from excluded package filtered: $packageName")
            return
        }

        val extras = sbn.notification.extras
        val rawTitle = extras.getString("android.title") ?: ""
        val rawText = extras.getCharSequence("android.text")?.toString() ?: ""

        val title = PrivacyFilter.sanitizeText(rawTitle)
        val summary = PrivacyFilter.sanitizeText(rawText)

        Log.i(TAG, "Permitted Notification: [$packageName] $title - $summary")
        // Dispatches sanitized event via Retrofit / Worker queue to POST /api/v1/mobile/events
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}
```

### Critical Findings:
1. **Line 33 is a code comment:** `// Dispatches sanitized event via Retrofit / Worker queue to POST /api/v1/mobile/events`. No dispatch code was ever written.
2. **Missing Lifecycle Methods:** Neither `onListenerConnected()` nor `onListenerDisconnected()` is implemented. The service has no mechanism to update capability status or notify the app that it has connected to the notification stream.
3. **Missing WorkManager / Network Stack:** No queue, database, or HTTP call exists in the service. The notification is received, filtered, printed to Logcat, and immediately discarded from memory.
