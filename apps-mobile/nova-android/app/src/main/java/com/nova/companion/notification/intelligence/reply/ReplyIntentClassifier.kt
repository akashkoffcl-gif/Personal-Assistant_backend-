package com.nova.companion.notification.intelligence.reply

import com.nova.companion.notification.intelligence.model.MessageType
import java.util.regex.Pattern

/**
 * Deterministic classifier evaluating whether an incoming message needs a response.
 */
object ReplyIntentClassifier {

    private val NO_REPLY_REGEX = Pattern.compile(
        "^\\b(thanks|thank you|thx|ok|okay|k|cool|great|awesome|noted|got it|sure|bye|good night|good morning|tc|take care)\\b[!. ]*$",
        Pattern.CASE_INSENSITIVE
    )

    private val QUESTION_REGEX = Pattern.compile(
        "\\?|\\b(why|what|when|where|who|how|is it|can you|could you|are you|will you|have you|did you)\\b",
        Pattern.CASE_INSENSITIVE
    )

    private val ACTION_REQUIRED_REGEX = Pattern.compile(
        "\\b(please send|send me|submit|share the|email me|complete this|urgent|action required|transfer)\\b",
        Pattern.CASE_INSENSITIVE
    )

    private val FOLLOW_UP_REGEX = Pattern.compile(
        "\\b(call me|call back|ring me|let me know|reach out|ping me when|call when)\\b",
        Pattern.CASE_INSENSITIVE
    )

    private val CONFIRMATION_REGEX = Pattern.compile(
        "\\b(confirm|is that fine|agree|deal|is it done)\\b",
        Pattern.CASE_INSENSITIVE
    )

    fun classify(
        messageText: String,
        messageType: MessageType
    ): Pair<ReplyIntent, List<String>> {
        val trimmed = messageText.trim()
        val evidence = mutableListOf<String>()

        if (trimmed.isEmpty()) {
            return Pair(ReplyIntent.NO_REPLY_REQUIRED, listOf("Empty content"))
        }

        // 1. Promotional and System notifications never require a reply
        if (messageType == MessageType.PROMOTIONAL || messageType == MessageType.SYSTEM) {
            evidence.add("System/Promotional message type: reply suppressed")
            return Pair(ReplyIntent.NO_REPLY_REQUIRED, evidence)
        }

        // 2. Sensitive / OTP check
        if (messageType == MessageType.OTP) {
            evidence.add("Security verification/OTP: sensitive, automated reply blocked")
            return Pair(ReplyIntent.SENSITIVE_RESPONSE, evidence)
        }

        // 3. Conversational trivialities / acknowledgments
        if (NO_REPLY_REGEX.matcher(trimmed).matches()) {
            evidence.add("Polite closing/acknowledgment: no reply needed")
            return Pair(ReplyIntent.NO_REPLY_REQUIRED, evidence)
        }

        // 4. Follow-up / Callback
        if (FOLLOW_UP_REGEX.matcher(trimmed).find()) {
            evidence.add("Follow-up / Callback request detected")
            return Pair(ReplyIntent.FOLLOW_UP_REQUIRED, evidence)
        }

        // 5. Action Required
        if (ACTION_REQUIRED_REGEX.matcher(trimmed).find()) {
            evidence.add("Action request pattern detected")
            return Pair(ReplyIntent.ACTION_REQUIRED, evidence)
        }

        // 6. Direct Question
        if (trimmed.endsWith("?") || QUESTION_REGEX.matcher(trimmed).find()) {
            evidence.add("Direct question detected")
            return Pair(ReplyIntent.QUESTION_RECEIVED, evidence)
        }

        // 7. Confirmation
        if (CONFIRMATION_REGEX.matcher(trimmed).find()) {
            evidence.add("Confirmation inquiry detected")
            return Pair(ReplyIntent.CONFIRMATION_REQUIRED, evidence)
        }

        // 8. Default for direct messages: recommended
        if (messageType == MessageType.DIRECT) {
            evidence.add("Standard direct message: reply recommended")
            return Pair(ReplyIntent.REPLY_RECOMMENDED, evidence)
        }

        return Pair(ReplyIntent.UNKNOWN, listOf("Unclassified context"))
    }
}
