package com.nova.companion.service

object PrivacyFilter {
    // Packages strictly excluded from notification ingestion (Banking, Passwords, Authenticators)
    private val EXCLUDED_PACKAGES = setOf(
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
        "com.squareup.cash"
    )

    // Redaction patterns for 2FA, OTPs, verification pins, credit cards
    private val OTP_REGEX = Regex("""\b\d{4,8}\b""")
    private val CC_REGEX = Regex("""\b(?:\d{4}[ -]?){3}\d{4}\b""")

    fun isAllowed(packageName: String): Boolean {
        if (EXCLUDED_PACKAGES.contains(packageName.lowercase())) {
            return false
        }
        val lower = packageName.lowercase()
        return !(lower.contains("bank") || lower.contains("authenticator") || lower.contains("password"))
    }

    fun sanitizeText(input: String?): String {
        if (input.isNullOrBlank()) return ""
        var sanitized = CC_REGEX.replace(input, "[REDACTED_PAYMENT]")
        sanitized = OTP_REGEX.replace(sanitized, "[CODE_REDACTED]")
        return sanitized
    }
}

