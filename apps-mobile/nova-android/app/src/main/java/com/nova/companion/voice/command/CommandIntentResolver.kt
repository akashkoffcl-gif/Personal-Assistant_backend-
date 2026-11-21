package com.nova.companion.voice.command

import android.content.Context
import android.util.Log
import com.nova.companion.notification.engine.NotificationConversationRegistry

enum class ResolvedIntentType {
    REPLY_TO_SENDER,
    REPLY_TO_LAST,
    READ_LAST_MESSAGE,
    STOP_SPEECH,
    UNKNOWN
}

data class ResolvedVoiceCommand(
    val intent: ResolvedIntentType,
    val targetSender: String?,
    val replyBody: String?,
    val originalQuery: String
)

object CommandIntentResolver {

    private const val TAG = "CommandIntentResolver"

    fun resolve(text: String): ResolvedVoiceCommand {
        val clean = text.trim()
        val lower = clean.lowercase()

        // 1. Stop command
        if (lower == "stop" || lower.contains("stop talking") || lower.contains("nova stop")) {
            return ResolvedVoiceCommand(ResolvedIntentType.STOP_SPEECH, null, null, clean)
        }

        // 2. Read last message
        if (lower.contains("read last message") || lower.contains("read the last notification") || lower.contains("read message again")) {
            return ResolvedVoiceCommand(ResolvedIntentType.READ_LAST_MESSAGE, null, null, clean)
        }

        // 3. "Reply to <sender> that/saying <message>"
        val replyToSenderRegex = Regex("""(?:reply to|tell)\s+([a-zA-Z0-9_\s]+?)\s+(?:that|saying)\s+(.+)""", RegexOption.IGNORE_CASE)
        val senderMatch = replyToSenderRegex.find(clean)
        if (senderMatch != null) {
            val sender = senderMatch.groupValues[1].trim()
            val message = senderMatch.groupValues[2].trim()
            return ResolvedVoiceCommand(ResolvedIntentType.REPLY_TO_SENDER, sender, message, clean)
        }

        // 4. "Reply to the last message saying <message>" or "Reply saying <message>"
        val replyLastRegex = Regex("""(?:reply to (?:the )?last (?:whatsapp )?message saying|reply saying|reply that)\s+(.+)""", RegexOption.IGNORE_CASE)
        val lastMatch = replyLastRegex.find(clean)
        if (lastMatch != null) {
            val message = lastMatch.groupValues[1].trim()
            return ResolvedVoiceCommand(ResolvedIntentType.REPLY_TO_LAST, null, message, clean)
        }

        return ResolvedVoiceCommand(ResolvedIntentType.UNKNOWN, null, null, clean)
    }

    fun executeVoiceCommand(context: Context, command: ResolvedVoiceCommand, onResultSpoken: (String) -> Unit) {
        Log.i(TAG, "Executing resolved voice command: ${command.intent}")

        when (command.intent) {
            ResolvedIntentType.STOP_SPEECH -> {
                com.nova.companion.voice.arbitration.SpeechArbitrator.getInstance(context).stopAllSpeech()
                onResultSpoken("Speech stopped.")
            }
            ResolvedIntentType.READ_LAST_MESSAGE -> {
                val last = NotificationConversationRegistry.getLastContext()
                if (last != null) {
                    onResultSpoken("Last message from ${last.sender} on ${last.appName}: ${last.summary}")
                } else {
                    onResultSpoken("No recent notifications to read.")
                }
            }
            ResolvedIntentType.REPLY_TO_SENDER -> {
                val senderQuery = command.targetSender ?: ""
                val ctx = NotificationConversationRegistry.findContextForSender(senderQuery)
                val replyText = command.replyBody ?: ""

                if (ctx == null) {
                    onResultSpoken("I couldn't find a recent conversation with $senderQuery to reply to.")
                    return
                }

                if (replyText.isBlank()) {
                    onResultSpoken("What message would you like to send to ${ctx.sender}?")
                    return
                }

                val success = NotificationConversationRegistry.executeReply(context, ctx, replyText)
                if (success) {
                    onResultSpoken("Reply sent to ${ctx.sender} on ${ctx.appName}: $replyText")
                } else {
                    onResultSpoken("Failed to send reply to ${ctx.sender}.")
                }
            }
            ResolvedIntentType.REPLY_TO_LAST -> {
                val ctx = NotificationConversationRegistry.getLastContext()
                val replyText = command.replyBody ?: ""

                if (ctx == null) {
                    onResultSpoken("There is no recent notification to reply to.")
                    return
                }

                if (replyText.isBlank()) {
                    onResultSpoken("What message would you like to send to ${ctx.sender}?")
                    return
                }

                val success = NotificationConversationRegistry.executeReply(context, ctx, replyText)
                if (success) {
                    onResultSpoken("Reply sent to ${ctx.sender} on ${ctx.appName}: $replyText")
                } else {
                    onResultSpoken("Failed to send reply to ${ctx.sender}.")
                }
            }
            ResolvedIntentType.UNKNOWN -> {
                // Not a local notification command; dispatch to standard conversational AI
                Log.d(TAG, "Unknown local command; delegating to conversational AI.")
            }
        }
    }
}
