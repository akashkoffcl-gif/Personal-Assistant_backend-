# Phase 51.5 Baseline Audit: Repository Structure, Architecture & Defect Inventory

**Application:** Nova Personal Assistant PWA  
**Backend:** NestJS Modular Monolith (`http://localhost:3001/api/v1`)  
**Frontend:** Next.js 14 App Router PWA (`http://localhost:3000`)  
**Environment:** Local Staging Only (Single-Worker Mode: `DISABLE_WORKER="true"`)  
**Execution Date:** 2026-11-06  
**Auditor:** Google Antigravity (Principal Systems & Reliability Architect)

---

## 1. Actual Repository Structure & Verification

```
D:\PT
├── apps/
│   ├── api/                   # NestJS 10 backend modular monolith
│   │   ├── prisma/            # schema.prisma (Supabase PostgreSQL pooler)
│   │   ├── src/
│   │   │   ├── common/        # redis.service.ts, filters, decorators, guards
│   │   │   ├── modules/       # Domain modules: tasks, calendar, routines, projects,
│   │   │   │                  # knowledge, focus, finance, wellness, analytics, goals,
│   │   │   │                  # emergency, notifications, settings, and ai
│   │   │   │   └── ai/        # AI orchestration, tool registry, and multi-step workflow engine
│   │   │   │       ├── ai.controller.ts
│   │   │   │       ├── ai.service.ts
│   │   │   │       ├── jarvis-tool-registry.service.ts  (52 registered domain tools)
│   │   │   │       └── workflow/
│   │   │   │           ├── workflow-graph.types.ts       (WorkflowStateMachine)
│   │   │   │           ├── workflow-planner.service.ts   (DAG decomposition & hash calculation)
│   │   │   │           └── workflow-orchestrator.service.ts (Execution, leases, compensation)
│   │   │   └── worker/        # Background queue worker (BullMQ & Outbox reconciliation)
│   │   └── test/              # Unit & integration test suites (multi-step-workflow.spec.ts)
│   └── web/                   # Next.js 14 PWA frontend
│       └── src/
│           ├── app/           # App router tab routes
│           ├── components/    # Workspace UI components, Avatar, Voice UI
│           └── hooks/         # useVoiceInteraction.ts, useWorkflowStream.ts
├── docs/                      # Engineering audits and phase acceptance reports
│   ├── phase-51.4/            # Complete Phase 51.4 validation reports (12 docs)
│   └── phase-51.5/            # Target Phase 51.5 deliverables
└── scripts/                   # Verification and test harnesses
    ├── test-universal-capabilities.js   (52 tools verified)
    ├── test-workspace-coverage.js       (22 workspaces verified)
    └── test-cancellation-security.js   (Cancellation, tampering, and tenant isolation)
```

---

## 2. Existing Execution Flow

Nova processes autonomous operations along a strictly defined architectural pipeline:
1. **User Utterance / Prompt:** Received via text or Web Speech API (`useVoiceInteraction.ts`).
2. **Intent Classification & Anaphora:** `AIService` matches intent to registered capabilities or tab routing (`clientAction: 'NAVIGATE_TAB'`).
3. **DAG Workflow Planning:** Complex multi-step instructions are routed to `WorkflowPlannerService.generatePlan()`, constructing an acyclic dependency graph (DAG) with SHA-256 payload canonical hashing.
4. **Server-Side Approval:** High-risk actions or multi-step proposals require an explicit approval call (`POST /ai/workflows/:id/approve` or `POST /ai/actions/:id/execute`), cryptographically verifying that the hash matches the un-tampered plan and the authenticated `userId`.
5. **Execution & Leases:** `WorkflowOrchestratorService` executes topological steps, enforces atomic worker lease heartbeats, pipes outputs across dependent step inputs, and invokes domain services through `JarvisToolRegistryService`.
6. **Saga Rollback:** If an intermediate step fails, compensation steps (`abort_focus_session`, `archive_project`, etc.) execute in reverse order.
7. **Read-After-Write Verification & UI Feedback:** Database state is updated, SSE events stream to the browser, and TTS synthesizes execution outcomes.

