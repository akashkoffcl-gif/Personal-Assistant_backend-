package com.nova.companion.notification.intelligence.classifier

import android.app.Notification
import android.os.Bundle
import androidx.core.app.NotificationCompat
import com.nova.companion.notification.intelligence.model.ContextualNotification
import com.nova.companion.notification.intelligence.model.MessageIntent
import com.nova.companion.notification.intelligence.model.MessageType
import java.util.regex.Pattern

/**
 * ContextualClassifier
 *
 * Inspects Notification extras, flags, categories, and titles to extract
 * semantic classification (MessageType, clean sender, conversation group).
 */
object ContextualClassifier {

    private val OTP_REGEX = Pattern.compile(
        "\\b(verification code|security code|otp|one time password|is your login code|use code|pin is|do not share)\\b|\\b\\d{4,8}\\b",
        Pattern.CASE_INSENSITIVE
    )

    private val PROMOTIONAL_REGEX = Pattern.compile(
        "\\b(discount|off sale|cashback|promo|promocode|limited offer|buy now|voucher|coupon|free delivery|deal of the day|order now)\\b",
        Pattern.CASE_INSENSITIVE
    )

    private val MISSED_CALL_REGEX = Pattern.compile(
        "\\b(missed call|missed voice call|missed video call)\\b",
        Pattern.CASE_INSENSITIVE
    )

    /**
     * Parse raw notification fields and optional Bundle extras into a ContextualNotification.
     */
    fun classify(
        eventId: String,
        packageName: String,
        appName: String,
        rawTitle: String,
        rawSummary: String,
        extras: Bundle? = null,
        notificationCategory: String? = null
    ): ContextualNotification {
        val evidence = mutableListOf<String>()
        var messageType = MessageType.UNKNOWN
        var cleanSender = rawTitle.trim()
        var conversationTitle: String? = null
        var isGroup = false

        val text = rawSummary.trim()
        val combined = "$rawTitle $text".trim()

        // 1. Check for Missed Call
        val isCallCategory = notificationCategory == Notification.CATEGORY_CALL ||
                notificationCategory == NotificationCompat.CATEGORY_MISSED_CALL
        if (isCallCategory || MISSED_CALL_REGEX.matcher(combined).find()) {
            messageType = MessageType.MISSED_CALL
            evidence.add("Missed call detected via category or text pattern")
            // Clean up sender if title is "Missed call" and text has contact name
            if (rawTitle.contains("missed call", ignoreCase = true) && text.isNotBlank()) {
                cleanSender = text
            }
        }

        // 2. Check for OTP / 2FA Verification
        if (messageType == MessageType.UNKNOWN) {
            val otpMatcher = OTP_REGEX.matcher(combined)
            if (otpMatcher.find() && (combined.contains("code", ignoreCase = true) || combined.contains("otp", ignoreCase = true))) {
                messageType = MessageType.OTP
                evidence.add("Authentication/OTP pattern detected: '${otpMatcher.group()}'")
            }
        }

        // 3. Check for Group Conversation
        if (messageType == MessageType.UNKNOWN) {
            // Android MessagingStyle extras check
            val isGroupExtra = extras?.getBoolean(NotificationCompat.EXTRA_IS_GROUP_CONVERSATION) ?: false
            val convTitleExtra = extras?.getCharSequence(NotificationCompat.EXTRA_CONVERSATION_TITLE)?.toString()
            val subText = extras?.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()

            if (isGroupExtra || !convTitleExtra.isNullOrBlank()) {
                messageType = MessageType.GROUP
                isGroup = true
                conversationTitle = convTitleExtra ?: subText ?: "Group"
                evidence.add("Android MessagingStyle group conversation flag confirmed")
            } else if (rawTitle.contains(":") || rawTitle.contains("@")) {
                // Heuristic delimiter check (e.g. "College Group: Harish" or "Harish @ Work")
                if (rawTitle.contains(":")) {
                    val parts = rawTitle.split(":", limit = 2)
                    conversationTitle = parts[0].trim()
                    cleanSender = parts[1].trim()
                    messageType = MessageType.GROUP
                    isGroup = true
                    evidence.add("Delimiter ':' group pattern parsed: [$conversationTitle -> $cleanSender]")
                }
            }
        }

        // 4. Check for Promotional / Marketing Messages
        if (messageType == MessageType.UNKNOWN) {
            val promoMatcher = PROMOTIONAL_REGEX.matcher(combined)
            if (promoMatcher.find()) {
                messageType = MessageType.PROMOTIONAL
                evidence.add("Promotional / Marketing keyword detected: '${promoMatcher.group()}'")
            }
        }

        // 5. Check for Direct Messaging from Communication Apps
        if (messageType == MessageType.UNKNOWN) {
            val isCommApp = packageName.contains("whatsapp") ||
                    packageName.contains("instagram") ||
                    packageName.contains("messaging") ||
                    packageName.contains("telegram") ||
                    packageName.contains("signal")

            if (isCommApp) {
                messageType = MessageType.DIRECT
                evidence.add("Direct message inferred from verified communication package: $packageName")
            } else {
                messageType = MessageType.SYSTEM
                evidence.add("Defaulted to system/general notification")
            }
        }

        // Classify Intent
        val (intent, intentEvidence) = IntentClassifier.classifyIntent(text)
        evidence.addAll(intentEvidence)

        // Normalize Sender Name for Natural Speech (Phase 69.5.1)
        val normalizedSender = com.nova.companion.notification.normalization.NotificationContactNameNormalizer.normalizeForSpeech(cleanSender)

        return ContextualNotification(
            eventId = eventId,
            packageName = packageName,
            appName = appName,
            rawSender = rawTitle,
            cleanSender = if (normalizedSender.isBlank() || normalizedSender.equals("Someone", ignoreCase = true)) {
                if (cleanSender.isNotBlank()) cleanSender else appName
            } else normalizedSender,
            conversationTitle = conversationTitle,
            summary = text,
            messageType = messageType,
            messageIntent = intent,
            isGroup = isGroup,
            confidenceScore = if (evidence.isNotEmpty()) 0.95f else 0.70f,
            classificationEvidence = evidence,
            timestamp = System.currentTimeMillis()
        )
    }
}
