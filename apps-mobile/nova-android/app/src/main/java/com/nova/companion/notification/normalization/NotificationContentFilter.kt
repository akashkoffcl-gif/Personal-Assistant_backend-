package com.nova.companion.notification.normalization

/**
 * Categorized notification content type for conversational phrasing.
 */
enum class NotificationContentType {
    TEXT_MESSAGE,
    MULTIPLE_MESSAGES,
    IMAGE_MESSAGE,
    VIDEO_MESSAGE,
    VOICE_MESSAGE,
    MISSED_CALL,
    INCOMING_CALL,
    OUTGOING_CALL,
    SYSTEM_NOTIFICATION,
    GROUP_MESSAGE,
    UNKNOWN
}

data class FilteredNotificationContent(
    val contentType: NotificationContentType,
    val spokenText: String,
    val messageCount: Int = 1,
    val isGroup: Boolean = false,
    val groupTitle: String? = null,
    val isOutgoing: Boolean = false
)

/**
 * NotificationContentFilter
 *
 * Sanitizes and normalizes notification content, identifies media/calls/groups,
 * and eliminates duplicate boilerplates and technical metadata.
 */
object NotificationContentFilter {

    private val MEDIA_PHOTO_PATTERN = Regex("(?i)\\b(photo|image|picture)\\b")
    private val MEDIA_VIDEO_PATTERN = Regex("(?i)\\b(video)\\b")
    private val MEDIA_VOICE_PATTERN = Regex("(?i)\\b(voice message|audio message|voice note)\\b")
    private val MULTI_MSG_PATTERN = Regex("(?i)(\\d+)\\s+(new\\s+)?messages?")

    /**
     * Filters and categorizes raw notification summary and title.
     */
    fun filterContent(
        rawTitle: String,
        rawSummary: String,
        isGroupChat: Boolean = false,
        groupName: String? = null
    ): FilteredNotificationContent {
        val trimmedTitle = rawTitle.trim()
        val trimmedSummary = rawSummary.trim()

        // 1. Check for multi-message summary (e.g. "3 new messages")
        val multiMatch = MULTI_MSG_PATTERN.find(trimmedSummary) ?: MULTI_MSG_PATTERN.find(trimmedTitle)
        if (multiMatch != null) {
            val count = multiMatch.groupValues[1].toIntOrNull() ?: 2
            return FilteredNotificationContent(
                contentType = NotificationContentType.MULTIPLE_MESSAGES,
                spokenText = "sent you $count messages",
                messageCount = count,
                isGroup = isGroupChat,
                groupTitle = groupName
            )
        }

        // 2. Check for Voice Message
        if (MEDIA_VOICE_PATTERN.containsMatchIn(trimmedSummary)) {
            return FilteredNotificationContent(
                contentType = NotificationContentType.VOICE_MESSAGE,
                spokenText = "sent you a voice message",
                isGroup = isGroupChat,
                groupTitle = groupName
            )
        }

        // 3. Check for Photo / Image
        if (MEDIA_PHOTO_PATTERN.containsMatchIn(trimmedSummary)) {
            return FilteredNotificationContent(
                contentType = NotificationContentType.IMAGE_MESSAGE,
                spokenText = "sent you a photo",
                isGroup = isGroupChat,
                groupTitle = groupName
            )
        }

        // 4. Check for Video
        if (MEDIA_VIDEO_PATTERN.containsMatchIn(trimmedSummary)) {
            return FilteredNotificationContent(
                contentType = NotificationContentType.VIDEO_MESSAGE,
                spokenText = "sent you a video",
                isGroup = isGroupChat,
                groupTitle = groupName
            )
        }

        // 5. Check for Missed Call
        if (trimmedSummary.contains("missed call", ignoreCase = true) || trimmedTitle.contains("missed call", ignoreCase = true)) {
            return FilteredNotificationContent(
                contentType = NotificationContentType.MISSED_CALL,
                spokenText = "called you, but you missed it",
                isGroup = false
            )
        }

        // 6. Regular Text Message: Sanitize excessive boilerplate/emojis
        val cleanSummary = sanitizeMessageBody(trimmedSummary)
        val textToSpeak = if (cleanSummary.isNotBlank()) {
            "says: $cleanSummary"
        } else {
            "sent you a message"
        }

        return FilteredNotificationContent(
            contentType = if (isGroupChat) NotificationContentType.GROUP_MESSAGE else NotificationContentType.TEXT_MESSAGE,
            spokenText = textToSpeak,
            isGroup = isGroupChat,
            groupTitle = groupName
        )
    }

    private fun sanitizeMessageBody(text: String): String {
        var clean = text
        // Remove repeated newlines or tabs
        clean = clean.replace(Regex("[\\r\\n\\t]+"), " ")
        // Remove redundant trailing whitespace
        clean = clean.trim()
        // If message is purely emojis or empty, fallback cleanly
        if (clean.isBlank()) return ""
        return clean
    }
}
