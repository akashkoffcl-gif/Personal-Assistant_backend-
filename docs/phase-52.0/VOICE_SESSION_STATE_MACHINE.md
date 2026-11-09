# PHASE 52.0: VOICE SESSION STATE MACHINE SPECIFICATION

## 1. Formal State Definitions

| State | Semantic Meaning | Active Audio Operation | Next Allowed States |
|---|---|---|---|
| `IDLE` | Modal closed or dormant | None | `REQUESTING_PERMISSION`, `LISTENING` |
| `REQUESTING_PERMISSION` | Prompting browser mic permission | `getUserMedia` | `LISTENING`, `ERROR` |
| `LISTENING` | Listening for user speech | `SpeechRecognition` + Analyser | `PROCESSING`, `PAUSED`, `STOPPED`, `ERROR` |
| `PROCESSING` | Submitting final transcript to API | None | `GENERATING_RESPONSE`, `ERROR` |
| `GENERATING_RESPONSE` | Waiting for backend AI response | None | `SPEAKING`, `ERROR` |
| `SPEAKING` | Speaking assistant response | `SpeechSynthesis` | `WAITING_FOR_FOLLOWUP`, `INTERRUPTED`, `STOPPED` |
| `WAITING_FOR_FOLLOWUP` | Brief transition window after speech | None | `LISTENING`, `STOPPED` |
| `INTERRUPTED` | Barge-in triggered mid-speech | Cancels Speech | `LISTENING`, `PROCESSING` |
| `RECOVERING` | Handling transient network drop | Backoff timer | `LISTENING`, `ERROR` |
| `PAUSED` | User explicitly paused voice | None | `LISTENING`, `STOPPED` |
| `STOPPED` | User ended session | None | `IDLE` |
| `ERROR` | Unrecoverable microphone failure | None | `IDLE`, `REQUESTING_PERMISSION` |

## 2. Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> REQUESTING_PERMISSION: Open / Start
    REQUESTING_PERMISSION --> LISTENING: Mic Granted
    REQUESTING_PERMISSION --> ERROR: Mic Denied
    LISTENING --> PROCESSING: Utterance Finalized
    PROCESSING --> GENERATING_RESPONSE: API Dispatched
    GENERATING_RESPONSE --> SPEAKING: Response Received
    SPEAKING --> INTERRUPTED: User Speaks (Barge-in)
    INTERRUPTED --> LISTENING: Resume Mic
    SPEAKING --> WAITING_FOR_FOLLOWUP: onend Fired
    WAITING_FOR_FOLLOWUP --> LISTENING: Auto Re-listen
    LISTENING --> PAUSED: "Pause Listening"
    PAUSED --> LISTENING: "Resume Listening"
    LISTENING --> STOPPED: "Stop Listening"
    SPEAKING --> STOPPED: "Stop Listening"
    STOPPED --> [*]
```

