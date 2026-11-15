package com.nova.companion.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "notification_events")
data class NotificationEventEntity(
    @PrimaryKey val id: String,
    val deviceId: String,
    val sourceApp: String,
    val appName: String,
    val category: String,
    val title: String,
    val summary: String,
    val occurredAt: String,
    val isSynced: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)
