# PHASE 54: REUSE VS. NEW IMPLEMENTATION MATRIX

**Document Date:** 2026-11-14  
**Project:** NOVA Android JARVIS Companion  

---

## 1. Architectural Component Mapping

| Subsystem | Existing Component (Reused) | New Implementation Required | Rationale & Architectural Boundary |
|---|---|---|---|
| **Authentication** | `SupabaseAuthGuard`, `AuthService`, Supabase JWT | Mobile device pairing challenge & public key registration | Protects user accounts; mobile app signs in with existing credentials, then pairs device keys. |
| **Conversational AI** | `AIService`, Gemini 1.5, `ConversationalIntentService` | Android Push-To-Talk & Audio Streaming Bridge | Avoids maintaining two divergent AI engines; Android streams voice text to existing AI Core. |
| **Action Execution** | `JarvisToolRegistryService`, `AIAction` model | `MobileCommandService` & Android Local Intent Dispatcher | Reuses existing consequential confirmation and autonomy levels (L0-L4) while executing native Android intents. |
| **Task Management** | `TasksService`, `SchedulingEngineService` | Mobile fast quick-add & voice sync | Android companion creates tasks through existing validated backend services. |
| **Push Notifications** | `NotificationsService` (Web Push / VAPID) | `MobilePushService` (Firebase Cloud Messaging / FCM v1) | Web Push and Native Android FCM must coexist without collision. |
| **Notification Listening**| N/A (None) | Android `NotificationListenerService` & local SQLite (Room) | Native OS capability only available on Android hardware. |
| **Background Sync** | BullMQ & Redis on Backend | Android `WorkManager` & OkHttp WebSocket | Guarantees reliable offline event queueing and battery-efficient retry. |
| **Data Storage** | Supabase PostgreSQL via Prisma | Android Room Database (local offline cache) & Prisma Mobile Models | Provides resilient offline capability on the phone and multi-device persistence in the cloud. |

---

## 2. Infrastructure Expansion Plan

```
Existing Infrastructure (Reused 100%):
[Next.js Web] ──┐
                ├──> [NestJS Core API] ──> [Supabase PostgreSQL]
[Background Q] ──┘         ▲       ▲
                           │       └──> [Redis Cache & BullMQ]
New Mobile Pipeline:       │
[Android Jetpack Compose] ─┤
  ├ NotificationListener  │ (JWT Authenticated /api/v1/mobile/*)
  ├ Android Keystore      │
  ├ Room Database (Local) └──> [MobileModule] ──> [FCM Push Service]
  └ WorkManager Offline Queue
```
