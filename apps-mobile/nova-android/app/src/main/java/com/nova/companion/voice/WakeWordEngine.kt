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
import java.util.Locale

/**
 * WakeWordEngine handles local keyword activation spotting.
 *
 * NOTE ON HARDWARE/OS CONSTRAINTS (Android 14-16 API 34-36):
 * True low-power hardware DSP always-on hotword detection is restricted to OEM
 * system assistants (e.g. com.vivo.assistant on Vivo/iQOO) with privileged platform signatures.
 * This class implements active acoustic keyword spotting ("Hey Nova" / "Jarvis") using
 * the local speech recognition engine while an active foreground service or in-app session is running,
 * and reports accurate capability states without fabricating unprivileged DSP access.
 */
class WakeWordEngine(
    private val context: Context,
    private val onWakeWordDetected: (keyword: String) -> Unit
) {

    companion object {
        private const val TAG = "NovaWakeWordEngine"
        private val KEYWORDS = listOf("hey nova", "nova", "jarvis")
    }

    private var speechRecognizer: SpeechRecognizer? = null
    private var isSpotting = false
    private val mainHandler = Handler(Looper.getMainLooper())

    fun isSupported(): Boolean {
        return SpeechRecognizer.isRecognitionAvailable(context)
    }

    fun startListening() {
        if (isSpotting) return
        if (!isSupported()) {
            Log.w(TAG, "Speech recognition not available for wake-word spotting")
            return
        }

        mainHandler.post {
            try {
                speechRecognizer?.destroy()
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                    setRecognitionListener(object : RecognitionListener {
                        override fun onReadyForSpeech(params: Bundle?) {
                            Log.d(TAG, "WakeWordEngine ready for speech")
                        }

                        override fun onBeginningOfSpeech() {}
                        override fun onRmsChanged(rmsdB: Float) {}
                        override fun onBufferReceived(buffer: ByteArray?) {}

                        override fun onEndOfSpeech() {
                            if (isSpotting) {
                                restartSpotting()
                            }
                        }

                        override fun onError(error: Int) {
                            Log.d(TAG, "WakeWordEngine recognition error code: $error")
                            if (isSpotting) {
                                mainHandler.postDelayed({
                                    restartSpotting()
                                }, 500)
                            }
                        }

                        override fun onResults(results: Bundle?) {
                            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            if (!matches.isNullOrEmpty()) {
                                val candidate = matches[0].lowercase(Locale.ROOT).trim()
                                Log.d(TAG, "WakeWord candidate heard: $candidate")
                                val detected = KEYWORDS.firstOrNull { candidate.contains(it) }
                                if (detected != null) {
                                    Log.i(TAG, "WakeWord DETECTED: $detected")
                                    stopListening()
                                    onWakeWordDetected(detected)
                                    return
                                }
                            }
                            if (isSpotting) {
                                restartSpotting()
                            }
                        }

                        override fun onPartialResults(partialResults: Bundle?) {
                            val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            if (!matches.isNullOrEmpty()) {
                                val candidate = matches[0].lowercase(Locale.ROOT).trim()
                                val detected = KEYWORDS.firstOrNull { candidate.contains(it) }
                                if (detected != null) {
                                    Log.i(TAG, "WakeWord DETECTED on partial: $detected")
                                    stopListening()
                                    onWakeWordDetected(detected)
                                }
                            }
                        }

                        override fun onEvent(eventType: Int, params: Bundle?) {}
                    })
                }

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US.toLanguageTag())
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                }

                speechRecognizer?.startListening(intent)
                isSpotting = true
                Log.i(TAG, "Wake-word spotting started on Main thread")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start wake-word spotting", e)
                isSpotting = false
            }
        }
    }

    private fun restartSpotting() {
        if (!isSpotting) return
        mainHandler.post {
            try {
                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US.toLanguageTag())
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                }
                speechRecognizer?.startListening(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Error restarting wake word spotting", e)
            }
        }
    }

    fun stopListening() {
        isSpotting = false
        mainHandler.post {
            try {
                speechRecognizer?.stopListening()
                speechRecognizer?.cancel()
                speechRecognizer?.destroy()
                speechRecognizer = null
                Log.i(TAG, "Wake-word spotting stopped")
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping wake word spotting", e)
            }
        }
    }

    fun isListening(): Boolean = isSpotting
}
