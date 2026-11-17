# 62-02 — Runtime Health Architecture

**Execution Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  

---

## 1. Subsystem Architecture

The Runtime Health & Telemetry subsystem bridges the physical Android device, the authenticated NestJS backend, and the Next.js Web Shell into a unified diagnostic state machine.

```mermaid
flowchart TD
    subgraph AndroidCompanion ["Android Companion (:app)"]
        DIAG["NovaDeviceDiagnosticsManager<br/>• Listener active check<br/>• PowerManager exemption<br/>• Room SQLite pending queue depth"]
        BRIDGE["NovaNativeBridge (@JavascriptInterface)<br/>• getDeviceDiagnostics()<br/>• openBatteryOptimizationSettings()"]
        WM["NotificationSyncWorker<br/>• Track last success / error"]
    end

    subgraph BackendGateway ["NestJS Backend (@assistant/api)"]
        CTRL["MobileController<br/>POST /api/v1/mobile/heartbeat"]
        SVC["MobileService.recordHeartbeat()<br/>• Upsert NOTIFICATION_LISTENER<br/>• Upsert BATTERY_OPTIMIZATION_EXEMPTION<br/>• Update lastSeenAt & versions"]
        CAP["NotificationCapabilityService<br/>• FULLY_CONNECTED / PERMISSION_NOT_GRANTED<br/>• LISTENER_DISCONNECTED / SYNC_FAILING"]
    end

    subgraph DataStore ["PostgreSQL Database"]
        DEV[("mobile_devices")]
        PERM[("mobile_permissions")]
    end

    subgraph FrontendShell ["Next.js Shell (@assistant/web)"]
        UI["AppAllowlistManager.tsx<br/>Runtime Health & Telemetry Dashboard"]
        NOTIF["NotificationCenterModal.tsx"]
    end

    DIAG --> BRIDGE
    BRIDGE --> UI
    DIAG --> CTRL
    CTRL --> SVC
    SVC --> DEV
    SVC --> PERM
    CAP --> DEV
    CAP --> PERM
    CAP --> UI
    CAP --> NOTIF
```

---

## 2. Capability State Classifications
- `FULLY_CONNECTED`: Device paired, notification listener granted and active within past 2 hours, recent events synchronized.
- `PERMISSION_NOT_GRANTED`: Paired device has not enabled system Notification Access.
- `LISTENER_DISCONNECTED`: Permission granted but native daemon inactive or process asleep.
- `SYNC_FAILING`: Permission granted but synchronization delayed for over 48 hours.
- `NO_DEVICE_PAIRED`: No active companion device associated with user tenant.
