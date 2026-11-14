# 05 — AUTHENTICATION & SESSION MANAGEMENT
## Seamless Token Lifecycle & Keystore Synchronization

**Author:** Staff Security Engineer  
**Date:** November 2026  

---

## 1. Unified Single Sign-On Strategy

In the consolidated model, the user logs in **once** through the NOVA web interface:

```
[User Signs In via Supabase / Email]
               │
               ▼
[Web Client acquires JWT Session Token]
               │
               ▼
[setApiAuthToken(token) called]
               │
               ▼
[NovaAndroidBridge.syncAuthSession(token, userId)]
               │
               ▼
[Stored in SecureSessionManager on Android Device]
               │
               ├─────────────────────────┐
               ▼                         ▼
   NovaNotificationListener    NovaFirebaseMessaging
   (syncs events to API)       (authenticates push commands)
```

---

## 2. Security Safeguards

- **No Plaintext Storage**: Token values are isolated within the application's private sandbox (`Context.MODE_PRIVATE`).
- **No Token Leaks**: Web JavaScript cannot inspect or extract device cryptographic keys stored in `AndroidKeyStore`.
- **Automatic Expiration**: When Supabase refreshes the token, `setApiAuthToken` automatically updates `SecureSessionManager`.