---

## 3. Confirmed Phase 51.4 Baseline Audit & Identified Gaps

Empirical re-testing against the live staging API server confirms the Phase 51.4 baseline:
- Universal Tool Registry: **52 / 52 tools PASS (100%)**.
- Workspace Navigation: **22 / 22 workspaces PASS (100%)**.
- Operational Workspace Endpoints: **22 / 22 endpoints PASS (100%)**.
- Workflow Engine Tests: **23 / 23 Jest tests PASS (100%)**.
- Cancellation & Security Suite: **7 / 7 checks PASS (100%)**.

### Confirmed Architectural Defects & Gaps to Remediate in Phase 51.5

| Issue Code | Priority | Description | Root Cause |
| :---: | :---: | :--- | :--- |
| **DEF-515-01** | **P0** | **Unconditional Cancellation Overwrite:** `cancelWorkflow` in `WorkflowOrchestratorService` validates status with `isTerminal` in memory, then issues an unconditional `prisma.aIAction.update`. | Lack of an atomic compare-and-set (CAS) update: if a workflow reaches `COMPLETED` concurrently between the check and the update, the terminal completion is silently overwritten with `CANCELLED`. |
| **DEF-515-02** | **P0** | **Recovery Idempotency Boundary Gap:** A worker crash occurring *after* a domain mutation succeeds but *before* step execution status is persisted can cause duplicate mutations upon recovery. | Step mutation and step result persistence are executed as separate, non-atomic calls without durable logical idempotency keys passed to the domain service. |
| **DEF-515-03** | **P1** | **Silent Redis Distributed Lock Fallback:** `RedisService.acquireLock` falls back to an in-process `memoryCache` `Map` when Redis is disconnected. | Process-local memory maps do not coordinate across multiple workers or processes. A disconnected Redis must fail closed on distributed coordination locks. |
| **DEF-515-04** | **P1** | **External Calendar Provider Verification:** `sync_calendar_external` produces simulated internal responses without verifying real external OAuth provider state. | Third-party calendar provider credentials and webhooks are not verified against real upstream APIs. |
| **DEF-515-05** | **P1** | **Memory Provenance & Verification Controls:** User preferences are stored without explicit confidence levels, source timestamps, or full granular user correction controls. | `AIMemoryService` lacks fine-grained provenance tracking and explicit category classification. |
| **DEF-515-06** | **P1** | **Performance Latency Dataset Ambiguity:** The latency documentation contains slight variations between preliminary runs and final benchmarks. | Needs a single canonical benchmark dataset with defined sample size ($N \ge 100$), percentile methodology, and concurrent workload breakdown. |

---

## 4. Workstream Implementation Strategy & Risk Mitigation

1. **Workstream A (Race-Safe Workflow Cancellation):**
   - Replace `aIAction.update` with an atomic conditional transaction:
     ```typescript
     await this.prisma.aIAction.updateMany({
       where: { id: workflowId, userId, status: { in: ['DRAFT', 'PROPOSED', 'CONFIRMED', 'RUNNING'] } },
       data: { status: 'CANCELLED', ... }
     });
     ```
   - Assert `count === 1`. If `count === 0`, throw `ConflictException` (cannot cancel a completed or already cancelled workflow).
2. **Workstream B (Durable Workflow Recovery & Idempotency):**
   - Introduce a stable idempotency key (`${workflowId}:${stepId}:${version}`) passed into domain execution.
   - Guard against duplicate step execution by asserting prior completed mutations in the outbox or step log.
3. **Workstream C (Redis Failure Boundaries):**
   - Split `RedisService` into two explicit capabilities:
     - `cache`: non-critical fallback to `memoryCache`.
     - `coordination` (`acquireLock`, `lease`): strict fail-closed policy when Redis is disconnected (`throw new ServiceUnavailableException('Distributed coordination unavailable')`).
4. **Workstream D through H:**
   - Execute in strict priority order, preserving all existing domain services and single-worker constraints.

