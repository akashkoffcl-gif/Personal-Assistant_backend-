package com.nova.companion.notification.intelligence.memory

import com.nova.companion.notification.intelligence.model.ContextualNotification
import java.util.concurrent.ConcurrentHashMap

/**
 * Thread lifecycle states.
 */
enum class NotificationDeliveryState {
    RECEIVED,
    CLASSIFIED,
    QUEUED,
    ANNOUNCED,
    SUPPRESSED,
    EXPIRED,
    FAILED
}

data class ThreadMemoryEntry(
    val threadKey: String,
    val sender: String,
    val appName: String,
    val conversationTitle: String?,
    val lastSummarySnippet: String,
    val state: NotificationDeliveryState,
    val lastUpdated: Long = System.currentTimeMillis(),
    val messageCount: Int = 1
)

/**
 * Short-term notification conversation memory (TTL: 180 seconds / 3 minutes).
 *
 * Tracks ongoing conversations per sender or group so follow-up notifications
 * are announced conversationally ("Harish also said...") without repetitive titles.
 */
object NotificationMemoryManager {

    private const val MEMORY_TTL_MS = 180_000L // 3 minutes
    private const val MAX_ENTRIES = 30

    private val threadMemory = ConcurrentHashMap<String, ThreadMemoryEntry>()

    /**
     * Resolves thread key based on app + conversation or sender.
     */
    fun buildThreadKey(packageName: String, sender: String, conversationTitle: String?): String {
        return if (!conversationTitle.isNullOrBlank()) {
            "$packageName:group:$conversationTitle"
        } else {
            "$packageName:direct:${sender.lowercase().trim()}"
        }
    }

    /**
     * Check if an active announced thread exists within the TTL window.
     */
    fun isOngoingThread(threadKey: String): Boolean {
        cleanupExpired()
        val entry = threadMemory[threadKey] ?: return false
        val now = System.currentTimeMillis()
        return (now - entry.lastUpdated < MEMORY_TTL_MS) && entry.state == NotificationDeliveryState.ANNOUNCED
    }

    /**
     * Record or update a thread's delivery state in short-term memory.
     */
    fun recordNotification(
        notification: ContextualNotification,
        state: NotificationDeliveryState
    ) {
        cleanupExpired()
        val key = buildThreadKey(
            notification.packageName,
            notification.cleanSender,
            notification.conversationTitle
        )
        val now = System.currentTimeMillis()
        val existing = threadMemory[key]

        val updated = if (existing != null && (now - existing.lastUpdated < MEMORY_TTL_MS)) {
            existing.copy(
                lastSummarySnippet = notification.summary.take(60),
                state = state,
                lastUpdated = now,
                messageCount = existing.messageCount + 1
            )
        } else {
            ThreadMemoryEntry(
                threadKey = key,
                sender = notification.cleanSender,
                appName = notification.appName,
                conversationTitle = notification.conversationTitle,
                lastSummarySnippet = notification.summary.take(60),
                state = state,
                lastUpdated = now,
                messageCount = 1
            )
        }

        threadMemory[key] = updated
    }

    private fun cleanupExpired() {
        val now = System.currentTimeMillis()
        threadMemory.entries.removeIf { now - it.value.lastUpdated > MEMORY_TTL_MS }
    }

    fun clearAll() {
        threadMemory.clear()
    }
}
