# 61-05 — Offline Persistence and Security Test Report

**Execution Date:** 2026-11-17  
**Physical Test Device:** iQOO I2305 (Android 16 / API 36)  

---

## 1. Offline Persistence Verification
- **Scenario:** Incoming notification arrives when device network is down or backend is offline.
- **Verification Evidence:**
  - When the physical device captured the notification while the backend was starting, `NotificationDatabase` wrote the raw event to Room SQLite:
    ```text
    com.google.android.youtube-1008-1794893629748|local-device|com.google.android.youtube|YouTube|MEDIA|Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)|Tap to resume watching...|2026-11-17T05:33:49.748Z|0|1794893630130
    ```
  - `isSynced` flag was set to `0`.
  - The record remained safely intact in SQLite until network and authentication conditions were met.
- **Verdict:** PASS

---

## 2. Mandatory Security & Privacy Exclusions
- **Scenario:** Notifications from unapproved or security-sensitive apps (e.g., Banking, UPI, Authenticator).
- **Verification Evidence:**
  - Unapproved background notifications from `com.snaptube.premium` were rejected at the listener boundary:
    ```text
    11-17 11:02:04.976 D NovaNotificationListener: Notification from unapproved application rejected: com.snaptube.premium
    ```
  - No database entry was created.
  - Zero PII or private payloads were logged or transmitted.
- **Verdict:** PASS
