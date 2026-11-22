# NOVA 2.0 — PHASE 67 IMPLEMENTATION PLAN
## PROACTIVE AI ASSISTANT & SMART MESSAGE RESPONSE ENGINE

**Device Target:** Vivo/iQOO I2305 (Android 16 / API 36) — `192.168.0.7:40955`  
**Package:** `com.nova.companion`  
**Certified Baseline:** Phase 66 (Commit `ef71adc`)  
**Base APK SHA-256:** `3754447136655DC9BC0897C845E4A4B295F2F0110220D39E683A2ECE51EB9EFF`

---

## 1. Executive Summary & Architecture Goals

Phase 66 established robust contextual notification intelligence (direct, group, missed call, OTP, priority scoring P0..P4, quiet hours, and 180s thread memory).

Phase 67 evolves NOVA into a **proactive personal assistant and smart message response engine**:
1. **Understanding vs. Suggesting vs. Executing:** Proactively understand incoming message context and prepare suggested replies or reminders without ever executing consequential actions without explicit user authorization.
2. **Reply Intent Detection (`ReplyIntentClassifier`):** Detect if a reply is recommended, required (e.g. questions, urgent requests), or unnecessary (e.g. "thanks bro").
3. **Contextual Smart Reply Generation (`SmartReplyEngine`):** Synthesize natural, configurable reply choices (affirmative, tentative, negative) without hallucinating facts or making unauthorized commitments.
4. **Action Authorization & Execution (`SmartReplyActionExecutor`):** Safely execute replies via verified `RemoteInput` action intents with single-use authorization, idempotency, and TTL expiration.
5. **Conversation Follow-up & Action Extraction (`ConversationFollowUpManager` & `ConversationActionExtractor`):** Extract callback requests, task deadlines, and reminders ("call me when you're free", "meeting at 6"), managing follow-up alerts responsibly without repetitive nagging.
6. **Proactive Assistance (`ProactiveAssistantEngine`):** Offer helpful voice prompts ("Want me to prepare a reply?") with strict rate limiting, quiet hours suppression, and per-contact policies.

---

## 2. Component Inventory & Package Layout

All new components reside in the modular response engine:
`apps-mobile/nova-android/app/src/main/java/com/nova/companion/notification/intelligence/`

```
com.nova.companion.notification.intelligence/
├── reply/
│   ├── ReplyIntent.kt                 # Reply intent classifications (REPLY_RECOMMENDED, etc.)
│   ├── ReplyIntentClassifier.kt       # Deterministic semantics and question analysis
│   ├── ReplySuggestion.kt             # Model for generated reply options + confidence
│   └── SmartReplyEngine.kt            # Multi-option reply synthesis & style personalization
├── actions/
│   ├── ActionType.kt                  # SEND_REPLY, CREATE_REMINDER, CALLBACK
│   ├── PendingAction.kt               # Pending action model with lifecycle & authorization TTL
│   ├── PendingActionManager.kt        # Bounded store for pending actions awaiting confirmation
│   └── SmartReplyActionExecutor.kt    # Secure RemoteInput execution & confirmation
├── followup/
│   ├── FollowUpItem.kt                # Extracted task/reminder model
│   ├── ConversationActionExtractor.kt # Extracts callbacks, deadlines, meetings
│   └── ConversationFollowUpManager.kt # Snooze, completion, and non-intrusive reminder tracking
└── proactive/
    ├── ProactiveAssistantEngine.kt    # Decides when and how to proactively offer assistance
    └── ProactivePolicyPreferences.kt  # Rate limiting, cooldowns, and global toggles
```

---

## 3. Subphase Breakdown & Gates

### Subphase 67.1: Reply Intent Detection
- Classify: `NO_REPLY_REQUIRED`, `REPLY_RECOMMENDED`, `QUESTION_RECEIVED`, `ACTION_REQUIRED`, `FOLLOW_UP_REQUIRED`, `SENSITIVE_RESPONSE`.
- Deterministic regex & grammatical cues ensuring zero false commitments.

### Subphase 67.2: Contextual Smart Reply Generation
- Generate balanced suggestions:
  1. Affirmative / positive ("Yes, I'll be there.")
  2. Tentative / postponement ("I'm not sure yet, will let you know.")
  3. Negative / declination ("I can't make it today.")
- Configurable tone (casual, friendly, professional).
- Mark confidence and whether commitment/sensitive content is present.

### Subphase 67.3: Smart Reply User Experience & Voice Integration
- Connect with `NotificationConversationManager` and `SpeechArbitrator`:
  - When a question arrives: *"Akash, Harish is asking if you're coming today. Want me to suggest a reply?"*
  - User confirms or dictates custom response.

### Subphase 67.4: Authorized Reply Execution
- `SmartReplyActionExecutor`:
  - Verifies notification key, package name, sender, and RemoteInput availability.
  - Requires explicit confirmation (`APPROVED`).
  - Action lifecycle: `CREATED` → `PENDING_APPROVAL` → `APPROVED` → `EXECUTING` → `EXECUTED` / `FAILED`.
  - Dispatches via `NotificationConversationRegistry.executeReply()`.

### Subphase 67.5 & 67.6: Follow-up & Task/Reminder Extraction
- `ConversationActionExtractor` parses:
  - Callback: *"Call me when you're free"* → Action: Callback Harish.
  - Deadline/Task: *"Send report before 5"* → Action: Send report (Due 5 PM).
  - Meeting: *"Let's meet at 6"* → Action: Meeting at 6 PM.
- Stores in `ConversationFollowUpManager` with snooze and completion tracking.

### Subphase 67.7: Proactive Assistant Engine
- Rate limiting: Max 3 proactive prompts per hour, 15-minute cooldown per contact.
- Suppressed during quiet hours or when user dismissed previous prompt.

### Subphase 67.8 – 67.10: Security, Privacy & Physical Hardware Validation
- Prompt injection protection: Treat notification text strictly as untrusted data.
- Never log or store OTPs / private tokens.
- Deploy APK to Vivo/iQOO I2305 and validate with live WhatsApp / Google Messages interactions.
