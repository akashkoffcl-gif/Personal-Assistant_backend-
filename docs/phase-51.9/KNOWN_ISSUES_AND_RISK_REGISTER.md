# PHASE 51.9: KNOWN ISSUES AND RISK REGISTER

## 1. Risk Register

| Risk ID | Domain | Description | Severity | Impact | Mitigation / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RISK-01** | Infrastructure | Remote pooler WAN latency during sequential interactive transactions | Medium | P95 write latency reaches 6.5s - 18s | Co-locate compute and database in same AWS VPC in production; consolidate row-lock queries into CTEs. |
| **RISK-02** | Concurrency | Running multiple worker nodes with local memory lock enabled | High | Potential duplicate task execution if multiple workers share local lock | `ALLOW_LOCAL_LOCK` strictly barred in multi-worker production. Enforce Redis Redlock. |
| **RISK-03** | Auth | Accidental deployment of non-production `NODE_ENV` | Critical | Could expose `x-user-id` header bypass in live environment | CI/CD pipeline enforces `NODE_ENV=production` check before artifact release. |
| **RISK-04** | AI Quota | External Gemini API rate limits on burst multi-step planning | Low | 429 response on rapid consecutive workflow plans | Built-in fallback heuristics and exponential backoff retry. |

## 2. Technical Debt Register
1. **Consolidated Lock CTE:** Replace the dual-query row locks (`SELECT ... FOR UPDATE` on workflow followed by `SELECT ... FOR UPDATE` on claim) with a single compound CTE to save one network roundtrip per mutation.
2. **Automated Audit Logging:** Expand outbox event dispatcher to capture transactional rollback metadata in an immutable audit table.

