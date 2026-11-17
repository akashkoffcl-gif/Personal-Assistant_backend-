package com.nova.companion.health

import android.content.Context
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationManagerCompat
import com.nova.companion.data.local.AppApprovalRegistry
import com.nova.companion.data.local.NotificationDatabase
import com.nova.companion.data.local.SecureSessionManager
import com.nova.companion.data.remote.NovaApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

data class DeviceDiagnostics(
    val deviceId: String,
    val appVersion: String,
    val osVersion: String,
    val isListenerConnected: Boolean,
    val isNotificationAccessGranted: Boolean,
    val isBatteryOptimizationIgnored: Boolean,
    val approvedAppsCount: Int,
    val pendingQueueCount: Int,
    val oldestPendingEventTime: String?,
    val lastSyncError: String?,
    val lastSuccessfulSync: String?
)

object NovaDeviceDiagnosticsManager {
    private const val APP_VERSION = "1.0.0"

    suspend fun collectDiagnostics(context: Context): DeviceDiagnostics = withContext(Dispatchers.IO) {
        val deviceId = SecureSessionManager.getDeviceId(context) ?: "unpaired-device"
        val enabledPackages = NotificationManagerCompat.getEnabledListenerPackages(context)
        val isNotificationAccessGranted = enabledPackages.contains(context.packageName)

        // Battery optimization exemption check
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val isBatteryOptimizationIgnored = powerManager?.isIgnoringBatteryOptimizations(context.packageName) ?: false

        // Room queue metrics
        val db = NotificationDatabase.getInstance(context)
        val pendingEvents = db.notificationEventDao().getPendingEvents()
        val pendingQueueCount = pendingEvents.size
        val oldestPending = pendingEvents.minByOrNull { it.createdAt }?.occurredAt

        val approvedApps = AppApprovalRegistry.getApprovedPackages(context)

        DeviceDiagnostics(
            deviceId = deviceId,
            appVersion = APP_VERSION,
            osVersion = "${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
            isListenerConnected = isNotificationAccessGranted,
            isNotificationAccessGranted = isNotificationAccessGranted,
            isBatteryOptimizationIgnored = isBatteryOptimizationIgnored,
            approvedAppsCount = approvedApps.size,
            pendingQueueCount = pendingQueueCount,
            oldestPendingEventTime = oldestPending,
            lastSyncError = null,
            lastSuccessfulSync = null
        )
    }

    suspend fun collectDiagnosticsJson(context: Context): String = withContext(Dispatchers.IO) {
        val d = collectDiagnostics(context)
        JSONObject().apply {
            put("deviceId", d.deviceId)
            put("appVersion", d.appVersion)
            put("osVersion", d.osVersion)
            put("isListenerConnected", d.isListenerConnected)
            put("isNotificationAccessGranted", d.isNotificationAccessGranted)
            put("isBatteryOptimizationIgnored", d.isBatteryOptimizationIgnored)
            put("approvedAppsCount", d.approvedAppsCount)
            put("pendingQueueCount", d.pendingQueueCount)
            put("oldestPendingEventTime", d.oldestPendingEventTime ?: JSONObject.NULL)
            put("lastSyncError", d.lastSyncError ?: JSONObject.NULL)
            put("lastSuccessfulSync", d.lastSuccessfulSync ?: JSONObject.NULL)
        }.toString()
    }
}
