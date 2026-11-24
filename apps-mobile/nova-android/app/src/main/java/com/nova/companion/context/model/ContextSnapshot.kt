package com.nova.companion.context.model

import com.nova.companion.task.commitment.CommitmentRecord
import com.nova.companion.task.orchestration.PersonalTask

/**
 * Time-bounded unified snapshot representing the user's active digital context.
 */
data class ContextSnapshot(
    val snapshotId: String,
    val activeContact: String? = null,
    val activePackageName: String? = null,
    val activeConversationTitle: String? = null,
    val relatedTasks: List<PersonalTask> = emptyList(),
    val relatedCommitments: List<CommitmentRecord> = emptyList(),
    val isWaitingForResponse: Boolean = false,
    val waitingDetails: String? = null,
    val suggestedNextAction: String? = null,
    val confidenceScore: Float = 0.9f,
    val timestamp: Long = System.currentTimeMillis()
)
