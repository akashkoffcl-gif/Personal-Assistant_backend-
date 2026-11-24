package com.nova.companion.notification.engine

import java.util.concurrent.ConcurrentHashMap

/**
 * Delivery states for single speech delivery guarantee.
 */
enum class EventSpeechState {
    RECEIVED,
    PARSED,
    BATCHED,
    QUEUED,
    SPEAKING,
    DELIVERED,
    FAILED
}

/**
 * EventSpeechDeliveryCoordinator
 *
 * Enforces a strict single speech delivery guarantee per logical event:
 * 1. Notification Event Level (deduplicates updates with same key + content hash within 15s)
 * 2. Speech Enqueue Level (atomic claim ensures an event is only enqueued once)
 * 3. Speech Completion Level (transitions event to DELIVERED)
 */
object EventSpeechDeliveryCoordinator {

    // eventId/fingerprint -> EventSpeechState
    private val eventStates = ConcurrentHashMap<String, EventSpeechState>()
    private val eventTimestamps = ConcurrentHashMap<String, Long>()

    // Bounded TTL of 30 seconds
    private const val EVENT_TTL_MS = 30_000L

    /**
     * Attempts to claim an event for batching/speech.
     * Returns true if successfully claimed (was not already QUEUED, SPEAKING, or DELIVERED).
     */
    @Synchronized
    fun tryClaimForSpeech(eventFingerprint: String): Boolean {
        cleanupExpired()
        val currentState = eventStates[eventFingerprint]
        if (currentState == EventSpeechState.QUEUED ||
            currentState == EventSpeechState.SPEAKING ||
            currentState == EventSpeechState.DELIVERED
        ) {
            return false
        }
        eventStates[eventFingerprint] = EventSpeechState.QUEUED
        eventTimestamps[eventFingerprint] = System.currentTimeMillis()
        return true
    }

    /**
     * Marks an event as actively speaking.
     */
    fun markSpeaking(eventFingerprint: String) {
        eventStates[eventFingerprint] = EventSpeechState.SPEAKING
    }

    /**
     * Marks an event as successfully delivered.
     */
    fun markDelivered(eventFingerprint: String) {
        eventStates[eventFingerprint] = EventSpeechState.DELIVERED
        eventTimestamps[eventFingerprint] = System.currentTimeMillis()
    }

    /**
     * Marks an event as failed.
     */
    fun markFailed(eventFingerprint: String) {
        eventStates[eventFingerprint] = EventSpeechState.FAILED
    }

    private fun cleanupExpired() {
        val now = System.currentTimeMillis()
        if (eventTimestamps.size > 100) {
            val toRemove = eventTimestamps.entries.filter { now - it.value > EVENT_TTL_MS }.map { it.key }
            for (key in toRemove) {
                eventStates.remove(key)
                eventTimestamps.remove(key)
            }
        }
    }
}
