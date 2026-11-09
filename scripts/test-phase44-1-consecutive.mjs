import http from 'http';

const API_BASE = 'http://127.0.0.1:3001/api/v1';
const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ';

const endpoints = [
  { name: 'Settings', method: 'GET', path: '/settings' },
  { name: 'Follow-ups', method: 'GET', path: '/follow-ups/pending' },
  { name: 'Tasks', method: 'GET', path: '/tasks' },
  { name: 'User Profile', method: 'GET', path: '/auth/me' },
  { name: 'Routines', method: 'GET', path: '/routines' },
  { name: 'Day Timeline', method: 'GET', path: '/analytics/day-timeline?date=2026-11-05' },
];

async function measureRequest(ep) {
  const start = performance.now();
  const options = {
    method: ep.method,
    headers: {
      Authorization: `Bearer ${DEMO_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  if (ep.body) options.body = JSON.stringify(ep.body);

  const res = await fetch(`${API_BASE}${ep.path}`, options);
  const duration = performance.now() - start;
  const ok = res.status >= 200 && res.status < 300;
  return { name: ep.name, ok, status: res.status, duration };
}

async function runConsecutiveStabilityTest(totalRequests = 60) {
  console.log('====================================================');
  console.log(`STARTING PHASE 44.1: ${totalRequests} CONSECUTIVE DATABASE API REQUESTS`);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;
  const latencies = [];
  const perEndpoint = {};

  for (let i = 0; i < totalRequests; i++) {
    const ep = endpoints[i % endpoints.length];
    try {
      const res = await measureRequest(ep);
      latencies.push(res.duration);
      if (!perEndpoint[res.name]) perEndpoint[res.name] = { count: 0, sum: 0, ok: 0, fail: 0 };
      perEndpoint[res.name].count++;
      perEndpoint[res.name].sum += res.duration;

      if (res.ok) {
        passed++;
        perEndpoint[res.name].ok++;
        if ((i + 1) % 10 === 0 || i === 0) {
          console.log(`[PASS] Request #${i+1}/${totalRequests} [${res.name}] HTTP ${res.status} in ${Math.round(res.duration)}ms`);
        }
      } else {
        failed++;
        perEndpoint[res.name].fail++;
        console.error(`[FAIL] Request #${i+1} [${res.name}] HTTP ${res.status}`);
      }
    } catch (err) {
      failed++;
      console.error(`[ERROR] Request #${i+1} [${ep.name}] Exception: ${err.message}`);
    }
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);

  console.log('\n--- PER-ENDPOINT METRICS ---');
  for (const [name, stats] of Object.entries(perEndpoint)) {
    const epAvg = (stats.sum / stats.count).toFixed(1);
    console.log(`- ${name.padEnd(14)}: ${stats.count} reqs | Success: ${stats.ok}/${stats.count} | Avg Latency: ${epAvg}ms`);
  }

  console.log('\n--- OVERALL LATENCY DISTRIBUTION ---');
  console.log(`Total Requests : ${totalRequests}`);
  console.log(`Successful     : ${passed}`);
  console.log(`Failed         : ${failed}`);
  console.log(`Success Rate   : ${((passed / totalRequests) * 100).toFixed(2)}%`);
  console.log(`P50 (Median)   : ${p50.toFixed(1)}ms`);
  console.log(`P95 (Tail)     : ${p95.toFixed(1)}ms`);
  console.log(`P99 (Extreme)  : ${p99.toFixed(1)}ms`);
  console.log(`Average Latency: ${avg.toFixed(1)}ms`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runConsecutiveStabilityTest().catch(console.error);
