# 04 — NOTIFICATION EVENT ARCHITECTURE
## End-to-End Pipeline: Ingestion, In-App Storage & Assistant Surfacing

**Author:** Staff Software Engineer  
**Date:** November 2026  

---

## 1. Data Pipeline Overview

```mermaid
sequenceDiagram
    participant OS as Android OS
    participant NLS as NovaNotificationListenerService
    participant API as NestJS MobileController
    participant DB as Postgres (Prisma)
    participant AI as AIService & JarvisToolRegistry
    participant UI as NotificationCenterModal

    OS->>NLS: onNotificationPosted(sbn)
    Note over NLS: Scrub OTPs, filter allowlist
    NLS->>API: POST /api/v1/mobile/events
    API->>DB: MobileEvent.create()
    UI->>API: GET /api/v1/mobile/events
    API-->>UI: Return recent events (Apps Tab)
    User->>AI: "What notifications did I get on my phone?"
    AI->>AI: Execute get_phone_notifications tool
    AI->>DB: prisma.mobileEvent.findMany()
    AI-->>User: Grounded summary of real events
```

---

## 2. Ingestion Rules & Sanitization
1. **Allowlisted Applications**: Notifications are only processed if the source package is approved by the user.
2. **On-Device Sanitization**:
   - One-time verification codes, banking PINs, and credit card numbers are masked via regex before leaving the device.
3. **Deduplication**: SHA-256 payload hashing prevents redundant database insertions for ongoing notifications (e.g., media playback or download progress).
