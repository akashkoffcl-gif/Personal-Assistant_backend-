# 04 — Android to Backend Integration Audit Report

**Date:** 2026-11-15  
**Auditor:** Principal Android Engineer & Mobile Security Auditor  
**Pipeline:** Android OS → `NovaNotificationListenerService` → Network Dispatch → `POST /api/v1/mobile/events`  

---

## 1. End-to-End Execution Trace Analysis

```
[Android OS Notification]
         │
         ▼
[NovaNotificationListenerService.onNotificationPosted()]
         │
         ▼
[PrivacyFilter.isAllowed() & sanitizeText()]
         │
         ▼
[Log.i(TAG, ...)] ───────────► (HALTS HERE - NEVER TRANSMITTED)
         │
      (MISSING)
         │
         ▼
[POST /api/v1/mobile/events]
```

### The Broken Link:
1. `NovaNotificationListenerService.kt` line 33 is an unexecuted comment:
   `// Dispatches sanitized event via Retrofit / Worker queue to POST /api/v1/mobile/events`
2. `NovaApiService.kt` is an empty interface:
   ```kotlin
   package com.nova.companion.data.remote
   interface NovaApiService {
   }
   ```
3. There is **no Retrofit instance**, **no OkHttpClient**, and **no WorkManager worker** instantiated in the Android companion app.

---

## 2. Authentication & Device Pairing Gap

Even if an HTTP call were made, the backend `POST /api/v1/mobile/events` endpoint in `MobileService.ts` executes:
```typescript
async ingestEvent(userId: string, dto: IngestMobileEventDto) {
  const device = await this.prisma.mobileDevice.findFirst({
    where: { id: dto.deviceId, userId, status: 'PAIRED' },
  });

  if (!device) {
    throw new UnauthorizedException(`Device ${dto.deviceId} is not paired or unauthorized`);
  }
  ...
}
```

### Critical Findings:
1. The backend strictly requires a `PAIRED` device record with a matching `deviceId`.
2. The Android companion has never initiated or confirmed device pairing with the backend.
3. No pairing challenge has ever been signed by `KeyStoreManager.signChallenge()`.
4. The user's backend database record has **zero** devices in `MobileDevice`.
5. Therefore, any event sent by the app would fail with `401 Unauthorized`.
