package com.nova.companion.service

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.nova.companion.data.local.AppApprovalRegistry
import com.nova.companion.data.local.NotificationDatabase
import com.nova.companion.data.local.NotificationEventEntity
import com.nova.companion.data.local.SecureSessionManager
import com.nova.companion.worker.NotificationSyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

class NovaNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "NovaNotificationListener"
    }

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "NotificationListenerService connected and active")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "NotificationListenerService disconnected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName ?: return

        // 1. Mandatory Security Exclusion Check
        if (AppApprovalRegistry.isSecurityBlocked(packageName)) {
            Log.d(TAG, "Notification excluded by mandatory security policy: $packageName")
            return
        }

        // 2. User Approval Check (Privacy-first: only approved applications allowed)
        if (!AppApprovalRegistry.isApproved(this, packageName)) {
            Log.d(TAG, "Notification from unapproved application rejected: $packageName")
            return
        }

        // 3. Extract Notification Metadata safely
        val notification = sbn.notification ?: return
        val extras = notification.extras

        val rawTitle = extras.getString(Notification.EXTRA_TITLE)
            ?: extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
            ?: ""

        val rawText = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            ?: ""

        // Skip blank notifications
        if (rawTitle.isBlank() && rawText.isBlank()) {
            return
        }

        // 4. Privacy Sanitization (Redact OTPs, verification PINs, payment card patterns)
        val sanitizedTitle = PrivacyFilter.sanitizeText(rawTitle)
        val sanitizedSummary = PrivacyFilter.sanitizeText(rawText)

        // Resolve user-friendly app display name
        val pm = packageManager
        val appName = try {
            val appInfo = pm.getApplicationInfo(packageName, 0)
            pm.getApplicationLabel(appInfo).toString()
        } catch (_: Exception) {
            packageName
        }

        // Determine category
        val category = when {
            packageName.contains("whatsapp") || packageName.contains("telegram") || packageName.contains("chat") -> "COMMUNICATION"
            packageName.contains("mail") || packageName.contains("gmail") -> "COMMUNICATION"
            packageName.contains("music") || packageName.contains("youtube") -> "MEDIA"
            packageName.contains("calendar") -> "CALENDAR"
            else -> "ALERT"
        }

        val deviceId = SecureSessionManager.getDeviceId(this) ?: "local-device"
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val occurredAt = isoFormat.format(Date(sbn.postTime))
        val eventId = "${packageName}-${sbn.id}-${sbn.postTime}"

        Log.i(TAG, "Approved notification captured: [$appName] (Package: $packageName)")

        // 4. Parse notification and register RemoteInput reply context if available
        val parsedEvent = com.nova.companion.notification.engine.NotificationParser.parse(this, sbn)
        if (parsedEvent != null) {
            com.nova.companion.notification.engine.NotificationConversationRegistry.registerNotification(
                eventId = parsedEvent.id,
                packageName = parsedEvent.packageName,
                appName = parsedEvent.appName,
                sender = parsedEvent.sender,
                summary = parsedEvent.summary,
                replyAction = parsedEvent.replyAction,
                remoteInput = parsedEvent.remoteInput
            )
        }

        // 5. Trigger User-Visible Alert and Optional Voice Announcement
        com.nova.companion.notification.NotificationAlertDispatcher.dispatchAlert(
            context = applicationContext,
            packageName = packageName,
            appName = appName,
            sanitizedTitle = sanitizedTitle,
            sanitizedSummary = sanitizedSummary
        )

        // 6. Persist to local Room Queue and Trigger Background Sync Worker
        serviceScope.launch {
            try {
                val db = NotificationDatabase.getInstance(applicationContext)
                val entity = NotificationEventEntity(
                    id = eventId,
                    deviceId = deviceId,
                    sourceApp = packageName,
                    appName = appName,
                    category = category,
                    title = sanitizedTitle,
                    summary = sanitizedSummary,
                    occurredAt = occurredAt,
                    isSynced = false
                )
                db.notificationEventDao().insertEvent(entity)

                // Enqueue immediate / constrained sync
                NotificationSyncWorker.enqueue(applicationContext)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to persist notification event locally", e)
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}
