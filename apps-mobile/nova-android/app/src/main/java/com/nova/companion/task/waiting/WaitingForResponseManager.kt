package com.nova.companion.task.waiting

import com.nova.companion.task.commitment.CommitmentRecord
import java.util.concurrent.ConcurrentHashMap

data class WaitingEntry(
    val id: String,
    val contactName: String,
    val expectedItem: String,
    val sourcePackage: String,
    val registeredAt: Long = System.currentTimeMillis(),
    val dueHint: String? = null,
    var isResolved: Boolean = false
)

/**
 * WaitingForResponseManager
 *
 * Tracks situations where the user is expecting a deliverable or response from another person.
 */
object WaitingForResponseManager {

    private val waitingById = ConcurrentHashMap<String, WaitingEntry>()

    fun recordWaiting(commitment: CommitmentRecord) {
        val entry = WaitingEntry(
            id = commitment.id,
            contactName = commitment.contactName,
            expectedItem = commitment.description,
            sourcePackage = commitment.sourcePackage,
            dueHint = commitment.dueHint
        )
        waitingById[entry.id] = entry
    }

    fun getActiveWaiting(): List<WaitingEntry> {
        return waitingById.values.filter { !it.isResolved }
    }

    fun resolveWaiting(contactName: String) {
        val c = contactName.lowercase().trim()
        waitingById.values.forEach {
            if (it.contactName.lowercase().contains(c)) {
                it.isResolved = true
            }
        }
    }

    fun clear() {
        waitingById.clear()
    }
}
