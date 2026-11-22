package com.nova.companion.notification.engine

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.nova.companion.notification.NotificationAlertPreferences
import com.nova.companion.voice.arbitration.ArbitratedUtterance
import com.nova.companion.voice.arbitration.SpeechArbitrator
import com.nova.companion.voice.arbitration.UtterancePriority
import com.nova.companion.voice.identity.VoiceIdentityManager
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Single unit of notification context used for conversational batching and history.
 */
data class QueuedNotification(
    val eventId: String,
    val packageName: String,
    val appName: String,
    val sender: String,
    val summary: String,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Natural Notification Conversation Manager
 *
 * Implements intelligent window-based batching (3s initial, 2s extension, max 8s),
 * same-sender grouping, deduplication protection, conversational context history,
 * and natural human-like speech announcement generation.
 */
object NotificationConversationManager {

    private const val TAG = "NotifConvManager"

    // Configuration parameters
    private const val INITIAL_BATCH_WINDOW_MS = 3000L
    private const val EXTEND_BATCH_WINDOW_MS = 2000L
    private const val MAX_BATCH_WINDOW_MS = 8000L
    private const val MAX_NOTIFS_PER_BATCH = 5
    private const val EXPIRATION_WINDOW_MS = 30000L // 30s timeout

    // Main thread handler for window scheduling
    private val mainHandler = Handler(Looper.getMainLooper())

    // Batch buffer state
    private val currentBatch = CopyOnWriteArrayList<QueuedNotification>()
    private var batchStartTime = 0L
    private var batchFlushRunnable: Runnable? = null

    // Deduplication tracker: content hash -> last arrival timestamp
    private val recentContentHashes = ConcurrentHashMap<String, Long>()
    private const val DEDUP_FINGERPRINT_TTL_MS = 6000L

    // Conversational context history (bounded to last 20 notifications)
    private val recentContextHistory = CopyOnWriteArrayList<QueuedNotification>()
    private const val MAX_HISTORY_SIZE = 20

    /**
     * Submit an intercepted and parsed notification to the conversation engine.
     */
    @Synchronized
    fun onNotificationReceived(
        context: Context,
        eventId: String,
        packageName: String,
        appName: String,
        sender: String,
        summary: String
    ) {
        val now = System.currentTimeMillis()

        // 1. Duplicate & re-processing protection
        val fingerprint = "$packageName|$sender|${summary.trim()}"
        val lastSeen = recentContentHashes[fingerprint] ?: 0L
        if (now - lastSeen < DEDUP_FINGERPRINT_TTL_MS) {
            Log.d(TAG, "Suppressed duplicate notification callback within fingerprint TTL: $fingerprint")
            return
        }
        recentContentHashes[fingerprint] = now

        // Evict expired fingerprint cache periodically
        if (recentContentHashes.size > 50) {
            recentContentHashes.entries.removeIf { now - it.value > DEDUP_FINGERPRINT_TTL_MS * 2 }
        }

        val item = QueuedNotification(
            eventId = eventId,
            packageName = packageName,
            appName = appName,
            sender = sender.trim(),
            summary = summary.trim(),
            timestamp = now
        )

        // Add to historical context
        recentContextHistory.add(item)
        while (recentContextHistory.size > MAX_HISTORY_SIZE) {
            recentContextHistory.removeAt(0)
        }

        // 2. Intelligent Batching Logic
        if (currentBatch.isEmpty()) {
            batchStartTime = now
            currentBatch.add(item)
            scheduleFlush(context, INITIAL_BATCH_WINDOW_MS)
            Log.d(TAG, "Started notification batch window (${INITIAL_BATCH_WINDOW_MS}ms) with event: $eventId")
        } else {
            currentBatch.add(item)
            val elapsed = now - batchStartTime
            if (currentBatch.size >= MAX_NOTIFS_PER_BATCH || elapsed >= MAX_BATCH_WINDOW_MS) {
                Log.d(TAG, "Batch threshold reached (count=${currentBatch.size}, elapsed=${elapsed}ms). Flushing immediately.")
                cancelScheduledFlush()
                flushBatch(context)
            } else {
                // Extend window dynamically
                val remainingMax = MAX_BATCH_WINDOW_MS - elapsed
                val extension = EXTEND_BATCH_WINDOW_MS.coerceAtMost(remainingMax)
                cancelScheduledFlush()
                scheduleFlush(context, extension)
                Log.d(TAG, "Extended batch window by ${extension}ms (total items=${currentBatch.size})")
            }
        }
    }

    private fun scheduleFlush(context: Context, delayMs: Long) {
        val runnable = Runnable {
            synchronized(this) {
                flushBatch(context)
            }
        }
        batchFlushRunnable = runnable
        mainHandler.postDelayed(runnable, delayMs)
    }

    private fun cancelScheduledFlush() {
        batchFlushRunnable?.let { mainHandler.removeCallbacks(it) }
        batchFlushRunnable = null
    }

    @Synchronized
    private fun flushBatch(context: Context) {
        cancelScheduledFlush()
        if (currentBatch.isEmpty()) return

        val batchItems = ArrayList(currentBatch)
        currentBatch.clear()
        batchStartTime = 0L

        // Discard if notifications in batch are already expired (>30s)
        val now = System.currentTimeMillis()
        val validItems = batchItems.filter { now - it.timestamp < EXPIRATION_WINDOW_MS }
        if (validItems.isEmpty()) {
            Log.w(TAG, "Batch discarded: all notifications expired (> ${EXPIRATION_WINDOW_MS}ms)")
            return
        }

        // Check if voice announcement is enabled
        if (!NotificationAlertPreferences.isVoiceAnnouncementEnabled(context)) {
            Log.d(TAG, "Voice announcement disabled in user preferences")
            return
        }

        // Generate natural conversational announcement
        val owner = VoiceIdentityManager.getOwnerName(context)
        val announcement = buildNaturalAnnouncement(owner, validItems)
        if (announcement.isBlank()) return

        // Dispatch through central SpeechArbitrator
        val utterance = ArbitratedUtterance(
            id = "batch_announcement_${now}",
            text = announcement,
            priority = UtterancePriority.NOTIFICATION_ANNOUNCEMENT
        )
        SpeechArbitrator.getInstance(context).enqueueUtterance(utterance)
        Log.i(TAG, "Dispatched conversational batch announcement [${validItems.size} item(s)]: \"$announcement\"")
    }

    /**
     * Synthesizes conversational, human-like phrases depending on:
     * - Number of items
     * - Same-sender vs multi-sender grouping
     * - App identities
     * - Content preview availability
     */
    private fun buildNaturalAnnouncement(owner: String, items: List<QueuedNotification>): String {
        if (items.isEmpty()) return ""

        // Case 1: Exactly 1 notification in batch
        if (items.size == 1) {
            val single = items[0]
            val sender = if (single.sender.isNotBlank()) single.sender else single.appName
            val app = single.appName

            return if (single.summary.isNotBlank()) {
                "$owner, $sender sent you a message on $app. They say: ${single.summary}"
            } else {
                "$owner, you have a new $app notification from $sender."
            }
        }

        // Case 2: Check if all notifications are from the same sender
        val firstSender = items[0].sender.ifBlank { items[0].appName }
        val allSameSender = items.all { (it.sender.ifBlank { it.appName }).equals(firstSender, ignoreCase = true) }

        if (allSameSender) {
            val countWord = when (items.size) {
                2 -> "two"
                3 -> "three"
                4 -> "four"
                5 -> "five"
                else -> "${items.size}"
            }
            val app = items[0].appName
            val lastSummary = items.last().summary
            return if (lastSummary.isNotBlank()) {
                "$owner, $firstSender has sent you $countWord messages on $app. The latest is: $lastSummary"
            } else {
                "$owner, $firstSender sent you $countWord messages on $app."
            }
        }

        // Case 3: Multiple different senders / apps
        val senderList = items.map {
            val s = it.sender.ifBlank { it.appName }
            "$s on ${it.appName}"
        }.distinct()

        val summaryPhrase = when (senderList.size) {
            2 -> "${senderList[0]}, and ${senderList[1]}"
            3 -> "${senderList[0]}, ${senderList[1]}, and ${senderList[2]}"
            else -> "${senderList.take(2).joinToString(", ")}, plus ${senderList.size - 2} more"
        }

        val totalCountWord = when (items.size) {
            2 -> "two"
            3 -> "three"
            4 -> "four"
            5 -> "five"
            else -> "${items.size}"
        }

        return "$owner, you've got $totalCountWord new notifications: from $summaryPhrase."
    }

    /**
     * Context retrieval for follow-up voice queries ("read last message", etc.)
     */
    fun getLastNotification(): QueuedNotification? {
        return recentContextHistory.lastOrNull()
    }

    fun getRecentNotifications(): List<QueuedNotification> {
        return ArrayList(recentContextHistory)
    }

    fun clearHistory() {
        recentContextHistory.clear()
        recentContentHashes.clear()
    }
}
