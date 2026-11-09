# Security and Privacy Review

## 1. Multi-Tenant Memory Isolation
Every query in `AIMemoryService` and `BehaviouralContextService` binds explicitly to the authenticated `userId` extracted from JWT headers (`x-user-id`). No memory or conversation data can be cross-pollinated across users.

## 2. Action Authorization Gating
- High-risk operations still require user confirmation before database mutation.
- Model proposals cannot execute without valid worker claims and fencing tokens.
- Malicious prompts attempting database deletions (e.g., Scenario #17) are trapped by the policy router and denied execution.

