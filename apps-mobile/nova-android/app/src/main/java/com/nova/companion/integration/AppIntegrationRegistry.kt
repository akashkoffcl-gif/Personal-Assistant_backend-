package com.nova.companion.integration

enum class IntegrationCapability {
    READ_CONTEXT,
    SEND_MESSAGE,
    REPLY_TO_NOTIFICATION,
    CREATE_EVENT,
    READ_EVENT,
    CREATE_TASK
}

data class AppIntegrationInfo(
    val packageName: String,
    val appName: String,
    val supportedCapabilities: Set<IntegrationCapability>,
    val requiresApproval: Boolean = true
)

/**
 * AppIntegrationRegistry
 *
 * Tracks supported capabilities across installed applications (WhatsApp, Messages, Calendar).
 */
object AppIntegrationRegistry {

    private val registry = mapOf(
        "com.whatsapp" to AppIntegrationInfo(
            packageName = "com.whatsapp",
            appName = "WhatsApp",
            supportedCapabilities = setOf(IntegrationCapability.READ_CONTEXT, IntegrationCapability.REPLY_TO_NOTIFICATION)
        ),
        "com.google.android.apps.messaging" to AppIntegrationInfo(
            packageName = "com.google.android.apps.messaging",
            appName = "Messages",
            supportedCapabilities = setOf(IntegrationCapability.READ_CONTEXT, IntegrationCapability.REPLY_TO_NOTIFICATION)
        ),
        "com.google.android.calendar" to AppIntegrationInfo(
            packageName = "com.google.android.calendar",
            appName = "Calendar",
            supportedCapabilities = setOf(IntegrationCapability.READ_EVENT, IntegrationCapability.CREATE_EVENT)
        )
    )

    fun getIntegration(packageName: String): AppIntegrationInfo? {
        return registry[packageName]
    }

    fun isCapabilitySupported(packageName: String, capability: IntegrationCapability): Boolean {
        return registry[packageName]?.supportedCapabilities?.contains(capability) == true
    }
}
