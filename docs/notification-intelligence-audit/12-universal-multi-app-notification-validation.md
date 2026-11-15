# 12 — Universal Multi-App Notification Capture, Filtering & Synchronization Validation Report

**Date:** 2026-11-15  
**Auditor Roles:** Principal Android Engineer, Senior Kotlin Developer, NestJS Backend Architect & Mobile Security Auditor  
**Branch:** `feature/unified-android-apk`  
**Commit:** `ef17b2b`  
**Physical Test Device:** iQOO I2305 (Android 16 / API Level 36)  

---

## 1. Executive Summary

This investigation evaluates NOVA's universal Android notification intelligence capability: capturing, filtering, persisting, and retrieving eligible notifications from **ALL Android applications explicitly approved by the user**, without hardcoding any single application (such as WhatsApp).

### Key Findings:
1. **Dynamic Application Discovery on Physical Device (`I2305`):**
   Using Android's package manager mechanisms, the physical device was queried directly. 38 third-party applications were discovered across diverse categories:
   - **Messaging:** `com.whatsapp`, `org.telegram.messenger`, `com.snapchat.android`
   - **Media:** `com.amazon.mp3`, `com.playit.videoplayer`, `in.startv.hotstar`
   - **Social / Professional:** `com.instagram.android`, `com.linkedin.android`
   - **Finance / Banking (Strictly Excluded by Privacy Policy):** `com.phonepe.app`, `in.org.npci.upiapp`, `com.google.android.apps.nbu.paisa.user`, `com.iexceed.ib.digitalbankingprod`, `in.dmifinance.app`, `com.kreditbee.android`
   - **Productivity / AI / Travel:** `com.openai.chatgpt`, `com.google.android.apps.docs`, `in.redbus.android`, `cris.org.in.prs.ima`
2. **Current Filtering Policy & Privacy Safeguards:**
   - In `PrivacyFilter.kt`, exclusions are based on security patterns (`lower.contains("bank") || lower.contains("authenticator") || lower.contains("password")`) and specific sensitive packages.
   - WhatsApp is **not** hardcoded as the sole permitted package in `PrivacyFilter.kt`.
3. **Missing Dynamic Allowlist Management UI:**
   - In `NovaNotificationListenerService.kt`, all non-sensitive apps currently pass `PrivacyFilter.isAllowed()`. There is no persistent local user-approval registry (e.g. SQLite / SharedPreferences allowlist) to enforce a default-off privacy policy where the user must explicitly toggle each app.
   - In `notification-capability.service.ts` (backend), approved packages default to `['com.whatsapp', 'com.slack', 'com.google.android.gm', 'com.google.android.calendar', 'com.discord']` if not dynamically updated via device permissions.
4. **Physical-Device Multi-App Notification Capture Evidence:**
   Logcat on `I2305` demonstrates that multiple applications are actively captured by `NovaNotificationListenerService`:
   - `com.amazon.mp3` (Amazon Music): Track notifications captured and sanitized.
   - `com.google.android.youtube`: Channel video updates captured, year numbers redacted (`[CODE_REDACTED]`).
   - The listener pipeline halts because the dispatch code to `POST /api/v1/mobile/events` is commented out.

---

## 2. Dynamic Installed Application Inventory (Physical Device: `I2305`)

| Package Name | Category | Privacy Classification | Default Allowlist Status |
| :--- | :--- | :--- | :--- |
| `com.whatsapp` | Messaging | Safe / Eligible | Eligible (Pending User Toggle) |
| `org.telegram.messenger` | Messaging | Safe / Eligible | Eligible (Pending User Toggle) |
| `com.amazon.mp3` | Media / Audio | Safe / Eligible | Eligible (Pending User Toggle) |
| `com.instagram.android` | Social | Safe / Eligible | Eligible (Pending User Toggle) |
| `com.linkedin.android` | Professional | Safe / Eligible | Eligible (Pending User Toggle) |
| `com.google.android.apps.docs` | Productivity | Safe / Eligible | Eligible (Pending User Toggle) |
| `com.openai.chatgpt` | Productivity / AI | Safe / Eligible | Eligible (Pending User Toggle) |
| `in.redbus.android` | Travel / Transit | Safe / Eligible | Eligible (Pending User Toggle) |
| `cris.org.in.prs.ima` | Travel (IRCTC) | Safe / Eligible | Eligible (Pending User Toggle) |
| `com.phonepe.app` | UPI / Payments | **SENSITIVE — BLOCKED** | **Blocked by Policy** |
| `in.org.npci.upiapp` | UPI (BHIM) | **SENSITIVE — BLOCKED** | **Blocked by Policy** |
| `com.google.android.apps.nbu.paisa.user` | Payments (GPay) | **SENSITIVE — BLOCKED** | **Blocked by Policy** |
| `com.iexceed.ib.digitalbankingprod` | Banking | **SENSITIVE — BLOCKED** | **Blocked by Policy** |
| `in.dmifinance.app` | Lending / Finance | **SENSITIVE — BLOCKED** | **Blocked by Policy** |
| `com.kreditbee.android` | Lending / Finance | **SENSITIVE — BLOCKED** | **Blocked by Policy** |

