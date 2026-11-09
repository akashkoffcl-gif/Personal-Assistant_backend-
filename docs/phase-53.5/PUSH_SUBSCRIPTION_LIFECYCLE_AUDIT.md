# Push Subscription Lifecycle Audit

**Phase:** 53.5  
**Audit Target:** Inspect subscription persistence, deactivation, renewal, multi-device registration, and tenant scoping.

---

## 1. Audit Findings in Baseline Implementation

1. **Silent Fallback to Mock Object:**
   - In `saveSubscription()`, if the database disconnected, it silently returned `{ id: 'mock-sub-id', ...payload, isActive: true }`, falsely presenting success.
2. **Ambiguous Delivery Demarcation:**
   - `notifyUser()` returned `deliveredCount`, which conflated push gateway acceptance with physical device delivery.
3. **Endpoint Unsubscription Endpoint Missing:**
   - The API only supported deleting subscriptions by internal UUID (`DELETE /notifications/subscriptions/:id`). When browsers call `unsubscribe()`, they only possess the `endpoint` string, making client-side unsubscribe uncoordinated with the backend.
4. **Multi-Device Support:**
   - The database schema supported multiple subscriptions via `@@unique([endpoint])`, but lacked an endpoint to query active devices for the current user.

---

## 2. Hardened Lifecycle Implementation

- **Strict Error Handling:** Removed silent `mock-sub-id` returns; throws clear HTTP errors if the database is disconnected.
- **Explicit Delivery Demarcation:** `notifyUser()` now returns `dispatchAcceptedCount`, `totalSubscriptions`, and detailed `deliveryResults` with status (`ACCEPTED`, `EXPIRED`, `FAILED`).
- **Endpoint-Based Unsubscribe:** Added `POST /api/v1/notifications/unsubscribe` accepting `{ endpoint }`.
- **Tenant Isolation:** Enforced `userId` scoping across all updates and lookups; subscriptions cannot be accessed or deactivated cross-tenant.

