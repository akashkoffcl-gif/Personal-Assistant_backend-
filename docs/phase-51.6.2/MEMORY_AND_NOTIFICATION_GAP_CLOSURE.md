# Personal Memory Provenance & Notification Gap Closure Report

## 1. Personal Memory Provenance & Conflict Resolution
### Provenance Architecture
- Each preference/memory stored via `AIMemoryService` and `remember_preference` records an authoritative provenance trail:
  - Source channel (`VOICE`, `CHAT`, `AUTOMATION`, `USER_MANUAL`)
  - Timestamp of ingestion
  - User ID owner reference
  - Confidence rating (0.0 to 1.0)
- **Conflict Resolution Policy:**
  - When contradictory preferences are recorded (e.g. "prefer working in mornings" vs "prefer working late nights"), the conflict is resolved using a deterministic recency-and-confidence ordering:
    1. Highest confidence score.
    2. Most recent update timestamp (`updatedAt`).
  - Superseded memories are archived rather than destructively deleted, allowing auditability and point-in-time recovery.

### Search-Index Invalidation
- Redis pattern invalidation (`memory:${userId}:*`) is triggered synchronously upon creation, update, and deletion of memories.
- Stale embeddings and cached vector scores are cleared upon write to prevent semantic query hallucinations.

## 2. Notification Frequency Caps & Delivery Validation
### Multi-Level Frequency Caps
- Global user frequency capping prevents alert fatigue:
  - Max alerts per category per hour: 3 (except `EMERGENCY` which bypasses caps).
  - Quiet hours window (e.g., 22:00 - 07:00 local time) suppresses non-critical audio chimes and popups while still queuing them into the in-app notification inbox.
- **Provider Redundancy:**
  - Primary: Web Push (RFC 8291 / VAPID webpush payload)
  - Secondary fallback: In-app real-time SSE stream (`/api/v1/notifications/stream`)
  - Tertiary fallback: In-app database inbox (`get_in_app_notifications`)
- Delivery status is tracked from `SCHEDULED` -> `ENQUEUED` -> `DISPATCHED` -> `ACKNOWLEDGED`.

