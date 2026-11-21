package com.nova.companion.voice

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import java.util.Locale

class NovaSpeechSynthesisManager(
    private val context: Context,
    private val onInitResult: ((Boolean) -> Unit)? = null,
    private val onSpeechCompleted: () -> Unit = {}
) : TextToSpeech.OnInitListener {

    companion object {
        private const val TAG = "NovaSpeechSynthesis"
    }

    private var tts: TextToSpeech? = null
    @Volatile
    private var isInitialized = false

    fun isReady(): Boolean = isInitialized && tts != null

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

            // Explicitly route to STREAM_MUSIC / USAGE_MEDIA to avoid OEM policy ducking or muting
            try {
                val audioAttributes = android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_ASSISTANT)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                    .setLegacyStreamType(android.media.AudioManager.STREAM_MUSIC)
                    .build()
                tts?.setAudioAttributes(audioAttributes)
                Log.i(TAG, "TTS AudioAttributes configured with USAGE_ASSISTANT and STREAM_MUSIC")
            } catch (e: Exception) {
                Log.w(TAG, "Could not set custom AudioAttributes on TextToSpeech", e)
            }

            isInitialized = true
            Log.i(TAG, "Native Android TextToSpeech engine initialized successfully")
            onInitResult?.invoke(true)
        } else {
            isInitialized = false
            Log.e(TAG, "Failed to initialize native TextToSpeech engine: status=$status")
            onInitResult?.invoke(false)
        }
    }

    fun speak(text: String, utteranceId: String = "nova_tts_${System.currentTimeMillis()}"): Boolean {
        if (!isInitialized || tts == null) {
            Log.w(TAG, "Cannot speak: TTS not yet initialized")
            return false
        }

        // Strip markdown formatting symbols (*, _, #, `, [ACTION:...])
        val sanitized = text
            .replace(Regex("\\[ACTION:[^\\]]+\\]"), "")
            .replace(Regex("[*#`_]"), "")
            .trim()

        if (sanitized.isBlank()) return false

        val params = Bundle().apply {
            putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f)
        }

        // Log audio device route information for debugging
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
            if (audioManager != null && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val devices = audioManager.getDevices(android.media.AudioManager.GET_DEVICES_OUTPUTS)
                val deviceNames = devices.joinToString(", ") { "${it.productName} (type:${it.type})" }
                Log.i(TAG, "Active audio output routes: $deviceNames")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not query audio devices: ${e.message}")
        }

        val result = tts?.speak(sanitized, TextToSpeech.QUEUE_FLUSH, params, utteranceId)
        val success = (result == TextToSpeech.SUCCESS)
        Log.i(TAG, "tts.speak invoked for utteranceId=$utteranceId, returnCode=$result (SUCCESS=${TextToSpeech.SUCCESS})")
        return success
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
