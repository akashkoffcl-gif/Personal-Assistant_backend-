package com.nova.companion.task.orchestration

enum class TaskStatus {
    CREATED,
    PENDING,
    IN_PROGRESS,
    WAITING,
    COMPLETED,
    CANCELLED,
    OVERDUE
}

enum class TaskCategory {
    COMMUNICATION,
    DOCUMENT,
    WORK,
    PERSONAL,
    PAYMENT,
    MEETING,
    OTHER
}

/**
 * Structured Personal Task Model.
 */
data class PersonalTask(
    val id: String,
    val title: String,
    val category: TaskCategory,
    val priorityRank: Int = 2, // 0 = Urgent/P0, 1 = High/P1, 2 = Normal/P2, 3 = Low/P3
    val sourcePackage: String? = null,
    val associatedContact: String? = null,
    val associatedCommitmentId: String? = null,
    val dueHint: String? = null,
    val dueTimestamp: Long? = null,
    var status: TaskStatus = TaskStatus.PENDING,
    val createdAt: Long = System.currentTimeMillis(),
    var updatedAt: Long = System.currentTimeMillis()
)
