package com.nova.companion.notification.intelligence.priority

import android.content.Context
import com.nova.companion.notification.intelligence.model.ContextualNotification
import com.nova.companion.notification.intelligence.model.MessageIntent
import com.nova.companion.notification.intelligence.model.MessageType
import com.nova.companion.notification.intelligence.model.PriorityLevel
import java.util.concurrent.ConcurrentHashMap

/**
 * Deterministic Notification Priority Engine
 *
 * Implements transparent, inspectable priority scoring rules (P0 to P4)
 * with structured decision explanations.
 */
object NotificationPriorityEngine {

    // Tracks recent missed call timestamps per sender for repeated-call emergency escalation
    private val recentMissedCalls = ConcurrentHashMap<String, MutableList<Long>>()
    private const val REPEATED_CALL_WINDOW_MS = 5 * 60 * 1000L // 5 minutes

    /**
     * Evaluate priority level and generate human-readable explanation.
     */
    fun evaluatePriority(
        context: Context,
        notification: ContextualNotification
    ): Pair<PriorityLevel, String> {
        val cleanSender = notification.cleanSender.trim()
        val summary = notification.summary.trim()
        val isVip = NotificationVipRegistry.isVip(context, cleanSender)

        // 1. Rule P0 (Critical / Emergency):
        // Repeated missed calls from the same sender within 5 minutes
        if (notification.messageType == MessageType.MISSED_CALL) {
            val now = System.currentTimeMillis()
            val callList = recentMissedCalls.getOrPut(cleanSender.lowercase()) { mutableListOf() }
            synchronized(callList) {
                callList.removeIf { now - it > REPEATED_CALL_WINDOW_MS }
                callList.add(now)
                if (callList.size >= 2) {
                    return Pair(
                        PriorityLevel.P0_CRITICAL,
                        "P0: Repeated missed call (${callList.size} in 5 min) from $cleanSender"
                    )
                }
            }
        }

        // Critical safety keywords
        if (summary.contains("emergency", ignoreCase = true) ||
            summary.contains("urgent help", ignoreCase = true) ||
            summary.contains("hospital", ignoreCase = true)
        ) {
            return Pair(
                PriorityLevel.P0_CRITICAL,
                "P0: Critical safety keyword detected in content"
            )
        }

        // 2. Rule P4 (Suppressed):
        // Promotional, newsletters, coupon codes, marketing
        if (notification.messageType == MessageType.PROMOTIONAL) {
            return Pair(
                PriorityLevel.P4_SUPPRESSED,
                "P4: Promotional/marketing content automatically suppressed"
            )
        }

        // 3. Rule P1 (High):
        // VIP contacts, direct questions requiring reply, single missed calls from known contacts
        if (isVip) {
            return Pair(
                PriorityLevel.P1_HIGH,
                "P1: Sender '$cleanSender' is an enrolled VIP contact"
            )
        }

        if (notification.messageType == MessageType.MISSED_CALL) {
            return Pair(
                PriorityLevel.P1_HIGH,
                "P1: Missed call notification"
            )
        }

        if (notification.messageIntent == MessageIntent.QUESTION && notification.messageType == MessageType.DIRECT) {
            return Pair(
                PriorityLevel.P1_HIGH,
                "P1: Direct personal question requiring user response"
            )
        }

        if (notification.messageIntent == MessageIntent.ACTION_REQUIRED && notification.messageType == MessageType.DIRECT) {
            return Pair(
                PriorityLevel.P1_HIGH,
                "P1: Direct urgent action requested by sender"
            )
        }

        // 4. Rule P2 (Normal):
        // Direct personal messages from messaging apps
        if (notification.messageType == MessageType.DIRECT || notification.messageType == MessageType.OTP) {
            return Pair(
                PriorityLevel.P2_NORMAL,
                "P2: Standard 1-on-1 direct message or security verification"
            )
        }

        // 5. Rule P3 (Low):
        // Group messages, non-urgent updates
        if (notification.messageType == MessageType.GROUP) {
            return Pair(
                PriorityLevel.P3_LOW,
                "P3: Group conversation message"
            )
        }

        // Fallback default
        return Pair(
            PriorityLevel.P2_NORMAL,
            "P2: Default standard priority"
        )
    }
}
