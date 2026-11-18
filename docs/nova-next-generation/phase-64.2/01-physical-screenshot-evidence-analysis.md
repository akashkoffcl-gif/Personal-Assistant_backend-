# NOVA 2.0 — PHASE 64.2: PHYSICAL DEVICE EVIDENCE AUDIT & ROOT CAUSE INVESTIGATION
**Document ID:** `docs/nova-next-generation/phase-64.2/01-physical-screenshot-evidence-analysis.md`  
**Execution Date:** 2026-11-18  
**Repository Branch:** `feature/unified-android-apk`  
**Git HEAD:** `80c76ff`  
**Target Device:** Vivo/iQOO I2305 (Android 16 / API 36)  
**Package:** `com.nova.companion`  

---

## 1. Physical Screenshot Evidence Analysis

The user presented four distinct physical runtime states from the connected iQOO device:

### Evidence A — Device Permissions & Capabilities
- `RECORD_AUDIO`: **Granted**
- `POST_NOTIFICATIONS`: **Granted**
- `Notification Listener Access`: **Active & Synced**
- `Battery Optimization`: **Optimized**

### Evidence B — Runtime Health & Telemetry
- Device Identity: **iQOO I2305 — Unpaired**
- Listener Service: **Disconnected / Standby**
- Approved Applications: **0 Applications**
- Ingested Events: **0 in past 24 hours**
- Heartbeat: **Active / Heartbeat Acknowledged**
- Security Policy Firewall: **Permanent Deny Enforced**

### Evidence C — Installed App Allowlist
- Approved Applications: **2 Approved** (e.g. WhatsApp, Slack)
- Device Connection: **Unpaired**
- Notification Access: **Permission Required**

### Evidence D — Android Notification Shade
- Real WhatsApp Message: `Harish — hellooo`
- Voice Notification Error: `NOVA Voice Subsystem — Voice error: No speech recognized`

---

## 2. Root Cause Diagnostics

### A. Device Pairing Forensics
1. **The Disconnect**: The WebView's authentication state in Supabase (`assistant_token`) was never automatically handed off to Android's `SecureSessionManager` on page reload.
2. In commit `80c76ff`, we added the auto-sync probe in `onPageFinished()`. However, the live Render backend container had not reloaded the routes from commit `c4386fa`/`80c76ff`. Live Render returns HTTP 404 for `/api/v1/mobile/capability/status`, meaning Render has not completed the build/restart cycle from the Git push or is running from a detached deployment branch.
3. Because the backend returned 404 on `capability/status`, the frontend caught an error and fell back to default uninitialized states: `Unpaired`, `0 Approved Applications`, and `Disconnected / Standby`.

### B. Approved App Allowlist Contradiction
- In `AppAllowlistManager.tsx`, the local UI reads 2 approved apps from Android's `AppApprovalRegistry`.
- In `RuntimeHealthCard.tsx`, the component queries the backend `/api/v1/mobile/capability/status`. Because the backend had not received or persisted `metadata.approvedPackages` from the bridge, it returned 0 approved apps.
- **Remediation**: Implemented in commit `80c76ff` by extending `UpdatePermissionsDto` and `UpdatePermissionsRequest` with `approvedPackages: string[]` and syncing both permission keys and package names simultaneously.

### C. Speech Recognition Error: "Voice error: No speech recognized"
- Error code reported: `SpeechRecognizer.ERROR_NO_MATCH` (Error 7).
- In `VoiceSessionManager.kt`, when `SpeechRecognizer` times out without acoustic input or detects silence/ambient background noise, it enters `onError(SpeechRecognizer.ERROR_NO_MATCH)` which produced the persistent notification text: `"Voice error: No speech recognized"`.
- This is a normal speech recognizer timeout when no voice utterance is detected within the speech listening window, but it was being treated as a fatal service failure.
- **Remediation**: `ERROR_NO_MATCH` and `ERROR_SPEECH_TIMEOUT` must transition cleanly back to `VoiceState.READY` without displaying an alarming error notification, reserving error alerts only for hardware, permission, or network connection failures.
