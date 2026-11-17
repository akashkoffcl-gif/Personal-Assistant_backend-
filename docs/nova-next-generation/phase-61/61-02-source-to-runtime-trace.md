# 61-02 — Source-to-Runtime Trace

**Execution Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  
**Test Application:** YouTube (`com.google.android.youtube`)  

---

## 1. Stage-by-Stage Method & Data Flow Mapping

| Stage | Subsystem | Source File | Method / Execution Point | Inputs | Output / Destination |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Stage 1** | Android Listener | `NovaNotificationListenerService.kt` | `onNotificationPosted(sbn: StatusBarNotification)` | Raw Android OS `StatusBarNotification` | Package name, title, text extracted |
| **Stage 2** | Privacy Filter | `PrivacyFilter.kt` | `isPackageExcluded(pkg)`, `sanitizeText(text)` | Raw notification strings & package ID | Rejection of Banking/UPI/Auth; Regex redaction of OTP/PIN patterns |
| **Stage 3** | App Approval | `AppApprovalRegistry.kt` | `isApproved(context, pkg)` | `context`, `com.google.android.youtube` | Boolean gate reading `nova_app_approval_prefs.xml` |
| **Stage 4** | Room SQLite | `NotificationEventDao.kt` | `insertEvent(entity)` | Sanitized `NotificationEventEntity` | Row persisted in `notification_events` with `isSynced = 0` |
| **Stage 5** | WorkManager | `NotificationSyncWorker.kt` | `doWork() -> Result` | Enqueued WorkRequest, `getPendingEvents()` | Batch dispatched via Retrofit, marked `isSynced = 1` |
| **Stage 6** | Authenticated API | `NovaApiService.kt` | `ingestEvent(auth, request)` | Bearer JWT, `IngestMobileEventRequest` | HTTP POST to `/api/v1/mobile/events` |
| **Stage 7** | NestJS Ingestion | `mobile.service.ts` | `ingestEvent(userId, dto)` | Validated `IngestMobileEventDto` | Duplicate suppression check, audit metadata creation |
| **Stage 8** | PostgreSQL | `schema.prisma` | `prisma.mobileEvent.create()` | Sanitized attributes, device and user IDs | Persistent row in table `mobile_events` |
| **Stage 9** | Notification Feed | `mobile.controller.ts` | `getEvents(userId)` | User session token | JSON array of active events served to frontend |
| **Stage 10** | AI Retrieval | `ai.service.ts` & `jarvis-tool-registry.service.ts` | `executeTool('get_phone_notifications')` | User query, `limit: 10` | Grounded tool output formatted by Gemini into user response |
