# Atomic Idempotency Architecture & Design

## 1. The Race Condition
When two distributed workers or rapid user clicks submit the same logical operation simultaneously:
```text
Worker 1: Query idempotency key -> null -> executeTool() -> create row -> save key
Worker 2: Query idempotency key -> null -> executeTool() -> create row -> save key
Result: 2 duplicate rows created in database.
```

## 2. The Atomic Claim Solution
To eliminate time-of-check to time-of-use (TOCTOU) races:
```mermaid
sequenceDiagram
    participant W1 as Worker 1 (First)
    participant W2 as Worker 2 (Concurrent)
    participant DB as PostgreSQL (ai_actions)
    participant Domain as Domain Service

    W1->>DB: INSERT AIAction (status: PENDING, key: step-idem-1)
    DB-->>W1: 201 Created (Claim Won)
    
    W2->>DB: INSERT AIAction (status: PENDING, key: step-idem-1)
    DB-->>W2: Error P2002 Unique Constraint Violation (Claim Lost)
    
    Note over W2: W2 detects P2002 conflict<br/>Enters polling loop on winner's key

    W1->>Domain: Execute tool mutation (e.g. create_project)
    Domain-->>W1: Entity created (id: proj-123)
    
    W1->>DB: UPDATE AIAction SET status = EXECUTED, payload = { result: proj-123 }
    
    W2->>DB: findUnique(key: step-idem-1)
    DB-->>W2: status: EXECUTED, payload: { result: proj-123 }
    
    Note over W2: W2 returns cached proj-123<br/>Zero duplicate domain mutations committed
```

## 3. Database Failure & Rollback Guarantees
- **Fail-Closed on DB Disconnect:** If PostgreSQL is unreachable when an idempotency key is required, the mutation is immediately rejected with an error rather than silently executed without idempotency protection.
- **Atomic Failure Cleanup:** If the tool execution throws an error, the `PENDING` claim row is deleted immediately (`deleteMany({ where: { idempotencyKey, status: 'PENDING' } })`), ensuring subsequent retries or recoveries are not permanently blocked.
- **Tenant Isolation:** If an existing key belongs to another `userId`, the request is rejected with `403 Forbidden`.

