package com.nova.companion.notification.intelligence.preferences

import android.content.Context
import android.content.SharedPreferences
import java.util.Calendar

/**
 * Preferences for notification intelligence, quiet hours, and interruption rules.
 */
object NotificationIntelligencePrefs {

    private const val PREFS_NAME = "nova_notification_intelligence_prefs"
    private const val KEY_QUIET_HOURS_ENABLED = "quiet_hours_enabled"
    private const val KEY_QUIET_START_HOUR = "quiet_start_hour"       // 22 (10 PM)
    private const val KEY_QUIET_START_MINUTE = "quiet_start_minute"   // 0
    private const val KEY_QUIET_END_HOUR = "quiet_end_hour"           // 7 (7 AM)
    private const val KEY_QUIET_END_MINUTE = "quiet_end_minute"       // 0
    private const val KEY_ALLOW_VIPS_IN_QUIET = "allow_vips_in_quiet" // true
    private const val KEY_ALLOW_P0_ALWAYS = "allow_p0_always"         // true

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun isQuietHoursEnabled(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_QUIET_HOURS_ENABLED, true)
    }

    fun setQuietHoursEnabled(context: Context, enabled: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_QUIET_HOURS_ENABLED, enabled).apply()
    }

    fun isAllowVipsInQuiet(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_ALLOW_VIPS_IN_QUIET, true)
    }

    fun isAllowP0Always(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_ALLOW_P0_ALWAYS, true)
    }

    /**
     * Checks if current local time falls within configured quiet hours window.
     * Accurately supports overnight spans (e.g. 22:00 -> 07:00).
     */
    fun isQuietHoursActive(context: Context): Boolean {
        if (!isQuietHoursEnabled(context)) return false

        val prefs = getPrefs(context)
        val startHour = prefs.getInt(KEY_QUIET_START_HOUR, 22)
        val startMin = prefs.getInt(KEY_QUIET_START_MINUTE, 0)
        val endHour = prefs.getInt(KEY_QUIET_END_HOUR, 7)
        val endMin = prefs.getInt(KEY_QUIET_END_MINUTE, 0)

        val cal = Calendar.getInstance()
        val currentMinutes = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
        val startMinutes = startHour * 60 + startMin
        val endMinutes = endHour * 60 + endMin

        return if (startMinutes < endMinutes) {
            // Same-day window (e.g. 13:00 to 15:00)
            currentMinutes in startMinutes until endMinutes
        } else {
            // Overnight window (e.g. 22:00 to 07:00 next day)
            currentMinutes >= startMinutes || currentMinutes < endMinutes
        }
    }
}
