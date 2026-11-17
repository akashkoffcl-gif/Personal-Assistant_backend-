# 06 — Module Ownership and Duplication Audit

**Audit Date:** 2026-11-17  
**Branch:** `feature/unified-android-apk`  

---

## 1. Domain Module Ownership Matrix

| Domain Module | Primary Owner Service | Primary Controller | Primary Database Table(s) | Health & Audit State |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile Companion** | `MobileService` & `NotificationCapabilityService` | `MobileController` | `mobile_devices`, `mobile_events`, `mobile_permissions`, `mobile_push_tokens` | **Active & Certified** (Clean modular boundary) |
| **AI Orchestration** | `AIService` | `AIController` | `ai_conversations`, `ai_messages`, `ai_actions` | **Active** (Interfaces with Gemini) |
| **Context Assembly** | `UnifiedContextService` | Shared internal provider | Multiple (aggregates domain tables) | **Active** (Single authoritative context builder) |
| **Tool Calling** | `JarvisToolRegistryService` | Shared internal provider | N/A (Dispatches to domain services) | **Active** (Consolidated registry) |
| **Tasks & Routines** | `TasksService` & `RoutinesService` | `TasksController` & `RoutinesController` | `tasks`, `routines`, `routine_occurrences` | **Active** |
| **Scheduling** | `SchedulingService` & `SmartPlannerService` | `SchedulingController` | `schedule_plans`, `schedule_changes` | **Active** |
| **Knowledge Base** | `KnowledgeService` | `KnowledgeController` | `knowledge_documents`, `knowledge_chunks`, `knowledge_notes` | **Active** |
| **Focus Studio** | `FocusService` | `FocusController` | `focus_sessions`, `focus_preferences` | **Active** |
| **Finance & Goals** | `FinanceService` & `GoalsService` | `FinanceController` & `GoalsController` | `finance_accounts`, `finance_transactions`, `goals` | **Active** |

---

## 2. Duplication & Obsolete Component Audit Findings

1. **Context Builders:**
   - *Audit Check:* Verified whether multiple competing context builders exist.
   - *Finding:* `UnifiedContextService` (`apps/api/src/modules/ai/unified-context.service.ts`) is the **sole** context builder in the backend. There are no competing context builders.
2. **Device Lifecycle Services:**
   - *Audit Check:* Verified whether a duplicate device management service was introduced.
   - *Finding:* `MobileService` handles device pairing, token registration, and event ingestion; `NotificationCapabilityService` evaluates diagnostic health. No competing device services exist.
3. **Android Voice Implementations:**
   - *Audit Check:* Verified whether any partial native Android voice services exist.
   - *Finding:* No Android native voice services (`NovaVoiceForegroundService`, `WakeWordEngine`) exist yet in `apps-mobile/nova-android/`. Voice is currently handled by `useVoiceInteraction.ts` in the web client, backed by `NovaNativeBridge.speakText()` for native TTS.
4. **Obsolete Mobile Screens:**
   - *Audit Check:* Inspected `apps-mobile/nova-android/app/src/main/java/com/nova/companion/ui/screens/MainJarvisScreen.kt`.
   - *Finding:* `MainJarvisScreen.kt` was the initial standalone Compose prototype from Phase 54. In commit `4e33483`, `MainActivity.kt` switched to `UnifiedNovaWebView.kt`. `MainJarvisScreen.kt` is currently unreferenced in `MainActivity`, but serves as reference code.
   - *Recommendation:* Keep intact without deletion per audit-only policy.
