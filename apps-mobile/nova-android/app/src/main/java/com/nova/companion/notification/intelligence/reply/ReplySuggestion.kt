package com.nova.companion.notification.intelligence.reply

/**
 * Model representing a single smart reply suggestion option.
 */
data class ReplySuggestion(
    val id: String,
    val text: String,
    val type: SuggestionType, // AFFIRMATIVE, TENTATIVE, NEGATIVE, CUSTOM
    val confidence: Float = 0.9f,
    val containsCommitment: Boolean = false,
    val requiresVerification: Boolean = false
)

enum class SuggestionType {
    AFFIRMATIVE,
    TENTATIVE,
    NEGATIVE,
    ACKNOWLEDGMENT
}
