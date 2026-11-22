package com.nova.companion.notification.intelligence.actions

enum class ActionType {
    SEND_REPLY,
    CREATE_REMINDER,
    CALLBACK,
    SNOOZE_NOTIFICATION
}

enum class ActionState {
    CREATED,
    PENDING_APPROVAL,
    APPROVED,
    EXECUTING,
    EXECUTED,
    FAILED,
    CANCELLED,
    EXPIRED
}

/**
 * Model representing a pending or executed assistant action.
 */
data class PendingAction(
    val id: String,
    val type: ActionType,
    val eventId: String,
    val packageName: String,
    val appName: String,
    val targetSender: String,
    val proposedContent: String,
    var state: ActionState = ActionState.CREATED,
    val createdAt: Long = System.currentTimeMillis(),
    val expiresAt: Long = System.currentTimeMillis() + 120_000L // 2 min authorization TTL
) {
    fun isExpired(): Boolean = System.currentTimeMillis() > expiresAt
}
