package com.nova.companion.bridge

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.CombinedVibration
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.webkit.JavascriptInterface
import androidx.core.app.NotificationManagerCompat
import com.nova.companion.data.local.KeyStoreManager
import com.nova.companion.data.local.SecureSessionManager
import org.json.JSONObject

class NovaNativeBridge(
    private val context: Context,
    private val onRequestMicPermission: () -> Unit
) {

    companion object {
        const val JAVASCRIPT_INTERFACE_NAME = "NovaAndroidBridge"
        private val TRUSTED_HOSTS = setOf(
            "personal-assistant-frontend-jk5l.onrender.com",
            "nova-assistant-web.onrender.com",
            "localhost",
            "127.0.0.1",
            "10.0.2.2"
        )
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
        }
        return json.toString()
    }

    @JavascriptInterface
    fun getNotificationCapabilityStatus(): String {
        val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
        val isGranted = enabledPackages.contains(context.packageName)

        val json = JSONObject().apply {
            put("isGranted", isGranted)
            put("isListenerConnected", isGranted)
            put("packageName", context.packageName)
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
    fun requestMicrophonePermission() {
        onRequestMicPermission()
    }

    @JavascriptInterface
    fun syncAuthSession(token: String, userId: String) {
        if (token.isNotBlank() && userId.isNotBlank()) {
            SecureSessionManager.saveSession(context, token, userId)
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
}
