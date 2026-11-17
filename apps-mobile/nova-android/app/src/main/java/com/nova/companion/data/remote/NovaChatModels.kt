package com.nova.companion.data.remote

import com.google.gson.annotations.SerializedName

data class ChatMessageDto(
    @SerializedName("message") val message: String,
    @SerializedName("conversationId") val conversationId: String? = null,
    @SerializedName("assistantName") val assistantName: String? = "JARVIS"
)

data class ChatResponseDto(
    @SerializedName("success") val success: Boolean? = true,
    @SerializedName("message") val message: ChatMessagePayload? = null,
    @SerializedName("conversationId") val conversationId: String? = null,
    @SerializedName("reply") val reply: String? = null
)

data class ChatMessagePayload(
    @SerializedName("id") val id: String? = null,
    @SerializedName("role") val role: String? = null,
    @SerializedName("content") val content: String? = null
)
