# 05 — End-to-End Pipeline Dependency Map

**Audit Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  

---

## 1. Traced Pipeline Specifications

### Pipeline A: Android Notification Intelligence
```
StatusBarNotification (Android OS)
  │
  ▼
NovaNotificationListenerService.kt (onNotificationPosted)
  │
  ├──► PrivacyFilter.kt (Rejects Banking/UPI/Auth; masks regex OTPs/PINs)
  │
  ├──► AppApprovalRegistry.kt (Checks user allowlist in SharedPreferences)
  │
  ▼
NotificationDatabase.kt (Room SQLite: notification_events table, isSynced = 0)
  │
  ▼
NotificationSyncWorker.kt (WorkManager triggered on NetworkType.CONNECTED)
  │
  ▼ (Retrofit HTTPS POST /api/v1/mobile/events)
MobileController.ts (SupabaseAuthGuard / JWT authentication)
  │
  ▼
MobileService.ts (60s duplicate suppression window)
  │
  ▼
PostgreSQL Database (table: mobile_events)
  │
  ├──► NotificationCenterModal.tsx (GET /api/v1/mobile/capability/status & events)
  │
  ▼
JarvisToolRegistryService.ts (get_phone_notifications) ◄── ai.service.ts ◄── User
```

### Pipeline B: Voice Intelligence (Current Dual-Mode State)
```
[Browser / WebView Client]
SpeechRecognition / Web Speech API (useVoiceInteraction.ts)
  │
  ▼
Audio Barge-in & Acoustic Thresholding
  │
  ▼
HTTP POST /api/v1/ai/chat (or WebSocket streamChat)
  │
  ▼
AIAssistantOrchestrator (ai.service.ts)
  │
  ▼
TTS SpeechSynthesis (Browser SpeechSynthesis API)
  │
  ▼ (Native fallback)
NovaNativeBridge.speakText() -> Android TextToSpeech Engine
```
*(Note: Native Android Background Wake-Word via NovaVoiceForegroundService is the target capability for Phase 63).*

### Pipeline C: Task & Routine Intelligence
```
User Request / AI Action Proposal
  │
  ▼
TasksService.ts / RoutinesService.ts
  │
  ▼
PrismaClient -> PostgreSQL (tasks, routines, routine_occurrences)
  │
  ▼
BullMQ WorkerService.ts (Scheduled reminder jobs in Redis)
  │
  ▼
MobilePushService.ts / WebPush (Push notification dispatch)
```
