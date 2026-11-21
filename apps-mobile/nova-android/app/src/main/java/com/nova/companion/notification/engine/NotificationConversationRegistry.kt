package com.nova.companion.notification.engine

import android.app.Notification
import android.app.RemoteInput
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import java.util.concurrent.ConcurrentHashMap

data class NotificationReplyContext(
    val eventId: String,
    val packageName: String,
    val appName: String,
    val sender: String,
    val summary: String,
    val timestamp: Long,
    val replyAction: Notification.Action,
    val remoteInput: RemoteInput
)

object NotificationConversationRegistry {

    private const val TAG = "ConversationRegistry"
    private val contextsBySender = ConcurrentHashMap<String, NotificationReplyContext>()
    private val contextsByPackage = ConcurrentHashMap<String, NotificationReplyContext>()
    private val allContexts = ConcurrentHashMap<String, NotificationReplyContext>()

    @Volatile
    private var lastContext: NotificationReplyContext? = null

    fun registerNotification(
        eventId: String,
        packageName: String,
        appName: String,
        sender: String,
        summary: String,
        replyAction: Notification.Action?,
        remoteInput: RemoteInput?
    ) {
        if (replyAction == null || remoteInput == null) return

        val ctx = NotificationReplyContext(
            eventId = eventId,
            packageName = packageName,
            appName = appName,
            sender = sender,
            summary = summary,
            timestamp = System.currentTimeMillis(),
            replyAction = replyAction,
            remoteInput = remoteInput
        )

        allContexts[eventId] = ctx
        if (sender.isNotBlank()) {
            contextsBySender[sender.lowercase().trim()] = ctx
        }
        contextsByPackage[packageName] = ctx
        lastContext = ctx

        Log.i(TAG, "Registered reply context for [$appName] from sender: '$sender'")
    }

    fun getLastContext(): NotificationReplyContext? = lastContext

    fun findContextForSender(senderQuery: String): NotificationReplyContext? {
        val q = senderQuery.lowercase().trim()
        val exact = contextsBySender[q]
        if (exact != null) return exact

        // Fuzzy / substring match
        return contextsBySender.entries.firstOrNull { it.key.contains(q) || q.contains(it.key) }?.value
    }

    fun executeReply(context: Context, replyContext: NotificationReplyContext, replyMessage: String): Boolean {
        try {
            val action = replyContext.replyAction
            val remoteInput = replyContext.remoteInput
            val intent = Intent()
            val bundle = Bundle()

            bundle.putCharSequence(remoteInput.resultKey, replyMessage)
            RemoteInput.addResultsToIntent(arrayOf(remoteInput), intent, bundle)

            action.actionIntent.send(context, 0, intent)
            Log.i(TAG, "Successfully dispatched voice reply to [${replyContext.appName} / ${replyContext.sender}]")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to execute RemoteInput reply", e)
            return false
        }
    }
}
