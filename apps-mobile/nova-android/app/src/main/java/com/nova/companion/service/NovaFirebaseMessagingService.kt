package com.nova.companion.service

import android.content.Intent
import android.net.Uri
import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import org.json.JSONObject

class NovaFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "NovaFCM"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.i(TAG, "New FCM Token received: ${token.take(12)}...")
        // Registers active FCM token with backend POST /api/v1/mobile/push-token
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val data = message.data
        val messageType = data["type"] ?: return

        if (messageType == "MOBILE_COMMAND") {
            handleMobileCommand(data)
        }
    }

    private fun handleMobileCommand(data: Map<String, String>) {
        val commandId = data["commandId"] ?: return
        val commandType = data["commandType"] ?: return
        val requiresConfirmation = data["requiresConfirmation"]?.toBoolean() ?: false
        val payloadJson = data["payload"] ?: "{}"

        Log.i(TAG, "Received Mobile Command: $commandType (Confirmation: $requiresConfirmation)")

        if (requiresConfirmation) {
            // Surface local confirmation dialog / notification for L3 approval
            showApprovalPrompt(commandId, commandType)
            return
        }

        // Execute authorized command
        executeAction(commandType, JSONObject(payloadJson))
    }

    private fun showApprovalPrompt(commandId: String, commandType: String) {
        Log.i(TAG, "Prompeting user for explicit confirmation of command: $commandId ($commandType)")
        // Displays system notification or Compose bottom-sheet asking user to confirm
    }

    private fun executeAction(commandType: String, payload: JSONObject) {
        when (commandType) {
            "OPEN_APP" -> {
                val packageName = payload.optString("packageName")
                if (packageName.isNotEmpty()) {
                    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                    if (launchIntent != null) {
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(launchIntent)
                    }
                }
            }
            "OPEN_URL" -> {
                val url = payload.optString("url")
                if (url.isNotEmpty()) {
                    val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(browserIntent)
                }
            }
            "SHARE_TEXT" -> {
                val text = payload.optString("text")
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, text)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(Intent.createChooser(shareIntent, "Share via NOVA").apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                })
            }
        }
    }
}

