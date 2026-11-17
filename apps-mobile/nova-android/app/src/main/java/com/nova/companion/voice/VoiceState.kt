package com.nova.companion.voice

enum class VoiceState {
    DISABLED,
    READY,
    LISTENING,
    PROCESSING,
    RESPONDING,
    ERROR
}

data class VoiceStatusInfo(
    val state: VoiceState,
    val isWakeWordActive: Boolean,
    val isTtsActive: Boolean,
    val isRecognitionAvailable: Boolean,
    val lastTranscript: String?,
    val lastError: String?
)
