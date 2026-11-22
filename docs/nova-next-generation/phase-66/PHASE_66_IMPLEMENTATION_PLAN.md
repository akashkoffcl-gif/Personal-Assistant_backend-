# NOVA 2.0 — PHASE 66 IMPLEMENTATION PLAN
## CONTEXT-AWARE NOTIFICATION INTELLIGENCE & PERSONALIZATION

**Device Target:** Vivo/iQOO I2305 (Android 16 / API 36)  
**Package:** `com.nova.companion`  
**Base Commit Verified:** `15fc800` (Phase 65.1 Certified on Physical Hardware)  
**Process PID:** `20665` (Active & Verified on Vivo device)

---

## 1. Executive Summary & Objectives

Phase 65.1 successfully upgraded NOVA with conversational batching, deduplication, dynamic collection windows, and clean audio focus lifecycle management.

Phase 66 elevates NOVA from a **notification-reading assistant** into an **intelligent context-aware notification system**. NOVA will not merely read notifications sequentially or in batches; it will:
1. **Understand context:** Classify message type (`DIRECT`, `GROUP`, `MISSED_CALL`, `OTP`, `PROMOTIONAL`) and message intent (`QUESTION`, `ACTION_REQUIRED`, `INFO`).
2. **Prioritize deterministically:** Assign priority levels `P0` (Critical/Emergency) through `P4` (Low/Suppressed) with explicit, inspectable rules.
3. **Personalize natural delivery:** Synthesize phrasing tailored to the context (e.g., distinguishing group messages, missed calls, urgent questions, and VIP contacts).
4. **Maintain conversation memory:** Track short-lived thread sequences so follow-up messages provide natural conversational context rather than repeating full sender prefixes.
5. **Enforce quiet mode intelligence:** Respect quiet hours and Do Not Disturb (DND), while permitting preemption and delivery for high-priority emergency notifications (`P0`).
6. **Learn and adapt user preferences:** Provide extensible local storage for VIP contacts, custom app priority overrides, and quiet hours.

---

## 2. Architecture & File Structure

All new components reside in the modular intelligence package:
`apps-mobile/nova-android/app/src/main/java/com/nova/companion/notification/intelligence/`

```
com.nova.companion.notification.intelligence/
├── model/
│   ├── ContextualNotification.kt      # Unified contextual model (Type, Intent, Priority)
│   ├── MessageType.kt                 # DIRECT, GROUP, MISSED_CALL, OTP, PROMOTIONAL
│   ├── MessageIntent.kt               # QUESTION, ACTION_REQUIRED, INFO
│   └── PriorityLevel.kt               # P0 (Critical) to P4 (Low)
├── classifier/
│   ├── ContextualClassifier.kt        # Extracts extras, titles, flags, and regex semantics
│   └── IntentClassifier.kt            # Analyzes body text for questions, urgent actions, OTPs
├── priority/
│   ├── NotificationPriorityEngine.kt  # Deterministic scoring and priority assignment rules
│   └── NotificationVipRegistry.kt     # In-memory and SharedPreferences-backed VIP contact list
├── memory/
│   └── NotificationMemoryManager.kt   # Short-lived thread memory (TTL 3 min) for thread context
├── preferences/
│   └── NotificationIntelligencePrefs.kt # Settings: Quiet hours (e.g. 22:00-07:00), VIPs, App overrides
```

---

## 3. Subphase Breakdown

### Subphase 66.1: Contextual Classification Engine
- **Models:**
  - `MessageType`: `DIRECT`, `GROUP`, `MISSED_CALL`, `OTP`, `PROMOTIONAL`, `SYSTEM`
  - `MessageIntent`: `QUESTION` (contains ?, interrogatives), `ACTION_REQUIRED` ("urgent", "call me", "asap"), `INFO` (default)
- **Classifier Logic:**
  - Detect group messages via `NotificationCompat.isGroupSummary()`, `EXTRA_IS_GROUP_CONVERSATION`, subText presence, and delimiter patterns like `Group: Sender` or `Sender @ Group`.
  - Detect missed calls via `Notification.CATEGORY_CALL`, `EXTRA_CALL_TYPE`, or title/text matching "missed call".
  - Detect OTPs and 2FA tokens via numeric/alphanumeric code patterns and keywords ("verification code", "OTP", "do not share").

### Subphase 66.2: Deterministic Intelligent Priority Engine
- **Priority Levels:**
  - `P0 (Critical / Emergency)`: Repeated missed calls from same contact within 5 minutes, keywords "emergency", "hospital", "urgent help".
  - `P1 (High)`: VIP contacts, direct questions requiring reply, missed calls from known contacts.
  - `P2 (Normal)`: Direct personal messages from approved messaging apps (WhatsApp, Instagram DM, SMS).
  - `P3 (Low)`: Group chat messages, social media likes/follows.
  - `P4 (Suppressed)`: Promotional messages, marketing, known ad keywords.

### Subphase 66.3: Personalized Conversational Phrasing
- Modify `NotificationConversationManager.kt` to leverage `ContextualNotification`:
  - **Group Messages:** *"Akash, new message in [Group Title] from [Sender]: [Snippet]"*
  - **Missed Calls:** *"Akash, you have a missed call from [Sender]."*
  - **Direct Questions:** *"Akash, [Sender] asks: [Question]"*
  - **OTPs:** Security-conscious announcement: *"You received a verification code on [App]."* (Omit reading OTP aloud unless in private audio mode).
  - **Same-sender ongoing thread:** *"Harish followed up: [Snippet]"*

### Subphase 66.4: Conversation Memory (Thread Context)
- `NotificationMemoryManager`:
  - In-memory LRU cache storing the last active thread per `senderKey` or `groupKey`.
  - Window TTL: 180 seconds (3 minutes).
  - If a message arrives from the same sender within 3 minutes of an announcement:
    - Mark as `isOngoingThread = true`.
    - Synthesize natural continuation phrasing (*"Harish also said..."* / *"He added..."*).

### Subphase 66.5: Interruption & Quiet Mode Intelligence
- `NotificationIntelligencePrefs`:
  - Default Quiet Hours: 22:00 (10 PM) to 07:00 (7 AM).
  - Check device DND state via `NotificationManager.currentInterruptionFilter`.
- **Policy Enforcement:**
  - During Quiet Hours / DND:
    - `P0` (Emergency): Always announced; preempts current lower-priority speech via `SpeechArbitrator.speak(priority = HIGH)`.
    - `P1` (VIP/Important): Announced if user configured "Allow VIPs during quiet hours".
    - `P2`, `P3`, `P4`: Suppressed from speech, logged silently to database and sync engine.

### Subphase 66.6: Certification & Physical Device Validation
- Build and sign debug APK.
- Deploy to Vivo/iQOO I2305 (`adb-10BF2413RD003BT-1KXSF1._adb-tls-connect._tcp`).
- Validate on physical hardware with live notifications across WhatsApp and Google Messages:
  - Direct message vs. Group message.
  - Question vs. standard message.
  - Multiple rapid messages from same thread (memory continuity).
  - Quiet hours policy simulation.
