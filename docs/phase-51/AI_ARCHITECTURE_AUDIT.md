# PHASE 51.0: AI ARCHITECTURE AUDIT REPORT
## Inspection of Intent Routing, Context Retrieval, Tool Registry & Action Execution

**Date:** 6 November 2026  
**Environment:** Local Staging (`D:\PT`)

---

## 1. Existing AI Orchestration Pipeline

The current AI request flow across `apps/api/src/modules/ai/` operates as follows:

```
User Query (Text or Voice)
  │
  ▼
classifyRequest(userMessage) ──► Intent: CONVERSATIONAL | SYSTEM_QUERY | ACTION_REQUEST | MULTI_STEP_WORKFLOW
  │
  ▼
gatherContextForPrompt(userId, userMessage) ──► Domain Tools (Briefing, Day Schedule, Progress, etc)
  │
  ▼
callGemini(userId, userMessage, toolContext)
  ├── 1. Upstream Call to Google Gemini (gemini-3.5-flash-lite)
  └── 2. Grounded Fallback Engine (Deterministic heuristic parsing if unauthenticated / offline)
  │
  ▼
Response Parser
  ├── Parse [ACTION:ACTION_TYPE:{...}] from LLM Output
  └── Fallback Heuristic Matcher (starts with "create task", "reminder for", etc)
  │
  ▼
Persistence & Action Proposal
  ├── Create AIMessage in AIConversation
  └── If action proposed: Create AIAction with status="PROPOSED"
```

---

## 2. Inconsistencies & Architecture Flaws Discovered

### A. Dual Tool Registries and Duplication
- **Registry A:** `JarvisToolRegistryService` registers 21 tools with `execute` lambdas.
- **Registry B:** `AIService.executeAction` uses a separate, hardcoded `switch-case` block:
  ```typescript
  switch (action.actionType) {
    case 'CREATE_TASK': ...
    case 'COMPLETE_TASK': ...
    case 'CREATE_REMINDER': ...
    case 'START_FOCUS': ...
    // then falls back to jarvisRegistry
  }
  ```
  This creates maintenance drift where actions supported in `executeAction` differ from those registered in `JarvisToolRegistryService`.

### B. Lack of Atomic Multi-Step Execution Planning
When a user issues a composite instruction (e.g. *"Plan my afternoon: block 2 hours for coding, remind me to submit PR at 4 PM, and log 500ml water"*), the current system can only return a single action proposal (`[ACTION:CREATE_TASK:...]`), discarding the other requests or failing to generate a dependency chain.

### C. Frontend Tab Navigation Disconnect
The voice assistant interface (`AIAssistantExperience.tsx`) cannot programmatically command the Next.js parent container (`page.tsx`) to switch tabs or open modals. When a user asks: *"Nova, open my finance dashboard"*, the assistant generates a text reply, but the UI remains static on the current screen.

### D. Grounded Engine Regex Parsing Limitations
While the grounded fallback engine is highly resilient, it relies heavily on string matching (`lowerMsg.startsWith('create task')`). Commands phrased colloquially (e.g., *"Can you please add a reminder for 5 PM?"*) can fail to extract parameters accurately when remote Gemini credentials are unavailable.

---

## 3. Recommended Architectural Hardening

1. **Unify Action Execution:** Direct 100% of action execution through `JarvisToolRegistryService.executeTool(userId, toolId, payload)` with strict schema validation.
2. **Multi-Action Proposal Support:** Allow the AI response to propose an ordered list of actions (`AIAction[]`) bound under a single `PlanningProposal` or workflow ID.
3. **Frontend Client Command Bridge:** Surface an `onClientCommand(command: { type: 'NAVIGATE' | 'OPEN_MODAL' | 'APPLY_FILTER', payload: any })` callback in `AIAssistantExperience` so voice commands trigger visible UI updates.