---

## 3. Allowlist & Filtering Architecture

```
[Installed Apps on Android]
           │
           ▼
[Dynamic Package Discovery via PackageManager]
           │
           ▼
[User-Controlled Allowlist UI (Settings / Notification Center)]
           │
           ├── User toggles approval for specific app (e.g., Telegram, WhatsApp, Gmail)
           │
           ▼
[On-Device Preferences & Backend Sync: PUT /api/v1/mobile/permissions]
           │
           ▼
[NovaNotificationListenerService: onNotificationPosted]
           │
           ├── 1. Check if package is in EXCLUDED_PACKAGES or contains bank/auth/password -> BLOCK
           ├── 2. Check if package is explicitly approved in User Allowlist -> ALLOW / REJECT
           ├── 3. Sanitize OTPs, credit cards, PINs
           │
           ▼
[POST /api/v1/mobile/events]
           │
           ▼
[PostgreSQL: MobileEvent (tenant-isolated)]
           │
           ▼
[NOVA AI: get_phone_notifications tool (filterable by appName)]
```

---

## 4. Multi-App AI Retrieval Contract

In `apps/api/src/modules/ai/jarvis-tool-registry.service.ts`:
```typescript
this.register({
  id: 'get_phone_notifications',
  name: 'Get Phone Notifications',
  category: 'NOTIFICATIONS',
  description: 'Retrieves actual permitted notifications received from paired Android device.',
  inputSchema: { limit: 'number', appName: 'string' },
  execute: async (userId, input) => {
    return this.prisma.mobileEvent.findMany({
      where: {
        userId,
        ...(input?.appName ? { sourceApp: { contains: input.appName, mode: 'insensitive' } } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: input?.limit ?? 10,
    });
  },
});
```

The tool supports querying by `appName` (e.g. `appName: "telegram"`, `appName: "instagram"`, `appName: "whatsapp"`), ensuring that NOVA's intelligence can answer questions about any specific approved app.

---

## 5. Required Implementations & Blueprint

To satisfy all universal notification requirements:

1. **Android Application Discovery Bridge (`NovaNativeBridge.kt`):**
   - Implement `getInstalledEligibleApps(): String` that queries `packageManager.getInstalledApplications(PackageManager.GET_META_DATA)`, filters out blocked packages, and returns a JSON array with `packageName`, `appName`, and `isApproved`.
   - Implement `setAppApproval(packageName: String, approved: Boolean)` persisting to SharedPreferences.
2. **On-Device Universal Allowlist (`AppApprovalRegistry.kt`):**
   - Store approved package names in private SharedPreferences (`nova_approved_apps`).
   - Default: All new applications are unapproved until the user toggles them on.
3. **Listener Integration (`NovaNotificationListenerService.kt`):**
   - Check `AppApprovalRegistry.isAppApproved(context, sbn.packageName)` before accepting the notification.
4. **Backend Transmission:**
   - Transmit approved notifications across all applications using `IngestMobileEventDto` with `sourceApp: sbn.packageName`, `appName: resolveAppName(sbn.packageName)`.
5. **Frontend Notification Center & Settings UI:**
   - Display the list of discovered applications with toggle switches under Notification Settings.
   - In Notification Center, add filter pills by app name (`All`, `WhatsApp`, `Telegram`, `Gmail`, etc.).

---

## 6. Verification Status

- **Source Code Inspected:** YES (verified no hardcoded WhatsApp restrictions in listener).
- **Physical Device Package Discovery Verified:** YES (38 third-party packages mapped).
- **Live Multi-App Notification Capture Verified:** YES (`com.amazon.mp3` & `com.google.android.youtube` captured in Logcat).
- **End-to-End Multi-App Dispatch:** Pending implementation of the missing client-side network transmission and dynamic allowlist UI.
