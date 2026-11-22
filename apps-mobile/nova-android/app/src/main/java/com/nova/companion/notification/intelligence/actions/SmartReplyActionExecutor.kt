package com.nova.companion.notification.intelligence.actions

import android.content.Context
import android.util.Log
import com.nova.companion.notification.engine.NotificationConversationRegistry

sealed class ActionExecutionResult {
    data class Success(val message: String) : ActionExecutionResult()
    data class Failure(val error: String) : ActionExecutionResult()
}

/**
 * SmartReplyActionExecutor
 *
 * Verifies authorization, action lifecycle, and executes replies via RemoteInput.
 */
object SmartReplyActionExecutor {

    private const val TAG = "SmartReplyExecutor"

    fun executePendingReply(context: Context, action: PendingAction): ActionExecutionResult {
        if (action.isExpired()) {
            action.state = ActionState.EXPIRED
            Log.w(TAG, "Cannot execute action [${action.id}]: Authorization expired")
            return ActionExecutionResult.Failure("Authorization expired.")
        }

        if (action.state != ActionState.APPROVED && action.state != ActionState.PENDING_APPROVAL) {
            Log.w(TAG, "Cannot execute action [${action.id}]: Invalid state (${action.state})")
            return ActionExecutionResult.Failure("Action not approved.")
        }

        // Find matching active reply context from notification registry
        val replyCtx = NotificationConversationRegistry.findContextForSender(action.targetSender)
            ?: NotificationConversationRegistry.getLastContext()

        if (replyCtx == null) {
            action.state = ActionState.FAILED
            Log.e(TAG, "No active reply context found for target [${action.targetSender}]")
            return ActionExecutionResult.Failure("No active conversation found to reply to.")
        }

        // Idempotency: Transition to EXECUTING
        action.state = ActionState.EXECUTING
        Log.i(TAG, "Executing reply for [${action.targetSender}] on [${action.appName}]: '${action.proposedContent}'")

        val sent = NotificationConversationRegistry.executeReply(
            context = context,
            replyContext = replyCtx,
            replyMessage = action.proposedContent
        )

        return if (sent) {
            action.state = ActionState.EXECUTED
            Log.i(TAG, "Reply executed successfully for [${action.targetSender}]")
            ActionExecutionResult.Success("Reply sent to ${replyCtx.sender}: \"${action.proposedContent}\"")
        } else {
            action.state = ActionState.FAILED
            Log.e(TAG, "RemoteInput dispatch failed for [${action.targetSender}]")
            ActionExecutionResult.Failure("Failed to transmit reply through Android notification action.")
        }
    }
}
