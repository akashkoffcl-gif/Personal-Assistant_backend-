# PHASE 51.0: IMPLEMENTATION ROADMAP
## Universal Application Capability Rollout, Complexity Estimates & Milestones

**Date:** 6 November 2026  
**Environment:** Local Staging (`D:\PT`)

---

## 1. Prioritized Implementation Roadmap

The transition of Nova from partial coverage to universal application control will be executed across four distinct sub-phases:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 51.1: Core Universal Tool Registry & Missing Domain Wrappers          │
│ - Implement 27 missing tools across Wellness, Goals, Focus, & Emergencies   │
│ - Unify AIService.executeAction dispatch through JarvisToolRegistryService  │
│ - Complexity: MEDIUM (Est: 4-6 hours)                                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 51.2: Multi-Step Autonomous Planning & Dependency Chaining            │
│ - Build Directed Acyclic Graph (DAG) MultiStepPlan executor in AIService    │
│ - Implement output-to-input parameter piping across sequential tool steps   │
│ - Implement failure rollback / inverse compensation handlers                │
│ - Complexity: HIGH (Est: 6-8 hours)                                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 51.3: Voice Navigation & Bidirectional Client UI Control              │
│ - Add client action streaming payload (`NAVIGATE_TAB`, `OPEN_MODAL`)        │
│ - Wire window event listener in page.tsx for hands-free screen navigation   │
│ - Enable voice-driven workspace switching and modal control                 │
│ - Complexity: LOW to MEDIUM (Est: 2-3 hours)                                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 51.4: End-to-End Certification & Multi-Module Scenario Verification   │
│ - Write automated integration tests for all 10 capability groups            │
│ - Verify read-after-write database queries across all 48 tools               │
│ - Certify zero security bypasses, zero data loss, and zero unhandled errors │
│ - Complexity: MEDIUM (Est: 3-4 hours)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Capability Gap Priority Classification

### P0: Security & Data Integrity
- Ensure `AIAction` execution authoritatively validates user session ownership.
- Enforce mandatory explicit confirmation on destructive mutations (delete project, task deletion, clear memories) and transactions > ₹1,000.
- Sanitize memory inputs to prevent prompt injection into persistent context.

### P1: Core Application Control
- Implement remaining CRUD tools: Task rescheduling, Project detail updates, Routine completion/skipping, Focus session lifecycle.
- Add voice navigation bridge to allow hands-free tab switching across all 19 workspaces.

### P2: Autonomous Multi-Step Workflows
- Multi-step DAG planning engine with parameter dependency chaining.
- Atomic batch action approval cards in the floating assistant overlay.

### P3: Advanced Personalization & Proactive Intelligence
- Habit adherence triggers and fatigue-based proactive break suggestions.
- Cross-domain summaries (e.g. Life Balance score linking sleep, hydration, focus, and financial savings).

---

## 3. Engineering Complexity Estimation

| Milestone | Scope of Work | Files Impacted | Estimated Complexity |
|---|---|---|---|
| **Phase 51.1** | Universal Tool Registry & Wrappers | `jarvis-tool-registry.service.ts`, `ai-tools.service.ts`, `ai.service.ts` | **Medium** |
| **Phase 51.2** | Multi-Step Execution & Rollback | `ai.service.ts`, `smart-planner.service.ts`, `worker.service.ts` | **High** |
| **Phase 51.3** | Client Voice Navigation Bridge | `AIAssistantExperience.tsx`, `page.tsx`, `api.ts` | **Low** |
| **Phase 51.4** | Automated Suite & Certification | `test/universal-capabilities.spec.ts`, `docs/phase-51/` | **Medium** |

---

## 4. Immediate Stop Condition

In strict accordance with the user instructions:
> **STOP CONDITION:** Complete the audit and present the findings before modifying source code. Wait for implementation authorization.

All baseline audit documents have been generated in `docs/phase-51/`. No source code modifications have been made. We await explicit user authorization before commencing Phase 51.1 implementation.

