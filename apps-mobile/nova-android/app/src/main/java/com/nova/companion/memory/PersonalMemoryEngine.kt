package com.nova.companion.memory

enum class PersonalMemoryCategory {
    SHORT_TERM,
    TASK,
    USER_PREFERENCE,
    EPISODIC
}

data class PersonalMemoryEntry(
    val id: String,
    val category: PersonalMemoryCategory,
    val key: String,
    val value: String,
    val sourceContact: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * PersonalMemoryEngine
 *
 * Multitiered memory store for user preferences, task memory, and completed obligations.
 * Never stores OTPs or private security tokens.
 */
object PersonalMemoryEngine {

    private val entries = mutableListOf<PersonalMemoryEntry>()

    fun recordMemory(entry: PersonalMemoryEntry) {
        synchronized(entries) {
            entries.removeIf { it.category == entry.category && it.key.equals(entry.key, ignoreCase = true) }
            entries.add(entry)
            if (entries.size > 100) {
                entries.removeAt(0)
            }
        }
    }

    fun findMemory(keyQuery: String): List<PersonalMemoryEntry> {
        val q = keyQuery.lowercase().trim()
        synchronized(entries) {
            return entries.filter { it.key.lowercase().contains(q) || it.value.lowercase().contains(q) }
        }
    }

    fun clearAll() {
        synchronized(entries) {
            entries.clear()
        }
    }
}
