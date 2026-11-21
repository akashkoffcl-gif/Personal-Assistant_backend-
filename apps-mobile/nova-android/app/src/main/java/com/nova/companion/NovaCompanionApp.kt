package com.nova.companion

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class NovaCompanionApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Pre-warm audio channel and SpeechArbitrator
        com.nova.companion.notification.NotificationAlertDispatcher.createNotificationChannel(this)
        com.nova.companion.voice.arbitration.SpeechArbitrator.getInstance(this)
    }
}

