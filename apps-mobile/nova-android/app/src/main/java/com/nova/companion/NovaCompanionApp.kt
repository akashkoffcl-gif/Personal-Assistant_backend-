package com.nova.companion

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class NovaCompanionApp : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}

