# 01 — ARCHITECTURE AUDIT & UNIFICATION ROADMAP
## Consolidating NOVA PWA and Native Android Companion into One Unified APK

**Author:** Principal Android Architect, Senior Kotlin Engineer, Next.js Architect  
**Project:** NOVA Personal AI Companion  
**Date:** November 2026  
**Target Branch:** `feature/unified-android-apk`

---

## 1. Executive Summary

NOVA currently provides two separate application experiences:
1. **Web / PWA Application (`apps/web`)**: A feature-rich Next.js 14 client providing the entire NOVA operating environment: Unified Dashboard, Smart Planner, Calendar, Task & Project Workspaces, Focus Studio, Wellness KPI tracker, Voice Assistant Modal, Real-time Notification Center, and User Settings.
2. **Native Android Companion (`apps-mobile/nova-android`)**: A standalone Kotlin/Compose application containing `NovaNotificationListenerService`, `NovaFirebaseMessagingService`, Android Keystore cryptographic identity management (`KeyStoreManager`), and local regex privacy redaction (`PrivacyFilter`).

This bifurcated model creates user friction: users must install a PWA for the full UI while maintaining a separate background Android companion for device notifications and remote commands.

**The Consolidation Objective**: Merge both layers into **one unified Android application (`.apk`)** where:
- A high-performance native Android container (Activity + Compose Shell) wraps and hosts the NOVA UI via a secure, authenticated, hardware-accelerated `WebView`.
- An authenticated bidirectional Native Bridge (`NovaNativeBridge`) connects the web interface with Android native subsystems.
- All native background services (`NotificationListenerService`, `FirebaseMessagingService`, `WorkManager` event syncer) run continuously within the same OS process and application ID.
- The user installs **one APK**, logs in once, and gets the unified desktop, mobile, voice, and device intelligence experience.

---

## 2. Deep-Dive Inspection of Existing Assets

### 2.1 The Web Application (`apps/web/`)
- **Framework & Structure**: Next.js 14 (App Router & Pages components), Tailwind CSS, Lucide icons, `@tanstack/react-query`.
- **Navigation & Views**: Single-Page Architecture rendered through tabs (`home`, `work`, `routines`, `analytics`, `focus`, `settings`, `planner`).
- **Assistant Experience**:
  - `AIAssistantExperience.tsx`: Floating on-demand 3D avatar, command bar, and speech transcript.
  - `VoiceAssistantModal.tsx` & `useVoiceInteraction.ts`: Web Audio API, push-to-talk, speech-to-text, and browser synthesis.
- **Notification Center**: `NotificationCenterModal.tsx` with tabs for `All`, `Unread`, `Apps` (Android ingested events), `Tasks`, `Routines`, and `Reminders`.
- **Authentication**: Supabase JWT session stored in memory, `localStorage`, and HTTP headers (`api.ts`).

### 2.2 The Native Companion (`apps-mobile/nova-android/`)
- **Package / Namespace**: `com.nova.companion` (to be unified to `com.nova.assistant` or unified companion application ID).
- **Core Native Services**:
  - `NovaNotificationListenerService`: Subscribes to `StatusBarNotification`, applies `PrivacyFilter.isAllowed()` and `PrivacyFilter.sanitizeText()`.
  - `NovaFirebaseMessagingService`: Receives FCM push messages and dispatches `MOBILE_COMMAND` actions (`OPEN_APP`, `OPEN_URL`, `SHARE_TEXT`).
  - `KeyStoreManager`: Generates ECDSA P-256 keys in `AndroidKeyStore` for tamper-proof device challenge signing.
  - `MainJarvisScreen.kt`: Minimal Compose UI with voice orb and device status.
- **Gradle Dependencies**: Kotlin 2.0+, Compose BOM, Hilt, Room, Retrofit, OkHttp, WorkManager, Firebase Messaging.

### 2.3 The Cloud Backend (`apps/api/`)
- **State Preservation**: NestJS backend, Supabase PostgreSQL, Prisma schema, Redis / BullMQ queues.
- **Runtime Mobile Endpoints**:
  - `GET /api/v1/mobile/capability/status`
  - `GET /api/v1/mobile/events`
  - `POST /api/v1/mobile/events`
  - `POST /api/v1/mobile/pair/init` & `POST /api/v1/mobile/pair/verify`
  - `POST /api/v1/mobile/commands/:id/status`

---

## 3. Reusable Components & Migration Matrix

| Component | Current Location | Target Unified Location | Strategy |
| :--- | :--- | :--- | :--- |
| **Android Manifest** | `apps-mobile/.../AndroidManifest.xml` | `apps-mobile/nova-android/...` | Add `uses-permission` for WebView, Audio, Notification Access, Vibration. |
| **Notification Listener** | `NovaNotificationListenerService.kt` | Retain in same app package | Feed events into local SQLite Room DB + sync to backend + notify WebView bridge. |
| **Privacy Filter** | `PrivacyFilter.kt` | Retain | Maintain client-side OTP and credential scrubbing. |
| **Cryptographic Identity** | `KeyStoreManager.kt` | Retain | Provide device challenge signing directly to native bridge. |
| **UI Container** | `MainActivity.kt` | Modernized Native Host Activity | Host Compose layout embedding `AndroidView(factory = { WebView(it) })`. |
| **Web UI** | `apps/web/` | Hosted on trusted origin or bundled asset build | Loaded seamlessly into secure WebView with bridge injection. |
| **Native Bridge** | *New Component* | `NovaNativeBridge.kt` | `@JavascriptInterface` exposing authorized Android methods. |

---

## 4. Key Risks & Technical Mitigations

1. **WebView Security**:
   - *Risk*: Malicious external scripts executing native methods.
   - *Mitigation*: Restrict bridge binding strictly to trusted origins (`https://nova-assistant-web.onrender.com`, `http://localhost:3000`, `file:///android_asset`). Disallow arbitrary domain navigation, enforce CSP, and disable file system access.
2. **Session Desynchronization**:
   - *Risk*: User logs in on WebView, but native background services have no auth token to sync notifications.
   - *Mitigation*: The WebView passes the authenticated session JWT to the native bridge on login via `bridge.syncAuthSession(token, userId)`. Android securely stores this in encrypted SharedPreferences/Keystore for background syncing.
3. **Audio Autoplay & Mic Permissions**:
   - *Risk*: Android WebView blocks microphone access or speech synthesis.
   - *Mitigation*: Implement custom `WebChromeClient.onPermissionRequest()` to grant `RESOURCE_AUDIO_CAPTURE` when system `RECORD_AUDIO` is approved.
4. **Build Environment Prerequisites**:
   - *Finding*: Host environment currently lacks local Android SDK command-line tools / JDK 17 in user PATH.
   - *Mitigation*: Architect all native Kotlin source files, Gradle scripts, bridge schemas, and automated build scripts so the project builds cleanly both locally and in standard CI/CD pipelines (GitHub Actions / Gradle CLI).
