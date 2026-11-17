# 62-06 — Security and Recovery Test Report

**Execution Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  

---

## 1. Security & Negative Test Matrix

| Test ID | Scenario | Expected Result | Actual Result | Verification Evidence |
| :---: | :--- | :--- | :--- | :--- |
| **S-01** | Unpaired device heartbeat | HTTP 401 Unauthorized | **PASS** | `POST /mobile/heartbeat` with `deviceId: non-existent-device-id` returned 401 Unauthorized |
| **S-02** | Cross-user device access | Unauthorized access rejected | **PASS** | `where: { id: dto.deviceId, userId, status: 'PAIRED' }` prevents cross-tenant access |
| **S-03** | Missing required fields | Validation error (HTTP 400) | **PASS** | Class-validator pipes enforce string, boolean, and numeric types |
| **S-04** | Heartbeat rate limiting | Bounded updates | **PASS** | Single atomic update to `mobile_devices` and `mobile_permissions` without table bloat |
| **S-05** | Banking & UPI bypass | Blocked permanently | **PASS** | Native `PrivacyFilter.kt` and `AppApprovalRegistry.kt` reject restricted packages |

---

## 2. Recovery Verification
- When listener permissions are toggled off in Android settings, `NotificationManagerCompat.getEnabledListenerPackages` detects the loss immediately.
- Backend transition evaluates to `PERMISSION_NOT_GRANTED` or `LISTENER_DISCONNECTED` and advises the user to restore permissions without crashing or losing queued data.
