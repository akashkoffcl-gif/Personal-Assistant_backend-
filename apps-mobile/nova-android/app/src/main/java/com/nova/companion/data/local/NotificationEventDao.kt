package com.nova.companion.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface NotificationEventDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvent(event: NotificationEventEntity)

    @Query("SELECT * FROM notification_events WHERE isSynced = 0 ORDER BY occurredAt ASC LIMIT 50")
    suspend fun getPendingEvents(): List<NotificationEventEntity>

    @Query("UPDATE notification_events SET isSynced = 1 WHERE id = :id")
    suspend fun markSynced(id: String)

    @Query("DELETE FROM notification_events WHERE isSynced = 1 AND createdAt < :thresholdTimestamp")
    suspend fun purgeOldSyncedEvents(thresholdTimestamp: Long)
}
