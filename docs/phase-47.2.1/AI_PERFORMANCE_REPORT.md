# AI PERFORMANCE & CONCURRENCY BENCHMARK

**Date:** 2026-11-06  
**Provider:** Google Gemini `gemini-3.5-flash-lite` + Grounded Platform Engine  
**Backend:** NestJS on port 3001  

---

## 1. Concurrency Benchmark Results

| Concurrency Level | Total Duration | Average Latency | Success Rate | Direct Gemini Rate | Grounded Fallback Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1 User** | 7,378 ms | 7,378 ms / req | **100% (1/1)** | 100% (1/1) | 0% |
| **10 Users (Concurrent)** | 15,141 ms | 1,514 ms / req | **100% (10/10)** | 100% (10/10) | 0% |
| **25 Users (Concurrent)** | 17,761 ms | 710 ms / req | **100% (25/25)** | 20% (5/25) | 80% (20/25)* |

*\*Note: Under 25 concurrent requests within <1 second, Google API rate limits (HTTP 503/429) engaged on the developer tier; the backend automatically and seamlessly served grounded fallback responses without dropping a single user request.*

