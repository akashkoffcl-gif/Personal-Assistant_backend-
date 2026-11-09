# Phase 53.1: Current NLP & Conversational Intelligence Implementation Audit

**Audit Date:** 2026-11-09  
**Repository Baseline:** Phase 52.0  
**Target:** Transform NOVA from a conventional reactive chatbot into an intelligent, context-aware, two-way conversational personal assistant.

---

## 1. Executive Summary & Defect Topology

Prior to Phase 53.1, NOVA operated predominantly as a deterministic keyword router and single-turn task bot. A detailed inspection of `AIService`, `AIToolsService`, `AIMemoryService`, `useVoiceInteraction.ts`, and the Prisma persistence models reveals the following architectural bottlenecks:

| Dimension | Baseline State | Critical Limitation | Required Phase 53.1 Remedy |
| :--- | :--- | :--- | :--- |
| **Intent Understanding** | Primitive keyword/substring checks (`lower.includes(...)`) in `classifyRequest()` | High false-positive rate; fails to distinguish implicit requests, advice requests, emotional statements, or conversational sharing. | Multi-tier intent engine with primary/secondary intent, user objective, confidence score, and decision policies. |
| **Context & Pronoun Resolution** | Single-message prompt injection (`contents: [{ role: 'user', parts: [prompt + message] }]`). | Zero multi-turn context passed to Gemini; cannot resolve "it", "that project", or "which one is first". | Bounded multi-turn message history injection with explicit pronoun/anaphora resolution. |
| **Memory Architecture** | Unranked retrieval of notes titled `[JARVIS_MEMORY]`. | Injects either all memories or none; no semantic relevance scoring, no confidence weighting, no recency decay. | Ranked contextual memory retrieval with category filtering, confidence scoring, and fact vs. inference tagging. |
| **Behavioural Modeling** | Non-existent; static hardcoded prompt attributes. | NOVA does not adapt to user pace, conciseness preferences, repeated corrections, or domain habits. | Evidence-based behavioural context engine tracking communication style, work planning patterns, and verified preferences. |
| **Decision Policy** | If keyword matches `create task`, creates `AIAction` or triggers tool immediately. | Conversational statements like "I have a lot to finish today" or "This project is a mess" trigger unwanted task creations. | 7-state Conversational Decision Policy (`DIRECT_ANSWER`, `CONTEXTUAL_RESPONSE`, `RECOMMENDATION`, `CLARIFICATION`, `PLAN`, `ACTION`, `PROACTIVE_SUGGESTION`). |
| **Personality & Tone** | Static prompt: *"Your personality is calm, exceptionally capable, articulate, and proactive."* | Robotic, repetitive greetings, canned confirmation messages, excessive markdown bullet points. | Adaptive personality engine with situational tone adaptation (calm, focused, empathetic, concise, or structured). |
| **Voice Delivery** | Browser Web Speech API with fixed `rate = 1.05`, `pitch = 1.0`, generic voice selection. | Unnatural flat cadence, no pause segmentation, no situational rate/pitch adjustment, no mixed speech support. | Context-sensitive voice delivery engine with sentence segmentation, expressive prosody tags, and pacing control. |

---

## 2. In-Depth Component Analysis

### 2.1 Backend Request Classification (`apps/api/src/modules/ai/ai.service.ts`)
Lines 221–341 implement `classifyRequest(userMessage: string)` using a linear sequence of `lower.includes(...)` statements:
- Queries like `"What tasks should I prioritize?"` hit `TASK_QUERY`.
- Queries like `"I need help organizing my mess of notes"` immediately hit `KNOWLEDGE_SEARCH` and blindly invoke `searchKnowledge`.
- Implicit assistance requests like `"I'm feeling overwhelmed by deadlines"` fall through to `GENERAL_CONVERSATION` without retrieving priorities or offering structured relief.
- Crucially, `chat()` receives a `conversationId`, saves user and assistant messages to `AIMessage`, but **never feeds previous conversation turns into the Gemini prompt**. The prompt is constructed solely from the current message and tool context (`${systemPrompt}\n\nUser request: ${userMessage}`).

### 2.2 Memory Service (`apps/api/src/modules/ai/ai-memory.service.ts`)
- Stores user memories in `KnowledgeNote` rows with prefix `[JARVIS_MEMORY]`.
- `getContextualMemoryPrompt(userId)` loads all notes and formats them into a flat string. If a user has 50 preferences, all 50 are concatenated without relevance filtering, consuming token budget and diluting model focus.
- No distinction between confirmed facts and unconfirmed behavioral inferences.

### 2.3 Voice Frontend (`apps/web/src/hooks/useVoiceInteraction.ts`)
- Continuous conversation loop implemented in Phase 52.0 operates correctly (`utterance.onend -> LISTENING`), but TTS delivery uses static parameters (`utterance.rate = 1.05`, `utterance.pitch = 1.0`).
- Text preprocessing only strips code blocks and asterisks. It does not insert conversational pauses or format lists for spoken delivery, causing long run-on sentences during voice synthesis.
- Web Speech API voice selection searches for `"Google"`, `"Natural"`, or `"Samantha"`, with no fallback hierarchy or multilingual/mixed-accent consideration.

---

## 3. Architectural Gap Matrix & Phase 53.1 Target State

```
[User Utterance / Text Input]
            │
            ▼
┌────────────────────────────────────────┐
│  Tier 1: Intent & Pragmatic Analyzer   │ ◄── Multi-turn History (last 6 turns)
│  - Intent Classification (12 categories)│ ◄── Active UI Context (tab, task, project)
│  - Anaphora & Entity Resolution         │
│  - Ambiguity & Emotion/Urgency Sensor  │
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│  Tier 2: Decision Policy Router        │
│  - Policy: Clarify / Answer / Action / │
│    Recommend / Plan / Listen           │
│  - Action Threshold Gate (Prevents     │
│    unwanted mutations on venting)      │
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│  Tier 3: Context & Behaviour Engine    │
│  - Bounded Ranked Memory Retrieval     │ ◄── Fact vs Inference Tagging
│  - User Behaviour Profile (Pacing,     │ ◄── Communication Style Model
│    Verbosity, Verified Preferences)    │
│  - Domain Tool Grounding (selective)   │
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│  Tier 4: Personality & Generation      │
│  - Adaptive Tone (Calm/Direct/Empathetic│
│  - Anti-Robot Filter (No canned echoes)│
│  - Speech Segmentation for Natural TTS │
└──────────────────┬─────────────────────┘
                   │
                   ▼
[Natural Voice Output / Structured Response]
```

---

## 4. Remediation Plan

1. **Context & Multi-Turn History Integration:** Fetch recent messages from `AIMessage` for the active `conversationId` and provide a sliding context window to Gemini.
2. **Advanced Intent Classification Service (`conversational-intent.service.ts`):** Replace regex/keyword checks with structured intent scoring, entity extraction, and decision policies.
3. **Behavioral & Memory Context Engine (`behavioral-context.service.ts`):** Implement ranked memory retrieval, user preference learning, and confidence gating.
4. **Adaptive Conversational Personality Engine (`personality-engine.service.ts`):** Formulate dynamic system instructions adapting tone, conciseness, and conversational empathy based on user urgency and situation.
5. **Voice Delivery Optimization (`useVoiceInteraction.ts` & Voice Prosody):** Implement smart sentence chunking, dynamic speech rates based on context (e.g. 1.1x for urgent, 0.95x for deep guidance), and natural phrasing.

