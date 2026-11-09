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

async function runTrueConcurrentUsers(concurrentUsers, requestsPerUser = 2) {
  const endpoints = [
    '/tasks',
    '/projects',
    '/routines',
    '/analytics/day-timeline?date=2026-11-05',
    '/finance/summary',
    '/analytics/command-center'
  ];

  const startTime = performance.now();
  const allLatencies = [];
  let successful = 0;
  let failed = 0;

  // Launch N concurrent user worker routines simultaneously
  const userWorkers = Array.from({ length: concurrentUsers }, async (_, userId) => {
    for (let r = 0; r < requestsPerUser; r++) {
      const ep = endpoints[(userId + r) % endpoints.length];
      try {
        const { ok, duration } = await measureSingle(ep);
        if (ok) successful++;
        else failed++;
        allLatencies.push(duration);
      } catch (err) {
        failed++;
      }
    }
  });

  await Promise.all(userWorkers);
  const totalDurationSeconds = (performance.now() - startTime) / 1000;
  const totalRequests = concurrentUsers * requestsPerUser;
  const throughput = totalRequests / totalDurationSeconds;

  allLatencies.sort((a, b) => a - b);
  const p50 = allLatencies[Math.floor(allLatencies.length * 0.50)] || 0;
  const p95 = allLatencies[Math.floor(allLatencies.length * 0.95)] || 0;
  const p99 = allLatencies[Math.floor(allLatencies.length * 0.99)] || 0;
  const avg = allLatencies.reduce((acc, v) => acc + v, 0) / (allLatencies.length || 1);

  return {
    concurrentUsers,
    totalRequests,
    successful,
    failed,
    errorRate: ((failed / totalRequests) * 100).toFixed(2),
    throughput: throughput.toFixed(2),
    p50: p50.toFixed(1),
    p95: p95.toFixed(1),
    p99: p99.toFixed(1),
    avg: avg.toFixed(1),
  };
}

async function runTier50LoadBenchmark() {
  console.log('====================================================');
  console.log('PHASE 44 TIER 50 TRUE CONCURRENT USER BENCHMARK (1–100 USERS)');
  console.log('====================================================\n');

  const userTiers = [1, 10, 25, 50, 100];

  for (const users of userTiers) {
    const res = await runTrueConcurrentUsers(users, 2);
    console.log(`[CONCURRENT USERS: ${res.concurrentUsers}] Requests: ${res.totalRequests} | Success: ${res.successful} | Failures: ${res.failed} | Error Rate: ${res.errorRate}% | Throughput: ${res.throughput} req/s | P50: ${res.p50}ms | P95: ${res.p95}ms | P99: ${res.p99}ms | Avg: ${res.avg}ms`);
  }

  console.log('\n====================================================');
  console.log('TIER 50 CONCURRENT LOAD BENCHMARK COMPLETE');
  console.log('====================================================');
}

runTier50LoadBenchmark().catch(console.error);

