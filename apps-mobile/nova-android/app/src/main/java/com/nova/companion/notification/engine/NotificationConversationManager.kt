package com.nova.companion.notification.engine

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.nova.companion.notification.NotificationAlertPreferences
import com.nova.companion.notification.intelligence.classifier.ContextualClassifier
import com.nova.companion.notification.intelligence.memory.NotificationDeliveryState
import com.nova.companion.notification.intelligence.memory.NotificationMemoryManager
import com.nova.companion.notification.intelligence.model.ContextualNotification
import com.nova.companion.notification.intelligence.model.MessageIntent
import com.nova.companion.notification.intelligence.model.MessageType
import com.nova.companion.notification.intelligence.model.PriorityLevel
import com.nova.companion.notification.intelligence.preferences.NotificationIntelligencePrefs
import com.nova.companion.notification.intelligence.priority.NotificationPriorityEngine
import com.nova.companion.voice.arbitration.ArbitratedUtterance
import com.nova.companion.voice.arbitration.SpeechArbitrator
import com.nova.companion.voice.arbitration.UtterancePriority
import com.nova.companion.voice.identity.VoiceIdentityManager
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Natural Notification Conversation Manager (Phase 66 Upgrade)
 *
 * Preserves Phase 65.1 batching (3s initial, 2s extension, max 8s), deduplication,
 * and audio arbitration.
 *
 * Enhances with Phase 66 Contextual Intelligence:
 * - Deterministic Priority Engine (P0..P4)
 * - Quiet Hours & DND Interruption Policies
 * - Conversational phrasing for Groups, Questions, Missed Calls, and OTPs
 * - Short-term Thread Conversation Memory (3-minute TTL)
 */
object NotificationConversationManager {

    private const val TAG = "NotifConvManager"

    // Configuration parameters
    private const val INITIAL_BATCH_WINDOW_MS = 3000L
    private const val EXTEND_BATCH_WINDOW_MS = 2000L
    private const val MAX_BATCH_WINDOW_MS = 8000L
    private const val MAX_NOTIFS_PER_BATCH = 5
    private const val EXPIRATION_WINDOW_MS = 30000L // 30s timeout

    // Main thread handler for window scheduling
    private val mainHandler = Handler(Looper.getMainLooper())

    // Batch buffer state holding rich contextual notifications
    private val currentBatch = CopyOnWriteArrayList<ContextualNotification>()
    private var batchStartTime = 0L
    private var batchFlushRunnable: Runnable? = null

    // Deduplication tracker: content hash -> last arrival timestamp
    private val recentContentHashes = ConcurrentHashMap<String, Long>()
    private const val DEDUP_FINGERPRINT_TTL_MS = 6000L

    // Conversational context history (bounded to last 20 notifications)
    private val recentContextHistory = CopyOnWriteArrayList<ContextualNotification>()
    private const val MAX_HISTORY_SIZE = 20

