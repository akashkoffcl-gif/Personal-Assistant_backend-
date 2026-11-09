# PHASE 51.0: MULTI-STEP EXECUTION ARCHITECTURE DESIGN
## Autonomous Planning, Dependency Chaining, Approval Gates & Verification

**Date:** 6 November 2026  
**Environment:** Local Staging (`D:\PT`)

---

## 1. Architectural Overview

To enable Nova to handle complex, multi-stage directives (e.g. *"Set up Sprint Beta: create the project, add 3 tasks, schedule a team briefing reminder for Monday 10 AM, and reorganize my morning schedule"*), the system must orchestrate an atomic, multi-step execution pipeline.

```
User Multi-Step Command
  │
  ▼
1. Intent Deconstruction & Module Identification (AIService)
  │
  ▼
2. Context Retrieval & State Grounding (Active Projects, Existing Tasks, Schedule)
  │
  ▼
3. Execution Graph Construction (DAG of Step Actions)
  ├── Step 1: create_project { name: "Sprint Beta" } -> returns projectId
  ├── Step 2: create_task { title: "Task A", projectId: "$step1.id" }
  ├── Step 3: create_reminder { triggerTime: "..." }
  └── Step 4: reschedule_tasks { strategy: "DEEP_WORK" }
  │
  ▼
4. Consequential Risk & Authorization Assessment
  ├── Contains HIGH risk action? (e.g. reschedule / delete / budget mutation)
  └── YES ──► Create Batch AIAction Proposal & Request User Confirmation
  │
  ▼ User Confirmed (or All Steps Low Risk)
5. Sequential Domain Execution (JarvisToolRegistryService)
  ├── Execute Step 1 via ProjectsService
  ├── Inject Step 1 Output into Step 2 Context
  ├── Execute Step 2 via TasksService
  └── Execute Step 3 via RemindersService
  │
  ▼
6. Read-After-Write State Verification
  ├── Query Prisma to verify actual DB mutations
  └── Assert zero orphaned or duplicate records
  │
  ▼
7. Executive Result Synthesis & UI Feedback
  ├── Deliver Voice/Text Briefing to User
  └── Trigger Client UI Event (Refresh Dashboard / Navigate to Project)
```

---

## 2. Execution Graph & Schema Specification

Multi-step proposals will be recorded in a unified `MultiStepPlan` structure:

```typescript
export interface ExecutionStep {
  stepIndex: number;
  toolId: string;
  name: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  input: Record<string, any>;
  dependsOn?: number[]; // indices of required preceding steps
}

export interface MultiStepExecutionPlan {
  id: string;
  userId: string;
  title: string;
  description: string;
  totalSteps: number;
  steps: ExecutionStep[];
  requiresConfirmation: boolean;
  status: 'PROPOSED' | 'APPROVED' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
}
```

---

## 3. Rollback & Fault Tolerance

If Step $N$ in a multi-step plan fails:
1. Execution halts immediately to prevent partial state corruption.
2. The error is captured in `executionResult`.
3. Inverse compensation handlers are invoked for preceding steps (e.g. if task creation fails after project creation, the newly created empty project is cleanly rolled back).
4. An alert is returned to the user with actionable diagnostic feedback.

---

## 4. Client-Side Voice Navigation Integration

When Nova executes a client UI action (e.g. navigation or opening a modal), `AIService` includes a `clientAction` payload in the response stream:

```json
{
  "clientAction": {
    "type": "NAVIGATE_TAB",
    "tab": "projects",
    "highlightId": "proj-123"
  }
}
```

In `AIAssistantExperience.tsx`:
```typescript
if (response.clientAction?.type === 'NAVIGATE_TAB') {
  window.dispatchEvent(new CustomEvent('ai-assistant:navigate', {
    detail: { tab: response.clientAction.tab }
  }));
}
```
This enables seamless voice navigation without page reloads.

