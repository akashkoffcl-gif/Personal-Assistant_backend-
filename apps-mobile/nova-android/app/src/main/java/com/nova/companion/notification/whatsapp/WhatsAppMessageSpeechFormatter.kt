package com.nova.companion.notification.whatsapp

import com.nova.companion.notification.normalization.NotificationContactNameNormalizer

/**
 * WhatsAppMessageSpeechFormatter
 *
 * Formats genuine incoming WhatsApp messages into natural conversational speech.
 *
 * Required Output Format:
 * "{userName}, {senderName} sent you a message: {messageBody}."
 *
 * Guarantees:
 * - Uses configured user's preferred spoken name (dynamically passed, never hardcoded).
 * - Normalizes emoji/decorative symbols from sender names using [NotificationContactNameNormalizer].
 * - Preserves exact incoming message body without rewriting, translation, or paraphrase.
 * - Does not emit extra boilerplate phrases ("You have a new notification", "Message received", etc.).
 */
object WhatsAppMessageSpeechFormatter {

    /**
     * Formats an incoming message announcement for Text-To-Speech delivery.
     *
     * @param userName Preferred spoken name of the user (e.g. "Akash")
     * @param rawSender Normalized or raw sender name (e.g. "Harish🔥", "Mom ❤️")
     * @param messageBody Exact incoming message text (e.g. "Hii")
     * @param conversationTitle Optional group chat or conversation title
     * @param isGroup Whether this is a group chat
     * @return Natural speech utterance string
     */
    fun formatAnnouncement(
        userName: String,
        rawSender: String,
        messageBody: String,
        conversationTitle: String? = null,
        isGroup: Boolean = false
    ): String {
        val cleanUserName = if (userName.isBlank()) "User" else userName.trim()
        val cleanSenderName = NotificationContactNameNormalizer.normalizeForSpeech(rawSender)
        val cleanBody = messageBody.trim()

        if (cleanBody.isBlank()) {
            return ""
        }

        return if (isGroup && !conversationTitle.isNullOrBlank()) {
            val cleanGroup = NotificationContactNameNormalizer.normalizeForSpeech(conversationTitle)
            "$cleanUserName, $cleanSenderName in $cleanGroup sent you a message: $cleanBody."
        } else {
            "$cleanUserName, $cleanSenderName sent you a message: $cleanBody."
        }
    }
}
