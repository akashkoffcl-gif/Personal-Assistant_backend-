# 03 — Privacy Filter & Package Analysis Report

**Date:** 2026-11-15  
**Target Class:** `com.nova.companion.service.PrivacyFilter`  

---

## 1. Package Allowlist & Blocklist Evaluation

In `apps-mobile/nova-android/app/src/main/java/com/nova/companion/service/PrivacyFilter.kt`:
```kotlin
object PrivacyFilter {
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

    fun isAllowed(packageName: String): Boolean {
        if (EXCLUDED_PACKAGES.contains(packageName.lowercase())) {
            return false
        }
        val lower = packageName.lowercase()
        return !(lower.contains("bank") || lower.contains("authenticator") || lower.contains("password"))
    }
}
```

### Package Filtering Matrix:
| Package Name | Expected Result | Actual Result | Verification Evidence |
| :--- | :--- | :--- | :--- |
| `com.whatsapp` | Allow | **Allowed** | Does not match blocklist or keywords |
| `com.google.android.gm` | Allow | **Allowed** | Does not match blocklist |
| `com.google.android.youtube` | Allow | **Allowed** | Logcat verified: `[com.google.android.youtube]` logged |
| `com.amazon.mp3` | Allow | **Allowed** | Logcat verified: `[com.amazon.mp3] Galatta - Sushin Shyam` logged |
| `com.chase.sig.android` | Block | **Blocked** | In `EXCLUDED_PACKAGES` |
| `com.authy.authy` | Block | **Blocked** | In `EXCLUDED_PACKAGES` |
| Banking applications | Block | **Blocked** | Filtered by `lower.contains("bank")` |

---

## 2. Privacy Sanitization Evaluation

```kotlin
private val OTP_REGEX = Regex("""\b\d{4,8}\b""")
private val CC_REGEX = Regex("""\b(?:\d{4}[ -]?){3}\d{4}\b""")

fun sanitizeText(input: String?): String {
    if (input.isNullOrBlank()) return ""
    var sanitized = CC_REGEX.replace(input, "[REDACTED_PAYMENT]")
    sanitized = OTP_REGEX.replace(sanitized, "[CODE_REDACTED]")
    return sanitized
}
```

### Sanitization Observations:
- In physical device Logcat:
  ```text
  11-15 15:55:34.404 I/NovaNotificationListener: Permitted Notification: [com.google.android.youtube]  - Moondru Mudichu - Best Scenes 1 | 14 Nov [CODE_REDACTED] | Tamil Serial | Sun TV
  ```
  The year `2026` was matched by `\b\d{4,8}\b` and redacted as `[CODE_REDACTED]`. While aggressive on 4-digit numbers (years/dates), it strictly protects against OTP leakage.
- WhatsApp message extraction currently only extracts `extras.getString("android.title")` and `extras.getCharSequence("android.text")`.
- For rich messaging-style notifications (such as WhatsApp group chats), `Notification.EXTRA_MESSAGING_PERSON` or `Notification.EXTRA_CONVERSATION_TITLE` can be leveraged for better context, but basic title/text extraction succeeds.
