package com.nova.companion.notification.intelligence.actions

import java.util.concurrent.ConcurrentHashMap

/**
 * Bounded store holding pending actions awaiting explicit user authorization.
 */
object PendingActionManager {

    private val actionsById = ConcurrentHashMap<String, PendingAction>()
    @Volatile
    private var latestPendingAction: PendingAction? = null

    fun stageAction(action: PendingAction) {
        cleanupExpired()
        actionsById[action.id] = action
        latestPendingAction = action
    }

    fun getAction(id: String): PendingAction? {
        cleanupExpired()
        return actionsById[id]
    }

    fun getLatestPendingAction(): PendingAction? {
        cleanupExpired()
        val latest = latestPendingAction
        return if (latest != null && !latest.isExpired() && latest.state == ActionState.PENDING_APPROVAL) {
            latest
        } else {
            null
        }
    }

    fun updateState(id: String, newState: ActionState) {
        val action = actionsById[id] ?: return
        action.state = newState
        if (latestPendingAction?.id == id) {
            latestPendingAction = action
        }
    }

    private fun cleanupExpired() {
        val now = System.currentTimeMillis()
        actionsById.entries.removeIf { it.value.isExpired() || it.value.state == ActionState.EXECUTED }
        if (latestPendingAction?.isExpired() == true) {
            latestPendingAction = null
        }
    }

    fun clear() {
        actionsById.clear()
        latestPendingAction = null
    }
}
