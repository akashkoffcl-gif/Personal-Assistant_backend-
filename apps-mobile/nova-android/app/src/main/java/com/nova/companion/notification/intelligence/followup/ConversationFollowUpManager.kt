package com.nova.companion.notification.intelligence.followup

import java.util.concurrent.ConcurrentHashMap

/**
 * Tracks extracted conversational tasks, callbacks, and reminders.
 */
object ConversationFollowUpManager {

    private val itemsById = ConcurrentHashMap<String, FollowUpItem>()

    fun recordFollowUp(item: FollowUpItem) {
        cleanupExpired()
        // Deduplicate per sender + type
        val existing = itemsById.values.firstOrNull {
            it.sender.equals(item.sender, ignoreCase = true) &&
                    it.type == item.type &&
                    it.status == FollowUpStatus.PENDING
        }
        if (existing == null) {
            itemsById[item.id] = item
        }
    }

    fun getPendingFollowUps(): List<FollowUpItem> {
        cleanupExpired()
        return itemsById.values.filter { it.status == FollowUpStatus.PENDING }
    }

    fun completeFollowUp(id: String) {
        itemsById[id]?.status = FollowUpStatus.COMPLETED
    }

    fun dismissFollowUp(id: String) {
        itemsById[id]?.status = FollowUpStatus.DISMISSED
    }

    fun snoozeFollowUp(id: String, snoozeDurationMs: Long = 30 * 60 * 1000L) {
        itemsById[id]?.let {
            it.status = FollowUpStatus.SNOOZED
            // Re-activate after snooze window
        }
    }

    private fun cleanupExpired() {
        val now = System.currentTimeMillis()
        itemsById.entries.removeIf { now > it.value.expiresAt }
    }

    fun clear() {
        itemsById.clear()
    }
}
