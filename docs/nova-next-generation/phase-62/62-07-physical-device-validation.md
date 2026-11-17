# 62-07 — Physical Device Validation Report

**Execution Date:** 2026-11-17  
**Physical Device:** Vivo / iQOO I2305 (Android 16 / API Level 36)  
**Package:** `com.nova.companion` (Version 1.0.0, Code 1)  

---

## 1. Physical Device Telemetry Evidence

1. **Device Identification:**
   - Model: `I2305`
   - Android Version: `16`
   - SDK Level: `36`
   - ADB Connection: `192.168.0.3:41639`
2. **On-Device Diagnostics Check:**
   - Notification Access: Enabled in `dumpsys notification` (`com.nova.companion/com.nova.companion.service.NovaNotificationListenerService`).
   - SQLite Queue: Direct database query confirmed pending and synced event tables are healthy.
3. **Heartbeat Submission Evidence:**
   - Physical device ID `android-iQOO-I2305-physical` registered with `status: PAIRED` in PostgreSQL.
   - Live heartbeat call succeeded with `status: HEARTBEAT_ACKNOWLEDGED`.
