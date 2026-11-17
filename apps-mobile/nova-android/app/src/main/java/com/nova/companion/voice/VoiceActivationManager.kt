package com.nova.companion.voice

import android.content.Context
import android.util.Log

class VoiceActivationManager(
    private val context: Context,
    private val onStatusUpdate: ((VoiceStatusInfo) -> Unit)? = null
) {

    companion object {
        private const val TAG = "NovaVoiceActivation"
    }

    private val audioFocusManager = NovaAudioFocusManager(context)
    private val speechSynthesisManager = NovaSpeechSynthesisManager(context) {
        // Speech playback completed callback
        audioFocusManager.abandonAudioFocus()
        currentState = VoiceState.READY
        notifyStatus()
        // If wake word was enabled, resume listening
        if (isWakeWordEnabled) {
            wakeWordEngine.startListening()
        }
    }

    private val voiceSessionManager = VoiceSessionManager(
        context = context,
        audioFocusManager = audioFocusManager,
        speechSynthesisManager = speechSynthesisManager,
        onStateChanged = { state, payload ->
            currentState = state
            when (state) {
                VoiceState.LISTENING -> lastTranscript = payload
                VoiceState.PROCESSING -> lastTranscript = payload
                VoiceState.RESPONDING -> lastTranscript = payload
                VoiceState.ERROR -> lastError = payload
                VoiceState.READY -> {}
                VoiceState.DISABLED -> {}
            }
            notifyStatus()
        }
    )

    private val wakeWordEngine = WakeWordEngine(context) { keyword ->
        Log.i(TAG, "Wake word trigger from engine: $keyword")
        startVoiceSession()
    }

    private var currentState: VoiceState = VoiceState.READY
    private var isWakeWordEnabled: Boolean = false
    private var lastTranscript: String? = null
    private var lastError: String? = null

    fun startVoiceSession() {
        Log.i(TAG, "Starting manual or wake-word activated voice session")
        wakeWordEngine.stopListening()
        speechSynthesisManager.stop()
        currentState = VoiceState.LISTENING
        notifyStatus()
        voiceSessionManager.startListening()
    }

    fun stopVoiceSession() {
        Log.i(TAG, "Stopping voice session")
        voiceSessionManager.stopListening()
        speechSynthesisManager.stop()
        audioFocusManager.abandonAudioFocus()
        currentState = VoiceState.READY
        notifyStatus()

        if (isWakeWordEnabled) {
            wakeWordEngine.startListening()
        }
    }

    fun setWakeWordEnabled(enabled: Boolean): Boolean {
        Log.i(TAG, "Setting wake word enabled: $enabled")
        isWakeWordEnabled = enabled
        if (enabled) {
            wakeWordEngine.startListening()
        } else {
            wakeWordEngine.stopListening()
        }
        notifyStatus()
        return isWakeWordEnabled
    }

    fun isWakeWordEnabled(): Boolean = isWakeWordEnabled

    fun testSpeechOutput(text: String) {
        Log.i(TAG, "Triggering test speech output: $text")
        currentState = VoiceState.RESPONDING
        notifyStatus()
        audioFocusManager.requestAudioFocus()
        speechSynthesisManager.speak(text)
    }

    fun getVoiceStatus(): VoiceStatusInfo {
        return VoiceStatusInfo(
            state = currentState,
            isWakeWordActive = wakeWordEngine.isListening(),
            isTtsActive = speechSynthesisManager.isSpeaking(),
            isRecognitionAvailable = wakeWordEngine.isSupported(),
            lastTranscript = lastTranscript,
            lastError = lastError
        )
    }

    private fun notifyStatus() {
        onStatusUpdate?.invoke(getVoiceStatus())
    }

    fun destroy() {
        wakeWordEngine.stopListening()
        voiceSessionManager.destroy()
        speechSynthesisManager.shutdown()
        audioFocusManager.abandonAudioFocus()
        currentState = VoiceState.DISABLED
        notifyStatus()
    }
}
