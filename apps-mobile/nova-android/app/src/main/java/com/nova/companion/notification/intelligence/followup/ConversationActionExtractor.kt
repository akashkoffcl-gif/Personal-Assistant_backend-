package com.nova.companion.notification.intelligence.followup

import com.nova.companion.notification.intelligence.model.ContextualNotification
import java.util.UUID
import java.util.regex.Pattern

/**
 * Extracts potential tasks, deadlines, and callback follow-ups from notification content.
 */
object ConversationActionExtractor {

    private val CALLBACK_REGEX = Pattern.compile(
        "\\b(call me|call back|ring me|give me a call|phone me)\\b",
        Pattern.CASE_INSENSITIVE
    )

    private val DEADLINE_REGEX = Pattern.compile(
        "\\b(before|by|until|at)\\s+(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|evening|noon)\\b",
        Pattern.CASE_INSENSITIVE
    )

    private val MEETING_REGEX = Pattern.compile(
        "\\b(let's meet|meeting|catch up|discuss)\\b",
        Pattern.CASE_INSENSITIVE
    )

    fun extractAction(notification: ContextualNotification): FollowUpItem? {
        val text = notification.summary.trim()
        if (text.isEmpty()) return null

        val sender = notification.cleanSender
        val app = notification.appName

        // 1. Callback detection
        if (CALLBACK_REGEX.matcher(text).find()) {
            return FollowUpItem(
                id = UUID.randomUUID().toString(),
                sender = sender,
                appName = app,
                type = FollowUpType.CALLBACK,
                actionDescription = "Call $sender back",
                rawTextSnippet = text
            )
        }

        // 2. Deadline / Task detection
        val deadlineMatcher = DEADLINE_REGEX.matcher(text)
        if (deadlineMatcher.find()) {
            val due = deadlineMatcher.group()
            return FollowUpItem(
                id = UUID.randomUUID().toString(),
                sender = sender,
                appName = app,
                type = FollowUpType.TASK_DEADLINE,
                actionDescription = "Follow up with $sender: '$text'",
                dueHint = due,
                rawTextSnippet = text
            )
        }

        // 3. Meeting coordination
        if (MEETING_REGEX.matcher(text).find()) {
            return FollowUpItem(
                id = UUID.randomUUID().toString(),
                sender = sender,
                appName = app,
                type = FollowUpType.MEETING,
                actionDescription = "Meeting with $sender",
                rawTextSnippet = text
            )
        }

        return null
    }
}
