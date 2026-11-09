# Phase 49 — JARVIS Personal Memory Engine Specification

**Phase:** Phase 49 — Section 6 Personal Memory Engine  
**Date:** 2026-11-06  
**Auditor:** Antigravity  
**Service:** `apps/api/src/modules/ai/ai-memory.service.ts`

---

## 1. Memory Architecture & Categories

The Personal Memory Engine establishes persistent, user-controlled memory records isolated per tenant. It avoids indiscriminately storing every conversational turn, capturing only explicit preferences and user-approved behavioral patterns across 5 core categories:

1. **`PREFERENCE`**: General lifestyle, assistant preferences, and platform defaults.
2. **`WORK_STYLE`**: Work rhythms, peak concentration hours, meeting boundaries (e.g. "Prefers morning deep work between 9am-11am").
3. **`COMMUNICATION`**: Brevity, tone, detail density, and technical depth.
4. **`DASHBOARD`**: Preferred dashboard views, density settings, and widget hierarchies.
5. **`AUTOMATION`**: Approved automation trigger rules and routine follow-up cadences.

---

## 2. API Endpoints & Tenant Isolation

- `GET /api/v1/ai/memory`: Lists all stored memory entries for the authenticated user.
- `POST /api/v1/ai/memory`: Upserts a new user preference or habit entry.
- `DELETE /api/v1/ai/memory/:id`: Permanently deletes an approved memory item.

### Persistence Mechanism
Memories are stored reliably in the `knowledge_notes` relation with a dedicated prefix tag `[JARVIS_MEMORY]`. This guarantees PostgreSQL persistence, cascade deletion with user cleanup, and full indexing without requiring schema migration downtime.

