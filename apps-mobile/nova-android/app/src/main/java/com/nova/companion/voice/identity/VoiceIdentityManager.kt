package com.nova.companion.voice.identity

import android.content.Context
import android.content.SharedPreferences
import android.util.Log

enum class VoiceIdentityStatus {
    NOT_ENROLLED,
    ENROLLED,
    VERIFIED,
    UNVERIFIED
}

object VoiceIdentityManager {

    private const val TAG = "VoiceIdentityManager"
    private const val PREFS_NAME = "nova_voice_identity_prefs"
    private const val KEY_IS_ENROLLED = "is_enrolled"
    private const val KEY_OWNER_NAME = "owner_name"
    private const val KEY_VOICE_PRINT = "voice_print_hash"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun isEnrolled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_IS_ENROLLED, false)
    }

    fun getOwnerName(context: Context): String {
        return getPrefs(context).getString(KEY_OWNER_NAME, "Akash") ?: "Akash"
    }

    fun enrollOwner(context: Context, ownerName: String, sampleHash: String) {
        getPrefs(context).edit()
            .putBoolean(KEY_IS_ENROLLED, true)
            .putString(KEY_OWNER_NAME, ownerName)
            .putString(KEY_VOICE_PRINT, sampleHash)
            .apply()
        Log.i(TAG, "Voice identity enrolled for owner: $ownerName")
    }

    fun verifySpeaker(context: Context, audioConfidence: Float): Boolean {
        if (!isEnrolled(context)) {
            // When not enrolled, default to permitted mode for owner convenience
            return true
        }
        val isVerified = audioConfidence >= 0.70f
        Log.i(TAG, "Speaker verification evaluation: confidence=$audioConfidence, verified=$isVerified")
        return isVerified
    }

    fun resetEnrollment(context: Context) {
        getPrefs(context).edit().clear().apply()
        Log.i(TAG, "Voice identity enrollment reset")
    }
}
