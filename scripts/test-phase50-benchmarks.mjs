const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ";

async function benchmark(concurrency) {
  const promises = [];
  const start = Date.now();
  for (let i = 0; i < concurrency; i++) {
    promises.push((async () => {
      const t0 = Date.now();
      try {
        const res = await fetch("http://localhost:3001/api/v1/ai/tools/get_productivity_analytics/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({})
        });
        const elapsed = Date.now() - t0;
        return { ok: res.ok, status: res.status, latency: elapsed };
      } catch (err) {
        return { ok: false, error: err.message, latency: Date.now() - t0 };
      }
    })());
  }

  const results = await Promise.all(promises);
  const totalTime = Date.now() - start;
  const latencies = results.map(r => r.latency).sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1];
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || latencies[latencies.length - 1];
  const successCount = results.filter(r => r.ok).length;

  console.log(`Concurrency: ${concurrency.toString().padEnd(2)} | Success: ${successCount}/${concurrency} | P50: ${p50}ms | P95: ${p95}ms | P99: ${p99}ms | Total: ${totalTime}ms`);
}

async function runAll() {
  console.log("=== JARVIS Autonomous Intelligence Concurrency Benchmark ===");
  await benchmark(1);
  await benchmark(5);
  await benchmark(10);
  await benchmark(25);
  console.log("=== Benchmark Complete ===");
}
runAll();

