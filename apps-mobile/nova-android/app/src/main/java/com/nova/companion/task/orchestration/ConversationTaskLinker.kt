package com.nova.companion.task.orchestration

import com.nova.companion.notification.intelligence.model.ContextualNotification
import com.nova.companion.task.commitment.CommitmentRecord
import java.util.UUID

/**
 * ConversationTaskLinker
 *
 * Bridges incoming conversation notifications and commitments into actionable personal tasks.
 */
object ConversationTaskLinker {

    fun createFromCommitment(commitment: CommitmentRecord): PersonalTask {
        val category = when (commitment.category) {
            com.nova.companion.task.commitment.CommitmentCategory.SEND_DOCUMENT -> TaskCategory.DOCUMENT
            com.nova.companion.task.commitment.CommitmentCategory.MAKE_CALL -> TaskCategory.COMMUNICATION
            com.nova.companion.task.commitment.CommitmentCategory.PAYMENT -> TaskCategory.PAYMENT
            com.nova.companion.task.commitment.CommitmentCategory.ATTEND_MEETING -> TaskCategory.MEETING
            else -> TaskCategory.WORK
        }

        return PersonalTask(
            id = UUID.randomUUID().toString(),
            title = commitment.description,
            category = category,
            sourcePackage = commitment.sourcePackage,
            associatedContact = commitment.contactName,
            associatedCommitmentId = commitment.id,
            dueHint = commitment.dueHint,
            status = TaskStatus.PENDING
        )
    }

    fun createFromNotification(notification: ContextualNotification): PersonalTask {
        return PersonalTask(
            id = UUID.randomUUID().toString(),
            title = "Respond to ${notification.cleanSender}: \"${notification.summary.take(60)}\"",
            category = TaskCategory.COMMUNICATION,
            priorityRank = notification.priority.rank,
            sourcePackage = notification.packageName,
            associatedContact = notification.cleanSender,
            status = TaskStatus.PENDING
        )
    }
}
