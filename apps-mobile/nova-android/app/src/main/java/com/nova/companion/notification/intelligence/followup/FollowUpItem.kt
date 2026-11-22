package com.nova.companion.notification.intelligence.followup

enum class FollowUpType {
    CALLBACK,
    TASK_DEADLINE,
    MEETING,
    GENERAL_FOLLOW_UP
}

enum class FollowUpStatus {
    PENDING,
    SNOOZED,
    COMPLETED,
    DISMISSED,
    EXPIRED
}

/**
 * Extracted conversational follow-up or reminder item.
 */
data class FollowUpItem(
    val id: String,
    val sender: String,
    val appName: String,
    val type: FollowUpType,
    val actionDescription: String,
    val dueHint: String? = null,
    val rawTextSnippet: String,
    var status: FollowUpStatus = FollowUpStatus.PENDING,
    val createdAt: Long = System.currentTimeMillis(),
    val expiresAt: Long = System.currentTimeMillis() + 24 * 3600 * 1000L // 24h default
)
