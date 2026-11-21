package com.nova.companion.notification.engine

import android.app.Notification
import android.app.PendingIntent
import android.app.RemoteInput
import android.content.Context
import android.os.Bundle
import android.service.notification.StatusBarNotification
import android.util.Log

data class ParsedNotificationEvent(
    val id: String,
    val packageName: String,
    val appName: String,
    val sender: String,
    val summary: String,
    val category: String,
    val occurredAt: String,
    val postTime: Long,
    val replyAction: Notification.Action?,
    val remoteInput: RemoteInput?
)

object NotificationParser {

    private const val TAG = "NotificationParser"

    fun parse(context: Context, sbn: StatusBarNotification): ParsedNotificationEvent? {
        val packageName = sbn.packageName ?: return null
        val notification = sbn.notification ?: return null
        val extras = notification.extras ?: Bundle()

        val rawTitle = extras.getString(Notification.EXTRA_TITLE)
            ?: extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
            ?: ""

        val rawText = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            ?: ""

        if (rawTitle.isBlank() && rawText.isBlank()) {
            return null
        }

        val pm = context.packageManager
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

        // Discover RemoteInput Reply Action from notification actions
        var replyAction: Notification.Action? = null
        var remoteInput: RemoteInput? = null

        val actions = notification.actions
        if (!actions.isNullOrEmpty()) {
            for (action in actions) {
                val inputs = action.remoteInputs
                if (!inputs.isNullOrEmpty()) {
                    for (input in inputs) {
                        if (input.allowFreeFormInput || action.title?.toString()?.contains("Reply", ignoreCase = true) == true) {
                            replyAction = action
                            remoteInput = input
                            break
                        }
                    }
                }
                if (replyAction != null) break
            }
        }

        val eventId = "${packageName}-${sbn.id}-${sbn.postTime}"

        return ParsedNotificationEvent(
            id = eventId,
            packageName = packageName,
            appName = appName,
            sender = rawTitle.trim(),
            summary = rawText.trim(),
            category = category,
            occurredAt = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.format(java.util.Date(sbn.postTime)),
            postTime = sbn.postTime,
            replyAction = replyAction,
            remoteInput = remoteInput
        )
    }
}
