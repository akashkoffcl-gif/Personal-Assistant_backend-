# 62-04 — Backend Telemetry Report

**Execution Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  

---

## 1. Implementation Details

1. **`DeviceHeartbeatDto` (`apps/api/src/modules/mobile/dto/mobile.dto.ts`):**
   - Validates `deviceId`, `appVersion`, `osVersion`, `isListenerConnected`, `isNotificationAccessGranted`, `isBatteryOptimizationIgnored`, `pendingQueueCount`, `oldestPendingEventTime`, `lastSyncError`, and `lastSuccessfulSync`.
2. **`MobileController.recordHeartbeat()` (`POST /api/v1/mobile/heartbeat`):**
   - Protected by `SupabaseAuthGuard`.
   - Derives `userId` from authenticated session token.
3. **`MobileService.recordHeartbeat()`:**
   - Enforces device ownership: checks that `deviceId` belongs to `userId` and has status `PAIRED`.
   - Updates `lastSeenAt`, `appVersion`, and `osVersion` on `mobile_devices`.
   - Upserts `NOTIFICATION_LISTENER` and `BATTERY_OPTIMIZATION_EXEMPTION` in `mobile_permissions`.

---

## 2. API Telemetry Verification Log
- Request to `POST /api/v1/mobile/heartbeat`:
  ```json
  {
    "deviceId": "android-iQOO-I2305-physical",
    "appVersion": "1.0.0",
    "osVersion": "16 (API 36)",
    "isListenerConnected": true,
    "isNotificationAccessGranted": true,
    "isBatteryOptimizationIgnored": true,
    "pendingQueueCount": 0
  }
  ```
- Response (HTTP 201):
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "timestamp": "2026-11-17T07:09:36.659Z",
      "status": "HEARTBEAT_ACKNOWLEDGED",
      "deviceId": "android-iQOO-I2305-physical"
    }
  }
  ```
