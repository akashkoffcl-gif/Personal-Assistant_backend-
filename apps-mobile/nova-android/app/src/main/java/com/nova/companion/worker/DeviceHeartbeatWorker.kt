package com.nova.companion.worker

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.nova.companion.data.local.SecureSessionManager
import com.nova.companion.data.remote.DeviceHeartbeatRequest
import com.nova.companion.data.remote.NovaApiClient
import com.nova.companion.health.NovaDeviceDiagnosticsManager
import java.util.concurrent.TimeUnit

class DeviceHeartbeatWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        private const val TAG = "DeviceHeartbeatWorker"
        private const val UNIQUE_WORK_NAME = "nova_periodic_heartbeat_worker"

        fun schedulePeriodic(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            // Periodic heartbeat runs every 15 minutes (Android WorkManager minimum interval)
            val periodicRequest = PeriodicWorkRequestBuilder<DeviceHeartbeatWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                periodicRequest
            )
            Log.i(TAG, "Periodic device heartbeat scheduled (15m interval)")
        }

        fun enqueueImmediate(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val oneTimeRequest = OneTimeWorkRequestBuilder<DeviceHeartbeatWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueue(oneTimeRequest)
            Log.i(TAG, "Immediate device heartbeat enqueued")
        }
    }

    override suspend fun doWork(): Result {
        val context = applicationContext
        val token = SecureSessionManager.getAuthToken(context)
        val deviceId = SecureSessionManager.getDeviceId(context)

        if (token.isNullOrBlank() || deviceId.isNullOrBlank()) {
            Log.w(TAG, "Heartbeat aborted: Unauthenticated or missing device ID")
            return Result.failure()
        }

        return try {
            val diag = NovaDeviceDiagnosticsManager.collectDiagnostics(context)
            val authHeader = if (token.startsWith("Bearer ")) token else "Bearer $token"
            val apiService = NovaApiClient.getApiService()

            val request = DeviceHeartbeatRequest(
                deviceId = deviceId,
                appVersion = diag.appVersion,
                osVersion = diag.osVersion,
                isListenerConnected = diag.isListenerConnected,
                isNotificationAccessGranted = diag.isNotificationAccessGranted,
                isBatteryOptimizationIgnored = diag.isBatteryOptimizationIgnored,
                pendingQueueCount = diag.pendingQueueCount,
                oldestPendingEventTime = diag.oldestPendingEventTime,
                lastSyncError = diag.lastSyncError,
                lastSuccessfulSync = diag.lastSuccessfulSync
            )

            val response = apiService.sendHeartbeat(authHeader, request)
            if (response.isSuccessful) {
                Log.i(TAG, "Device heartbeat acknowledged by server: timestamp=${System.currentTimeMillis()}")
                Result.success()
            } else if (response.code() == 401) {
                Log.e(TAG, "Heartbeat rejected (401 Unauthorized): Device session revoked or expired")
                Result.failure()
            } else {
                Log.w(TAG, "Heartbeat transient failure (HTTP ${response.code()})")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Network exception during heartbeat dispatch", e)
            Result.retry()
        }
    }
}
