# 16 — Mobile Companion Settings & Universal App Allowlist UI Audit

**Date:** 2026-11-15  
**Auditor Roles:** Principal Product UI/UX Architect, Senior Next.js Engineer, Android Integration Engineer  
**Branch:** `feature/unified-android-apk`  
**HEAD Commit:** `09bcb38`  
**Physical Test Device:** iQOO I2305 (Android 16 / API 36)  

---

## 1. Executive Summary & Problem Diagnosis

While Phase 54.2 successfully built the Kotlin registry (`AppApprovalRegistry.kt`), Room database, and WorkManager sync worker, and embedded an inline allowlist manager inside `NotificationCenterModal.tsx`, **physical-device and frontend inspection revealed an architectural UX gap**:

1. **The App Allowlist was not discoverable in Settings:**
   When navigating to **Settings** (`currentTab === 'settings'` in `page.tsx`), the page displayed only "User Settings & Data Portability" (Work Start/End Hour, Quiet Hours, and Data Export). There was no "Mobile Companion" navigation item or settings card.
2. **Notification Center Modal Coupling:**
   The user had to click the Bell icon in the header, toggle to the `APPS` tab, and scroll to find the allowlist. When viewing Settings directly, the user was blocked from discovering or managing their paired phone or approved applications.
3. **`MobileCompanionPanel.tsx` Was Unmounted:**
   The component `apps/web/src/components/MobileCompanionPanel.tsx` existed in the repository from Phase 54, but it was not rendered anywhere on the dashboard or in Settings!
4. **Desktop/Browser vs Native APK State:**
   In desktop Chrome or standard PWA mode, `window.NovaAndroidBridge` is `undefined`. The frontend lacked a clean fallback explaining how to connect the phone or review server-persisted device records.

---

## 2. Source-Backed Findings

### A. Navigation & Settings Workspace (`apps/web/src/app/page.tsx`)
- Lines 1435–1525:
  Only one card is rendered for `currentTab === 'settings'`: `User Settings & Data Portability`.
- `MobileCompanionPanel` is not imported or used in `page.tsx`.

### B. Notification Center (`apps/web/src/components/NotificationCenterModal.tsx`)
- Contains the `APPS` feed with filter pills and search bar.
- Contains a link:
  ```tsx
  <button onClick={() => { onNavigateTab('settings'); onClose(); }}>Manage</button>
  ```
  However, clicking this link navigated the user to `settings`, which had no Mobile Companion or App Allowlist controls!

### C. Native Bridge (`NovaNativeBridge.kt`)
- `getInstalledEligibleApps()` returns a JSON array of `{ packageName, appName, isApproved, isSecurityBlocked, category }`.
- `setAppApproval(packageName, approved)` updates `AppApprovalRegistry` and triggers `syncApprovedAppsToBackend()`.
- Bridge methods are verified functional in Kotlin.

---

## 3. Implementation Plan for Phase 54.2.1

1. **Create Dedicated AppAllowlistManager Component (`apps/web/src/components/mobile/AppAllowlistManager.tsx`)**:
   - Reusable across both Settings and Notification Center.
   - Discovers installed apps from `window.NovaAndroidBridge.getInstalledEligibleApps()`.
   - Offers Search, Category Filter (`MESSAGING`, `MEDIA`, `SOCIAL`, `PRODUCTIVITY`, `ALL`), and Status Filter (`Approved`, `Unapproved`, `Security Excluded`).
   - Renders individual toggles with instant native registry feedback and backend permission synchronization.
   - For desktop browsers or unlinked devices, displays an informative state: *"Connect NOVA Android Companion to manage installed applications"*.
2. **Implement Settings → Mobile Companion Navigation in `page.tsx`**:
   - Add sub-navigation or tabbed cards in `currentTab === 'settings'`:
     1. **General & Productivity** (Working hours, quiet hours, data export).
     2. **Mobile Companion** (Device Connection, Notification Access, Installed App Allowlist, Notification Synchronization, Privacy & Security).
   - Mount `AppAllowlistManager.tsx` directly in Settings.
3. **Notification Center Linking**:
   - Update `NotificationCenterModal.tsx` so clicking "Manage Approved Applications" switches to Settings with the Mobile Companion section active.
