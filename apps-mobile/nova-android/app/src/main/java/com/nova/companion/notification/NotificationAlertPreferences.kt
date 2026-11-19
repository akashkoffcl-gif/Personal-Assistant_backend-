package com.nova.companion.notification

import android.content.Context
import android.content.SharedPreferences

object NotificationAlertPreferences {
    private const val PREFS_NAME = "nova_notification_alert_prefs"
    private const val KEY_ALERTS_ENABLED = "alerts_enabled"
    private const val KEY_SOUND_ENABLED = "sound_enabled"
    private const val KEY_VIBRATION_ENABLED = "vibration_enabled"
    private const val KEY_SENDER_ANNOUNCEMENT_ENABLED = "sender_announcement_enabled"
    private const val KEY_CONTENT_PREVIEW_ENABLED = "content_preview_enabled"
    private const val KEY_VOICE_ANNOUNCEMENT_ENABLED = "voice_announcement_enabled"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun isAlertsEnabled(context: Context): Boolean =
        getPrefs(context).getBoolean(KEY_ALERTS_ENABLED, true)

    fun setAlertsEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_ALERTS_ENABLED, enabled).apply()
    }

    fun isSoundEnabled(context: Context): Boolean =
        getPrefs(context).getBoolean(KEY_SOUND_ENABLED, true)

    fun setSoundEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_SOUND_ENABLED, enabled).apply()
    }

    fun isVibrationEnabled(context: Context): Boolean =
        getPrefs(context).getBoolean(KEY_VIBRATION_ENABLED, true)

    fun setVibrationEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_VIBRATION_ENABLED, enabled).apply()
    }

    fun isSenderAnnouncementEnabled(context: Context): Boolean =
        getPrefs(context).getBoolean(KEY_SENDER_ANNOUNCEMENT_ENABLED, false)

    fun setSenderAnnouncementEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_SENDER_ANNOUNCEMENT_ENABLED, enabled).apply()
    }

    fun isContentPreviewEnabled(context: Context): Boolean =
        getPrefs(context).getBoolean(KEY_CONTENT_PREVIEW_ENABLED, false)

    fun setContentPreviewEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_CONTENT_PREVIEW_ENABLED, enabled).apply()
    }

    fun isVoiceAnnouncementEnabled(context: Context): Boolean =
        getPrefs(context).getBoolean(KEY_VOICE_ANNOUNCEMENT_ENABLED, true)

    fun setVoiceAnnouncementEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_VOICE_ANNOUNCEMENT_ENABLED, enabled).apply()
    }
}
