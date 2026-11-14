# 04 — ANDROID PERMISSION INTEGRATION REPORT
## Native Permissions & Lifecycle Coordination

**Author:** Senior Android Engineer & Mobile Security Lead  
**Date:** November 2026  

---

## 1. System Permissions Handled

| Permission | Manifest Level | Runtime Check | Purpose |
| :--- | :--- | :--- | :--- |
| `INTERNET` | Normal | Automatic | Communication with NestJS API and Supabase |
| `ACCESS_NETWORK_STATE` | Normal | Automatic | Offline queue synchronization |
| `POST_NOTIFICATIONS` | Dangerous (API 33+) | Prompted on startup | Foreground push alerts and status |
| `RECORD_AUDIO` | Dangerous | Prompted on mic tap | Push-to-talk speech recognition |
| `BIND_NOTIFICATION_LISTENER_SERVICE` | Signature / Special | System Settings Intent | Reading permitted phone notifications |
| `QUERY_ALL_PACKAGES` | Normal / Filtered | App Allowlist | Launching approved apps via digital actions |

---

## 2. Notification Access Flow Inside Unified APK

1. User opens **Notification Center > Preferences**.
2. If `capabilityStatus.state === 'PERMISSION_NOT_GRANTED'`, the UI detects `window.NovaAndroidBridge`.
3. The UI renders the **"Grant on Phone"** button.
4. Clicking invokes `NovaAndroidBridge.openNotificationAccessSettings()`.
5. Android displays the system Notification Access management screen for NOVA JARVIS.
6. Once enabled, `NovaNotificationListenerService` activates, sets `isGranted: true`, and the UI instantly updates to **"Active & Synced"**.