    /**
     * Submit an intercepted and parsed notification to the conversation engine.
     */
    @Synchronized
    fun onNotificationReceived(
        context: Context,
        eventId: String,
        packageName: String,
        appName: String,
        sender: String,
        summary: String
    ) {
        val now = System.currentTimeMillis()

        // 1. Event-Level Deduplication & Single Delivery Claim (Phase 69.5.1)
        val fingerprint = "$packageName|$sender|${summary.trim()}"
        if (!EventSpeechDeliveryCoordinator.tryClaimForSpeech(fingerprint)) {
            Log.d(TAG, "DUPLICATE_EVENT_REJECTED: Event already QUEUED, SPEAKING, or DELIVERED: $fingerprint")
            return
        }

        val lastSeen = recentContentHashes[fingerprint] ?: 0L
        if (now - lastSeen < DEDUP_FINGERPRINT_TTL_MS) {
            Log.d(TAG, "Suppressed duplicate notification callback within fingerprint TTL: $fingerprint")
            return
        }
        recentContentHashes[fingerprint] = now

        // Evict expired fingerprint cache periodically
        if (recentContentHashes.size > 50) {
            recentContentHashes.entries.removeIf { now - it.value > DEDUP_FINGERPRINT_TTL_MS * 2 }
        }

        // 2. Classify Context (Phase 66.1)
        val initialContextual = ContextualClassifier.classify(
            eventId = eventId,
            packageName = packageName,
            appName = appName,
            rawTitle = sender,
            rawSummary = summary
        )

        // 3. Evaluate Deterministic Priority (Phase 66.2)
        val (priority, explanation) = NotificationPriorityEngine.evaluatePriority(context, initialContextual)

        // 4. Check Thread Memory (Phase 66.4)
        val threadKey = NotificationMemoryManager.buildThreadKey(
            packageName,
            initialContextual.cleanSender,
            initialContextual.conversationTitle
        )
        val isOngoing = NotificationMemoryManager.isOngoingThread(threadKey)

        val item = initialContextual.copy(
            priority = priority,
            priorityExplanation = explanation,
            isOngoingThread = isOngoing
        )

        NotificationMemoryManager.recordNotification(item, NotificationDeliveryState.RECEIVED)

        // 5. Check Quiet Mode & Priority Policy (Phase 66.5)
        if (NotificationIntelligencePrefs.isQuietHoursActive(context)) {
            val allowP0 = NotificationIntelligencePrefs.isAllowP0Always(context) && item.priority == PriorityLevel.P0_CRITICAL
            val allowVip = NotificationIntelligencePrefs.isAllowVipsInQuiet(context) && item.isVip

            if (!allowP0 && !allowVip) {
                Log.i(TAG, "Quiet hours active: suppressed speech for [${item.cleanSender}] (Priority: ${item.priority}). Policy explanation: $explanation")
                NotificationMemoryManager.recordNotification(item, NotificationDeliveryState.SUPPRESSED)
                return
            }
        }

        // Drop P4 (Suppressed) from speech announcements
        if (item.priority == PriorityLevel.P4_SUPPRESSED) {
            Log.d(TAG, "Notification speech suppressed by Priority Engine (P4): $explanation")
            NotificationMemoryManager.recordNotification(item, NotificationDeliveryState.SUPPRESSED)
            return
        }

        // Add to historical context
        recentContextHistory.add(item)
        while (recentContextHistory.size > MAX_HISTORY_SIZE) {
            recentContextHistory.removeAt(0)
        }

        // 6. Emergency Preemption (P0 Critical): Flush immediately and speak with HIGH priority
        if (item.priority == PriorityLevel.P0_CRITICAL) {
            Log.w(TAG, "P0 Critical notification arrived. Preempting current batch and triggering immediate speech: $explanation")
            cancelScheduledFlush()
            currentBatch.add(item)
            flushBatch(context, isEmergency = true)
            return
        }

        // 7. Intelligent Batching Logic (Phase 65.1 Preservation)
        if (currentBatch.isEmpty()) {
            batchStartTime = now
            currentBatch.add(item)
            NotificationMemoryManager.recordNotification(item, NotificationDeliveryState.QUEUED)
            scheduleFlush(context, INITIAL_BATCH_WINDOW_MS)
            Log.d(TAG, "Started notification batch window (${INITIAL_BATCH_WINDOW_MS}ms) with event: $eventId")
        } else {
            currentBatch.add(item)
            NotificationMemoryManager.recordNotification(item, NotificationDeliveryState.QUEUED)
            val elapsed = now - batchStartTime
            if (currentBatch.size >= MAX_NOTIFS_PER_BATCH || elapsed >= MAX_BATCH_WINDOW_MS) {
                Log.d(TAG, "Batch threshold reached (count=${currentBatch.size}, elapsed=${elapsed}ms). Flushing immediately.")
                cancelScheduledFlush()
                flushBatch(context, isEmergency = false)
            } else {
                // Extend window dynamically
                val remainingMax = MAX_BATCH_WINDOW_MS - elapsed
                val extension = EXTEND_BATCH_WINDOW_MS.coerceAtMost(remainingMax)
                cancelScheduledFlush()
                scheduleFlush(context, extension)
                Log.d(TAG, "Extended batch window by ${extension}ms (total items=${currentBatch.size})")
            }
        }
    }

    private fun scheduleFlush(context: Context, delayMs: Long) {
        val runnable = Runnable {
            synchronized(this) {
                flushBatch(context, isEmergency = false)
            }
        }
        batchFlushRunnable = runnable
        mainHandler.postDelayed(runnable, delayMs)
    }

    private fun cancelScheduledFlush() {
        batchFlushRunnable?.let { mainHandler.removeCallbacks(it) }
        batchFlushRunnable = null
    }

