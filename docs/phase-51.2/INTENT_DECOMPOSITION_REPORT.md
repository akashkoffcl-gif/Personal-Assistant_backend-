# Phase 51.2 — Intent Decomposition Report

## 1. Intent Extraction Principles
Nova’s intent decomposition breaks complex multi-clause instructions into discrete, actionable steps while observing strict platform safeguards:
1. **Zero Hallucination:** Never silently invent missing dates or parameters.
2. **Context Resolution:** Automatically resolves relative time references (e.g. "tomorrow at 4 PM") using local timezone metadata.
3. **Dependency Mapping:** Explicitly links parent-child relationships (e.g., tasks generated under a newly created project).

## 2. Canonical Decomposition Scenario
**Instruction:**
> "Create a project called Website Launch, add three tasks, schedule a focus session and remind me tomorrow at 4 PM."

### Decomposed Execution Plan:
1. **Step 1:** `create_project`
   - Description: "Create Website Launch Project"
   - Input: `{ name: 'Website Launch', color: '#8B45F5', priority: 'HIGH' }`
   - Dependencies: `[]`
   - Risk Level: `MEDIUM`

2. **Step 2:** `create_task`
   - Description: "Create Task: UI Design"
   - Input: `{ title: 'UI Design', projectId: '$step-1.id', priority: 'HIGH', category: 'WORK' }`
   - Dependencies: `['step-1']`
   - Risk Level: `MEDIUM`

3. **Step 3:** `create_task`
   - Description: "Create Task: Backend Integration"
   - Input: `{ title: 'Backend Integration', projectId: '$step-1.id', priority: 'HIGH', category: 'WORK' }`
   - Dependencies: `['step-1']`
   - Risk Level: `MEDIUM`

4. **Step 4:** `create_task`
   - Description: "Create Task: Testing"
   - Input: `{ title: 'Testing', projectId: '$step-1.id', priority: 'MEDIUM', category: 'WORK' }`
   - Dependencies: `['step-1']`
   - Risk Level: `MEDIUM`

5. **Step 5:** `start_focus_session`
   - Description: "Initiate 25-minute Focus Block"
   - Input: `{ durationMinutes: 25, taskId: '$step-2.id' }`
   - Dependencies: `['step-2']`
   - Risk Level: `LOW`

6. **Step 6:** `create_reminder`
   - Description: "Create follow-up reminder for tomorrow at 4 PM"
   - Input: `{ title: 'Review Website Launch Progress', time: '<tomorrow>T16:00:00.000Z', taskId: '$step-2.id' }`
   - Dependencies: `['step-2']`
   - Risk Level: `MEDIUM`

## 3. Ambiguous & Conflict Detection
- Prompts that specify conflicting timestamps or missing parameters are captured in `DRAFT` status and prompt the user for clarification before generating a `PROPOSED` plan.

