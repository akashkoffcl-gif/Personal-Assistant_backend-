package com.nova.companion.bridge

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.util.Log
import android.webkit.JavascriptInterface
import androidx.core.app.NotificationManagerCompat
import com.nova.companion.data.local.AppApprovalRegistry
import com.nova.companion.data.local.KeyStoreManager
import com.nova.companion.data.local.SecureSessionManager
import com.nova.companion.data.remote.ConfirmPairingRequest
import com.nova.companion.data.remote.InitiatePairingRequest
import com.nova.companion.data.remote.NovaApiClient
import com.nova.companion.data.remote.PermissionEntry
import com.nova.companion.data.remote.UpdatePermissionsRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import com.nova.companion.voice.NovaVoiceForegroundService
import com.nova.companion.voice.VoiceActivationManager

class NovaNativeBridge(
    private val context: Context,
    private val onRequestMicPermission: () -> Unit,
    private val onRequestNotificationPermission: () -> Unit = {}
) {

    companion object {
        const val JAVASCRIPT_INTERFACE_NAME = "NovaAndroidBridge"
        private const val TAG = "NovaNativeBridge"
        private val TRUSTED_HOSTS = setOf(
            "personal-assistant-frontend-jk5l.onrender.com",
            "nova-assistant-web.onrender.com",
            "localhost",
            "127.0.0.1",
            "10.0.2.2"
        )
    }

    private val bridgeScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var voiceActivationManager: VoiceActivationManager? = null

    init {
        // Initialize voice manager for in-app or bridge interactions
        try {
            voiceActivationManager = VoiceActivationManager(context)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize VoiceActivationManager in bridge", e)
        }
    }

    @JavascriptInterface
    fun isNativeApp(): Boolean = true

    @JavascriptInterface
    fun getDeviceIdentity(): String {
        val json = JSONObject().apply {
            put("deviceName", "${Build.MANUFACTURER} ${Build.MODEL}")
            put("deviceModel", Build.MODEL)
            put("osVersion", "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})")
            put("appVersion", "1.0.0")
            put("publicKeyPem", KeyStoreManager.getPublicKeyPem())
            put("deviceId", SecureSessionManager.getDeviceId(context) ?: "")
        }
        return json.toString()
    }

    @JavascriptInterface
    fun getNotificationCapabilityStatus(): String {
        val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
        val isGranted = enabledPackages.contains(context.packageName)
        val approvedApps = AppApprovalRegistry.getApprovedPackages(context)

        val json = JSONObject().apply {
            put("isGranted", isGranted)
            put("isListenerConnected", isGranted)
            put("packageName", context.packageName)
            put("approvedAppsCount", approvedApps.size)
            put("state", if (isGranted) "FULLY_CONNECTED" else "PERMISSION_NOT_GRANTED")
        }
        return json.toString()
    }

    @JavascriptInterface
    fun openNotificationAccessSettings() {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun getDeviceDiagnostics(): String {
        return kotlinx.coroutines.runBlocking {
            com.nova.companion.health.NovaDeviceDiagnosticsManager.collectDiagnosticsJson(context)
        }
    }

    @JavascriptInterface
    fun openBatteryOptimizationSettings() {
        val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun getInstalledEligibleApps(): String {
        return AppApprovalRegistry.getDiscoveredAppsJson(context)
    }

    @JavascriptInterface
    fun setAppApproval(packageName: String, approved: Boolean): Boolean {
        val success = AppApprovalRegistry.setAppApproval(context, packageName, approved)
        if (success) {
            syncApprovedAppsToBackend()
        }
        return success
    }

    @JavascriptInterface
    fun syncAuthSession(token: String, userId: String) {
        if (token.isNotBlank() && userId.isNotBlank()) {
            SecureSessionManager.saveSession(context, token, userId)
            autoPairDeviceIfNeeded(token, userId)
            // Schedule periodic background heartbeat and trigger immediate telemetry ping
            com.nova.companion.worker.DeviceHeartbeatWorker.schedulePeriodic(context)
            com.nova.companion.worker.DeviceHeartbeatWorker.enqueueImmediate(context)
        }
    }

    private fun autoPairDeviceIfNeeded(token: String, userId: String) {
        bridgeScope.launch {
            try {
                val existingDeviceId = SecureSessionManager.getDeviceId(context)
                if (!existingDeviceId.isNullOrBlank()) {
                    Log.i(TAG, "Device already paired: $existingDeviceId")
                    syncApprovedAppsToBackend()
                    return@launch
                }

                Log.i(TAG, "Initiating device pairing handshake with backend...")
                val apiService = NovaApiClient.getApiService()
                val authHeader = if (token.startsWith("Bearer ")) token else "Bearer $token"

                val initReq = InitiatePairingRequest(
                    deviceName = "${Build.MANUFACTURER} ${Build.MODEL}",
                    deviceModel = Build.MODEL,
                    osVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
                    appVersion = "1.0.0",
                    publicKey = KeyStoreManager.getPublicKeyPem()
                )

                val initRes = apiService.initiatePairing(authHeader, initReq)
                if (!initRes.isSuccessful || initRes.body() == null) {
                    Log.e(TAG, "Failed to initiate pairing: HTTP ${initRes.code()}")
                    return@launch
                }

                val pairingData = initRes.body()!!
                val signedChallenge = KeyStoreManager.signChallenge(pairingData.challenge)

                val confirmReq = ConfirmPairingRequest(
                    deviceId = pairingData.deviceId,
                    signedChallenge = signedChallenge
                )

                val confirmRes = apiService.confirmPairing(authHeader, confirmReq)
                if (confirmRes.isSuccessful && confirmRes.body()?.success == true) {
                    SecureSessionManager.saveDeviceId(context, pairingData.deviceId)
                    Log.i(TAG, "Device pairing completed successfully! Device ID: ${pairingData.deviceId}")
                    syncApprovedAppsToBackend()
                } else {
                    Log.e(TAG, "Device confirmation failed: HTTP ${confirmRes.code()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception during auto device pairing", e)
            }
        }
    }

    private fun syncApprovedAppsToBackend() {
        bridgeScope.launch {
            try {
                val token = SecureSessionManager.getAuthToken(context) ?: return@launch
                val deviceId = SecureSessionManager.getDeviceId(context) ?: return@launch
                val authHeader = if (token.startsWith("Bearer ")) token else "Bearer $token"
                val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
                val isGranted = enabledPackages.contains(context.packageName)

                val apiService = NovaApiClient.getApiService()
                val approvedAppsList = AppApprovalRegistry.getApprovedPackages(context).toList()
                val req = UpdatePermissionsRequest(
                    deviceId = deviceId,
                    permissions = listOf(
                        PermissionEntry("NOTIFICATION_LISTENER", isGranted),
                        PermissionEntry("RECORD_AUDIO", true)
                    ),
                    approvedPackages = approvedAppsList
                )
                apiService.updatePermissions(authHeader, req)
                Log.i(TAG, "Device permissions and ${approvedAppsList.size} approved apps synchronized to backend")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to sync permissions to backend", e)
            }
        }
    }

    @JavascriptInterface
    fun requestMicrophonePermission() {
        onRequestMicPermission()
    }

    @JavascriptInterface
    fun requestNotificationPermission() {
        onRequestNotificationPermission()
    }

    @JavascriptInterface
    fun openAppSettings() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", context.packageName, null)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open application settings", e)
        }
    }

    @JavascriptInterface
    fun getDevicePermissionStatus(): String {
        return try {
            val micGranted = androidx.core.content.ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.RECORD_AUDIO
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

            val notifGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                androidx.core.content.ContextCompat.checkSelfPermission(
                    context,
                    android.Manifest.permission.POST_NOTIFICATIONS
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            } else {
                NotificationManagerCompat.from(context).areNotificationsEnabled()
            }

            val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
            val listenerGranted = enabledPackages.contains(context.packageName)

            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
            val batteryOptimizationIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                powerManager?.isIgnoringBatteryOptimizations(context.packageName) ?: false
            } else {
                true
            }

            val json = JSONObject().apply {
                put("recordAudioGranted", micGranted)
                put("postNotificationsGranted", notifGranted)
                put("notificationListenerGranted", listenerGranted)
                put("batteryOptimizationIgnored", batteryOptimizationIgnored)
                put("sdkInt", Build.VERSION.SDK_INT)
            }
            json.toString()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to inspect permission status", e)
            "{\"error\":\"${e.message}\"}"
        }
    }

    @JavascriptInterface
    fun triggerHapticFeedback(pattern: String) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                val effect = when (pattern) {
                    "SUCCESS" -> VibrationEffect.createWaveform(longArrayOf(0, 50, 50, 80), -1)
                    "WARNING" -> VibrationEffect.createWaveform(longArrayOf(0, 100, 50, 100), -1)
                    else -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
                }
                vibratorManager?.defaultVibrator?.vibrate(effect)
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                vibrator?.vibrate(50)
            }
        } catch (_: Exception) {}
    }

    @JavascriptInterface
    fun openApp(packageName: String): Boolean {
        if (packageName.isBlank()) return false
        val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName)
        return if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(launchIntent)
            true
        } else {
            false
        }
    }

    @JavascriptInterface
    fun shareText(text: String, title: String) {
        if (text.isBlank()) return
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
            putExtra(Intent.EXTRA_TITLE, title)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val chooser = Intent.createChooser(shareIntent, title).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(chooser)
    }

    // ==================== PHASE 63: NATIVE VOICE SUBSYSTEM BRIDGE ====================

    @JavascriptInterface
    fun startVoiceSession(): Boolean {
        return try {
            voiceActivationManager?.startVoiceSession()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start voice session from bridge", e)
            false
        }
    }

    @JavascriptInterface
    fun stopVoiceSession(): Boolean {
        return try {
            voiceActivationManager?.stopVoiceSession()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop voice session from bridge", e)
            false
        }
    }

    @JavascriptInterface
    fun setWakeWordEnabled(enabled: Boolean): Boolean {
        return try {
            voiceActivationManager?.setWakeWordEnabled(enabled) ?: false
        } catch (e: Exception) {
            Log.e(TAG, "Failed to set wake-word state from bridge", e)
            false
        }
    }

    @JavascriptInterface
    fun startVoiceForegroundService(): Boolean {
        return try {
            NovaVoiceForegroundService.startService(context)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start voice foreground service", e)
            false
        }
    }

    @JavascriptInterface
    fun stopVoiceForegroundService(): Boolean {
        return try {
            NovaVoiceForegroundService.stopService(context)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop voice foreground service", e)
            false
        }
    }

    @JavascriptInterface
    fun testVoiceOutput(phrase: String?): String {
        return try {
            val textToSpeak = if (!phrase.isNullOrBlank()) phrase else "Hello! This is NOVA. Native Android voice output is working properly."
            voiceActivationManager?.testSpeechOutput(textToSpeak)
            "{\"success\":true,\"message\":\"Speech output triggered\"}"
        } catch (e: Exception) {
            Log.e(TAG, "Failed to test speech output", e)
            "{\"success\":false,\"error\":\"${e.message}\"}"
        }
    }

    @JavascriptInterface
    fun getVoiceStatus(): String {
        return try {
            val status = voiceActivationManager?.getVoiceStatus()
            val json = JSONObject().apply {
                put("state", status?.state?.name ?: "DISABLED")
                put("isWakeWordActive", status?.isWakeWordActive ?: false)
                put("isTtsActive", status?.isTtsActive ?: false)
                put("isRecognitionAvailable", status?.isRecognitionAvailable ?: false)
                put("lastTranscript", status?.lastTranscript ?: JSONObject.NULL)
                put("lastError", status?.lastError ?: JSONObject.NULL)
            }
            json.toString()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get voice status", e)
            "{\"state\":\"ERROR\",\"lastError\":\"${e.message}\"}"
        }
    }
}
