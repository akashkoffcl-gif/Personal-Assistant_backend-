package com.nova.companion.data.local

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

data class DiscoveredApp(
    val packageName: String,
    val appName: String,
    val isApproved: Boolean,
    val isSecurityBlocked: Boolean,
    val category: String
)

object AppApprovalRegistry {
    private const val PREFS_NAME = "nova_app_approval_prefs"
    private const val KEY_APPROVED_PACKAGES = "approved_packages_set"

    // Mandatory hardcoded security exclusions (Banking, UPI, Authenticator, Password Managers)
    private val MANDATORY_BLOCKED_PACKAGES = setOf(
        "com.google.android.apps.authenticator2",
        "com.authy.authy",
        "com.duosecurity.duomobile",
        "com.onepassword.android",
        "com.bitwarden.client",
        "com.lastpass.lpandroid",
        "com.chase.sig.android",
        "com.bankofamerica.community",
        "com.wellsfargo.mobile",
        "com.paypal.android.p2pmobile",
        "com.venmo",
        "com.squareup.cash",
        "com.phonepe.app",
        "in.org.npci.upiapp",
        "com.google.android.apps.nbu.paisa.user",
        "com.iexceed.ib.digitalbankingprod",
        "in.dmifinance.app",
        "com.kreditbee.android"
    )

    fun isSecurityBlocked(packageName: String): Boolean {
        val lower = packageName.lowercase()
        if (MANDATORY_BLOCKED_PACKAGES.contains(lower)) return true
        return lower.contains("bank") ||
                lower.contains("authenticator") ||
                lower.contains("password") ||
                lower.contains("credit") ||
                lower.contains("upi") ||
                lower.contains("finance")
    }

    fun getApprovedPackages(context: Context): Set<String> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getStringSet(KEY_APPROVED_PACKAGES, emptySet()) ?: emptySet()
    }

    fun isApproved(context: Context, packageName: String): Boolean {
        if (isSecurityBlocked(packageName)) return false
        val approved = getApprovedPackages(context)
        return approved.contains(packageName.lowercase())
    }

    fun setAppApproval(context: Context, packageName: String, approved: Boolean): Boolean {
        if (isSecurityBlocked(packageName) && approved) {
            // Disallow overriding mandatory security exclusions
            return false
        }
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val current = prefs.getStringSet(KEY_APPROVED_PACKAGES, emptySet())?.toMutableSet() ?: mutableSetOf()
        val pkg = packageName.lowercase()
        if (approved) {
            current.add(pkg)
        } else {
            current.remove(pkg)
        }
        prefs.edit().putStringSet(KEY_APPROVED_PACKAGES, current).apply()
        return true
    }

    fun discoverInstalledApps(context: Context): List<DiscoveredApp> {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }

        val resolveInfos = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
        } else {
            @Suppress("DEPRECATION")
            pm.queryIntentActivities(intent, 0)
        }

        val approved = getApprovedPackages(context)
        val discovered = mutableListOf<DiscoveredApp>()
        val seenPackages = mutableSetOf<String>()

        for (info in resolveInfos) {
            val pkg = info.activityInfo.packageName
            if (pkg == context.packageName || seenPackages.contains(pkg)) continue
            seenPackages.add(pkg)

            val appName = info.loadLabel(pm).toString()
            val blocked = isSecurityBlocked(pkg)
            val isAppApproved = !blocked && approved.contains(pkg.lowercase())

            val category = when {
                pkg.contains("whatsapp") || pkg.contains("telegram") || pkg.contains("messaging") || pkg.contains("chat") -> "MESSAGING"
                pkg.contains("mail") || pkg.contains("gmail") || pkg.contains("outlook") -> "EMAIL"
                pkg.contains("music") || pkg.contains("youtube") || pkg.contains("video") || pkg.contains("spotify") -> "MEDIA"
                pkg.contains("instagram") || pkg.contains("linkedin") || pkg.contains("twitter") || pkg.contains("snapchat") -> "SOCIAL"
                pkg.contains("calendar") || pkg.contains("clock") || pkg.contains("docs") || pkg.contains("notes") -> "PRODUCTIVITY"
                blocked -> "SECURITY_EXCLUDED"
                else -> "OTHER"
            }

            discovered.add(
                DiscoveredApp(
                    packageName = pkg,
                    appName = appName,
                    isApproved = isAppApproved,
                    isSecurityBlocked = blocked,
                    category = category
                )
            )
        }

        return discovered.sortedWith(
            compareBy<DiscoveredApp> { it.isSecurityBlocked }
                .thenByDescending { it.isApproved }
                .thenBy { it.appName.lowercase() }
        )
    }

    fun getDiscoveredAppsJson(context: Context): String {
        val apps = discoverInstalledApps(context)
        val array = JSONArray()
        for (app in apps) {
            val obj = JSONObject().apply {
                put("packageName", app.packageName)
                put("appName", app.appName)
                put("isApproved", app.isApproved)
                put("isSecurityBlocked", app.isSecurityBlocked)
                put("category", app.category)
            }
            array.put(obj)
        }
        return array.toString()
    }
}
