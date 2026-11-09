# Phase 51.5 Workstream E: Personal Memory Architecture

**Application:** Nova Personal Assistant PWA  
**Service:** `AIMemoryService` & `KnowledgeService`  
**Database Tables:** `notes`, `user_preferences`, `ai_conversations`

---

## 1. Memory Classification & Categorization

To maintain conversational continuity without compromising privacy or storing sensitive facts indiscriminately, Nova categorizes memory into 5 distinct tiers:

| Tier | Category | Storage Table | Sensitivity | User Control |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **User Preferences** | `user_preferences` / Settings | Low | Directly editable via Settings UI. |
| **2** | **Working Context** | Session Cache (`activeWorkspace`, `selectedTaskId`) | Low | Ephemeral; clears on browser close. |
| **3** | **Project & Task Context** | `projects`, `tasks` (relational models) | Medium | Standard CRUD in Workspaces. |
| **4** | **Knowledge Hub** | `notes` (Markdown + Tags) | High | Explicitly managed in Knowledge workspace. |
| **5** | **Conversational Memory** | `ai_conversations` & vector embeddings | High | User can inspect, edit, or purge all memories. |

---

## 2. Memory Provenance & Verification Controls

Every memory entry automatically captures provenance metadata:
- **`sourceConversationId`:** The conversation where the fact was stated.
- **`confidence`:** Score between $0.0$ and $1.0$ indicating certainty.
- **`category`:** The semantic classification.
- **`createdAt` / `lastVerifiedAt`:** Timestamps preventing stale facts from dominating context.

### User Memory Privacy Controls
Nova provides dedicated tools in `JarvisToolRegistryService` allowing users to inspect and curate their personal context:
- `get_personal_memories`: Inspect all active memories.
- `remember_preference`: Explicitly teach Nova a preference.
- `forget_memory`: Remove a specific inaccurate memory.
- `clear_all_memories`: Completely purge stored conversational context.
- All memory queries strictly enforce tenant isolation (`where: { userId: authenticatedUser.id }`).

