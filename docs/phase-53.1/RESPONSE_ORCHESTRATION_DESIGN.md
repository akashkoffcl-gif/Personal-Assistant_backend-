# Response Orchestration Design

## 1. Multi-Stage Pipeline
1. **Request Intake:** Extract UI context and previous message thread.
2. **Pragmatic Analysis:** `ConversationalIntentService` extracts intent, pacing, emotion, and pronouns.
3. **Context Selection:** `BehaviouralContextService` selects top 4 memories and user profile.
4. **Tool Gating:** Domain tools are only called if policy demands action or domain grounding.
5. **Personality Framing:** `ConversationalPersonalityEngine` injects situational prompt directives.
6. **Gemini Invocations:** Sliding window of up to 4 historical turns + system prompt + active utterance.
7. **Delivery Conditioning:** Return structured payload with intent analysis and cadence hints to the client.

