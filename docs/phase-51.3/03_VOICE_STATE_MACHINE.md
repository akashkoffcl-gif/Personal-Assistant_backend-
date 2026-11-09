# PHASE 51.3 — VOICE STATE MACHINE SPECIFICATION

## 1. Specification Overview

Nova's voice interaction follows a deterministic Finite State Machine (FSM) spanning user speech input, transcription, intention classification, planning, confirmation, streaming execution, and speech feedback.

---

## 2. Formal Voice State Machine

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> LISTENING: Mic Activated / Push-To-Talk
    LISTENING --> TRANSCRIBING: Interim Speech Detected
    TRANSCRIBING --> UNDERSTANDING: Final Speech + 1.2s Silence
    
    UNDERSTANDING --> PLANNING: Multi-Step Workflow Intent
    UNDERSTANDING --> AWAITING_CONFIRMATION: Single Consequential Action
    UNDERSTANDING --> SPEAKING: Informational / Navigation Result
    
    PLANNING --> AWAITING_APPROVAL: Plan Generated & DAG Displayed
    
    AWAITING_APPROVAL --> EXECUTING: Vocal / UI Approval (CAS)
    AWAITING_APPROVAL --> CANCELLED: Vocal / UI Rejection ("cancel")
    
    AWAITING_CONFIRMATION --> EXECUTING: Vocal / UI Approval ("confirm")
    AWAITING_CONFIRMATION --> CANCELLED: Vocal / UI Rejection ("cancel")
    
    EXECUTING --> SPEAKING: Conclude & Announce Outcome
    SPEAKING --> LISTENING: Continuous Voice Loop (autoVoiceResponse)
    SPEAKING --> IDLE: Turn Complete / User Dismiss
    
    LISTENING --> INTERRUPTED: User Tap / Manual Interrupt
    SPEAKING --> INTERRUPTED: User Speaks / Clicks Stop
    INTERRUPTED --> IDLE: State Cleared
    
    UNDERSTANDING --> ERROR: Upstream / Network Failure
    EXECUTING --> ERROR: Unrecoverable Execution Failure
    ERROR --> IDLE: Auto-Dismiss (2.5s)
```

---

## 3. State Definitions & Invariants

| State | Avatar Mapping | Microphone State | Audio Output | Invariants |
|---|---|---|---|---|
| `IDLE` | `idle` | Inactive | Inactive | Waiting for hotkey, dock click, or activation. |
| `LISTENING` | `listening` | Active | Inactive | Recording user audio; listening for interim tokens. |
| `TRANSCRIBING` | `listening` | Active | Inactive | Showing live text in transcript pill. |
| `UNDERSTANDING` | `thinking` | Inactive | Inactive | Resolving NLP intent and querying domain tools. |
| `PLANNING` | `planning` | Inactive | Inactive | Decomposing multi-step instructions into DAG. |
| `AWAITING_APPROVAL` | `awaiting_approval` | Inactive | Inactive | Plan displayed; waiting for explicit user approval. |
| `EXECUTING` | `executing` | Inactive | Inactive | SSE stream active; lease renewals in progress. |
| `SPEAKING` | `speaking` | Inactive | Active | TTS reading concise confirmation / response. |
| `INTERRUPTED` | `idle` | Inactive | Inactive | TTS cancelled immediately; pending actions cleared. |
| `CANCELLED` | `idle` | Inactive | Inactive | Proposal rejected; database action marked REJECTED. |
| `ERROR` | `error` | Inactive | Inactive | Toast displayed; fails closed. |

