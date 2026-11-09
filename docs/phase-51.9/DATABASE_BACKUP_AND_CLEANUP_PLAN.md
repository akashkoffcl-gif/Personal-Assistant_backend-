# PHASE 51.9: DATABASE BACKUP AND CLEANUP PLAN

## 1. Database Identification & Target Environment
- **Active Environment:** Local Staging / Developer Sandbox
- **Host:** AWS ap-northeast-1 Supabase Pooler (`aws-0-ap-northeast-1.pooler.supabase.com:5432`)
- **Database Engine:** PostgreSQL 15.x (Supabase Cloud Managed)
- **Database Name:** `postgres`
- **Schema Name:** `public`
- **Classification:** Staging Database with automated test artifacts.
- **Safety Status:** **NOT PRODUCTION**

## 2. Table Dependency & Foreign-Key Hierarchy
The application schema exhibits the following dependency tree:
1. `User` (Root entity)
   ├── `UserSettings` (Dependent on `User.id`)
   ├── `Task` (Dependent on `User.id`, optional `Project.id`, optional `parentTaskId`)
   ├── `Project` (Dependent on `User.id`)
   ├── `Routine` (Dependent on `User.id`)
   │    └── `RoutineOccurrence` (Dependent on `Routine.id`)
   ├── `KnowledgeNote` (Dependent on `User.id`)
   ├── `FinanceAccount` (Dependent on `User.id`)
   │    └── `FinanceTransaction` (Dependent on `FinanceAccount.id`)
   ├── `FocusSession` (Dependent on `User.id`, optional `Task.id`)
   ├── `Goal` (Dependent on `User.id`)
   ├── `Reminder` (Dependent on `User.id`)
   └── `AIAction` (Idempotency and workflow leases, dependent on `User.id`)

## 3. Preservation Scope (STRICTLY PRESERVED)
Under the Phase 51.9 cleanup guidelines, the following objects must **NEVER** be deleted or dropped:
- `_prisma_migrations` table (Prisma migration history).
- PostgreSQL schema objects (tables, indexes, foreign keys, triggers).
- Required extensions (`uuid-ossp`, `pgcrypto`).
- System tables and Supabase auth configurations.
- Root demo user profiles (`00000000-0000-0000-0000-000000000001`).

## 4. Proposed Cleanup Scope (PENDING EXPLICIT USER AUTHORIZATION)
Upon receiving explicit user authorization, cleanup will target transient test records created during Phases 51.0–51.9:
- `Task` records matching test titles (`*Test*`, `*P51*`, `*Sprint*`).
- `Project` records matching test titles (`*Test*`, `*P51*`, `*Launch*`).
- `AIAction` records with actionType `DOMAIN_STEP_IDEMPOTENCY` and `WORKFLOW_EXECUTION`.
- `RoutineOccurrence` and test `FocusSession` records.

## 5. Explicit Authorization Gate
In strict compliance with Phase 51.9 instructions:
**Destructive database operations are HALTED.** The database inventory and cleanup preview are presented to the user. Deletion will NOT execute until explicit target-specific approval is received.

