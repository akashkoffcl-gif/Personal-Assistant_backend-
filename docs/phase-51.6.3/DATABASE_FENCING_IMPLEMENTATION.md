# Database-Boundary Worker Fencing Implementation Report

## 1. Monotonic Fencing Version Architecture
Worker fencing prevents stale workers from committing database writes when a newer worker has taken over ownership of the workflow.

### Protocol:
1. **Initial Lease Acquisition:**
   - When a workflow transitions from `CONFIRMED` to `RUNNING`, the lease is stamped with `fencingVersion: 1`.
2. **Atomic Recovery Increment:**
   - In `WorkflowOrchestratorService.claimWorkflowRecovery()`, the recovery CAS atomically increments the fencing version:
     ```typescript
     const previousFencingVersion = plan.lease?.fencingVersion || 1;
     const newFencingVersion = previousFencingVersion + 1;
     plan.lease.fencingVersion = newFencingVersion;
     ```
3. **Database-Boundary Verification in `JarvisToolRegistryService`:**
   - Every protected tool invocation passes `{ workflowId, fencingVersion }`.
   - Before executing the mutation, the registry inspects the authoritative database record:
     ```typescript
     if (workflowId && fencingVersion !== undefined && this.prisma.isConnected) {
       const activeWf = await this.prisma.aIAction.findUnique({
         where: { id: workflowId },
         select: { payload: true, status: true },
       });
       const activeLease = (activeWf?.payload as any)?.lease;
       if (activeLease && activeLease.fencingVersion !== undefined && activeLease.fencingVersion > fencingVersion) {
         throw new ForbiddenException(`Stale worker fencing version ${fencingVersion}. Active workflow fencing version is ${activeLease.fencingVersion}. Mutation rejected.`);
       }
     }
     ```

## 2. External Provider Limitations
For third-party external side-effects (e.g. sending SMS, web push notifications, external payment processing):
- External APIs do not share PostgreSQL database transaction boundaries.
- To maintain consistency, external actions use an outbox table in PostgreSQL. The outbox row is committed inside the protected transaction boundary with the active `fencingVersion`. The background dispatcher processes only committed outbox rows.

