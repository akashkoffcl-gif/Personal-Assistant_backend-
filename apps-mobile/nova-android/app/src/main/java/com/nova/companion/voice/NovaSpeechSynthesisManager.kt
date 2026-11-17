package com.nova.companion.voice

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import java.util.Locale

class NovaSpeechSynthesisManager(
    private val context: Context,
    private val onSpeechCompleted: () -> Unit = {}
) : TextToSpeech.OnInitListener {

    companion object {
        private const val TAG = "NovaSpeechSynthesis"
    }

    private var tts: TextToSpeech? = null
    private var isInitialized = false

    init {
        tts = TextToSpeech(context.applicationContext, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.US)
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.w(TAG, "Locale.US not supported or missing data, falling back to default locale")
                tts?.setLanguage(Locale.getDefault())
            }

            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    Log.d(TAG, "TTS speech started: $utteranceId")
                }

                override fun onDone(utteranceId: String?) {
                    Log.d(TAG, "TTS speech completed: $utteranceId")
                    onSpeechCompleted()
                }

                override fun onError(utteranceId: String?) {
                    Log.e(TAG, "TTS speech error: $utteranceId")
                    onSpeechCompleted()
                }
            })

            isInitialized = true
            Log.i(TAG, "Native Android TextToSpeech engine initialized successfully")
        } else {
            Log.e(TAG, "Failed to initialize native TextToSpeech engine: status=$status")
        }
    }

    fun speak(text: String, utteranceId: String = "nova_tts_${System.currentTimeMillis()}") {
        if (!isInitialized || tts == null) {
            Log.w(TAG, "Cannot speak: TTS not yet initialized")
            return
        }

        // Strip markdown formatting symbols (*, _, #, `, [ACTION:...])
        val sanitized = text
            .replace(Regex("\\[ACTION:[^\\]]+\\]"), "")
            .replace(Regex("[*#`_]"), "")
            .trim()

        if (sanitized.isBlank()) return

        val params = Bundle().apply {
            putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f)
        }

        tts?.speak(sanitized, TextToSpeech.QUEUE_FLUSH, params, utteranceId)
    }

    fun stop() {
        if (tts?.isSpeaking == true) {
            tts?.stop()
            Log.i(TAG, "TTS speech stopped")
        }
    }

    fun isSpeaking(): Boolean {
        return tts?.isSpeaking == true
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        isInitialized = false
        Log.i(TAG, "TTS engine shut down")
    }
}
