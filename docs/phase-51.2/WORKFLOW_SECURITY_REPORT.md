# Phase 51.2 — Workflow Security Report

## 1. Security Threat Analysis & Mitigations

### 1.1 Cross-Tenant Workflow Access (IDOR)
- **Threat:** User B attempts to approve or execute a workflow created by User A.
- **Mitigation:** Queries mandate `where: { id: workflowId, userId }`. Unauthorized attempts throw `NotFoundException` (HTTP 404).

### 1.2 Tampering / Payload Modification
- **Threat:** User submits an approval token with altered parameters (e.g. changing task priority or injection).
- **Mitigation:** Approval requires verification of `stepPayloadHash`. A mismatch throws `ForbiddenException`.

### 1.3 Execution Replay Attacks
- **Threat:** Re-executing an already completed or running workflow.
- **Mitigation:** The orchestrator checks `action.status`. Workflows with status `COMPLETED` or `RUNNING` throw `BadRequestException`.

### 1.4 Code Injection via Parameter Piping
- **Threat:** LLM generates JavaScript expressions in piped references (e.g. `$(eval(...))`).
- **Mitigation:** The piping parser uses a strict regex `^\$([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.-]+)$` that only allows property path traversal. No `eval`, `Function`, or expression parsing is permitted.

### 1.5 High-Risk Operation Concealment
- **Threat:** A high-risk destructive action is hidden inside a multi-step plan.
- **Mitigation:** The risk analyzer scans all steps in the DAG. If any step is `HIGH`, the entire workflow is marked `overallRisk = HIGH` and mandates explicit approval.

