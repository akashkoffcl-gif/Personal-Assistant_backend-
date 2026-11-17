# 03 — Current Architecture As-Built

**Audit Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  
**Git HEAD:** `03c07c8`  

---

## 1. Concrete Source-to-Binary Inventory

### 1.1 Android Native Companion (`apps-mobile/nova-android/`)
- **Container / UI:**
  - `MainActivity.kt`: Sets edge-to-edge Compose window, initializes WebView with JS bridge.
  - `UnifiedNovaWebView.kt`: Houses full-screen Android WebView with DOM Storage, Cookies, Third-party cookies, WebChromeClient, and JavaScript enabled.
- **Bridge Interface:**
  - `NovaNativeBridge.kt`: Annotated with `@JavascriptInterface`. Exposes `getNotificationCapabilityStatus()`, `openNotificationAccessSettings()`, `getInstalledEligibleApps()`, `setAppApproval()`, `syncAuthSession()`.
- **System Service & Firewall:**
  - `NovaNotificationListenerService.kt`: Intercepts `StatusBarNotification`. Passes to `PrivacyFilter` and `AppApprovalRegistry`.
  - `PrivacyFilter.kt`: Hardcoded exclusion of Banking, UPI, and Authenticator packages. Regex masks numeric codes/OTPs.
- **On-Device Allowlist Registry:**
  - `AppApprovalRegistry.kt`: Queries `PackageManager` for installed launcher apps, serializes approval sets to `nova_app_approval_prefs.xml`.
- **Offline Persistence & Synchronization:**
  - `NotificationDatabase.kt`, `NotificationEventEntity.kt`, `NotificationEventDao.kt`: Room SQLite local store.
  - `NotificationSyncWorker.kt`: CoroutineWorker dispatched via Android `WorkManager` with `NetworkType.CONNECTED` constraint. Sends batch requests to `NovaApiClient`.

### 1.2 Web & UI Shell (`apps/web/`)
- Next.js 14 App Router workspace with Tailwind CSS.
- `apps/web/src/app/page.tsx`: Central command center shell. Sub-nav in Settings toggles between `General & Productivity` and `Mobile Companion (Android)`.
- `apps/web/src/components/mobile/AppAllowlistManager.tsx`: Real-time companion management UI (Allowlist toggle table, category filter, security policy display).
- `apps/web/src/components/NotificationCenterModal.tsx`: Central modal for notification feed, companion status, and "Manage Approved Apps" deep-link.

### 1.3 Backend Micro-Monolith (`apps/api/`)
- NestJS application with 21 modular domains.
- **Mobile Domain (`modules/mobile/`):**
  - `mobile.controller.ts`: Authenticated REST endpoints for device pairing, permissions, token registration, event ingestion, and event querying.
  - `mobile.service.ts`: Duplicate suppression (60s window), Prisma writes to `mobile_events`.
  - `notification-capability.service.ts`: Evaluates live capability state (`FULLY_CONNECTED`, `PERMISSION_NOT_GRANTED`, `LISTENER_DISCONNECTED`, `NO_DEVICE_PAIRED`).
- **AI Domain (`modules/ai/`):**
  - `ai.service.ts`: Google Gemini client orchestrator with fallback response handling.
  - `unified-context.service.ts`: Context Builder aggregating tasks, routines, projects, phone notifications, and memories.
  - `conversational-intent.service.ts`: Intent classifier assigning decision policies (`STATUS_REPORT`, `DIRECT_ANSWER`, `PLAN`, `ACTION`).
  - `jarvis-tool-registry.service.ts`: Tool execution engine including `get_phone_notifications`.
- **Background Worker (`src/worker/`):**
  - `worker.service.ts`: BullMQ worker running on Redis for asynchronous task processing and scheduled alerts.

### 1.4 Database & Persistence Tier
- PostgreSQL hosted on Supabase (Port 5432) accessed via Prisma ORM 5.22.0.
- Tables verified live: `mobile_devices`, `mobile_events`, `mobile_permissions`, `mobile_push_tokens`, `users`, `tasks`, `routines`, `in_app_notifications`, `ai_messages`, `ai_actions`, etc.
