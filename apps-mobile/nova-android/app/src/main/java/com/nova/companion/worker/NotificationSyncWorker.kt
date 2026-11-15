package com.nova.companion.worker

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.nova.companion.data.local.NotificationDatabase
import com.nova.companion.data.local.SecureSessionManager
import com.nova.companion.data.remote.IngestMobileEventRequest
import com.nova.companion.data.remote.NovaApiClient
import java.util.concurrent.TimeUnit

class NotificationSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        private const val TAG = "NotificationSyncWorker"

        fun enqueue(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = OneTimeWorkRequestBuilder<NotificationSyncWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueue(workRequest)
        }
    }

    override suspend fun doWork(): Result {
        val context = applicationContext
        val token = SecureSessionManager.getAuthToken(context)
        val deviceId = SecureSessionManager.getDeviceId(context)

        if (token.isNullOrBlank() || deviceId.isNullOrBlank()) {
            Log.w(TAG, "Sync aborted: Missing authentication token or device ID")
            return Result.failure()
        }

        val authHeader = if (token.startsWith("Bearer ")) token else "Bearer $token"
        val database = NotificationDatabase.getInstance(context)
        val dao = database.notificationEventDao()
        val pendingEvents = dao.getPendingEvents()

        if (pendingEvents.isEmpty()) {
            return Result.success()
        }

        val apiService = NovaApiClient.getApiService()
        var hasFailures = false

        for (event in pendingEvents) {
            try {
                val request = IngestMobileEventRequest(
                    deviceId = deviceId,
                    sourceApp = event.sourceApp,
                    appName = event.appName,
                    category = event.category,
                    title = event.title,
                    summary = event.summary,
                    occurredAt = event.occurredAt
                )

                val response = apiService.ingestEvent(authHeader, request)
                if (response.isSuccessful || response.code() == 409) {
                    dao.markSynced(event.id)
                    Log.i(TAG, "Notification event synchronized: [${event.sourceApp}] ID=${event.id}")
                } else if (response.code() in 400..499 && response.code() != 429) {
                    // Permanent client error (e.g. unapproved app on server or invalid schema)
                    Log.e(TAG, "Permanent rejection for event ${event.id}: HTTP ${response.code()}")
                    dao.markSynced(event.id) // Do not retry permanently rejected events
                } else {
                    Log.w(TAG, "Transient sync failure for event ${event.id}: HTTP ${response.code()}")
                    hasFailures = true
                }
            } catch (e: Exception) {
                Log.e(TAG, "Network exception during sync of event ${event.id}", e)
                hasFailures = true
            }
        }

        // Purge old synced events older than 7 days
        val sevenDaysAgo = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(7)
        dao.purgeOldSyncedEvents(sevenDaysAgo)

        return if (hasFailures) Result.retry() else Result.success()
    }
}
