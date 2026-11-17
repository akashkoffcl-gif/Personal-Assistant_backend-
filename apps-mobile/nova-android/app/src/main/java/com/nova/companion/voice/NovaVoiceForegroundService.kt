package com.nova.companion.voice

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.nova.companion.MainActivity

/**
 * NovaVoiceForegroundService allows voice interactions and acoustic wake-word spotting
 * while complying strictly with Android 14+ (API 34-36) microphone foreground service requirements.
 *
 * It must specify android:foregroundServiceType="microphone" in AndroidManifest.xml and
 * present an ongoing visible notification to ensure user privacy and OS compliance.
 */
class NovaVoiceForegroundService : Service() {

    companion object {
        private const val TAG = "NovaVoiceService"
        private const val CHANNEL_ID = "nova_voice_service_channel"
        private const val NOTIFICATION_ID = 4001

        const val ACTION_START_VOICE = "com.nova.companion.action.START_VOICE"
        const val ACTION_STOP_VOICE = "com.nova.companion.action.STOP_VOICE"
        const val ACTION_TOGGLE_WAKEWORD = "com.nova.companion.action.TOGGLE_WAKEWORD"

        fun startService(context: Context) {
            val intent = Intent(context, NovaVoiceForegroundService::class.java).apply {
                action = ACTION_START_VOICE
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, NovaVoiceForegroundService::class.java).apply {
                action = ACTION_STOP_VOICE
            }
            context.startService(intent)
        }
    }

    private val binder = LocalBinder()
    private var voiceActivationManager: VoiceActivationManager? = null

    inner class LocalBinder : Binder() {
        fun getService(): NovaVoiceForegroundService = this@NovaVoiceForegroundService
        fun getVoiceActivationManager(): VoiceActivationManager? = voiceActivationManager
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "NovaVoiceForegroundService onCreate")
        createNotificationChannel()

        voiceActivationManager = VoiceActivationManager(applicationContext) { status ->
            updateNotification(status)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START_VOICE
        Log.i(TAG, "NovaVoiceForegroundService onStartCommand action: $action")

        when (action) {
            ACTION_START_VOICE -> {
                startForegroundWithMicrophone()
                voiceActivationManager?.startVoiceSession()
            }
            ACTION_STOP_VOICE -> {
                voiceActivationManager?.stopVoiceSession()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
            ACTION_TOGGLE_WAKEWORD -> {
                val current = voiceActivationManager?.isWakeWordEnabled() ?: false
                voiceActivationManager?.setWakeWordEnabled(!current)
            }
        }

        return START_NOT_STICKY
    }

    private fun startForegroundWithMicrophone() {
        val notification = buildNotification(voiceActivationManager?.getVoiceStatus())

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun updateNotification(status: VoiceStatusInfo) {
        val notification = buildNotification(status)
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun buildNotification(status: VoiceStatusInfo?): Notification {
        val stateText = when (status?.state) {
            VoiceState.LISTENING -> "Listening for your command..."
            VoiceState.PROCESSING -> "Processing intelligence query..."
            VoiceState.RESPONDING -> "Speaking response..."
            VoiceState.READY -> if (status.isWakeWordActive) "Listening for 'Hey Nova' / 'Jarvis'..." else "Ready"
            VoiceState.ERROR -> "Voice error: ${status.lastError ?: "Unknown"}"
            else -> "Active"
        }

        val activityIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            activityIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, NovaVoiceForegroundService::class.java).apply {
            action = ACTION_STOP_VOICE
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("NOVA Voice Subsystem")
            .setContentText(stateText)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop Voice", stopPendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "NOVA Voice Intelligence Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Ongoing notification for native microphone voice session"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "NovaVoiceForegroundService onDestroy")
        voiceActivationManager?.destroy()
        voiceActivationManager = null
    }
}
