package com.nova.companion.notification.whatsapp

import android.app.Notification
import android.os.Bundle
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * WhatsAppNotificationClassifier
 *
 * Classifies WhatsApp StatusBarNotifications to ensure ONLY genuine incoming messages
 * are eligible for the speech delivery pipeline.
 *
 * Explicitly rejects:
 * - Missed calls
 * - Incoming or active call notifications
 * - Outgoing messages
 * - Sending message status (e.g. "Sending message...", "Sending...")
 * - Message sent confirmations (e.g. "Message sent")
 * - Delivery and read receipts
 * - Typing indicators (e.g. "typing...")
 * - WhatsApp service / background notifications (e.g. Web active, Backup in progress, Checking for new messages)
 * - Empty or unextractable content
 */
object WhatsAppNotificationClassifier {

    private const val TAG = "WhatsAppClassifier"
    const val WHATSAPP_PACKAGE = "com.whatsapp"
    const val WHATSAPP_BUSINESS_PACKAGE = "com.whatsapp.w4b"

    enum class WhatsAppEventType {
        INCOMING_MESSAGE,
        MISSED_CALL,
        CALL_NOTIFICATION,
        OUTGOING_STATUS,
        DELIVERY_STATUS,
        TYPING_INDICATOR,
        SERVICE_NOTIFICATION,
        UNKNOWN_INELIGIBLE
    }

    data class ClassificationResult(
        val eventType: WhatsAppEventType,
        val isEligibleForSpeech: Boolean,
        val sender: String? = null,
        val messageBody: String? = null,
        val conversationTitle: String? = null,
        val isGroup: Boolean = false,
        val messageIdentity: String? = null,
        val rejectionReason: String? = null
    )

    fun isWhatsAppPackage(packageName: String?): Boolean {
        if (packageName == null) return false
        val pkg = packageName.lowercase()
        return pkg == WHATSAPP_PACKAGE || pkg == WHATSAPP_BUSINESS_PACKAGE
    }

    /**
     * Inspects a StatusBarNotification from WhatsApp and determines eligibility for spoken delivery.
     */
    fun classify(sbn: StatusBarNotification): ClassificationResult {
        val packageName = sbn.packageName ?: return ClassificationResult(
            eventType = WhatsAppEventType.UNKNOWN_INELIGIBLE,
            isEligibleForSpeech = false,
            rejectionReason = "Null package name"
        )

        if (!isWhatsAppPackage(packageName)) {
            return ClassificationResult(
                eventType = WhatsAppEventType.UNKNOWN_INELIGIBLE,
                isEligibleForSpeech = false,
                rejectionReason = "Not a WhatsApp package: $packageName"
            )
        }

        val notification = sbn.notification ?: return ClassificationResult(
            eventType = WhatsAppEventType.UNKNOWN_INELIGIBLE,
            isEligibleForSpeech = false,
            rejectionReason = "Null notification"
        )

        // 1. Check Notification Category
        val category = notification.category
        if (category == Notification.CATEGORY_CALL) {
            return ClassificationResult(
                eventType = WhatsAppEventType.CALL_NOTIFICATION,
                isEligibleForSpeech = false,
                rejectionReason = "Category is CALL"
            )
        }
        if (category == Notification.CATEGORY_MISSED_CALL) {
            return ClassificationResult(
                eventType = WhatsAppEventType.MISSED_CALL,
                isEligibleForSpeech = false,
                rejectionReason = "Category is MISSED_CALL"
            )
        }
        if (category == Notification.CATEGORY_SERVICE || category == Notification.CATEGORY_PROGRESS) {
            return ClassificationResult(
                eventType = WhatsAppEventType.SERVICE_NOTIFICATION,
                isEligibleForSpeech = false,
                rejectionReason = "Category is SERVICE or PROGRESS"
            )
        }

        val extras = notification.extras ?: Bundle()

        // 2. Extract Title and Text
        val rawTitle = (extras.getString(Notification.EXTRA_TITLE)
            ?: extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
            ?: "").trim()

        val rawText = (extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            ?: "").trim()

        val subText = (extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: "").trim()
        val infoText = (extras.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString() ?: "").trim()

        // 3. Filter Service / System / Status updates by Title / Text patterns
        val combinedText = "$rawTitle $rawText $subText $infoText".lowercase()

        // Missed Call check
        if (combinedText.contains("missed call") || combinedText.contains("missed voice call") || combinedText.contains("missed video call")) {
            return ClassificationResult(
                eventType = WhatsAppEventType.MISSED_CALL,
                isEligibleForSpeech = false,
                rejectionReason = "Contains missed call indicators"
            )
        }

        // Outgoing status & Sending status
        if (combinedText.contains("sending message") || combinedText.contains("sending...") ||
            combinedText.contains("message sent") || combinedText.startsWith("sending")
        ) {
            return ClassificationResult(
                eventType = WhatsAppEventType.OUTGOING_STATUS,
                isEligibleForSpeech = false,
                rejectionReason = "Outgoing message or sending status"
            )
        }

        // Delivery / Read status
        if (combinedText.contains("read receipt") || combinedText.contains("delivered to")) {
            return ClassificationResult(
                eventType = WhatsAppEventType.DELIVERY_STATUS,
                isEligibleForSpeech = false,
                rejectionReason = "Delivery or read status"
            )
        }

        // Typing indicator
        if (combinedText.contains("is typing...") || combinedText.contains("typing...") || combinedText.endsWith("typing")) {
            return ClassificationResult(
                eventType = WhatsAppEventType.TYPING_INDICATOR,
                isEligibleForSpeech = false,
                rejectionReason = "Typing indicator"
            )
        }

        // WhatsApp Web / Backup / Sync services
        if (combinedText.contains("whatsapp web") || combinedText.contains("backup in progress") ||
            combinedText.contains("checking for new messages") || combinedText.contains("finishing backup") ||
            combinedText.contains("restoring chat history")
        ) {
            return ClassificationResult(
                eventType = WhatsAppEventType.SERVICE_NOTIFICATION,
                isEligibleForSpeech = false,
                rejectionReason = "Background or sync service notification"
            )
        }

        // 4. Extract Genuine Message Content & Sender from MessagingStyle or Extras
        val extraction = extractMessageDetails(extras, rawTitle, rawText)
        if (extraction == null || extraction.messageBody.isBlank()) {
            return ClassificationResult(
                eventType = WhatsAppEventType.UNKNOWN_INELIGIBLE,
                isEligibleForSpeech = false,
                rejectionReason = "No genuine message content could be extracted"
            )
        }

        // Final sanity check on extracted body
        val bodyLower = extraction.messageBody.lowercase().trim()
        if (bodyLower == "sending message" || bodyLower == "sending..." ||
            bodyLower == "message sent" || bodyLower.contains("missed voice call") ||
            bodyLower.contains("missed video call") || bodyLower == "missed call"
        ) {
            return ClassificationResult(
                eventType = WhatsAppEventType.UNKNOWN_INELIGIBLE,
                isEligibleForSpeech = false,
                rejectionReason = "Extracted body contains status text: ${extraction.messageBody}"
            )
        }

        // Construct stable message identity (key, postTime, sender, content)
        val messageIdentity = "${sbn.key}|${extraction.sender}|${extraction.messageBody.hashCode()}|${sbn.postTime}"

        return ClassificationResult(
            eventType = WhatsAppEventType.INCOMING_MESSAGE,
            isEligibleForSpeech = true,
            sender = extraction.sender,
            messageBody = extraction.messageBody,
            conversationTitle = extraction.conversationTitle,
            isGroup = extraction.isGroup,
            messageIdentity = messageIdentity
        )
    }

