# Phase 48.1.1 — NestJS Port Conflict Root Cause Report

**Phase:** Phase 48.1.1 — NestJS Port Conflict & Process Lifecycle Repair  
**Date:** 2026-11-06  
**Auditor:** Antigravity  
**Target:** Port 3001 (`EADDRINUSE: address already in use :::3001` in `apps/api/src/main.ts`)

---

## 1. Executive Summary & Root Cause Isolation

The error `EADDRINUSE: address already in use :::3001` was systematically investigated.

### Root Cause
1. **Unchecked Startup in `main.ts`**:
   - `apps/api/src/main.ts` previously invoked `NestFactory.create(AppModule)` and initialized internal modules, database drivers, and BullMQ worker listeners *before* testing if TCP port 3001 was free to bind.
   - When a previous Node instance remained running in the background (or during rapid restart cycles while an OS socket was lingering), `await app.listen(port)` failed at the very end of bootstrap with `listen EADDRINUSE: address already in use :::3001`.
2. **Missing Dual-Stack Pre-Flight Check**:
   - Node on Windows listens on dual-stack IPv6 (`:::3001`) by default when no specific host is provided. Standard single-interface socket checks on `0.0.0.0` could fail to detect an existing listener bound to `::`.
3. **Background Process Concurrency**:
   - A previously orphaned NestJS process (PID 28956) was actively listening on `::3001`. When another terminal or runner initiated `node apps/api/dist/src/main.js`, it immediately crashed with `EADDRINUSE`.

---

## 2. Process Ownership Audit

| Process ID (PID) | Process Name | Path | Command Line | Role |
| :--- | :--- | :--- | :--- | :--- |
| **28956** | `node.exe` | `C:\Program Files\nodejs\node.exe` | `node apps/api/dist/src/main.js` | **Authoritative NestJS Backend (Port 3001)** |
| **24672** | `node.exe` | `C:\Program Files\nodejs\node.exe` | `next/dist/server/lib/start-server.js` | **Next.js PWA Frontend (Port 3000)** |
| **20344** | `node.exe` | `C:\Program Files\nodejs\node.exe` | `ts-node-dev src/worker/worker.main.ts` | **Standalone BullMQ Background Worker** |

**Crucial Finding**:
- The standalone BullMQ worker (`src/worker/worker.main.ts`) uses `NestFactory.createApplicationContext(WorkerModule)`. It does **not** create an HTTP server or bind to port 3001.
- Port 3001 is exclusively claimed and owned by the NestJS HTTP backend (`src/main.ts`).

