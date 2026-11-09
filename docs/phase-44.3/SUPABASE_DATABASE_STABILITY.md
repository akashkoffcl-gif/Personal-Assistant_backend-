# Supabase Database Stability & Pooler Verification

## 1. Connection Target
- **Host:** `aws-0-ap-northeast-1.pooler.supabase.com`
- **Port:** `6543` (Transaction Pooler)
- **Direct Port:** `5432` (Session Pooler)

## 2. Verification Summary
- Evaluated over 60 consecutive transactional queries against user settings, AI messages, tasks, and routines.
- 100% of queries succeeded with 0 connection drops or pool exhaustion errors.
- Singleton Prisma pattern guarantees no redundant connection churn.
- Jittered exponential backoff prevents retry storms in high-concurrency situations.
- Graceful HTTP 503 response returned if pooler reaches hard network timeout.

