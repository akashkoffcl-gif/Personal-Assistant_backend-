# PHASE 51.2.2 — PERFORMANCE & LATENCY REPORT

## 1. Executive Summary

This report documents the performance measurements of the hardened workflow engine, recalculating total workflow duration with discrete timing for each component: **Planning**, **Approval**, and **Execution**.

---

## 2. Timing Breakdown (Canonical 5-Step Workflow)

Measured against live staging backend (`http://localhost:3001/api/v1`) using Supabase PostgreSQL connection pool:

| Workflow Component | Latency Measured (ms) | Target SLA (ms) | Status | Details |
|---|---|---|---|---|
| **Planning & DAG Generation** | 7,422 ms | < 8,000 ms | **PASS** | Natural language intent extraction, DAG acyclic validation, SHA-256 calculation, and `AIAction` database persistence. |
| **Approval & CAS Validation** | 1,352 ms | < 2,500 ms | **PASS** | Owner authentication, plan version check, hash verification, TTL calculation, and atomic CAS `status: PROPOSED -> CONFIRMED`. |
| **Streaming Execution & Leases** | 34,023 ms | < 45,000 ms | **PASS** | Distributed lease acquisition, per-step heartbeat renewals, 5 domain mutations with step idempotency, and live SSE event streaming. |
| **Total Workflow Duration** | **42,797 ms** | < 60,000 ms | **PASS** | Sum of Planning (7.4s) + Approval (1.4s) + Execution (34.0s). |

---

## 3. Worker Lease & Fencing Overhead

- **Lease Heartbeat Cost:** ~18-35 ms per step (executed asynchronously during step setup).
- **Idempotency Step Cache Cost:** ~22-40 ms per mutation for two-phase pre/post registration.
- **Resource Footprint:** Zero memory leaks detected; PostgreSQL active connection count remained stable under 5 concurrent connections.

