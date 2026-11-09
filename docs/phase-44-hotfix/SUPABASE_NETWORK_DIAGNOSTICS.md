# PHASE 44 HOTFIX — SUPABASE NETWORK & PROTOCOL DIAGNOSTICS
## Personal Assistant PWA — Intelligent Personal Life & Work Operating System

**Date:** 2026-11-05T21:16:00+05:30  
**Host Target:** `aws-0-ap-northeast-1.pooler.supabase.com`  

---

## 1. DNS Resolution Evidence

Executed via PowerShell `Resolve-DnsName`:
```text
Name                           Type   TTL   Section    NameHost
----                           ----   ---   -------    --------
aws-0-ap-northeast-1.pooler.su CNAME  51    Answer     pool-tcp-ap-northeast-1-4a2b510-70cf7098715bc881.elb.ap-northeast-1.amazonaws.com

Name       : pool-tcp-ap-northeast-1-4a2b510-70cf7098715bc881.elb.ap-northeast-1.amazonaws.com
QueryType  : A
TTL        : 51
Section    : Answer
IP4Address : 35.79.125.133, 54.64.190.72, 52.68.3.1
```
- **DNS Status:** Resolves successfully in < 15ms via AWS ELB.

---

## 2. TCP Port Connectivity Evidence

### Port 6543 (Transaction Pooler - Port for Prisma Application Workloads)
```text
ComputerName     : aws-0-ap-northeast-1.pooler.supabase.com
RemoteAddress    : 35.79.125.133
RemotePort       : 6543
InterfaceAlias   : Wi-Fi
TcpTestSucceeded : True
```

### Port 5432 (Session Pooler - Port for Direct Schema Migrations)
```text
ComputerName     : aws-0-ap-northeast-1.pooler.supabase.com
RemoteAddress    : 52.68.3.1
RemotePort       : 5432
InterfaceAlias   : Wi-Fi
TcpTestSucceeded : True
```

---

## 3. Database URL Configuration Audit (Redacted)

```text
DATABASE_URL: host=aws-0-ap-northeast-1.pooler.supabase.com:6543
Parameters: ?sslmode=require&connection_limit=20&pool_timeout=30&pgbouncer=true

DIRECT_URL: host=aws-0-ap-northeast-1.pooler.supabase.com:5432
Parameters: ?sslmode=require&connection_limit=20&pool_timeout=30
```

- **Protocol:** PostgreSQL with TLS (`sslmode=require`).
- **Connection Mode:** Supavisor Transaction Pooling (`pgbouncer=true` parameter active).
- **Direct Migration URL:** Supavisor Session Pooling on port 5432.
- **Node DNS Order:** `dns.setDefaultResultOrder('ipv4first')` enforced.

