package com.nova.companion.voice.arbitration

import android.content.Context
import android.util.Log
import com.nova.companion.voice.NovaSpeechSynthesisManager
import java.util.concurrent.PriorityBlockingQueue

enum class UtterancePriority(val weight: Int) {
    EMERGENCY(100),
    COMMAND_RESPONSE(80),
    ACTIVE_CONVERSATION(60),
    NOTIFICATION_ANNOUNCEMENT(40),
    BACKGROUND_INFO(20)
}

data class ArbitratedUtterance(
    val id: String,
    val text: String,
    val priority: UtterancePriority,
    val timestamp: Long = System.currentTimeMillis(),
    val onStart: (() -> Unit)? = null,
    val onDone: (() -> Unit)? = null,
    val onError: (() -> Unit)? = null
) : Comparable<ArbitratedUtterance> {
    override fun compareTo(other: ArbitratedUtterance): Int {
        // Higher weight first
        val weightComp = other.priority.weight.compareTo(this.priority.weight)
        return if (weightComp != 0) weightComp else this.timestamp.compareTo(other.timestamp)
    }
}

class SpeechArbitrator private constructor(private val context: Context) {

    companion object {
        private const val TAG = "SpeechArbitrator"

        @Volatile
        private var INSTANCE: SpeechArbitrator? = null

        fun getInstance(context: Context): SpeechArbitrator {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: SpeechArbitrator(context.applicationContext).also { INSTANCE = it }
            }
        }
    }

    private val speechQueue = PriorityBlockingQueue<ArbitratedUtterance>()
    @Volatile
    private var currentUtterance: ArbitratedUtterance? = null

    private val ttsManager = NovaSpeechSynthesisManager(context) {
        // Speech completed callback
        handleUtteranceCompleted()
    }

    @Synchronized
    fun enqueueUtterance(utterance: ArbitratedUtterance) {
        // If current utterance is lower priority, interrupt it
        val current = currentUtterance
        if (current != null && utterance.priority.weight > current.priority.weight + 20) {
            Log.i(TAG, "Preempting [${current.id}] (priority ${current.priority}) for higher priority [${utterance.id}] (priority ${utterance.priority})")
            ttsManager.stop()
            current.onDone?.invoke()
            currentUtterance = null
        }

        speechQueue.offer(utterance)
        processNextUtterance()
    }

    @Synchronized
    private fun processNextUtterance() {
        if (currentUtterance != null || ttsManager.isSpeaking()) {
            return
        }

        val next = speechQueue.poll() ?: return
        currentUtterance = next

        Log.i(TAG, "Speaking utterance [${next.id}] (${next.priority}): \"${next.text.take(40)}...\"")
        next.onStart?.invoke()
        ttsManager.speak(next.text, utteranceId = next.id)
    }

    @Synchronized
    private fun handleUtteranceCompleted() {
        val finished = currentUtterance
        Log.i(TAG, "Utterance completed: [${finished?.id}]")
        finished?.onDone?.invoke()
        currentUtterance = null
        processNextUtterance()
    }

    @Synchronized
    fun stopAllSpeech() {
        speechQueue.clear()
        currentUtterance = null
        ttsManager.stop()
        Log.i(TAG, "Stopped all arbitrated speech and cleared queue")
    }

    fun isSpeaking(): Boolean = ttsManager.isSpeaking()
}
