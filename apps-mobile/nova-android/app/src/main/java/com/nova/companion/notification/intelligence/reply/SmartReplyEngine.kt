package com.nova.companion.notification.intelligence.reply

import com.nova.companion.notification.intelligence.model.ContextualNotification
import java.util.UUID

/**
 * Contextual Smart Reply Engine
 *
 * Produces balanced, multi-choice reply options (affirmative, tentative, negative)
 * without hallucinating commitments or facts.
 */
object SmartReplyEngine {

    fun generateReplies(
        notification: ContextualNotification,
        intent: ReplyIntent
    ): List<ReplySuggestion> {
        val summary = notification.summary.trim()
        val suggestions = mutableListOf<ReplySuggestion>()

        when (intent) {
            ReplyIntent.QUESTION_RECEIVED -> {
                // Check if it's an arrival / presence question ("coming today?", "where are you?")
                if (summary.contains("coming", ignoreCase = true) || summary.contains("reach", ignoreCase = true)) {
                    suggestions.add(
                        ReplySuggestion(
                            id = UUID.randomUUID().toString(),
                            text = "Yes, I'll be there.",
                            type = SuggestionType.AFFIRMATIVE,
                            containsCommitment = true
                        )
                    )
                    suggestions.add(
                        ReplySuggestion(
                            id = UUID.randomUUID().toString(),
                            text = "Not sure yet, will let you know in a bit.",
                            type = SuggestionType.TENTATIVE
                        )
                    )
                    suggestions.add(
                        ReplySuggestion(
                            id = UUID.randomUUID().toString(),
                            text = "Can't make it today.",
                            type = SuggestionType.NEGATIVE
                        )
                    )
                } else {
                    // General question
                    suggestions.add(
                        ReplySuggestion(
                            id = UUID.randomUUID().toString(),
                            text = "Yes, absolutely.",
                            type = SuggestionType.AFFIRMATIVE
                        )
                    )
                    suggestions.add(
                        ReplySuggestion(
                            id = UUID.randomUUID().toString(),
                            text = "Let me check and get back to you.",
                            type = SuggestionType.TENTATIVE
                        )
                    )
                    suggestions.add(
                        ReplySuggestion(
                            id = UUID.randomUUID().toString(),
                            text = "No, not at the moment.",
                            type = SuggestionType.NEGATIVE
                        )
                    )
                }
            }
            ReplyIntent.FOLLOW_UP_REQUIRED -> {
                // Callbacks
                suggestions.add(
                    ReplySuggestion(
                        id = UUID.randomUUID().toString(),
                        text = "I'll call you back shortly.",
                        type = SuggestionType.AFFIRMATIVE,
                        containsCommitment = true
                    )
                )
                suggestions.add(
                    ReplySuggestion(
                        id = UUID.randomUUID().toString(),
                        text = "A bit tied up right now, will ping once free.",
                        type = SuggestionType.TENTATIVE
                    )
                )
            }
            ReplyIntent.ACTION_REQUIRED -> {
                // Task or file request
                suggestions.add(
                    ReplySuggestion(
                        id = UUID.randomUUID().toString(),
                        text = "Working on it, will share shortly.",
                        type = SuggestionType.AFFIRMATIVE,
                        containsCommitment = true
                    )
                )
                suggestions.add(
                    ReplySuggestion(
                        id = UUID.randomUUID().toString(),
                        text = "Received your request, looking into it now.",
                        type = SuggestionType.ACKNOWLEDGMENT
                    )
                )
            }
            ReplyIntent.CONFIRMATION_REQUIRED -> {
                suggestions.add(
                    ReplySuggestion(
                        id = UUID.randomUUID().toString(),
                        text = "Confirmed, looks good.",
                        type = SuggestionType.AFFIRMATIVE
                    )
                )
                suggestions.add(
                    ReplySuggestion(
                        id = UUID.randomUUID().toString(),
                        text = "I'll review and confirm in a while.",
                        type = SuggestionType.TENTATIVE
                    )
                )
            }
            ReplyIntent.REPLY_RECOMMENDED -> {
                suggestions.add(
                    ReplySuggestion(
                        id = UUID.randomUUID().toString(),
                        text = "Got it, thanks!",
                        type = SuggestionType.ACKNOWLEDGMENT
                    )
                )
                suggestions.add(
                    ReplySuggestion(
                        id = UUID.randomUUID().toString(),
                        text = "Sure, will keep you posted.",
                        type = SuggestionType.TENTATIVE
                    )
                )
            }
            else -> {
                // No automated suggestions generated
            }
        }

        return suggestions
    }
}
