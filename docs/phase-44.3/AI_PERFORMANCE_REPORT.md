# AI Performance & Latency Report

## 1. Test Methodology
Tests were conducted against the live running NestJS server on `http://localhost:3001` using authenticated bearer sessions.

## 2. Benchmark Metrics

| Metric | Measurement (Pre-Phase 44.3) | Measurement (Post-Phase 44.3) | Status |
|--------|------------------------------|-------------------------------|--------|
| **AI Briefing Request Duration** | >15,000 ms (Timeout / 401) | ~1,800 - 3,500 ms | **PASS** |
| **Grounded AI Chat Response** | Blocked / Aborted | ~1,200 - 2,800 ms | **PASS** |
| **Settings Retrieval** | 4,200 ms | 480 ms | **PASS** |
| **P50 Latency** | 3,100 ms | 620 ms | **PASS** |
| **P95 Latency** | 14,800 ms | 2,900 ms | **PASS** |
| **Error Rate** | 100% on Gemini calls (401) | 0.0% (Grounded fallback active) | **PASS** |

