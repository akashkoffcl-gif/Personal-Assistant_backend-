# Multi-Worker Coordination Report

**Phase:** 53.4  
**Target:** Verify distributed coordination across multiple background workers evaluating proactive opportunities.

---

## 1. Concurrency Control Mechanisms

To prevent multiple API instances or BullMQ workers from evaluating or dispatching duplicate proactive opportunities simultaneously:
1. **Redis Atomic Key Claims:**
   - Evaluated opportunities acquire a temporary Redis claim (`SET NX EX 30`) prior to dispatch.
2. **Deterministic Opportunity Keys:**
   - Opportunity IDs are deterministically derived from entity attributes:
     - `milestone-${projectId}-${taskId}`
     - `overdue-${taskId}`
     - `morning-focus-protection-${dateStr}`
     - `blocker-${blockerKey}`

## 2. Evidence of Coordination

- **Simultaneous Worker Evaluation:** When two worker processes evaluate user context at the same second, the first worker sets the Redis suppression key; the second worker reads `isSuppressed === true` and silences duplicate notification generation.
- **Fail-Closed Protection:** In the event of network partition or Redis failure, distributed locks fail closed without throwing unhandled exceptions.

