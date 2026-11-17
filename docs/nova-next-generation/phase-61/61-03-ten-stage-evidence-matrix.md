# 61-03 — Ten-Stage Physical Notification Evidence Matrix

**Execution Date:** 2026-11-17  
**Physical Test Device:** iQOO I2305 (Android 16 / API 36)  
**Sample Notification:** YouTube (`com.google.android.youtube`)  
**Generated Event ID:** `bdc7e069-62bb-4e20-8fef-516fe15269a4`  

---

## Complete Ten-Stage Evidence

| Stage | Name | Status | Timestamp | Verified Evidence & Logs |
| :---: | :--- | :---: | :---: | :--- |
| **01** | Android Notification Listener | **PASS** | 11:03:50.092 IST | `Logcat: 11-17 11:03:50.092 13747 13747 I NovaNotificationListener: Approved notification captured: [YouTube] (Package: com.google.android.youtube)` |
| **02** | Privacy Filter | **PASS** | 11:02:04 - 11:03:50 IST | Unapproved/excluded apps rejected: `D NovaNotificationListener: Notification from unapproved application rejected: com.snaptube.premium`. Text sanitized. |
| **03** | App Approval Registry | **PASS** | 11:03:06 IST | Stored XML in `shared_prefs/nova_app_approval_prefs.xml` holds `com.google.android.youtube`, `com.whatsapp`, `org.telegram.messenger`. |
| **04** | Room SQLite Persistence | **PASS** | 11:03:50 IST | Room DB query on device: `sqlite3 databases/nova_notification_db "SELECT * FROM notification_events"` returned: `com.google.android.youtube-1008-1794893629748\|local-device\|com.google.android.youtube\|YouTube\|MEDIA\|Rick Astley - Never Gonna Give You Up...\|0\|1794893630130` |
| **05** | WorkManager Sync Scheduling | **PASS** | 11:03:50.346 IST | WorkManager triggers `NotificationSyncWorker`: `D WM-WorkerWrapper: Starting work for com.nova.companion.worker.NotificationSyncWorker`. |
| **06** | Authenticated API Dispatch | **PASS** | 12:03:37 IST | Dispatched with Bearer JWT token to `POST /api/v1/mobile/events`. Endpoint returned HTTP 201 with success envelope. |
| **07** | NestJS Validation & Guard | **PASS** | 12:03:37.438 IST | `MobileController` and `MobileService` validated device ownership, user correlation (`55c5b52e-6d87-4ba2-9b1e-6019d53869ce`), and assigned server event ID `bdc7e069-62bb-4e20-8fef-516fe15269a4`. |
| **08** | PostgreSQL Persistence | **PASS** | 12:04:28 IST | Row verified in PostgreSQL table `mobile_events`: `{ id: 'bdc7e069-62bb-4e20-8fef-516fe15269a4', deviceId: 'android-iQOO-I2305-physical', sourceApp: 'com.google.android.youtube', title: 'Rick Astley - ...', isDismissed: false }`. |
| **09** | Notification Center Ingestion | **PASS** | 12:06:30 IST | `GET /api/v1/mobile/capability/status` returned `state: FULLY_CONNECTED`, `recentEventsCount: 1`, and recent event payload for display in `NotificationCenterModal.tsx`. |
| **10** | AI Grounded Retrieval | **PASS** | 12:41:46 IST | AI assistant queried via `POST /api/v1/ai/chat` responded: *"Your latest notification from YouTube is a prompt to resume watching Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster) in picture-in-picture mode."* using tool `get_phone_notifications`. |
