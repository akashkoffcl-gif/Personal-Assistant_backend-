package com.nova.companion.notification.intelligence.proactive

import android.content.Context
import android.content.SharedPreferences

/**
 * Preferences and rate-limiting policies for proactive assistant prompts.
 */
object ProactivePolicyPreferences {

    private const val PREFS_NAME = "nova_proactive_policy_prefs"
    private const val KEY_PROACTIVE_ENABLED = "proactive_enabled"
    private const val KEY_MAX_PROMPTS_PER_HOUR = "max_prompts_per_hour" // Default 3

    fun isProactiveEnabled(context: Context): Boolean {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_PROACTIVE_ENABLED, true)
    }

    fun setProactiveEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_PROACTIVE_ENABLED, enabled)
            .apply()
    }

    fun getMaxPromptsPerHour(context: Context): Int {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getInt(KEY_MAX_PROMPTS_PER_HOUR, 3)
    }
}
