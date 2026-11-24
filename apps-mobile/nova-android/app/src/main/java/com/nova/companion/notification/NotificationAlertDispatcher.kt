package com.nova.companion.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.nova.companion.MainActivity
import com.nova.companion.voice.NovaSpeechSynthesisManager
import java.util.concurrent.ConcurrentHashMap

object NotificationAlertDispatcher {

    private const val TAG = "NotificationAlert"
    const val CHANNEL_ID = "nova_companion_alerts"
    private const val CHANNEL_NAME = "NOVA Companion Alerts"
    private const val CHANNEL_DESC = "User-facing alerts for intercepted assistant events and messages"

    // Deduplication window: 5 seconds per source package + title
    private val recentAlerts = ConcurrentHashMap<String, Long>()
    private const val DEDUP_WINDOW_MS = 5000L

    // Optional shared speech synthesizer instance for announcements
    @Volatile
    private var sharedTts: NovaSpeechSynthesisManager? = null

    fun initializeTts(context: Context) {
        com.nova.companion.voice.arbitration.SpeechArbitrator.getInstance(context)
    }

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                ?: return

            val existingChannel = manager.getNotificationChannel(CHANNEL_ID)
            if (existingChannel == null) {
                val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()

                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = CHANNEL_DESC
                    enableLights(true)
                    enableVibration(true)
                    setSound(soundUri, audioAttributes)
                    setShowBadge(true)
                }
                manager.createNotificationChannel(channel)
                Log.i(TAG, "Notification channel created: $CHANNEL_ID")
            }
        }
    }

    fun dispatchAlert(
        context: Context,
        packageName: String,
        appName: String,
        sanitizedTitle: String,
        sanitizedSummary: String,
        sbn: android.service.notification.StatusBarNotification? = null
    ) {
        try {
            // 1. WhatsApp-Specific Strict Classifier (Phase 69.5.3)
            val isWhatsApp = com.nova.companion.notification.whatsapp.WhatsAppNotificationClassifier.isWhatsAppPackage(packageName)
            var whatsAppDetails: com.nova.companion.notification.whatsapp.WhatsAppNotificationClassifier.ClassificationResult? = null

            if (isWhatsApp && sbn != null) {
                whatsAppDetails = com.nova.companion.notification.whatsapp.WhatsAppNotificationClassifier.classify(sbn)
                if (!whatsAppDetails.isEligibleForSpeech) {
                    Log.d(TAG, "WhatsApp notification rejected for speech by strict classifier: ${whatsAppDetails.rejectionReason}")
                }
            }

            // 1. Check user preferences
            if (!NotificationAlertPreferences.isAlertsEnabled(context)) {
                Log.d(TAG, "Alerts disabled by user preference")
                return
            }

            // 2. Check Android POST_NOTIFICATIONS permission
            if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
                Log.w(TAG, "App notifications are disabled at Android system level")
                return
            }

            // 3. Deduplication check
            val dedupKey = "$packageName:$sanitizedTitle"
            val now = System.currentTimeMillis()
            val lastTime = recentAlerts[dedupKey] ?: 0L
            if (now - lastTime < DEDUP_WINDOW_MS) {
                Log.d(TAG, "Duplicate alert suppressed within dedup window: $dedupKey")
                return
            }
            recentAlerts[dedupKey] = now

            // Clean up stale entries periodically
            if (recentAlerts.size > 50) {
                recentAlerts.entries.removeIf { now - it.value > DEDUP_WINDOW_MS * 2 }
            }

            // Ensure channel exists
            createNotificationChannel(context)

            // 4. Construct privacy-respecting content
            val title = if (NotificationAlertPreferences.isSenderAnnouncementEnabled(context) && sanitizedTitle.isNotBlank()) {
                "New message from $sanitizedTitle"
            } else {
                "New notification from $appName"
            }

            val content = if (NotificationAlertPreferences.isContentPreviewEnabled(context) && sanitizedSummary.isNotBlank()) {
                sanitizedSummary
            } else {
                "NOVA captured a message from $appName"
            }

            // 5. Intent to launch app
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("source_package", packageName)
                putExtra("app_name", appName)
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                packageName.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notificationBuilder = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(content)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)

            if (!NotificationAlertPreferences.isSoundEnabled(context)) {
                notificationBuilder.setSilent(true)
            }

            val notificationManager = NotificationManagerCompat.from(context)
            val notificationId = (packageName.hashCode() xor now.toInt()) and 0x7FFFFFFF
            notificationManager.notify(notificationId, notificationBuilder.build())
            Log.i(TAG, "Dispatched user-visible alert for [$appName] (ID: $notificationId)")

            // 6. Voice announcement handled via intelligent conversation manager
            if (NotificationAlertPreferences.isVoiceAnnouncementEnabled(context)) {
                // If it's WhatsApp and not eligible, do NOT speak
                if (isWhatsApp && whatsAppDetails?.isEligibleForSpeech == false) {
                    Log.d(TAG, "Voice announcement skipped: WhatsApp event is not eligible for speech.")
                    return
                }

                val effectiveSender = whatsAppDetails?.sender ?: sanitizedTitle
                val effectiveSummary = whatsAppDetails?.messageBody ?: sanitizedSummary

                com.nova.companion.notification.engine.NotificationConversationManager.onNotificationReceived(
                    context = context,
                    eventId = whatsAppDetails?.messageIdentity ?: (dedupKey + "_" + now),
                    packageName = packageName,
                    appName = appName,
                    sender = effectiveSender,
                    summary = effectiveSummary,
                    isGroup = whatsAppDetails?.isGroup ?: false,
                    conversationTitle = whatsAppDetails?.conversationTitle
                )
            }

        } catch (e: Exception) {
            Log.e(TAG, "Failed to dispatch notification alert", e)
        }
    }

    private fun speakAnnouncement(context: Context, appName: String, sender: String, summary: String = "") {
        try {
            val owner = com.nova.companion.voice.identity.VoiceIdentityManager.getOwnerName(context)
            val style = NotificationAlertPreferences.getAnnouncementStyle(context)

            val announcement = when (style.uppercase()) {
                "FULL" -> {
                    if (sender.isNotBlank() && summary.isNotBlank()) {
                        "$owner, you have a $appName message from $sender. They say: $summary"
                    } else if (sender.isNotBlank()) {
                        "$owner, $sender sent you a message on $appName"
                    } else {
                        "$owner, you have a new $appName notification"
                    }
                }
                "SUMMARY" -> {
                    if (sender.isNotBlank()) {
                        "$owner, new message from $sender on $appName"
                    } else {
                        "$owner, new $appName notification received"
                    }
                }
                "MINIMAL" -> {
                    if (sender.isNotBlank()) {
                        "New message from $sender"
                    } else {
                        "New $appName alert"
                    }
                }
                "PRIVATE" -> {
                    "New notification received"
                }
                else -> {
                    "$owner, you have a new $appName notification from $sender"
                }
            }

            // Route through central SpeechArbitrator with NOTIFICATION_ANNOUNCEMENT priority
            val utterance = com.nova.companion.voice.arbitration.ArbitratedUtterance(
                id = "notif_announcement_${System.currentTimeMillis()}",
                text = announcement,
                priority = com.nova.companion.voice.arbitration.UtterancePriority.NOTIFICATION_ANNOUNCEMENT
            )
            com.nova.companion.voice.arbitration.SpeechArbitrator.getInstance(context).enqueueUtterance(utterance)
            Log.i(TAG, "Queued arbitrated voice announcement: \"$announcement\"")
        } catch (e: Exception) {
            Log.w(TAG, "Could not queue voice announcement", e)
        }
    }
}
