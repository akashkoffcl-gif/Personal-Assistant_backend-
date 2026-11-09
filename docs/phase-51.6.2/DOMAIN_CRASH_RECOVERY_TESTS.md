# Domain Crash Recovery Tests & Database Evidence

## 1. Overview
The mandatory crash test simulates worker termination after domain mutation commitment but before workflow plan persistence. When recovery claims the step, it executes the identical operation with the same logical idempotency key (`step-idem-${workflowId}-${step.id}`).

## 2. Test Execution Harness
Harness script: `scripts/test-domain-idempotency-crash.js`

### Tested Mutations:
1. `create_project`
2. `create_task`
3. `create_routine`
4. `create_knowledge_note`
5. `create_transaction_entry`

## 3. Verifiable Execution Evidence
Target API: `http://localhost:3001/api/v1`  
User ID: `00000000-0000-0000-0000-000000000001`

```text
[Test 1/5] Mutation: create_project
Idempotency Key: wf-crash-step-create_project-1793965923646
  Initial Execution Committed: Entity ID = 57363b92-8f4e-47eb-b0cf-fd46519131c1
  Simulating worker crash and recovery replay with same idempotency key...
  Recovery Execution Returned: Entity ID = 57363b92-8f4e-47eb-b0cf-fd46519131c1 (CachedFromIdem: true)
  Direct PostgreSQL Query Count: 1 record(s) matching title/description.
  Assertion: Entity ID preserved across crash replay? YES
  Assertion: Exactly 1 record created in PostgreSQL? YES
  Assertion: Persisted DB ID matches returned ID? YES
  Testing concurrent race with identical idempotency key...
  Assertion: Concurrent requests with identical key safe (Count = 1)? YES

[Test 2/5] Mutation: create_task
Idempotency Key: wf-crash-step-create_task-1793965932366
  Initial Execution Committed: Entity ID = 1c27b207-9495-41df-9d41-874a12ac85ba
  Simulating worker crash and recovery replay with same idempotency key...
  Recovery Execution Returned: Entity ID = 1c27b207-9495-41df-9d41-874a12ac85ba (CachedFromIdem: true)
  Direct PostgreSQL Query Count: 1 record(s) matching title/description.
  Assertion: Entity ID preserved across crash replay? YES
  Assertion: Exactly 1 record created in PostgreSQL? YES
  Assertion: Persisted DB ID matches returned ID? YES
  Testing concurrent race with identical idempotency key...
  Assertion: Concurrent requests with identical key safe (Count = 1)? YES

[Test 3/5] Mutation: create_routine
Idempotency Key: wf-crash-step-create_routine-1793965944792
  Initial Execution Committed: Entity ID = 14e0a07e-22f1-4fe2-b5f8-ed8a9d95de8b
  Simulating worker crash and recovery replay with same idempotency key...
  Recovery Execution Returned: Entity ID = 14e0a07e-22f1-4fe2-b5f8-ed8a9d95de8b (CachedFromIdem: true)
  Direct PostgreSQL Query Count: 1 record(s) matching title/description.
  Assertion: Entity ID preserved across crash replay? YES
  Assertion: Exactly 1 record created in PostgreSQL? YES
  Assertion: Persisted DB ID matches returned ID? YES
  Testing concurrent race with identical idempotency key...
  Assertion: Concurrent requests with identical key safe (Count = 1)? YES

[Test 4/5] Mutation: create_knowledge_note
Idempotency Key: wf-crash-step-create_knowledge_note-1793965953132
  Initial Execution Committed: Entity ID = 4c867bef-2009-4b19-a33c-c4424d7a1bae
  Simulating worker crash and recovery replay with same idempotency key...
  Recovery Execution Returned: Entity ID = 4c867bef-2009-4b19-a33c-c4424d7a1bae (CachedFromIdem: true)
  Direct PostgreSQL Query Count: 1 record(s) matching title/description.
  Assertion: Entity ID preserved across crash replay? YES
  Assertion: Exactly 1 record created in PostgreSQL? YES
  Assertion: Persisted DB ID matches returned ID? YES
  Testing concurrent race with identical idempotency key...
  Assertion: Concurrent requests with identical key safe (Count = 1)? YES

[Test 5/5] Mutation: create_transaction_entry
Idempotency Key: wf-crash-step-create_transaction_entry-1793965966477
  Initial Execution Committed: Entity ID = 8a6af1d7-e6f2-40cc-bec1-e1d514d6bfc0
  Simulating worker crash and recovery replay with same idempotency key...
  Recovery Execution Returned: Entity ID = 8a6af1d7-e6f2-40cc-bec1-e1d514d6bfc0 (CachedFromIdem: true)
  Direct PostgreSQL Query Count: 1 record(s) matching title/description.
  Assertion: Entity ID preserved across crash replay? YES
  Assertion: Exactly 1 record created in PostgreSQL? YES
  Assertion: Persisted DB ID matches returned ID? YES
  Testing concurrent race with identical idempotency key...
  Assertion: Concurrent requests with identical key safe (Count = 1)? YES
```

## 4. Verification Summary
- **Total Mutations Tested:** 5 / 5
- **Entity ID Preserved:** 100%
- **PostgreSQL Duplicate Prevention:** 100% (Exactly 1 row created in DB for each mutation)
- **Concurrent Request Safety:** 100%
- **Result:** PASSED

