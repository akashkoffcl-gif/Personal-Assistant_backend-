# Notification Delivery Reliability

**Phase:** 53.4  
**Target:** Web Push lifecycle, subscription cleanup, and delivery distinction.

---

## 1. Notification Delivery Lifecycle Demarcation

NOVA explicitly distinguishes three distinct stages of notification delivery:
1. **Creation:** Proactive opportunity generated and logged to in-app notification store (`InAppNotification`).
2. **Dispatch Acceptance:** Payload encrypted via VAPID and transmitted to Mozilla/Google push service endpoint.
3. **Device Delivery:** Physical ServiceWorker wake-up on client device (`showNotification`).

> [!IMPORTANT]
> A successful HTTP 201 from the push gateway verifies **dispatch acceptance**, not physical user attention or device screen render.

## 2. Invalid Subscription Cleanup

In [`NotificationsService.sendPushNotification`](file:///D:/PT/apps/api/src/modules/notifications/notifications.service.ts):
- HTTP 404 (Not Found) or HTTP 410 (Gone) returned by the push service indicates an expired or uninstalled browser subscription.
- The subscription row in `PushSubscription` is automatically marked `isActive: false` to prevent redundant network traffic.

