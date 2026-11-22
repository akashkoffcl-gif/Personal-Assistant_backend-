package com.nova.companion.task.commitment

import java.util.UUID
import java.util.regex.Pattern

/**
 * CommitmentDetectionEngine
 *
 * Deterministically parses conversation snippets to identify explicit promises,
 * distinguishing user commitments ("I'll send it tomorrow") from incoming commitments ("I'll pay you tonight").
 */
object CommitmentDetectionEngine {

    // User promises
    private val USER_COMMITMENT_REGEX = Pattern.compile(
        "\\b(i'll|i will|let me|i can|i shall|i'm going to)\\s+(send|call|share|transfer|pay|check|finish|come|ping|look into|handle|do it|meet)\\b",
        Pattern.CASE_INSENSITIVE
    )

    // Incoming promises from another person
    private val OTHER_COMMITMENT_REGEX = Pattern.compile(
        "\\b(i'll|i will|will send|will call|will pay|will share|will transfer|sending now|giving you)\\b",
        Pattern.CASE_INSENSITIVE
    )

    private val DEADLINE_REGEX = Pattern.compile(
        "\\b(tomorrow|tonight|today|by\\s+\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?|before\\s+\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?|on\\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\\b",
        Pattern.CASE_INSENSITIVE
    )

    fun detectCommitment(
        text: String,
        sourcePackage: String,
        contactName: String,
        isIncoming: Boolean = true
    ): CommitmentRecord? {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return null

        val pattern = if (isIncoming) OTHER_COMMITMENT_REGEX else USER_COMMITMENT_REGEX
        val matcher = pattern.matcher(trimmed)

        if (matcher.find()) {
            val lower = trimmed.lowercase()
            val category = when {
                lower.contains("send") && (lower.contains("doc") || lower.contains("file") || lower.contains("report") || lower.contains("pdf")) -> CommitmentCategory.SEND_DOCUMENT
                lower.contains("call") || lower.contains("ring") -> CommitmentCategory.MAKE_CALL
                lower.contains("pay") || lower.contains("transfer") || lower.contains("amount") || lower.contains("money") -> CommitmentCategory.PAYMENT
                lower.contains("meet") || lower.contains("meeting") -> CommitmentCategory.ATTEND_MEETING
                lower.contains("check") || lower.contains("verify") -> CommitmentCategory.VERIFY_INFORMATION
                else -> CommitmentCategory.COMPLETE_TASK
            }

            val deadlineMatcher = DEADLINE_REGEX.matcher(trimmed)
            val dueHint = if (deadlineMatcher.find()) deadlineMatcher.group() else null

            val owner = if (isIncoming) CommitmentOwner.OTHER_PERSON else CommitmentOwner.USER
            val status = if (owner == CommitmentOwner.USER) CommitmentStatus.NEEDS_CONFIRMATION else CommitmentStatus.WAITING_FOR_OTHER_PERSON

            return CommitmentRecord(
                id = UUID.randomUUID().toString(),
                description = trimmed,
                category = category,
                owner = owner,
                sourcePackage = sourcePackage,
                contactName = contactName,
                rawTextSnippet = trimmed.take(120),
                dueHint = dueHint,
                status = status
            )
        }

        return null
    }
}
