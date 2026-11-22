package com.nova.companion.notification.intelligence.priority

import android.content.Context
import android.content.SharedPreferences

/**
 * Registry of user-defined VIP contacts. VIP contacts are prioritized
 * as P1_HIGH and may be permitted during quiet hours if user configured.
 */
object NotificationVipRegistry {

    private const val PREFS_NAME = "nova_vip_contacts_prefs"
    private const val KEY_VIPS = "vip_contacts_set"

    private val cachedVips = mutableSetOf<String>()
    @Volatile
    private var isLoaded = false

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private fun ensureLoaded(context: Context) {
        if (!isLoaded) {
            synchronized(cachedVips) {
                if (!isLoaded) {
                    val saved = getPrefs(context).getStringSet(KEY_VIPS, emptySet()) ?: emptySet()
                    cachedVips.clear()
                    cachedVips.addAll(saved.map { it.lowercase().trim() })
                    isLoaded = true
                }
            }
        }
    }

    fun isVip(context: Context, contactName: String): Boolean {
        if (contactName.isBlank()) return false
        ensureLoaded(context)
        val normalized = contactName.lowercase().trim()
        synchronized(cachedVips) {
            return cachedVips.contains(normalized) || cachedVips.any { normalized.contains(it) }
        }
    }

    fun addVip(context: Context, contactName: String) {
        if (contactName.isBlank()) return
        ensureLoaded(context)
        val normalized = contactName.lowercase().trim()
        synchronized(cachedVips) {
            cachedVips.add(normalized)
            getPrefs(context).edit().putStringSet(KEY_VIPS, cachedVips).apply()
        }
    }

    fun removeVip(context: Context, contactName: String) {
        if (contactName.isBlank()) return
        ensureLoaded(context)
        val normalized = contactName.lowercase().trim()
        synchronized(cachedVips) {
            cachedVips.remove(normalized)
            getPrefs(context).edit().putStringSet(KEY_VIPS, cachedVips).apply()
        }
    }

    fun getAllVips(context: Context): Set<String> {
        ensureLoaded(context)
        synchronized(cachedVips) {
            return HashSet(cachedVips)
        }
    }
}
