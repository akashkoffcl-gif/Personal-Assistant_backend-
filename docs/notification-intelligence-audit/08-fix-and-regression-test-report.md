# 08 — Fix & Implementation Blueprint Report

**Date:** 2026-11-15  
**Objective:** Architecture and Code Specification to Resolve DEF-01 through DEF-04  

---

## 1. Concrete Solution Architecture

To enable end-to-end notification synchronization without unnecessary complexity:

### A. Automatic Background Device Pairing via Native Bridge
When the user opens the unified app:
1. `NovaNativeBridge` exposes `autoRegisterDevice(token: String, userId: String)`.
2. It generates/retrieves the Android KeyStore EC key pair.
3. It calls `POST /api/v1/mobile/pair/initiate` to receive a cryptographic challenge.
4. It signs the challenge using `KeyStoreManager.signChallenge(challenge)`.
5. It calls `POST /api/v1/mobile/pair/confirm` with the signed challenge.
6. The resulting `deviceId` is saved in `SecureSessionManager`.

### B. Direct HTTP Ingestion in `NovaNotificationListenerService`
Using a lightweight background coroutine or `HttpURLConnection` / `OkHttpClient`:
1. When `onNotificationPosted(sbn)` triggers:
2. Verify `PrivacyFilter.isAllowed(packageName)`.
3. Read `token`, `userId`, and `deviceId` from `SecureSessionManager`.
4. If paired and authenticated, build the `IngestMobileEventDto` JSON payload:
   ```json
   {
     "deviceId": "<stored-device-id>",
     "sourceApp": "com.whatsapp",
     "appName": "WhatsApp",
     "category": "COMMUNICATION",
     "title": "John Doe",
     "summary": "Meeting at 4pm",
     "occurredAt": "2026-11-15T10:35:00.000Z"
   }
   ```
5. Dispatch `POST https://nova-assistant-api.onrender.com/api/v1/mobile/events` with `Authorization: Bearer <token>`.
6. Log result in Logcat with `Log.i(TAG, "Event synced successfully: $id")`.
