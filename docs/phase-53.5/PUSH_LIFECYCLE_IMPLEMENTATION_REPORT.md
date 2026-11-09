# Push Lifecycle Implementation Report

**Phase:** 53.5  
**Component:** `NotificationsService` & `NotificationsController`  

---

## 1. Implemented Endpoints & Methods

### 1.1 `saveSubscription(userId: string, payload: PushSubscriptionPayload)`
- Executes an atomic upsert on `pushSubscription.endpoint`.
- Re-binds the subscription to the authenticated `userId` on account switches.
- Reactivates (`isActive: true`) and refreshes encryption keys (`p256dh`, `auth`) if a previously unsubscribed device re-subscribes.

### 1.2 `revokeSubscription(userId: string, subscriptionIdOrEndpoint: string)`
- Supports revoking either by subscription UUID or by the browser's raw `endpoint` URL.
- Enforces strict tenant scoping: `where: { endpoint, userId }`.

### 1.3 `getActiveSubscriptions(userId: string)`
- `GET /api/v1/notifications/subscriptions`
- Returns a list of the user's registered active devices with `deviceType`, `userAgent`, and creation timestamps.

### 1.4 `sendPushNotification()` Demarcation
- Returns `{ success: boolean, statusCode: number, error?: string }`.
- Automatically deactivates subscriptions (`isActive = false`) when receiving HTTP 410 (Gone) or HTTP 404 (Not Found) from FCM/Mozilla gateways.

