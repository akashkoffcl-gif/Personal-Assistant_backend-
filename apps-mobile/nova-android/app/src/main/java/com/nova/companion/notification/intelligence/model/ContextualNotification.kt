package com.nova.companion.notification.intelligence.model

/**
 * Rich contextual representation of an intercepted notification.
 */
data class ContextualNotification(
    val eventId: String,
    val packageName: String,
    val appName: String,
    val rawSender: String,
    val cleanSender: String,
    val conversationTitle: String? = null,
    val summary: String,
    val messageType: MessageType,
    val messageIntent: MessageIntent,
    val priority: PriorityLevel = PriorityLevel.P2_NORMAL,
    val priorityExplanation: String = "Default classification",
    val isGroup: Boolean = false,
    val isVip: Boolean = false,
    val isOngoingThread: Boolean = false,
    val confidenceScore: Float = 1.0f,
    val classificationEvidence: List<String> = emptyList(),
    val timestamp: Long = System.currentTimeMillis()
)
