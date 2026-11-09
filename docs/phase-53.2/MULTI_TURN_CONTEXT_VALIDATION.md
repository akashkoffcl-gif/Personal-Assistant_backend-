# Multi-Turn Context Validation

**Phase:** 53.2  
**Target:** Verify multi-turn continuity, pronoun resolution, topic switching, and topic resumption.

---

## 1. Multi-Turn History Injection Architecture

In [`ai.service.ts`](file:///D:/PT/apps/api/src/modules/ai/ai.service.ts), `chat()` fetches the last 6 messages belonging to `conversationId` and maps them chronologically into Gemini's multi-turn `contents` array:
- Up to 4 prior turns (`role: 'user'` and `role: 'model'`) precede the active turn.
- Active system prompt directives are prepended to the final user turn.

## 2. Test Observations

### 2.1 Anaphora & Pronoun Resolution
- **Turn 1:** *"I am working on the website project."*
- **Turn 2:** *"The client wants it finished this week. What should I do first?"*
- **Outcome:** The pronoun "it" is linked to "Website Launch" in `ConversationalIntentService.contextReferences.resolvedPronouns['it']`. Gemini's response referenced the website design requirements directly.

### 2.2 Continuity Across Turns
In Dialogue 1:
- Turn 1 acknowledged the hectic day.
- Turn 2 acknowledged completion of the UI design.
- Turn 3 connected the completed UI design to pre-client presentation review steps.

### 2.3 Topic Switching & Topic Resumption
- In Scenario #11 of the quality suite, the user switched from project planning to *"By the way, what was my spending this month?"*
- NOVA answered the financial inquiry directly without losing the conversation context.
- When followed up with *"And how long will that take?"*, NOVA asked for clarification on whether the user meant the spending report or the earlier project plan.