    @Synchronized
    private fun flushBatch(context: Context, isEmergency: Boolean = false) {
        cancelScheduledFlush()
        if (currentBatch.isEmpty()) return

        val batchItems = ArrayList(currentBatch)
        currentBatch.clear()
        batchStartTime = 0L

        // Discard if notifications in batch are already expired (>30s)
        val now = System.currentTimeMillis()
        val validItems = batchItems.filter { now - it.timestamp < EXPIRATION_WINDOW_MS }
        if (validItems.isEmpty()) {
            Log.w(TAG, "Batch discarded: all notifications expired (> ${EXPIRATION_WINDOW_MS}ms)")
            return
        }

        // Check if voice announcement is enabled
        if (!NotificationAlertPreferences.isVoiceAnnouncementEnabled(context)) {
            Log.d(TAG, "Voice announcement disabled in user preferences")
            return
        }

        // Generate context-aware conversational announcement (Phase 66.3)
        val owner = VoiceIdentityManager.getOwnerName(context)
        val announcement = buildNaturalAnnouncement(context, owner, validItems)
        if (announcement.isBlank()) return

        // Mark items as ANNOUNCED in thread memory
        for (item in validItems) {
            NotificationMemoryManager.recordNotification(item, NotificationDeliveryState.ANNOUNCED)
        }

        // Dispatch through central SpeechArbitrator with appropriate priority and completion listener
        val utterancePriority = if (isEmergency) UtterancePriority.EMERGENCY else UtterancePriority.NOTIFICATION_ANNOUNCEMENT
        val utterance = ArbitratedUtterance(
            id = "batch_announcement_${now}",
            text = announcement,
            priority = utterancePriority,
            onDone = {
                for (item in validItems) {
                    val fp = "${item.packageName}|${item.rawSender}|${item.summary.trim()}"
                    EventSpeechDeliveryCoordinator.markDelivered(fp)
                }
            },
            onError = {
                for (item in validItems) {
                    val fp = "${item.packageName}|${item.rawSender}|${item.summary.trim()}"
                    EventSpeechDeliveryCoordinator.markFailed(fp)
                }
            }
        )
        SpeechArbitrator.getInstance(context).enqueueUtterance(utterance)
        Log.i(TAG, "Dispatched conversational batch announcement [${validItems.size} item(s), Emergency=$isEmergency]: \"$announcement\"")
    }

