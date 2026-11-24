package com.nova.companion.calendar

data class CalendarEventRecord(
    val id: String,
    val title: String,
    val startTime: Long,
    val endTime: Long,
    val participant: String? = null,
    val location: String? = null,
    val isConfirmed: Boolean = true
)

/**
 * PersonalCalendarEngine
 *
 * Provides schedule awareness, detects meetings, and links tasks to preparation windows.
 */
object PersonalCalendarEngine {

    private val scheduledEvents = mutableListOf<CalendarEventRecord>()

    fun recordEvent(event: CalendarEventRecord) {
        synchronized(scheduledEvents) {
            scheduledEvents.removeIf { it.id == event.id }
            scheduledEvents.add(event)
        }
    }

    fun getUpcomingEvents(): List<CalendarEventRecord> {
        val now = System.currentTimeMillis()
        synchronized(scheduledEvents) {
            return scheduledEvents.filter { it.endTime > now }.sortedBy { it.startTime }
        }
    }

    fun findEventForContact(contact: String): CalendarEventRecord? {
        val c = contact.lowercase().trim()
        val now = System.currentTimeMillis()
        synchronized(scheduledEvents) {
            return scheduledEvents.firstOrNull {
                it.endTime > now && (it.participant?.lowercase()?.contains(c) == true || it.title.lowercase().contains(c))
            }
        }
    }

    fun clear() {
        synchronized(scheduledEvents) {
            scheduledEvents.clear()
        }
    }
}
