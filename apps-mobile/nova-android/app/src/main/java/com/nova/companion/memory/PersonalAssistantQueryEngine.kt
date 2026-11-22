package com.nova.companion.memory

import android.content.Context
import com.nova.companion.task.commitment.CommitmentLedgerManager
import com.nova.companion.task.orchestration.PersonalTaskOrchestrator
import com.nova.companion.task.waiting.WaitingForResponseManager

/**
 * PersonalAssistantQueryEngine
 *
 * Resolves natural language user queries regarding obligations, tasks, and memory.
 */
object PersonalAssistantQueryEngine {

    fun answerQuery(context: Context, query: String): String {
        val q = query.lowercase().trim()

        // 1. "What did I promise <contact>?" or "What did I promise?"
        if (q.contains("promise") || q.contains("promised")) {
            val commitments = CommitmentLedgerManager.getPendingCommitments()
            if (commitments.isEmpty()) {
                return "You don't have any active promises or commitments recorded."
            }
            // Check if contact mentioned
            val contactMatch = commitments.firstOrNull { q.contains(it.contactName.lowercase()) }
            return if (contactMatch != null) {
                "You promised ${contactMatch.contactName}: ${contactMatch.description}."
            } else {
                val list = commitments.take(2).joinToString("; ") { "${it.contactName}: ${it.description}" }
                "You have ${commitments.size} commitments: $list."
            }
        }

        // 2. "What are my tasks?" / "What is pending?" / "What do I need to finish?"
        if (q.contains("task") || q.contains("pending") || q.contains("finish") || q.contains("to do")) {
            val tasks = PersonalTaskOrchestrator.getPendingTasks()
            if (tasks.isEmpty()) {
                return "You have no pending tasks right now."
            }
            val taskList = tasks.take(3).joinToString(", ") { it.title }
            return "You have ${tasks.size} tasks pending: $taskList."
        }

        // 3. "Who am I waiting for?" / "Waiting for"
        if (q.contains("waiting") || q.contains("who am i waiting")) {
            val waiting = WaitingForResponseManager.getActiveWaiting()
            if (waiting.isEmpty()) {
                return "You are not waiting for any responses right now."
            }
            val waitingList = waiting.take(2).joinToString(", ") { "${it.contactName} (${it.expectedItem})" }
            return "You are waiting for: $waitingList."
        }

        // 4. Fallback search across memory
        val memoryMatches = PersonalMemoryEngine.findMemory(q)
        if (memoryMatches.isNotEmpty()) {
            return "Here is what I remember: ${memoryMatches.first().value}"
        }

        return "I couldn't find any pending commitments or tasks matching that request."
    }
}
