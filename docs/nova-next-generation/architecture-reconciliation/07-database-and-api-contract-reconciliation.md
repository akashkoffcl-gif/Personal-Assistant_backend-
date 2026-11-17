# 07 — Database & API Contract Reconciliation

**Audit Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  

---

## 1. Database Model & Live Table Mapping

| Prisma Model | Mapped Table Name | Database Presence | Primary Key | Critical Foreign Keys |
| :--- | :--- | :---: | :--- | :--- |
| `User` | `users` | **Present** | `id` (UUID) | None |
| `MobileDevice` | `mobile_devices` | **Present** (Pushed Phase 61) | `id` (String) | `userId` -> `users(id)` |
| `MobileDeviceSession` | `mobile_device_sessions` | **Present** (Pushed Phase 61) | `id` (UUID) | `deviceId` -> `mobile_devices(id)` |
| `MobilePushToken` | `mobile_push_tokens` | **Present** (Pushed Phase 61) | `id` (UUID) | `deviceId` -> `mobile_devices(id)` |
| `MobilePermission` | `mobile_permissions` | **Present** (Pushed Phase 61) | `id` (UUID) | `deviceId` -> `mobile_devices(id)` |
| `MobileEvent` | `mobile_events` | **Present** (Pushed Phase 61) | `id` (UUID) | `deviceId` -> `mobile_devices(id)`, `userId` -> `users(id)` |
| `MobileCommand` | `mobile_commands` | **Present** (Pushed Phase 61) | `id` (UUID) | `deviceId` -> `mobile_devices(id)` |
| `Task` | `tasks` | **Present** | `id` (UUID) | `userId` -> `users(id)` |
| `Routine` | `routines` | **Present** | `id` (UUID) | `userId` -> `users(id)` |
| `AIConversation` | `ai_conversations` | **Present** | `id` (UUID) | `userId` -> `users(id)` |
| `AIMessage` | `ai_messages` | **Present** | `id` (UUID) | `conversationId` -> `ai_conversations(id)` |
| `AIAction` | `ai_actions` | **Present** | `id` (UUID) | `userId` -> `users(id)` |

---

## 2. API Contract Invariants & Reconciliation

1. **`POST /api/v1/mobile/events`**
   - **Contract Invariant:** Requires Bearer JWT token in Authorization header.
   - **Payload Schema:**
     ```json
     {
       "deviceId": "string",
       "sourceApp": "string",
       "appName": "string",
       "category": "string",
       "title": "string",
       "summary": "string",
       "occurredAt": "ISO8601 string"
     }
     ```
   - **Reconciliation:** Verified matching between Android `IngestMobileEventRequest` and NestJS `IngestMobileEventDto`.

2. **`GET /api/v1/mobile/capability/status`**
   - **Contract Invariant:** Returns JSON status envelope containing:
     ```json
     {
       "state": "FULLY_CONNECTED",
       "hasPairedDevice": true,
       "deviceName": "iQOO I2305",
       "isPermissionGranted": true,
       "isListenerConnected": true,
       "approvedAppsCount": 5,
       "approvedAppPackages": [...],
       "recentEventsCount": 1,
       "recentEvents": [...]
     }
     ```
   - **Reconciliation:** Verified matching between NestJS `NotificationCapabilityService` and frontend `NotificationCenterModal.tsx`.
