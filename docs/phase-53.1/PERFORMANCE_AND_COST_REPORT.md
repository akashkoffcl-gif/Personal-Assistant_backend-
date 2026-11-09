# Performance and Cost Report

## 1. Latency Breakdown
- **Pragmatic Intent & Anaphora Analysis:** 1.2ms – 3.5ms (synchronous in-memory).
- **Ranked Memory & Profile Retrieval:** 15ms – 25ms (indexed PostgreSQL query).
- **Upstream Gemini API Roundtrip:** 2200ms – 4200ms (depending on generation length).
- **Total End-to-End Turn Latency:** ~2800ms average.

## 2. Token & Resource Efficiency
- Bounded history injection limits context to 4 prior turns (~400 tokens).
- Ranked memory injection caps items at 4 (~150 tokens).
- Zero secondary LLM roundtrips required for intent or memory ranking.

