package com.nova.companion.notification.intelligence.model

/**
 * High-level semantic classification of the notification message source and nature.
 */
enum class MessageType {
    DIRECT,        // 1-on-1 personal message (WhatsApp DM, SMS, Instagram DM)
    GROUP,         // Group chat message (WhatsApp Group, multi-recipient chat)
    MISSED_CALL,   // Missed incoming voice or video call
    OTP,           // One-Time Password / 2FA verification code
    PROMOTIONAL,   // Marketing, deals, newsletters, promotional offers
    SYSTEM,        // App status, sync, background service notifications
    UNKNOWN        // Unclassified or ambiguous
}
