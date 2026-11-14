# 01 — EXISTING ARCHITECTURE & ROOT CAUSE AUDIT
## Android Notification Intelligence & Runtime Capability Awareness

**Author:** Principal AI Systems Architect & Senior Android Engineer  
**Date:** November 2026  
**Target Branch:** `feature/phase-54-android-jarvis-companion`

---

## 1. Executive Summary

During mobile testing of NOVA Companion, asking NOVA about incoming phone notifications triggered a false refusal:
> *"I don't have direct access to your phone's live notifications for privacy and security reasons. If there's something specific coming through that you need to address, you can copy the details here, and we can sort through it together."*

This response was unacceptable for a connected, paired personal AI companion. An audit was conducted across the Android native layer, backend NestJS services, and the conversational AI pipeline to pinpoint why the model claimed complete lack of access.

---

## 2. Root Cause Analysis

### 2.1 The Hallucinated Privacy Barrier
The phrase *"I don't have direct access to your phone's live notifications for privacy and security reasons"* did **not** originate from code-level business logic, guards, or filters. Rather, it was generated organically by the Google Gemini LLM during text completion because:
1. `AIService` did not bind a phone notification retrieval tool to the tool calling loop.
2. `UnifiedContextService` did not provide real-time runtime capability status indicating whether Android Notification Access was enabled, disconnected, or permitted.
3. In the absence of grounded device context and tools, commercial LLMs default to generic corporate privacy disclaimers.

### 2.2 Android Native Layer Inspection
Inspection of `apps-mobile/nova-android/`:
- `NovaNotificationListenerService` was already implemented and registered in `AndroidManifest.xml` under `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`.
- Ingestion, on-device sanitization (scrubbing OTPs and banking secrets), and SHA-256 payload hashing were fully implemented.
- Packets were queued and posted to backend endpoint `/api/v1/mobile/events`.

### 2.3 Backend Mobile & Database Inspection
Inspection of `apps/api/`:
- Database models `MobileDevice`, `MobilePermission`, and `MobileEvent` existed in Prisma.
- `MobileService.ingestEvent()` correctly inserted notifications with `occurredAt`, `sourceApp`, `title`, and `summary`.
- However, there was no dedicated capability evaluator service determining whether a paired device was currently connected, granting permission, or actively syncing.

---

## 3. Resolution Architectural Blueprint

To permanently eradicate false refusals, a three-part architecture was engineered:
1. **`NotificationCapabilityService`**: Deterministic state machine evaluating 5 runtime states (`NO_DEVICE_PAIRED`, `PERMISSION_NOT_GRANTED`, `SYNC_FAILING`, `APP_NOT_APPROVED`, and `FULLY_CONNECTED`).
2. **`JarvisToolRegistryService` Tool Binding**: Implemented `get_phone_notifications` tool directly callable by the LLM.
3. **Conversational Intent Grounding**: Injected explicit notification directives and verified recent notification records into `UnifiedContextService` and `AIService` system prompts, forbidding false privacy refusals.
