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

