package com.nova.companion.notification.normalization

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationContactNameNormalizerTest {

    @Test
    fun testEmojiPrefixAndSuffixStripped() {
        assertEquals("Harish", NotificationContactNameNormalizer.normalizeForSpeech("🔥 Harish ❤️"))
        assertEquals("Rahul", NotificationContactNameNormalizer.normalizeForSpeech("👑 Rahul"))
        assertEquals("Arun Kumar", NotificationContactNameNormalizer.normalizeForSpeech("🦁 Arun Kumar"))
        assertEquals("Priya", NotificationContactNameNormalizer.normalizeForSpeech("❤️ Priya 🌸"))
        assertEquals("Vicky", NotificationContactNameNormalizer.normalizeForSpeech("⚡ Vicky 🔥"))
    }

    @Test
    fun testIndianRegionalScriptsPreserved() {
        // Tamil
        assertEquals("ஹரிஷ்", NotificationContactNameNormalizer.normalizeForSpeech("🔥 ஹரிஷ் ❤️"))
        // Hindi / Devanagari
        assertEquals("राहुल", NotificationContactNameNormalizer.normalizeForSpeech("👑 राहुल ⚡"))
    }

    @Test
    fun testNamesWithPunctuation() {
        assertEquals("Dr. Smith", NotificationContactNameNormalizer.normalizeForSpeech("Dr. Smith"))
        assertEquals("Mary-Jane", NotificationContactNameNormalizer.normalizeForSpeech("🌟 Mary-Jane 🌟"))
        assertEquals("O'Connor", NotificationContactNameNormalizer.normalizeForSpeech("O'Connor"))
    }

    @Test
    fun testEmojiOnlyFallback() {
        assertEquals("Someone", NotificationContactNameNormalizer.normalizeForSpeech("🔥❤️"))
        assertEquals("Someone", NotificationContactNameNormalizer.normalizeForSpeech("👑"))
        assertEquals("Someone", NotificationContactNameNormalizer.normalizeForSpeech(null))
        assertEquals("Someone", NotificationContactNameNormalizer.normalizeForSpeech("   "))
    }
}
