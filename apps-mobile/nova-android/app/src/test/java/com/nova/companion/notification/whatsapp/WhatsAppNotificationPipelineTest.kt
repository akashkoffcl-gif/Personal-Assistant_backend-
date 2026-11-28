package com.nova.companion.notification.whatsapp

import android.app.Notification
import android.os.Bundle
import com.nova.companion.notification.engine.EventSpeechDeliveryCoordinator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class WhatsAppNotificationPipelineTest {

    @Before
    fun setUp() {
        EventSpeechDeliveryCoordinator.clearAll()
    }

    private fun classify(
        packageName: String = "com.whatsapp",
        title: String? = null,
        text: String? = null,
        category: String? = null,
        isGroup: Boolean = false,
        conversationTitle: String? = null,
        postTime: Long = System.currentTimeMillis(),
        key: String = "0|com.whatsapp|1|null|10298"
    ): WhatsAppNotificationClassifier.ClassificationResult {
        val extras = Bundle()
        if (title != null) extras.putString(Notification.EXTRA_TITLE, title)
        if (text != null) extras.putString(Notification.EXTRA_TEXT, text)
        if (isGroup) extras.putBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION, true)
        if (conversationTitle != null) extras.putString(Notification.EXTRA_CONVERSATION_TITLE, conversationTitle)

        return WhatsAppNotificationClassifier.classifyRaw(
            packageName = packageName,
            category = category,
            extras = extras,
            sbnKey = key,
            postTime = postTime
        )
    }

    // 1. Harish sends "Hii" -> correct natural announcement
    @Test
    fun testCase1_HarishSendsHii() {
        val result = classify(title = "Harish", text = "Hii")
        assertTrue(result.isEligibleForSpeech)
        assertEquals("Harish", result.sender)
        assertEquals("Hii", result.messageBody)

        val speech = WhatsAppMessageSpeechFormatter.formatAnnouncement(
            userName = "Akash",
            rawSender = result.sender!!,
            messageBody = result.messageBody!!
        )
        assertEquals("Akash, Harish sent you a message: Hii.", speech)
    }

    // 2. Two different incoming messages -> both announced once
    @Test
    fun testCase2_TwoDifferentIncomingMessages() {
        val res1 = classify(title = "Harish", text = "Hii", postTime = 1000L, key = "key1")
        val res2 = classify(title = "Harish", text = "Are you free?", postTime = 2000L, key = "key2")

        assertTrue(res1.isEligibleForSpeech)
        assertTrue(res2.isEligibleForSpeech)

        assertTrue(EventSpeechDeliveryCoordinator.tryClaimForSpeech(res1.messageIdentity!!))
        assertTrue(EventSpeechDeliveryCoordinator.tryClaimForSpeech(res2.messageIdentity!!))
    }

    // 3. Two identical messages with distinct message identities -> both announced
    @Test
    fun testCase3_TwoIdenticalMessagesWithDistinctIdentities() {
        val res1 = classify(title = "Harish", text = "Hii", postTime = 1000L, key = "key1")
        val res2 = classify(title = "Harish", text = "Hii", postTime = 5000L, key = "key2")

        assertTrue(res1.isEligibleForSpeech)
        assertTrue(res2.isEligibleForSpeech)

        assertTrue(EventSpeechDeliveryCoordinator.tryClaimForSpeech(res1.messageIdentity!!))
        assertTrue(EventSpeechDeliveryCoordinator.tryClaimForSpeech(res2.messageIdentity!!))
    }

    // 4. Missed call -> silent
    @Test
    fun testCase4_MissedCall_Silent() {
        val result = classify(title = "Harish", text = "Missed voice call", category = Notification.CATEGORY_MISSED_CALL)
        assertFalse(result.isEligibleForSpeech)
        assertEquals(WhatsAppNotificationClassifier.WhatsAppEventType.MISSED_CALL, result.eventType)
    }

    // 5. Sending message -> silent
    @Test
    fun testCase5_SendingMessage_Silent() {
        val result = classify(title = "WhatsApp", text = "Sending message...")
        assertFalse(result.isEligibleForSpeech)
        assertEquals(WhatsAppNotificationClassifier.WhatsAppEventType.OUTGOING_STATUS, result.eventType)
    }

    // 6. Sent confirmation -> silent
    @Test
    fun testCase6_SentConfirmation_Silent() {
        val result = classify(title = "WhatsApp", text = "Message sent")
        assertFalse(result.isEligibleForSpeech)
        assertEquals(WhatsAppNotificationClassifier.WhatsAppEventType.OUTGOING_STATUS, result.eventType)
    }

    // 7. Delivered/read status -> silent
    @Test
    fun testCase7_DeliveredReadStatus_Silent() {
        val result = classify(title = "WhatsApp", text = "Read receipt")
        assertFalse(result.isEligibleForSpeech)
        assertEquals(WhatsAppNotificationClassifier.WhatsAppEventType.DELIVERY_STATUS, result.eventType)
    }

    // 8. Typing indicator -> silent
    @Test
    fun testCase8_TypingIndicator_Silent() {
        val result = classify(title = "Harish", text = "is typing...")
        assertFalse(result.isEligibleForSpeech)
        assertEquals(WhatsAppNotificationClassifier.WhatsAppEventType.TYPING_INDICATOR, result.eventType)
    }

    // 9. Unknown notification -> silent
    @Test
    fun testCase9_UnknownNotification_Silent() {
        val result = classify(title = "WhatsApp", text = "Checking for new messages")
        assertFalse(result.isEligibleForSpeech)
        assertEquals(WhatsAppNotificationClassifier.WhatsAppEventType.SERVICE_NOTIFICATION, result.eventType)
    }

    // 10. Duplicate notification callback -> one announcement
    @Test
    fun testCase10_DuplicateNotificationCallback_OneAnnouncement() {
        val res = classify(title = "Harish", text = "Hii", postTime = 1000L, key = "key1")

        assertTrue(EventSpeechDeliveryCoordinator.tryClaimForSpeech(res.messageIdentity!!))
        // Attempt duplicate claim with exact same messageIdentity
        assertFalse(EventSpeechDeliveryCoordinator.tryClaimForSpeech(res.messageIdentity!!))
    }

    // 11. Group message -> correct sender and exact content
    @Test
    fun testCase11_GroupMessage() {
        val result = classify(
            title = "Sprint Team",
            text = "Harish: Please review PR",
            isGroup = true,
            conversationTitle = "Sprint Team"
        )
        assertTrue(result.isEligibleForSpeech)
        assertEquals("Harish", result.sender)
        assertEquals("Please review PR", result.messageBody)
        assertTrue(result.isGroup)

        val speech = WhatsAppMessageSpeechFormatter.formatAnnouncement(
            userName = "Akash",
            rawSender = result.sender!!,
            messageBody = result.messageBody!!,
            conversationTitle = "Sprint Team",
            isGroup = true
        )
        assertEquals("Akash, Harish in Sprint Team sent you a message: Please review PR.", speech)
    }

    // 12. Emoji-decorated contact name -> clean spoken name
    @Test
    fun testCase12_EmojiDecoratedContactName() {
        val result = classify(title = "🔥 Harish ❤️", text = "Where are you?")
        assertTrue(result.isEligibleForSpeech)

        val speech = WhatsAppMessageSpeechFormatter.formatAnnouncement(
            userName = "Akash",
            rawSender = result.sender!!,
            messageBody = result.messageBody!!
        )
        assertEquals("Akash, Harish sent you a message: Where are you?.", speech)
    }

    // 13. Missing message body -> silent
    @Test
    fun testCase13_MissingMessageBody_Silent() {
        val result = classify(title = "Harish", text = "")
        assertFalse(result.isEligibleForSpeech)
    }

    // 14. Unauthorized app -> no capture or speech
    @Test
    fun testCase14_UnauthorizedApp() {
        assertFalse(WhatsAppNotificationClassifier.isWhatsAppPackage("com.unauthorized.messenger"))
        val result = classify(packageName = "com.unauthorized.messenger", title = "Spam", text = "Win $1000")
        assertFalse(result.isEligibleForSpeech)
    }
}