    /**
     * Synthesizes conversational, context-aware phrases (Phase 66 & 67 Proactive Assistance).
     */
    private fun buildNaturalAnnouncement(context: Context, owner: String, items: List<ContextualNotification>): String {
        if (items.isEmpty()) return ""

        // Case 1: Exactly 1 notification in batch
        if (items.size == 1) {
            val single = items[0]
            val sender = single.cleanSender
            val app = single.appName

            // Extract potential follow-ups or callbacks (Phase 67.5)
            val followUp = com.nova.companion.notification.intelligence.followup.ConversationActionExtractor.extractAction(single)
            if (followUp != null) {
                com.nova.companion.notification.intelligence.followup.ConversationFollowUpManager.recordFollowUp(followUp)
            }

            // Missed Call template
            if (single.messageType == MessageType.MISSED_CALL) {
                return "$owner, you missed a call from $sender on $app."
            }

            // OTP / Verification Code template (Security: avoid reading token digits aloud)
            if (single.messageType == MessageType.OTP) {
                return "$owner, you received a verification code from $app."
            }

            // Ongoing thread follow-up template
            if (single.isOngoingThread) {
                return if (single.summary.isNotBlank()) {
                    "$owner, $sender also said: ${single.summary}"
                } else {
                    "$owner, $sender followed up on $app."
                }
            }

            // Group message template
            if (single.messageType == MessageType.GROUP) {
                val group = single.conversationTitle ?: "group chat"
                return if (single.summary.isNotBlank()) {
                    "$owner, $sender posted in $group on $app: ${single.summary}"
                } else {
                    "$owner, new message from $sender in $group on $app."
                }
            }

            // Evaluate Reply Intent & Proactive Suggestion (Phase 67.1 & 67.7)
            val (replyIntent, _) = com.nova.companion.notification.intelligence.reply.ReplyIntentClassifier.classify(
                single.summary,
                single.messageType
            )

            // Direct Question template
            if (single.messageIntent == MessageIntent.QUESTION && single.summary.isNotBlank()) {
                val shouldProactivelyOffer = com.nova.companion.notification.intelligence.proactive.ProactiveAssistantEngine.shouldOfferReplyAssistance(
                    context,
                    single,
                    replyIntent
                )

                // Stage smart replies if actionable
                val replies = com.nova.companion.notification.intelligence.reply.SmartReplyEngine.generateReplies(single, replyIntent)
                if (replies.isNotEmpty()) {
                    val pendingAction = com.nova.companion.notification.intelligence.actions.PendingAction(
                        id = java.util.UUID.randomUUID().toString(),
                        type = com.nova.companion.notification.intelligence.actions.ActionType.SEND_REPLY,
                        eventId = single.eventId,
                        packageName = single.packageName,
                        appName = single.appName,
                        targetSender = single.cleanSender,
                        proposedContent = replies.first().text,
                        state = com.nova.companion.notification.intelligence.actions.ActionState.PENDING_APPROVAL
                    )
                    com.nova.companion.notification.intelligence.actions.PendingActionManager.stageAction(pendingAction)
                }

                return if (shouldProactivelyOffer) {
                    "$owner, $sender asks on $app: ${single.summary}. Would you like me to prepare a reply?"
                } else {
                    "$owner, $sender asks on $app: ${single.summary}"
                }
            }

            // Standard Direct message template (Phase 69.5.1 Content Filter)
            val filtered = com.nova.companion.notification.normalization.NotificationContentFilter.filterContent(
                rawTitle = single.cleanSender,
                rawSummary = single.summary,
                isGroupChat = single.isGroup,
                groupName = single.conversationTitle
            )

            return when (filtered.contentType) {
                com.nova.companion.notification.normalization.NotificationContentType.VOICE_MESSAGE ->
                    "$owner, $sender sent you a voice message on $app."
                com.nova.companion.notification.normalization.NotificationContentType.IMAGE_MESSAGE ->
                    "$owner, $sender sent you a photo on $app."
                com.nova.companion.notification.normalization.NotificationContentType.VIDEO_MESSAGE ->
                    "$owner, $sender sent you a video on $app."
                com.nova.companion.notification.normalization.NotificationContentType.MULTIPLE_MESSAGES ->
                    "$owner, $sender ${filtered.spokenText} on $app."
                com.nova.companion.notification.normalization.NotificationContentType.MISSED_CALL ->
                    "$owner, you missed a call from $sender on $app."
                else -> {
                    if (single.summary.isNotBlank()) {
                        "$owner, $sender sent you a message on $app. They say: ${single.summary}"
                    } else {
                        "$owner, you have a new $app notification from $sender."
                    }
                }
            }
        }

        // Case 2: All notifications are from the same sender
        val firstSender = items[0].cleanSender
        val allSameSender = items.all { it.cleanSender.equals(firstSender, ignoreCase = true) }

        if (allSameSender) {
            val countWord = when (items.size) {
                2 -> "two"
                3 -> "three"
                4 -> "four"
                5 -> "five"
                else -> "${items.size}"
            }
            val app = items[0].appName
            val lastSummary = items.last().summary

            // If same group
            if (items[0].messageType == MessageType.GROUP && items[0].conversationTitle != null) {
                val group = items[0].conversationTitle
                return if (lastSummary.isNotBlank()) {
                    "$owner, $firstSender sent $countWord messages in $group on $app. The latest is: $lastSummary"
                } else {
                    "$owner, $firstSender sent $countWord messages in $group on $app."
                }
            }

            return if (lastSummary.isNotBlank()) {
                "$owner, $firstSender has sent you $countWord messages on $app. The latest is: $lastSummary"
            } else {
                "$owner, $firstSender sent you $countWord messages on $app."
            }
        }

        // Case 3: Multiple different senders / apps
        val senderList = items.map {
            "${it.cleanSender} on ${it.appName}"
        }.distinct()

        val summaryPhrase = when (senderList.size) {
            2 -> "${senderList[0]}, and ${senderList[1]}"
            3 -> "${senderList[0]}, ${senderList[1]}, and ${senderList[2]}"
            else -> "${senderList.take(2).joinToString(", ")}, plus ${senderList.size - 2} more"
        }

        val totalCountWord = when (items.size) {
            2 -> "two"
            3 -> "three"
            4 -> "four"
            5 -> "five"
            else -> "${items.size}"
        }

        return "$owner, you've got $totalCountWord new notifications: from $summaryPhrase."
    }

    fun getLastNotification(): ContextualNotification? {
        return recentContextHistory.lastOrNull()
    }

    fun getRecentNotifications(): List<ContextualNotification> {
        return ArrayList(recentContextHistory)
    }

    fun clearHistory() {
        recentContextHistory.clear()
        recentContentHashes.clear()
        NotificationMemoryManager.clearAll()
    }
}
