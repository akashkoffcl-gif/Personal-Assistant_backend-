package com.nova.companion.notification.intelligence.model

/**
 * Underlying conversational intent detected in the notification content.
 */
enum class MessageIntent {
    QUESTION,         // Contains direct questions ("are you coming?", "where are you?")
    ACTION_REQUIRED,  // Calls for immediate user action ("call me back", "urgent", "please check")
    INFO,             // Standard informative statement or greeting
    NONE              // No detectable conversational intent (e.g. system alert, promotional)
}
