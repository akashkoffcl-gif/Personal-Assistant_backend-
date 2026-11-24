package com.nova.companion.context

import android.content.Context
import com.nova.companion.context.model.ContextSnapshot
import com.nova.companion.task.commitment.CommitmentLedgerManager
import com.nova.companion.task.orchestration.PersonalTaskOrchestrator
import com.nova.companion.task.waiting.WaitingForResponseManager
import java.util.UUID

/**
 * UnifiedContextEngine
 *
 * Aggregates information across conversations, tasks, commitments, and waiting states
 * to provide a coherent contextual view for personal workflows.
 */
object UnifiedContextEngine {

    fun resolveContextForContact(
        context: Context,
        contactName: String,
        packageName: String? = null,
        conversationTitle: String? = null
    ): ContextSnapshot {
        val cleanContact = contactName.trim()
        val tasks = PersonalTaskOrchestrator.findTasksForContact(cleanContact)
        val commitments = CommitmentLedgerManager.findCommitmentsForContact(cleanContact)
        val waiting = WaitingForResponseManager.getActiveWaiting().firstOrNull {
            it.contactName.equals(cleanContact, ignoreCase = true)
        }

        val nextAction = when {
            commitments.any { it.dueHint != null } -> "Follow up on commitment: ${commitments.first().description}"
            tasks.isNotEmpty() -> "Complete task: ${tasks.first().title}"
            waiting != null -> "Check for expected response: ${waiting.expectedItem}"
            else -> null
        }

        return ContextSnapshot(
            snapshotId = UUID.randomUUID().toString(),
            activeContact = cleanContact,
            activePackageName = packageName,
            activeConversationTitle = conversationTitle,
            relatedTasks = tasks,
            relatedCommitments = commitments,
            isWaitingForResponse = waiting != null,
            waitingDetails = waiting?.expectedItem,
            suggestedNextAction = nextAction,
            confidenceScore = 0.95f
        )
    }
}
