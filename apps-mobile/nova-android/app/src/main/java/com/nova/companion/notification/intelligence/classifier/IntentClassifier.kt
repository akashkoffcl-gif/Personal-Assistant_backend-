package com.nova.companion.notification.intelligence.classifier

import com.nova.companion.notification.intelligence.model.MessageIntent
import java.util.regex.Pattern

/**
 * Heuristic & rule-based classifier that extracts intent (QUESTION, ACTION_REQUIRED, INFO)
 * from notification text snippets without external network dependencies.
 */
object IntentClassifier {

    private val QUESTION_MARK_REGEX = Pattern.compile("\\?|\\b(why|what|when|where|who|how|is it|can you|could you|are you|will you)\\b", Pattern.CASE_INSENSITIVE)
    
    private val ACTION_REQUIRED_REGEX = Pattern.compile(
        "\\b(call me|call back|call asap|urgent|emergency|immediately|respond asap|asap|need help|please check|action required)\\b",
        Pattern.CASE_INSENSITIVE
    )

    fun classifyIntent(text: String): Pair<MessageIntent, List<String>> {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) {
            return Pair(MessageIntent.NONE, emptyList())
        }

        val evidence = mutableListOf<String>()

        // 1. Check for Action Required / Urgency first
        val actionMatcher = ACTION_REQUIRED_REGEX.matcher(trimmed)
        if (actionMatcher.find()) {
            evidence.add("Action/Urgency keyword detected: '${actionMatcher.group()}'")
            return Pair(MessageIntent.ACTION_REQUIRED, evidence)
        }

        // 2. Check for Question
        if (trimmed.endsWith("?") || QUESTION_MARK_REGEX.matcher(trimmed).find()) {
            evidence.add("Question pattern detected")
            return Pair(MessageIntent.QUESTION, evidence)
        }

        // 3. Default to Info
        evidence.add("Standard informative message")
        return Pair(MessageIntent.INFO, evidence)
    }
}
