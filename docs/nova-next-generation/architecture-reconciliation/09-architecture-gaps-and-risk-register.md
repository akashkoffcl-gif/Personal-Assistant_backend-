# 09 — Architecture Gaps and Risk Register

**Audit Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  

---

## 1. Prioritized Risk Register

| Risk ID | Priority | Subsystem | Description | Upstream / Downstream Impact | Recommended Remediation |
| :---: | :---: | :--- | :--- | :--- | :--- |
| **R-01** | **P1** | Android Device Telemetry | Backend `MobileDevice` model lacks granular telemetry fields (battery optimization status, listener lifecycle state, memory pressure). | Capability status relies on last seen timestamp rather than real-time daemon heartbeat. | Implement Phase 62 to add structured diagnostic telemetry pings from Android companion to `MobileDeviceService`. |
| **R-02** | **P1** | Android Native Voice | No native Android foreground voice service exists. Background wake-word detection impossible when WebView is in background. | Limits JARVIS voice activation to active browser/screen-on sessions. | Implement Phase 63 native `NovaVoiceForegroundService` with `WakeWordEngine` and `AudioFocusManager`. |
| **R-03** | **P2** | Action Policy | AI tool execution executes with minimal risk classification. | A rogue or confused LLM response could trigger disruptive state changes without confirmation. | Implement Phase 65 policy-controlled execution boundary with 4-tier risk classification and UI confirmation gates. |
| **R-04** | **P2** | Dynamic API Base URL | Android companion `NovaApiClient.kt` has hardcoded Render URL fallback. | If Render backend is sleeping or spinning up, initial mobile sync worker experiences transient timeout. | Support dynamic backend host discovery via `NovaNativeBridge.syncAuthSession(token, userId, backendUrl)`. |
| **R-05** | **P3** | Eviction Policy in Redis | Redis outputs warning: `Eviction policy is volatile-lru. It should be "noeviction"`. | Potential eviction of delayed BullMQ jobs under memory pressure. | Configure Redis cloud instance eviction policy to `noeviction` for BullMQ queues. |
