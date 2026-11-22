package com.nova.companion.notification.intelligence.model

/**
 * Deterministic priority levels assigned to intercepted notifications.
 */
enum class PriorityLevel(val rank: Int) {
    P0_CRITICAL(0),    // Emergency, repeated missed calls, urgent safety
    P1_HIGH(1),        // VIP contacts, direct questions requiring response, urgent action
    P2_NORMAL(2),      // Standard direct personal messages
    P3_LOW(3),         // Group chats, non-urgent social updates
    P4_SUPPRESSED(4);  // Promotional, spam, or muted notifications

    fun isMoreImportantThan(other: PriorityLevel): Boolean {
        return this.rank < other.rank
    }
}
