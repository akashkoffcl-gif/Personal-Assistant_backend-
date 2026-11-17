package com.nova.companion

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.nova.companion.ui.screens.UnifiedNovaWebView
import com.nova.companion.ui.theme.NovaDarkColorScheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val requestAudioPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        // Audio permission result handled
    }

    private val requestNotificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        // Notification permission result handled
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Request runtime Audio permission if needed for assistant voice interaction
        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            requestAudioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }

        // Request runtime Notification permission on Android 13+ (API 33-36)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        // Schedule periodic device telemetry heartbeat if session is established
        if (!com.nova.companion.data.local.SecureSessionManager.getAuthToken(this).isNullOrBlank()) {
            com.nova.companion.worker.DeviceHeartbeatWorker.schedulePeriodic(this)
            com.nova.companion.worker.DeviceHeartbeatWorker.enqueueImmediate(this)
        }

        setContent {
            MaterialTheme(colorScheme = NovaDarkColorScheme) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    UnifiedNovaWebView(
                        onRequestMicPermission = {
                            requestAudioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                        },
                        onRequestNotificationPermission = {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                            }
                        }
                    )
                }
            }
        }
    }
}
