package com.nova.companion.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

data class InitiatePairingRequest(
    @SerializedName("deviceName") val deviceName: String,
    @SerializedName("deviceModel") val deviceModel: String,
    @SerializedName("osVersion") val osVersion: String,
    @SerializedName("appVersion") val appVersion: String,
    @SerializedName("publicKey") val publicKey: String
)

data class InitiatePairingResponse(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("challenge") val challenge: String,
    @SerializedName("expiresAt") val expiresAt: String,
    @SerializedName("message") val message: String
)

data class ConfirmPairingRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("signedChallenge") val signedChallenge: String
)

data class ConfirmPairingResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("status") val status: String
)

data class IngestMobileEventRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("sourceApp") val sourceApp: String,
    @SerializedName("appName") val appName: String?,
    @SerializedName("category") val category: String,
    @SerializedName("title") val title: String?,
    @SerializedName("summary") val summary: String?,
    @SerializedName("occurredAt") val occurredAt: String,
    @SerializedName("rawMetadata") val rawMetadata: Map<String, Any>? = null
)

data class IngestMobileEventResponse(
    @SerializedName("id") val id: String,
    @SerializedName("occurredAt") val occurredAt: String
)

data class UpdatePermissionsRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("permissions") val permissions: List<PermissionEntry>
)

data class PermissionEntry(
    @SerializedName("permissionKey") val permissionKey: String,
    @SerializedName("isGranted") val isGranted: Boolean
)

data class DeviceHeartbeatRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("appVersion") val appVersion: String,
    @SerializedName("osVersion") val osVersion: String,
    @SerializedName("isListenerConnected") val isListenerConnected: Boolean,
    @SerializedName("isNotificationAccessGranted") val isNotificationAccessGranted: Boolean,
    @SerializedName("isBatteryOptimizationIgnored") val isBatteryOptimizationIgnored: Boolean,
    @SerializedName("pendingQueueCount") val pendingQueueCount: Int,
    @SerializedName("oldestPendingEventTime") val oldestPendingEventTime: String? = null,
    @SerializedName("lastSyncError") val lastSyncError: String? = null,
    @SerializedName("lastSuccessfulSync") val lastSuccessfulSync: String? = null
)

interface NovaApiService {
    @POST("mobile/pair/initiate")
    suspend fun initiatePairing(
        @Header("Authorization") authHeader: String,
        @Body request: InitiatePairingRequest
    ): Response<InitiatePairingResponse>

    @POST("mobile/pair/confirm")
    suspend fun confirmPairing(
        @Header("Authorization") authHeader: String,
        @Body request: ConfirmPairingRequest
    ): Response<ConfirmPairingResponse>

    @POST("mobile/events")
    suspend fun ingestEvent(
        @Header("Authorization") authHeader: String,
        @Body request: IngestMobileEventRequest
    ): Response<IngestMobileEventResponse>

    @POST("mobile/permissions")
    suspend fun updatePermissions(
        @Header("Authorization") authHeader: String,
        @Body request: UpdatePermissionsRequest
    ): Response<Map<String, Any>>

    @POST("mobile/heartbeat")
    suspend fun sendHeartbeat(
        @Header("Authorization") authHeader: String,
        @Body request: DeviceHeartbeatRequest
    ): Response<Map<String, Any>>

    @POST("ai/chat")
    suspend fun sendChatMessage(
        @Header("Authorization") authHeader: String,
        @Body request: ChatMessageDto
    ): Response<ChatResponseDto>
}
