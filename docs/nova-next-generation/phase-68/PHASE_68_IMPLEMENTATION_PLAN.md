# NOVA 2.0 — PHASE 68 MASTER IMPLEMENTATION PLAN
## PERSONAL TASK ORCHESTRATION, COMMITMENT TRACKING & MEMORY INTELLIGENCE

**Device Target:** Vivo/iQOO I2305 (Android 16 / API 36) — `192.168.0.7:40955`  
**Package:** `com.nova.companion`  
**Certified Baseline:** Phase 67 (Commit `c111eab`)  
**Base APK SHA-256:** `40C298B34550D305D136C09F019819B263D00FD9B641360121659A53DB76B73B`  
**Branch:** `feature/unified-android-apk`

---

## 1. Executive Summary & Core Objective

Phases 65.1 through 67 transformed NOVA into an intelligent, proactive notification assistant capable of understanding message semantics, extracting reply intents, offering smart response options, and securely dispatching RemoteInput actions under single-use user authorization.

**Phase 68** transitions NOVA into a **persistent personal intelligence and task orchestration assistant**. Rather than forgetting notifications once announced or replied to, NOVA will:
1. **Detect Commitments:** Identify obligations and promises made by the user ("I'll send the document tomorrow") and incoming commitments from others ("I'll pay you tonight").
2. **Commitment Ledger:** Maintain an actionable lifecycle (`DETECTED` → `CONFIRMED` → `PENDING` → `COMPLETED` / `CANCELLED`).
3. **Conversation-to-Task Linking:** Link to-dos, callbacks, and deliverables directly to their source conversation.
4. **Persistent Task Orchestration:** Manage structured tasks with priorities, due dates, and reminders across process restarts.
5. **Waiting-for-Others Intelligence:** Monitor pending responses from contacts and suggest timely follow-ups without nagging.
6. **Multi-Tiered Personal Memory:** Maintain short-term conversational context, task memory, user-approved preferences, and minimal episodic summaries without retaining sensitive credentials or OTPs.
7. **Daily Briefing Engine:** Deliver concise morning/daily summaries of today's tasks, deadlines, and waiting states via voice and UI.
8. **Natural-Language Memory Queries:** Enable users to query obligations via voice ("What did I promise Harish?", "What is pending today?").

---

## 2. Architecture Audit & Component Reuse Strategy

### Existing Reusable Architecture:
- `NotificationConversationManager`: Extends announcement pipeline to suggest tracking commitments and tasks.
- `NotificationConversationRegistry`: Maps active conversations and executes authorized RemoteInput replies.
- `SpeechArbitrator`: Manages audio focus and priority speech queueing for briefings and reminders.
- `CommandIntentResolver`: Expands to resolve natural-language memory queries and task confirmation commands.
- `PendingActionManager`: Handles explicit user authorization for commitment creation and follow-ups.
- `ConversationActionExtractor` & `ConversationFollowUpManager`: Extracted tasks feed directly into the Task Orchestrator.
- `NotificationMemoryManager`: Serves as the short-term layer of the comprehensive Memory Intelligence Engine.
- `NotificationDatabase`: Extends Room entities to persist commitments, personal tasks, and memory entries.

---

## 3. Package Structure & File Layout

All new modular components will reside under:
`apps-mobile/nova-android/app/src/main/java/com/nova/companion/task/` and  
`apps-mobile/nova-android/app/src/main/java/com/nova/companion/memory/`

```
com.nova.companion.task/
├── commitment/
│   ├── CommitmentCategory.kt          # SEND_DOCUMENT, MAKE_CALL, PAYMENT, etc.
│   ├── CommitmentRecord.kt            # Data model with owner, category, status, due date
│   ├── CommitmentDetectionEngine.kt   # Rule-based semantic extraction of user & contact promises
│   └── CommitmentLedgerManager.kt     # Lifecycle management, confirmation, and status updates
├── orchestration/
│   ├── PersonalTask.kt                # Structured task model with priority, category, status
│   ├── PersonalTaskOrchestrator.kt    # Task CRUD, rescheduling, prioritization, and linking
│   └── ConversationTaskLinker.kt      # Connects notification events to tasks and commitments
├── reminder/
│   └── PersonalReminderOrchestrator.kt# Smart reminder schedules, anti-annoyance limits, quiet hours
├── waiting/
│   └── WaitingForResponseManager.kt   # Tracks pending responses from other people
└── briefing/
    └── DailyBriefingEngine.kt         # Synthesizes morning/daily personal briefings

com.nova.companion.memory/
├── PersonalMemoryCategory.kt          # SHORT_TERM, TASK, PREFERENCE, EPISODIC
├── PersonalMemoryEntry.kt             # Minimal, privacy-filtered memory record
├── PersonalMemoryEngine.kt            # Multitiered memory store with retention policies & cleanup
└── PersonalAssistantQueryEngine.kt    # Resolves natural-language voice queries ("What did I promise?")
```

---

## 4. Subphase Implementation Order & Verification Gates

| Subphase | Component | Implementation Plan |
|---|---|---|
| **68.1 & 68.2** | Commitment Detection & Ledger | Models (`CommitmentRecord`, `CommitmentCategory`), detection heuristics for promises, `CommitmentLedgerManager`. |
| **68.3 & 68.4** | Task Linking & Task Orchestration | `PersonalTask`, `PersonalTaskOrchestrator`, `ConversationTaskLinker` with priority scoring. |
| **68.5 & 68.6** | Reminder Scheduler & Waiting-For | `PersonalReminderOrchestrator` (anti-annoyance, quiet hours) and `WaitingForResponseManager`. |
| **68.7 & 68.8** | Personal Memory & Daily Briefing | `PersonalMemoryEngine` (privacy-filtered, zero-OTP) and `DailyBriefingEngine`. |
| **68.9** | Voice Memory Query Engine | Expand `CommandIntentResolver` and `PersonalAssistantQueryEngine` for natural speech queries. |
| **68.10–68.12** | Privacy, CI & Physical Certification | Test on Vivo/iQOO I2305 with live WhatsApp / Google Messages notifications. |
