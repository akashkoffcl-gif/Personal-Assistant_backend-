# Phase 51.2 — Approval and Risk Engine Report

## 1. Multi-Tier Risk Evaluation
Workflows inherit their risk classification based on the highest risk tier among all contained steps:
1. **LOW Risk:** All operations are read-only or low-impact (e.g. queries, summaries, view navigation).
2. **MEDIUM Risk:** Operations mutate user workspace data reversibly (e.g. creating tasks, setting reminders). Explicit confirmation is required unless delegated by user settings.
3. **HIGH Risk:** Operations involve permanent deletion, financial transaction creation, mass schedule shifts, or data wipes (`delete_task`, `delete_project`, `clear_all_memories`, `apply_day_plan`, `report_emergency`).

## 2. Cryptographic Approval Binding
To prevent approval forgery, replay attacks, or plan modification between proposal and execution:
1. The planner computes a canonical SHA-256 hash of the steps:
   ```typescript
   static computeStepPayloadHash(steps: WorkflowStep[]): string {
     const canonical = steps.map((s) => ({
       id: s.id,
       toolId: s.toolId,
       input: s.input,
       dependencies: [...s.dependencies].sort(),
       riskLevel: s.riskLevel,
     }));
     return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
   }
   ```
2. When the user approves the workflow, the API compares the client hash against the stored plan hash.
3. If any step was modified or if the hash mismatches, execution is aborted with `HTTP 403 Forbidden: Workflow payload was modified after proposal`.

## 3. Approval Invalidation
If a proposed workflow is revised by a subsequent user prompt, the prior approval is invalidated, the record transitions to `CANCELLED`, and a fresh plan is drafted.

