package com.nova.companion.task.briefing

import android.content.Context
import com.nova.companion.task.commitment.CommitmentLedgerManager
import com.nova.companion.task.orchestration.PersonalTaskOrchestrator
import com.nova.companion.task.waiting.WaitingForResponseManager
import com.nova.companion.voice.identity.VoiceIdentityManager

/**
 * DailyBriefingEngine
 *
 * Synthesizes morning or on-demand personal briefings summarizing tasks,
 * deadlines, commitments, and waiting items.
 */
object DailyBriefingEngine {

    fun generateBriefingText(context: Context): String {
        val owner = VoiceIdentityManager.getOwnerName(context)
        val tasks = PersonalTaskOrchestrator.getPendingTasks()
        val waiting = WaitingForResponseManager.getActiveWaiting()
        val commitments = CommitmentLedgerManager.getPendingCommitments()

        if (tasks.isEmpty() && waiting.isEmpty() && commitments.isEmpty()) {
            return "Good day, $owner. You're completely caught up! No pending tasks or commitments recorded."
        }

        val parts = mutableListOf<String>()
        parts.add("Hello $owner, here is your personal status update.")

        if (tasks.isNotEmpty()) {
            val taskCount = tasks.size
            val topTask = tasks.first().title
            parts.add("You have $taskCount pending task${if (taskCount > 1) "s" else ""}. First up: $topTask.")
        }

        if (commitments.isNotEmpty()) {
            val c = commitments.first()
            val due = if (c.dueHint != null) " by ${c.dueHint}" else ""
            parts.add("You promised ${c.contactName} to ${c.description}$due.")
        }

        if (waiting.isNotEmpty()) {
            val w = waiting.first()
            parts.add("You are waiting for ${w.contactName} regarding: ${w.expectedItem}.")
        }

        return parts.joinToString(" ")
    }
}
