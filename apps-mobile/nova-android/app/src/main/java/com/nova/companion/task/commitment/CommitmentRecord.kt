package com.nova.companion.task.commitment

enum class CommitmentCategory {
    SEND_DOCUMENT,
    MAKE_CALL,
    SEND_MESSAGE,
    PAYMENT,
    ATTEND_MEETING,
    COMPLETE_TASK,
    SHARE_INFORMATION,
    VERIFY_INFORMATION,
    WAITING_FOR_RESPONSE,
    FOLLOW_UP,
    PERSONAL_TASK,
    OTHER,
    UNKNOWN
}

enum class CommitmentOwner {
    USER,
    OTHER_PERSON
}

enum class CommitmentStatus {
    DETECTED,
    NEEDS_CONFIRMATION,
    CONFIRMED,
    PENDING,
    IN_PROGRESS,
    WAITING_FOR_OTHER_PERSON,
    COMPLETED,
    CANCELLED,
    OVERDUE,
    EXPIRED
}

/**
 * Structured model of a personal or received commitment.
 */
data class CommitmentRecord(
    val id: String,
    val description: String,
    val category: CommitmentCategory,
    val owner: CommitmentOwner,
    val sourcePackage: String,
    val contactName: String,
    val conversationTitle: String? = null,
    val rawTextSnippet: String,
    val dueHint: String? = null,
    var status: CommitmentStatus = CommitmentStatus.DETECTED,
    val confidence: Float = 0.9f,
    val createdAt: Long = System.currentTimeMillis(),
    var updatedAt: Long = System.currentTimeMillis(),
    val expiresAt: Long = System.currentTimeMillis() + 7 * 24 * 3600 * 1000L // 7 days default
)
