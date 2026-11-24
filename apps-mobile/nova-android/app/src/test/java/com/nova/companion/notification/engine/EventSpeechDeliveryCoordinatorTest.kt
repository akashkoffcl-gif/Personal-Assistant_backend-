package com.nova.companion.notification.engine

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EventSpeechDeliveryCoordinatorTest {

    @Test
    fun testSingleClaimGuarantee() {
        val fingerprint = "com.whatsapp|Harish|Hello"
        assertTrue(EventSpeechDeliveryCoordinator.tryClaimForSpeech(fingerprint))
        // Subsequent claim while QUEUED must be rejected
        assertFalse(EventSpeechDeliveryCoordinator.tryClaimForSpeech(fingerprint))

        EventSpeechDeliveryCoordinator.markDelivered(fingerprint)
        // Subsequent claim while DELIVERED must be rejected
        assertFalse(EventSpeechDeliveryCoordinator.tryClaimForSpeech(fingerprint))
    }

    @Test
    fun testDistinctEventsClaimedSuccessfully() {
        val fp1 = "com.whatsapp|Harish|Message 1"
        val fp2 = "com.whatsapp|Harish|Message 2"
        assertTrue(EventSpeechDeliveryCoordinator.tryClaimForSpeech(fp1))
        assertTrue(EventSpeechDeliveryCoordinator.tryClaimForSpeech(fp2))
    }
}
