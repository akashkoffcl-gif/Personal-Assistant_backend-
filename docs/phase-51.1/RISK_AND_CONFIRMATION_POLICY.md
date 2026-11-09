# Phase 51.1 — Risk and Confirmation Policy

## 1. Risk Categorization Tiers

### 1.1 LOW Risk (Autonomous Execution)
- **Characteristics:** Read-only data queries, telemetry lookups, ephemeral client navigation, or non-destructive tracking (e.g. logging a glass of water, starting a focus timer).
- **Confirmation:** Not required. Executed immediately by the AI engine.
- **Examples:** `get_personal_profile`, `get_wellness_summary`, `get_focus_analytics`, `start_focus_session`, `navigate_to_tab`.

### 1.2 MEDIUM Risk (Standard Operations with Undo/Edit Capability)
- **Characteristics:** Standard workspace modifications that create or update non-critical state (e.g. creating a task, updating a goal, rescheduling an event).
- **Confirmation:** Optional depending on assistant mode; proposal presented in conversation transcript.
- **Examples:** `create_task`, `create_project`, `create_goal`, `update_goal_progress`, `remember_preference`.

### 1.3 HIGH Risk (Mandatory Explicit Confirmation)
- **Characteristics:** Permanent deletions, state overrides, bulk rescheduling, financial ledger creation, emergency activations, or data wipes.
- **Confirmation:** STRICTLY MANDATORY. `AIService.executeAction()` rejects execution with HTTP 403 Forbidden if `confirmed !== true`.
- **Examples:**
  - `delete_task`
  - `delete_project`
  - `delete_knowledge_note`
  - `clear_all_memories`
  - `apply_day_plan`
  - `report_emergency`
  - `create_transaction_entry`

## 2. Enforcement Mechanism
The backend authorization guard evaluates:
```typescript
if (tool.riskLevel === 'HIGH' && !confirmed) {
  throw new ForbiddenException(`Explicit user confirmation is mandatory for high-risk operation "${tool.name}".`);
}
```
This rule is evaluated before any domain service method can be invoked, ensuring fail-safe execution.

