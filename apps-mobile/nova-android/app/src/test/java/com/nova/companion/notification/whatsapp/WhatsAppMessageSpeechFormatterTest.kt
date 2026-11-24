package com.nova.companion.notification.whatsapp

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WhatsAppMessageSpeechFormatterTest {

    @Test
    fun testNaturalSpeechFormatting_DirectMessage() {
        // Requirement 1: Harish sends "Hii" -> "Akash, Harish sent you a message: Hii."
        val speech = WhatsAppMessageSpeechFormatter.formatAnnouncement(
            userName = "Akash",
            rawSender = "Harish",
            messageBody = "Hii"
        )
        assertEquals("Akash, Harish sent you a message: Hii.", speech)
    }

    @Test
    fun testNaturalSpeechFormatting_EmojiDecoratedSender() {
        // Requirement 12: Emoji-decorated contact name -> clean spoken name
        val speech = WhatsAppMessageSpeechFormatter.formatAnnouncement(
            userName = "Akash",
            rawSender = "🔥 Harish ❤️",
            messageBody = "Are you coming?"
        )
        assertEquals("Akash, Harish sent you a message: Are you coming?.", speech)
    }

    @Test
    fun testNaturalSpeechFormatting_GroupMessage() {
        // Requirement 11: Group message -> correct sender, group and exact content
        val speech = WhatsAppMessageSpeechFormatter.formatAnnouncement(
            userName = "Akash",
            rawSender = "Harish",
            messageBody = "Meeting in 5 mins",
            conversationTitle = "Sprint Team",
            isGroup = true
        )
        assertEquals("Akash, Harish in Sprint Team sent you a message: Meeting in 5 mins.", speech)
    }

    @Test
    fun testNaturalSpeechFormatting_BlankBody_Silent() {
        // Requirement 13: Missing message body -> silent
        val speech = WhatsAppMessageSpeechFormatter.formatAnnouncement(
            userName = "Akash",
            rawSender = "Harish",
            messageBody = "   "
        )
        assertEquals("", speech)
    }

    @Test
    fun testNaturalSpeechFormatting_DynamicOwner() {
        // Requirement: Do not hardcode Akash
        val speech = WhatsAppMessageSpeechFormatter.formatAnnouncement(
            userName = "Vikram",
            rawSender = "Rahul",
            messageBody = "Check your email."
        )
        assertEquals("Vikram, Rahul sent you a message: Check your email..", speech)
    }
}
