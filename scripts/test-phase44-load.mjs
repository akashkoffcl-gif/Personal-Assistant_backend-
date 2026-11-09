import http from 'http';

const API_BASE = 'http://127.0.0.1:3001/api/v1';
const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ';

async function measureSingle(endpoint) {
  const start = performance.now();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${DEMO_TOKEN}` }
  });
  const duration = performance.now() - start;
  return { status: res.status, ok: res.ok, duration };
}

async function runLoadTier(concurrency, totalRequests) {
  const latencies = [];
  let successful = 0;
  let failed = 0;

  const endpoints = [
    '/tasks',
    '/projects',
    '/routines',
    '/analytics/day-timeline?date=2026-11-05',
    '/finance/summary',
    '/analytics/command-center'
  ];

  let reqIndex = 0;
  async function worker() {
    while (reqIndex < totalRequests) {
      const idx = reqIndex++;
      const ep = endpoints[idx % endpoints.length];
      try {
        const { ok, duration } = await measureSingle(ep);
        if (ok) successful++;
        else failed++;
        latencies.push(duration);
      } catch {
        failed++;
      }
    }
  }

  const workers = [];
  for (let c = 0; c < concurrency; c++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = latencies.reduce((acc, v) => acc + v, 0) / (latencies.length || 1);

  return { concurrency, totalRequests, successful, failed, p50, p95, p99, avg };
}

async function runLoadSuite() {
  console.log('====================================================');
  console.log('PHASE 44 PERFORMANCE & CONCURRENT LOAD STRESS TEST');
  console.log('====================================================\n');

  const tiers = [
    { concurrency: 1, requests: 20 },
    { concurrency: 10, requests: 50 },
    { concurrency: 25, requests: 100 },
    { concurrency: 50, requests: 150 },
  ];

  for (const tier of tiers) {
    const res = await runLoadTier(tier.concurrency, tier.requests);
    console.log(`[CONCURRENCY ${res.concurrency}] Requests: ${res.totalRequests} | Success: ${res.successful} | Failures: ${res.failed} | P50: ${res.p50.toFixed(1)}ms | P95: ${res.p95.toFixed(1)}ms | P99: ${res.p99.toFixed(1)}ms | Avg: ${res.avg.toFixed(1)}ms`);
  }
  console.log('\n====================================================');
  console.log('LOAD STRESS TEST COMPLETE');
  console.log('====================================================');
}

runLoadSuite().catch(console.error);

