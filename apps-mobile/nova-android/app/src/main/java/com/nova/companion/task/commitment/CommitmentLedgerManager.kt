package com.nova.companion.task.commitment

import java.util.concurrent.ConcurrentHashMap

/**
 * CommitmentLedgerManager
 *
 * Maintains the persistent lifecycle of detected and confirmed commitments.
 */
object CommitmentLedgerManager {

    private val commitmentsById = ConcurrentHashMap<String, CommitmentRecord>()

    fun recordCommitment(record: CommitmentRecord) {
        cleanupExpired()
        // Deduplicate against active commitments for same contact & category
        val existing = commitmentsById.values.firstOrNull {
            it.contactName.equals(record.contactName, ignoreCase = true) &&
                    it.category == record.category &&
                    (it.status == CommitmentStatus.PENDING || it.status == CommitmentStatus.NEEDS_CONFIRMATION)
        }
        if (existing == null) {
            commitmentsById[record.id] = record
        }
    }

    fun confirmCommitment(id: String) {
        commitmentsById[id]?.let {
            it.status = CommitmentStatus.CONFIRMED
            it.updatedAt = System.currentTimeMillis()
        }
    }

    fun completeCommitment(id: String) {
        commitmentsById[id]?.let {
            it.status = CommitmentStatus.COMPLETED
            it.updatedAt = System.currentTimeMillis()
        }
    }

    fun cancelCommitment(id: String) {
        commitmentsById[id]?.let {
            it.status = CommitmentStatus.CANCELLED
            it.updatedAt = System.currentTimeMillis()
        }
    }

    fun getPendingCommitments(): List<CommitmentRecord> {
        cleanupExpired()
        return commitmentsById.values.filter {
            it.status == CommitmentStatus.CONFIRMED || it.status == CommitmentStatus.PENDING || it.status == CommitmentStatus.NEEDS_CONFIRMATION
        }
    }

    fun getWaitingCommitments(): List<CommitmentRecord> {
        cleanupExpired()
        return commitmentsById.values.filter {
            it.status == CommitmentStatus.WAITING_FOR_OTHER_PERSON
        }
    }

    fun findCommitmentsForContact(contact: String): List<CommitmentRecord> {
        cleanupExpired()
        val c = contact.lowercase().trim()
        return commitmentsById.values.filter { it.contactName.lowercase().contains(c) }
    }

    private fun cleanupExpired() {
        val now = System.currentTimeMillis()
        commitmentsById.entries.removeIf { now > it.value.expiresAt }
    }

    fun clear() {
        commitmentsById.clear()
    }
}
