# Phase 51.6.2 Baseline Audit & Verification Strategy

## 1. System Context & Environment
- **Application:** Nova Personal Assistant PWA
- **Repository:** `D:\PT`
- **Environment:** Local development & staging (`http://localhost:3001/api/v1`)
- **Mode:** Single-worker mode (`DISABLE_WORKER="true"`, `ALLOW_LOCAL_LOCK="true"`)
- **Authoritative Database:** Supabase PostgreSQL (`aIAction`, `task`, `project`, `routine`, `knowledgeNote`, `financeTransaction`)
- **Coordination Layer:** Redis with resilient local memory fallback
- **Production Deployment:** STRICTLY PROHIBITED

## 2. Evidence Gaps Targeted
Phase 51.6.1 achieved significant milestones across tool registration, CAS state transitions, and recovery leasing. However, independent certification review flagged three critical evidence gaps requiring direct database verification:
1. **P0-A Domain Mutation Atomicity & Crash Recovery:**
   - Prior idempotency keys were tracked inside workflow JSON payloads, but did not guarantee durable idempotency at the domain mutation boundary if a worker crashed before updating the workflow status.
   - Requirement: Transactionally couple mutation results with durable idempotency records in PostgreSQL. Execute crash-recovery simulations where a worker dies after domain write, and assert that replay returns the exact entity with zero duplicate rows created.
2. **P0-B State-Transition Concurrency:**
   - Multi-path state transitions required deterministic database-level proof covering simultaneous race conditions (Cancellation vs Completion, Cancellation vs Failure, Cancellation vs Compensation, Completion vs Failure, 2x simultaneous Completion, 2x simultaneous Compensation).
3. **P0-C Worker Fencing at Mutation Boundary:**
   - Race condition: Worker A validates lease, pauses, Worker B claims expired lease via recovery CAS, Worker A resumes and attempts mutation. Worker A must be strictly fenced (HTTP 403 / aborted write) at the mutation boundary.

## 3. Baseline Audit Findings
- `JarvisToolRegistryService` registers 52 capabilities across 22 workspaces.
- In `WorkflowOrchestratorService`, step idempotency keys were structured as `step-idem-${workflowId}-${step.id}`.
- By augmenting `JarvisToolRegistryService.executeTool` to query and persist `AIAction` records keyed by `stepIdempotencyKey`, domain operations become durably idempotent even in the event of premature worker termination.
- Lease verification prior to mutation and during step resumption ensures stale workers cannot commit mutations once another worker claims the lease.

