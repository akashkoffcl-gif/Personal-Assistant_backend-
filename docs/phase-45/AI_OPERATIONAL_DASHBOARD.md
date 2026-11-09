# AI Operational Dashboard & Command Center

## 1. Dashboard Architecture & Endpoint
- **Endpoint:** `GET /api/v1/ai/operational-metrics`
- **Controller:** Protected by `SupabaseAuthGuard` for administrative / authenticated user access.
- **Data Exposed:**
  - `providerStatus`: Current model, status enum (`INVALID_CREDENTIAL`, `CONNECTED`, etc.), and detailed status message.
  - `telemetry`:
    - `totalRequests`: Cumulative request count.
    - `successfulRequests` & `failedRequests`.
    - `groundedFallbackCount` vs `directGeminiCount`.
    - `p50LatencyMs` & `p95LatencyMs` (rolling window of recent requests).
    - `databaseQueryLatencyMs`: Active live roundtrip latency to PostgreSQL pooler.
    - `lastRequestAt`: Timestamp of the most recent invocation.
  - `workerQueue`:
    - `queueName`: `ai-workflows-queue`.
    - `status`: Verified `CONNECTED` to Redis.

## 2. Privacy & Security Safeguards
- Zero secrets, raw user messages, or sensitive Bearer tokens are exposed in the telemetry payload.

