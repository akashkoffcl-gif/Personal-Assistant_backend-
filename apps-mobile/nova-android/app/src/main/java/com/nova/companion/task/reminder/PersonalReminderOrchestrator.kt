package com.nova.companion.task.reminder

import android.content.Context
import android.util.Log
import com.nova.companion.notification.intelligence.preferences.NotificationIntelligencePrefs
import com.nova.companion.task.orchestration.PersonalTask
import com.nova.companion.task.orchestration.PersonalTaskOrchestrator
import com.nova.companion.voice.arbitration.ArbitratedUtterance
import com.nova.companion.voice.arbitration.SpeechArbitrator
import com.nova.companion.voice.arbitration.UtterancePriority
import com.nova.companion.voice.identity.VoiceIdentityManager
import java.util.concurrent.ConcurrentHashMap

/**
 * PersonalReminderOrchestrator
 *
 * Schedules and dispatches reminders for pending tasks and commitments with anti-annoyance limits.
 */
object PersonalReminderOrchestrator {

    private const val TAG = "ReminderOrchestrator"
    private val lastReminderByTask = ConcurrentHashMap<String, Long>()
    private const val TASK_REMINDER_COOLDOWN_MS = 60 * 60 * 1000L // 1 hour per task

    fun announceTaskReminder(context: Context, task: PersonalTask) {
        // Check quiet hours
        if (NotificationIntelligencePrefs.isQuietHoursActive(context)) {
            Log.d(TAG, "Suppressed reminder during quiet hours for task: ${task.title}")
            return
        }

        val now = System.currentTimeMillis()
        val lastTime = lastReminderByTask[task.id] ?: 0L
        if (now - lastTime < TASK_REMINDER_COOLDOWN_MS) {
            Log.d(TAG, "Suppressed duplicate reminder within cooldown for: ${task.title}")
            return
        }
        lastReminderByTask[task.id] = now

        val owner = VoiceIdentityManager.getOwnerName(context)
        val text = "$owner, quick reminder: ${task.title}"

        val utterance = ArbitratedUtterance(
            id = "reminder_${task.id}_$now",
            text = text,
            priority = UtterancePriority.NOTIFICATION_ANNOUNCEMENT
        )
        SpeechArbitrator.getInstance(context).enqueueUtterance(utterance)
        Log.i(TAG, "Dispatched task reminder: \"$text\"")
    }
}
