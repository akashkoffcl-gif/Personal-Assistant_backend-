package com.nova.companion.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import com.nova.companion.data.local.SecureSessionManager
import com.nova.companion.data.remote.ChatMessageDto
import com.nova.companion.data.remote.NovaApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

class VoiceSessionManager(
    private val context: Context,
    private val audioFocusManager: NovaAudioFocusManager,
    private val speechSynthesisManager: NovaSpeechSynthesisManager,
    private val onStateChanged: (VoiceState, String?) -> Unit
) {

    companion object {
        private const val TAG = "NovaVoiceSessionManager"
    }

    private val sessionScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var speechRecognizer: SpeechRecognizer? = null
    private var isRecording = false
    private val mainHandler = Handler(Looper.getMainLooper())

    fun startListening() {
        if (isRecording) {
            Log.w(TAG, "Already listening, ignoring startListening call")
            return
        }

        // Interrupt any ongoing speech synthesis
        speechSynthesisManager.stop()

        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            Log.e(TAG, "Speech recognition is not available on this device")
            onStateChanged(VoiceState.ERROR, "Speech recognition unavailable")
            return
        }

        try {
            speechRecognizer?.destroy()
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {
                        Log.d(TAG, "SpeechRecognizer onReadyForSpeech")
                        isRecording = true
                        onStateChanged(VoiceState.LISTENING, null)
                    }

                    override fun onBeginningOfSpeech() {
                        Log.d(TAG, "SpeechRecognizer onBeginningOfSpeech")
                    }

                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}

                    override fun onEndOfSpeech() {
                        Log.d(TAG, "SpeechRecognizer onEndOfSpeech")
                        isRecording = false
                        onStateChanged(VoiceState.PROCESSING, "Processing voice input...")
                    }

                    override fun onError(error: Int) {
                        isRecording = false
                        when (error) {
                            SpeechRecognizer.ERROR_NO_MATCH,
                            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> {
                                Log.d(TAG, "Speech recognition timed out with no speech detected (code $error). Returning to READY.")
                                onStateChanged(VoiceState.READY, null)
                            }
                            else -> {
                                val errorMsg = when (error) {
                                    SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                                    SpeechRecognizer.ERROR_CLIENT -> "Client side error"
                                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission denied"
                                    SpeechRecognizer.ERROR_NETWORK -> "Network error during speech recognition"
                                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service busy"
                                    SpeechRecognizer.ERROR_SERVER -> "Server recognition error"
                                    else -> "Recognition error: $error"
                                }
                                Log.e(TAG, "SpeechRecognizer fatal error: $errorMsg ($error)")
                                onStateChanged(VoiceState.ERROR, errorMsg)
                            }
                        }
                    }

                    override fun onResults(results: Bundle?) {
                        isRecording = false
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            val recognizedText = matches[0]
                            Log.i(TAG, "Speech recognized: $recognizedText")

                            // 1. Check if speaker is verified owner (speaker authentication check)
                            val isOwnerVerified = com.nova.companion.voice.identity.VoiceIdentityManager.verifySpeaker(context, 0.85f)
                            if (!isOwnerVerified) {
                                Log.w(TAG, "Unverified speaker attempted voice command. Rejecting.")
                                onStateChanged(VoiceState.READY, "Unrecognized speaker")
                                speechSynthesisManager.speak("I didn't recognize your voice. Voice commands are restricted to the enrolled owner.")
                                return
                            }

                            // 2. Check for contextual notification reply commands
                            val resolvedCommand = com.nova.companion.voice.command.CommandIntentResolver.resolve(recognizedText)
                            if (resolvedCommand.intent != com.nova.companion.voice.command.ResolvedIntentType.UNKNOWN) {
                                com.nova.companion.voice.command.CommandIntentResolver.executeVoiceCommand(context, resolvedCommand) { responseText ->
                                    onStateChanged(VoiceState.RESPONDING, responseText)
                                    speechSynthesisManager.speak(responseText)
                                }
                                return
                            }

                            // 3. Normal conversational AI request
                            dispatchToBackendAi(recognizedText)
                        } else {
                            onStateChanged(VoiceState.READY, "No speech detected")
                        }
                    }

                    override fun onPartialResults(partialResults: Bundle?) {
                        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            val partial = matches[0]
                            Log.d(TAG, "Partial speech: $partial")
                            onStateChanged(VoiceState.LISTENING, partial)
                        }
                    }

                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            }

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US.toLanguageTag())
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            }

            speechRecognizer?.startListening(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start speech recognition", e)
            isRecording = false
            onStateChanged(VoiceState.ERROR, e.message ?: "Failed to start recognition")
        }
    }

    fun stopListening() {
        if (!isRecording) return
        try {
            speechRecognizer?.stopListening()
            isRecording = false
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping recognition", e)
        }
    }

    fun cancel() {
        isRecording = false
        try {
            speechRecognizer?.cancel()
            speechRecognizer?.destroy()
            speechRecognizer = null
            speechSynthesisManager.stop()
            audioFocusManager.abandonAudioFocus()
            onStateChanged(VoiceState.READY, null)
        } catch (e: Exception) {
            Log.e(TAG, "Error cancelling voice session", e)
        }
    }

    private fun dispatchToBackendAi(userPrompt: String) {
        onStateChanged(VoiceState.PROCESSING, userPrompt)

        sessionScope.launch {
            val token = SecureSessionManager.getAuthToken(context)
            val authHeader = if (!token.isNullOrBlank()) {
                if (token.startsWith("Bearer ")) token else "Bearer $token"
            } else {
                // Anonymous or mock token for unauthenticated testing
                "Bearer anonymous-voice-token"
            }

            val replyText = withContext(Dispatchers.IO) {
                try {
                    val apiService = NovaApiClient.getApiService()
                    val response = apiService.sendChatMessage(
                        authHeader = authHeader,
                        request = ChatMessageDto(
                            message = userPrompt,
                            assistantName = "JARVIS"
                        )
                    )

                    if (response.isSuccessful && response.body() != null) {
                        val body = response.body()!!
                        body.message?.content ?: body.reply ?: "I have processed your request."
                    } else {
                        val errCode = response.code()
                        Log.w(TAG, "AI chat endpoint returned status $errCode")
                        // If offline or unauthenticated fallback
                        "I heard: \"$userPrompt\", but the NOVA intelligence server is currently unreachable."
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error communicating with AI backend", e)
                    "I heard: \"$userPrompt\", but I could not reach the NOVA server."
                }
            }

            // Transition to RESPONDING state and speak via TTS with Audio Focus
            onStateChanged(VoiceState.RESPONDING, replyText)
            audioFocusManager.requestAudioFocus()
            speechSynthesisManager.speak(replyText)
        }
    }

    fun destroy() {
        cancel()
    }
}
