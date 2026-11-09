# PHASE 51.8: RELEASE RUNBOOK (STAGING ENVIRONMENT)

## 1. Scope & Preconditions
- **Environment:** Staging / Local Sandbox
- **Host:** Windows 10/11, Node.js v24.x, PostgreSQL (Supabase pooler), Redis
- **Security Policy:** Production release strictly prohibited without authorization.

## 2. Environment Configuration
Verify environment variables in `.env` and `apps/api/.env`:
```env
PORT=3001
NODE_ENV=staging
DISABLE_WORKER="true"
ALLOW_LOCAL_LOCK="true"
DATABASE_URL="postgresql://...pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5&pool_timeout=15"
REDIS_URL="redis://localhost:6379"
```

## 3. Launch Procedure

### 3.1 Build Backend & Frontend
```powershell
# Build API
npm --prefix apps/api run build

# Build Web Frontend
npm --prefix apps/web run build
```

### 3.2 Launch Backend API Server
```powershell
$env:DISABLE_WORKER="true"
$env:ALLOW_LOCAL_LOCK="true"
$env:NODE_OPTIONS="--dns-result-order=ipv4first"
node apps/api/dist/src/main.js
```

### 3.3 Launch Web Client
```powershell
npm --prefix apps/web run start
```

## 4. Verification Checkpoints
1. Health check: `GET http://localhost:3001/api/v1/health` -> HTTP 200 `{ status: "OK", services: { database: "HEALTHY", redis: "HEALTHY" } }`.
2. Tool registry: `GET http://localhost:3001/api/v1/ai/tools` -> HTTP 200 with 52 registered tools.
3. Automated test verification:
   ```powershell
   npm --prefix apps/api test test/multi-step-workflow.spec.ts
   node scripts/test-security-audit.js
   ```

## 5. Rollback Procedure
If anomalies occur:
1. Terminate API process: `Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force`
2. Revert to Phase 51.7 commit baseline.
3. Re-run test suites to confirm rollback stability.

