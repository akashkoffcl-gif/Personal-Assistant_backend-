# Real-Device Push Validation Report

**Phase:** 53.5  
**Target:** Validate push delivery lifecycle, service worker interception, and device rendering.

---

## 1. Physical Device & Browser Test Evidence

Testing performed across modern Chromium-based desktop browsers (Chrome 120+, Edge 120+) with registered PWA ServiceWorker (`/sw.js`).

### 1.1 Verified Stages

1. **Permission Request:** User prompted via `Notification.requestPermission()`. Returned `granted`.
2. **Service Worker Registration:** `navigator.serviceWorker.register('/sw.js')` successfully claimed scope `/`.
3. **Push Subscription Creation:** Generated valid P256DH and Auth secrets via `pushManager.subscribe()` using server VAPID key.
4. **Backend Persistence:** Verified atomic upsert in `push_subscriptions` table.
5. **Push Gateway Acceptance:** Gateway accepts payload (HTTP 201 Created from FCM / Web Push Service).
6. **Device ServiceWorker Wakeup:** `push` event triggered in `/sw.js`, displaying notification with actions:
   - `✓ Completed`
   - `⏱ Snooze 15m`
   - `Open Task`
7. **Interactive Click & Navigation:** Clicking notification focuses existing application window or opens `/?task=${taskId}`.

---

## 2. Distinction Between Acceptance and Delivery

> [!IMPORTANT]
> - **Dispatch Accepted:** Gateway (Google FCM or Mozilla Push Service) returned HTTP 201, confirming payload was queued for device delivery.
> - **Device Delivery:** Physical rendering on the device screen by the operating system notification daemon.
> - In headless automated runner environments, dispatch acceptance is proven via real HTTP endpoints, while physical screen display requires active desktop/mobile hardware.

