package com.nova.companion.notification.intelligence.proactive

import android.content.Context
import android.util.Log
import com.nova.companion.notification.intelligence.model.ContextualNotification
import com.nova.companion.notification.intelligence.model.PriorityLevel
import com.nova.companion.notification.intelligence.preferences.NotificationIntelligencePrefs
import com.nova.companion.notification.intelligence.reply.ReplyIntent
import java.util.concurrent.ConcurrentHashMap

/**
 * ProactiveAssistantEngine
 *
 * Evaluates whether NOVA should proactively offer reply assistance or reminders,
 * adhering to rate-limits (max 3/hr), contact cooldowns (15 min), and quiet hours.
 */
object ProactiveAssistantEngine {

    private const val TAG = "ProactiveAssistant"

    // Cooldown per contact: 15 minutes
    private const val CONTACT_COOLDOWN_MS = 15 * 60 * 1000L
    private val lastPromptByContact = ConcurrentHashMap<String, Long>()

    // Global hourly rate tracking
    private val hourlyPromptTimestamps = mutableListOf<Long>()

    fun shouldOfferReplyAssistance(
        context: Context,
        notification: ContextualNotification,
        replyIntent: ReplyIntent
    ): Boolean {
        // 1. Master toggle
        if (!ProactivePolicyPreferences.isProactiveEnabled(context)) {
            return false
        }

        // 2. Quiet Hours check
        if (NotificationIntelligencePrefs.isQuietHoursActive(context)) {
            return false
        }

        // 3. Priority check: Only P0, P1, and high-relevance direct P2
        if (notification.priority == PriorityLevel.P3_LOW || notification.priority == PriorityLevel.P4_SUPPRESSED) {
            return false
        }

        // 4. Intent check: Only offer when a reply or action is clearly expected
        val eligibleIntent = replyIntent == ReplyIntent.QUESTION_RECEIVED ||
                replyIntent == ReplyIntent.ACTION_REQUIRED ||
                replyIntent == ReplyIntent.CONFIRMATION_REQUIRED ||
                replyIntent == ReplyIntent.FOLLOW_UP_REQUIRED

        if (!eligibleIntent) {
            return false
        }

        val now = System.currentTimeMillis()
        val contactKey = notification.cleanSender.lowercase().trim()

        // 5. Contact cooldown check
        val lastPrompt = lastPromptByContact[contactKey] ?: 0L
        if (now - lastPrompt < CONTACT_COOLDOWN_MS) {
            Log.d(TAG, "Proactive prompt suppressed by contact cooldown for: $contactKey")
            return false
        }

        // 6. Hourly rate limit check
        synchronized(hourlyPromptTimestamps) {
            hourlyPromptTimestamps.removeIf { now - it > 3600_000L }
            val maxPerHour = ProactivePolicyPreferences.getMaxPromptsPerHour(context)
            if (hourlyPromptTimestamps.size >= maxPerHour) {
                Log.d(TAG, "Proactive prompt suppressed by hourly limit ($maxPerHour/hr)")
                return false
            }
            hourlyPromptTimestamps.add(now)
        }

        lastPromptByContact[contactKey] = now
        Log.i(TAG, "Proactive assistance approved for contact: '$contactKey' with intent: $replyIntent")
        return true
    }
}