    private data class ExtractedDetails(
        val sender: String,
        val messageBody: String,
        val conversationTitle: String? = null,
        val isGroup: Boolean = false
    )

    private fun extractMessageDetails(extras: Bundle, rawTitle: String, rawText: String): ExtractedDetails? {
        // Attempt 1: Android MessagingStyle EXTRA_MESSAGES
        val messagesArray = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
        if (!messagesArray.isNullOrEmpty()) {
            // Take the newest message (last in list)
            val lastMsgBundle = messagesArray.lastOrNull() as? Bundle
            if (lastMsgBundle != null) {
                val text = lastMsgBundle.getCharSequence("text")?.toString()?.trim()
                val senderPerson = lastMsgBundle.getCharSequence("sender")?.toString()?.trim()
                    ?: (lastMsgBundle.getBundle("sender_person")?.getCharSequence("name")?.toString()?.trim())

                val convTitle = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()?.trim()
                val isGroup = extras.getBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION, false) || !convTitle.isNullOrBlank()

                val resolvedSender = if (!senderPerson.isNullOrBlank()) {
                    senderPerson
                } else if (!rawTitle.isBlank()) {
                    rawTitle
                } else {
                    "Someone"
                }

                if (!text.isNullOrBlank()) {
                    return ExtractedDetails(
                        sender = resolvedSender,
                        messageBody = text,
                        conversationTitle = convTitle,
                        isGroup = isGroup
                    )
                }
            }
        }

        // Attempt 2: Direct EXTRA_TEXT and EXTRA_TITLE
        if (rawText.isNotBlank()) {
            val convTitle = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()?.trim()
            val isGroup = extras.getBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION, false)

            // Check if group message with format "Sender: Message" in rawText
            val colonIndex = rawText.indexOf(": ")
            if (isGroup && colonIndex > 0 && colonIndex < 35) {
                val groupSender = rawText.substring(0, colonIndex).trim()
                val body = rawText.substring(colonIndex + 2).trim()
                if (groupSender.isNotBlank() && body.isNotBlank()) {
                    return ExtractedDetails(
                        sender = groupSender,
                        messageBody = body,
                        conversationTitle = if (rawTitle.isNotBlank()) rawTitle else convTitle,
                        isGroup = true
                    )
                }
            }

            val resolvedSender = if (rawTitle.isNotBlank()) rawTitle else "Someone"
            return ExtractedDetails(
                sender = resolvedSender,
                messageBody = rawText,
                conversationTitle = convTitle,
                isGroup = isGroup
            )
        }

        return null
    }
}
