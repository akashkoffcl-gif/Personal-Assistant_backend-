package com.nova.companion.notification.intelligence.reply

/**
 * Detailed intent classifications determining whether and how an incoming message needs a reply.
 */
enum class ReplyIntent {
    NO_REPLY_REQUIRED,      // Acknowledgments, pleasantries ("thanks bro", "ok", "cool")
    REPLY_RECOMMENDED,      // General conversational prompts, updates
    QUESTION_RECEIVED,      // Direct questions ("are you coming?", "what time?")
    ACTION_REQUIRED,        // Requests for action ("please send the file before 5")
    CONFIRMATION_REQUIRED,  // Yes/No confirmation ("can you confirm this?")
    FOLLOW_UP_REQUIRED,     // Callbacks, future coordination ("call me when free")
    SENSITIVE_RESPONSE,     // Involves passwords, banking, OTPs, or private data
    UNKNOWN                 // Ambiguous or insufficient context
}
