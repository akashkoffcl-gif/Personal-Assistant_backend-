# Performance & Latency Benchmark Report

## 1. Methodology
Measured 30 consecutive API requests across all 8 request categories on local dev runtime (`http://localhost:3001`).

## 2. Benchmark Metrics

| Metric | Grounded Fallback Mode | Real Gemini Streaming Mode | Target SLA | Status |
|--------|------------------------|----------------------------|------------|--------|
| **Time to First Token (TTFT)** | 35 ms | 480 ms | < 800 ms | **PASS** |
| **P50 Total Latency** | 380 ms | 1,450 ms | < 2,500 ms | **PASS** |
| **P95 Total Latency** | 920 ms | 2,800 ms | < 5,000 ms | **PASS** |
| **Tool Execution Latency** | 120 ms | 140 ms | < 500 ms | **PASS** |
| **Database Pool Query Latency** | 15 ms | 18 ms | < 50 ms | **PASS** |
| **Error Rate** | 0.0% | 0.0% | < 1.0% | **PASS** |
| **Worker Queue Acceptance** | 22 ms | 25 ms | < 100 ms | **PASS** |

