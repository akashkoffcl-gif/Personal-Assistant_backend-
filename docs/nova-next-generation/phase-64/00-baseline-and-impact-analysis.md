# NOVA 2.0 — PHASE 64: BASELINE AND IMPACT ANALYSIS
**Document ID:** `docs/nova-next-generation/phase-64/00-baseline-and-impact-analysis.md`  
**Execution Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  
**Reported Baseline:** `c4386fa`  
**Package:** `com.nova.companion`  
**Physical Target Device:** Vivo/iQOO I2305, Android 16 / API 36  

---

## 1. System Inventory & Reconciliation Matrix

| Subsystem | Historical Phase | Current Head State (`c4386fa`) | Physical Device Reality | Finding Classification |
|---|---|---|---|---|
| **Device Pairing** | Phase 54.1 (`KeyStoreManager`, ECDSA Handshake) | Handshake logic exists in `NovaNativeBridge.autoPairDeviceIfNeeded()`. Relies on `syncAuthSession()`. | App reports `Unpaired`. `syncAuthSession` is only invoked from `setApiAuthToken` when token is saved. If session cookie or demo mode is used, bridge never gets JWT token or userId, failing pairing handshake. | **CONFIRMED DEFECT** |
| **Notification Listener Access** | Phase 61 / 63.3 | Declared in Manifest. Status queried via `NotificationManagerCompat.getEnabledListenerPackages()`. | UI showed `Disconnected / Standby` and `Permission Required` before manual command injection. Reason: OS settings required explicit user grant or `allow_listener` command on Vivo/iQOO. Bridge reported `isGranted = false` until granted. | **CONFIRMED & REMEDIATED VIA RUNTIME GRANT** |
| **Approved Apps Discrepancy** | Phase 61 (`AppApprovalRegistry`) vs Backend (`notification-capability.service.ts`) | App Allowlist UI reads `AppApprovalRegistry` (3 approved, 7 excluded). Backend capability service defaults to static list `['com.whatsapp', 'com.slack', ...]` or requires `metadata.approvedPackages` in `MobilePermission`. `syncApprovedAppsToBackend()` only sends `permissions: [PermissionEntry("NOTIFICATION_LISTENER", true)]` and omits package list! Backend reports 0 approved. | Inconsistency confirmed: Local registry not synced to `metadata.approvedPackages` in backend. Backend returns 0 approved devices. | **CONFIRMED ARCHITECTURAL DEFECT** |
| **Recent Ingested Events (0 in 24h)** | Phase 61 (`NotificationSyncWorker` / `Room`) | `NovaNotificationListenerService` captures events into Room database. Worker syncs to `POST /api/v1/mobile/events`. | Because device was Unpaired and had no stored JWT token in `SecureSessionManager`, `NotificationSyncWorker` requests were failing with HTTP 401 Unauthorized or dropping sync tasks. Result: 0 events ingested in PostgreSQL. | **CONFIRMED DEFECT** |
| **Native Voice Audio Muted** | Phase 63 (`NovaSpeechSynthesisManager`) | TextToSpeech bound to `com.google.android.tts`. AudioFocus requests `USAGE_ASSISTANT` + `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`. TTS `speak()` uses default stream with `QUEUE_FLUSH`. | Vivo/iQOO system policies mute or duck assistant streams if audio stream attributes do not explicitly target `STREAM_MUSIC` or `AudioAttributes.USAGE_MEDIA` / `USAGE_ASSISTANT` with volume routing. Additionally, unauthenticated requests to `/api/v1/ai/chat` return fallback string or fail silently. | **CONFIRMED ROOT CAUSE** |
| **Mobile-First UX** | Phase 1 UI / 54 | Next.js layout uses fixed width breakpoints (`max-w-[1760px]`, desktop tab buttons, fixed sidebar in modals, table horizontal overflows). | Clipping, cramped navigation, unpadded bottom safe-area on Android gesture bar. | **CONFIRMED UX DEFECT** |

---

## 2. Findings Classification Summary

### Confirmed Findings
1. **Unpaired State**: The WebView auth flow never explicitly calls `syncAuthSession(token, userId)` upon initial page load if the user session was already stored in Supabase or local storage. The bridge `autoPairDeviceIfNeeded` is never triggered.
2. **App Approval Count Mismatch**: Local `AppApprovalRegistry` has 3 approved apps. But `NovaNativeBridge.syncApprovedAppsToBackend` does NOT send `approvedPackages` in `UpdatePermissionsDto`. Backend therefore has no package metadata and returns `approvedAppsCount: 0`.
3. **Muted Voice Audio**: `NovaSpeechSynthesisManager` does not set `AudioAttributes` on the `TextToSpeech` instance, causing default stream routing which is attenuated or muted under Android 16 Vivo audio policies. There is no user-facing "Test Voice Output" control.
4. **Mobile UX Overflow**: Mobile screens (<412px wide) suffer from horizontal padding overflow, crowded tabs, and navigation bar clipping.

### Suspected Findings
1. Vivo DND (Do Not Disturb) and background audio ducking policies can silence `USAGE_ASSISTANT` unless explicitly handled via `STREAM_MUSIC`.

---

## 3. Scope of Phase 64 Remediation

1. **Phase 1: Bridge & Device Pairing Protocol**:
   - Auto-detect auth session in WebView and invoke `window.NovaAndroidBridge.syncAuthSession(token, userId)` on both login and session restoration.
   - Update `NovaNativeBridge` to trigger immediate auto-pairing and local Keystore ECDSA registration.
2. **Phase 2: Approved Package Synchronization Contract**:
   - Extend `UpdatePermissionsDto` and `UpdatePermissionsRequest` to include `approvedPackages: string[]`.
   - Update `MobileService.updatePermissions` to persist `metadata: { approvedPackages }` in `MobilePermission`.
   - Update `NotificationCapabilityService` to read this synchronized list.
3. **Phase 3: Native Voice Audio & TTS Output**:
   - Configure `AudioAttributes` explicitly for speech on `TextToSpeech` (`USAGE_MEDIA` / `USAGE_ASSISTANT`).
   - Expose `@JavascriptInterface testVoiceOutput(text)` on `NovaNativeBridge`.
   - Add a "Test Voice Output" button in the Voice UI to immediately test speaker playback with latency and error reporting.
4. **Phase 4: Responsive Mobile UX Overhaul**:
   - Ensure clean single-column mobile layouts for `<432px` viewport widths with bottom safe-area padding.
   - Mobile-optimize `DevicePermissionsManager.tsx`, `AppAllowlistManager.tsx`, and `page.tsx` headers.
5. **Phase 5 & 6: Automated & Physical Verification**:
   - Verify device pairing, notification ingestion, audible TTS output, and responsive UI.
