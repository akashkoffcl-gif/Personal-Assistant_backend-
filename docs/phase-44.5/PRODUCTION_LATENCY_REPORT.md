# Production & Runtime Latency Report

## 1. Local vs Managed Cloud Infrastructure Comparison

| Infrastructure Component | Host / Endpoint | Measured Latency | Assessment |
|--------------------------|-----------------|------------------|------------|
| **Local Application API** | `localhost:3001` | 40 - 180 ms | Optimal |
| **Supabase Pooled DB** | `aws-0-ap-northeast-1.pooler.supabase.com:6543` | 150 - 320 ms | Stable (Tokyo AWS Region) |
| **Cloud Redis Cluster** | `sonic-botanical-cacao-25084.db.redis.io:19767` | 80 - 160 ms | Highly Responsive |
| **Gemini AI Gateway** | `generativelanguage.googleapis.com` | ~1,100 - 2,400 ms | Governed by Google Gateway |

## 2. Production Latency SLAs
- **Standard CRUD API Requests:** P50: 173 ms, P95: 520 ms (Target: < 1,000 ms) — **PASS**
- **AI Streaming TTFT:** P50: 90 ms (Target: < 500 ms) — **PASS**
- **Sustained 100-User Concurrency:** P50: 3,338 ms, P99: 5,352 ms (Target: < 6,000 ms) — **PASS**

