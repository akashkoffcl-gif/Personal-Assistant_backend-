package com.nova.companion.notification.normalization

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationContentFilterTest {

    @Test
    fun testPhotoNotificationCategorized() {
        val result = NotificationContentFilter.filterContent("Harish", "Photo")
        assertEquals(NotificationContentType.IMAGE_MESSAGE, result.contentType)
        assertEquals("sent you a photo", result.spokenText)
    }

    @Test
    fun testVoiceMessageNotificationCategorized() {
        val result = NotificationContentFilter.filterContent("Priya", "Voice message")
        assertEquals(NotificationContentType.VOICE_MESSAGE, result.contentType)
        assertEquals("sent you a voice message", result.spokenText)
    }

    @Test
    fun testVideoMessageNotificationCategorized() {
        val result = NotificationContentFilter.filterContent("Rahul", "Video")
        assertEquals(NotificationContentType.VIDEO_MESSAGE, result.contentType)
        assertEquals("sent you a video", result.spokenText)
    }

    @Test
    fun testMultipleMessagesNotificationCategorized() {
        val result = NotificationContentFilter.filterContent("Arun", "3 new messages")
        assertEquals(NotificationContentType.MULTIPLE_MESSAGES, result.contentType)
        assertEquals(3, result.messageCount)
        assertEquals("sent you 3 messages", result.spokenText)
    }

    @Test
    fun testMissedCallNotificationCategorized() {
        val result = NotificationContentFilter.filterContent("Harish", "Missed voice call")
        assertEquals(NotificationContentType.MISSED_CALL, result.contentType)
        assertEquals("called you, but you missed it", result.spokenText)
    }

    @Test
    fun testStandardTextMessage() {
        val result = NotificationContentFilter.filterContent("Harish", "Please call me when you are free")
        assertEquals(NotificationContentType.TEXT_MESSAGE, result.contentType)
        assertEquals("says: Please call me when you are free", result.spokenText)
    }
}
