# Conversational Intelligence Architecture Specification

## 1. System Topology & Tiered Reasoning Pipeline

The Conversational Intelligence Engine decouples input understanding, context ranking, and situational speech delivery from raw LLM text generation:

```
[User Utterance / Text Input]
            │
            ▼
┌────────────────────────────────────────┐
│  Tier 1: Intent & Pragmatic Analyzer   │
│  - ConversationalIntentService         │
│  - 12 Primary Intent Categories        │
│  - Anaphora & Pronoun Resolution       │
│  - Emotional Tone & Pacing Sensor      │
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│  Tier 2: Decision Policy Router        │
│  - 7 Policies: Direct, Contextual,     │
│    Recommendation, Clarify, Plan,      │
│    Action, Proactive Suggestion        │
│  - Action Threshold Gate (Anti-venting)│
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│  Tier 3: Behavioural & Memory Context  │
│  - BehaviouralContextService           │
│  - Ranked Bounded Context Retrieval    │
│  - Fact vs. Inference Discrimination   │
│  - Selective Tool Invocation           │
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│  Tier 4: Personality & Prompt Framing  │
│  - ConversationalPersonalityEngine     │
│  - Situational Tone Directives         │
│  - Anti-Robot Phrasing Filter          │
│  - Gemini Multimodal Generation        │
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│  Tier 5: Voice Delivery Adaptation     │
│  - useVoiceInteraction.ts              │
│  - Breath & Pause Segmentation         │
│  - Dynamic Cadence (0.95x - 1.15x)     │
│  - High-Fidelity Natural Voice Select  │
└────────────────────────────────────────┘
```

