# 06 — AI Notification Intelligence Validation Report

**Date:** 2026-11-15  
**Service:** `apps/api/src/modules/ai/ai.service.ts` & `jarvis-tool-registry.service.ts`  

---

## 1. AI Tool Registration

In `apps/api/src/modules/ai/jarvis-tool-registry.service.ts`:
```typescript
this.register({
  id: 'get_phone_notifications',
  name: 'Get Phone Notifications',
  category: 'NOTIFICATIONS',
  description: 'Retrieves actual permitted notifications received from paired Android device.',
  riskLevel: 'LOW',
  requiresConfirmation: false,
  inputSchema: { limit: 'number', appName: 'string' },
  execute: async (userId, input) => {
    return this.prisma.mobileEvent.findMany({
      where: {
        userId,
        ...(input?.appName ? { sourceApp: { contains: input.appName, mode: 'insensitive' } } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: input?.limit ?? 10,
    });
  },
});
```

---

## 2. Intent Routing & Fallback Reasoning

In `apps/api/src/modules/ai/ai.service.ts`:
- When the user asks about notifications or messages, `ai.service.ts` executes `get_phone_notifications` for the authenticated `userId`.
- In the local fallback reasoning handler (lines 1162-1169):
  ```typescript
  } else if (toolContext.toolUsed === 'get_phone_notifications') {
    const events = Array.isArray(toolContext.toolData) ? toolContext.toolData : [];
    if (events.length === 0) {
      actionReply = `I checked your paired phone's notifications, but you haven't received any new permitted messages or alerts recently.`;
    } else {
      const formatted = events.slice(0, 5).map((e: any) => `• [${e.appName || e.sourceApp}] ${e.title}: ${e.summary}`).join('\n');
      actionReply = `Here are the latest permitted notifications received from your phone:\n${formatted}`;
    }
  }
  ```
- When using the Google Gemini model directly, the `systemPrompt` explicitly instructs:
  ```text
  5. Notification Intelligence Directive:
     - When asked about phone notifications or received messages, NEVER say "I don't have direct access to your phone's live notifications for privacy and security reasons".
     - You HAVE direct Android Notification Access via the paired Android companion.
     - If grounded phone events are present in tool context or Unified Context, summarize them accurately.
     - If no events are present, state that no new messages or alerts have arrived on the connected device.
     - If device permission is disabled or listener disconnected, guide the user to enable Notification Access in Android Settings.
  ```

### Why NOVA Previously Claimed It Had No Access:
When no notifications exist in the database and no device is paired, the tool returns `[]`. If the LLM generates a response without grounded events and without this explicit directive, standard foundational models default to safety refusals ("I don't have access to your personal phone notifications for privacy and security reasons").
Once events are actually ingested into `mobileEvent`, the AI tool retrieves them and grounds the response.
