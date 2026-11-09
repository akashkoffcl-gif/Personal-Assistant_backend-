const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ";

async function runSecurityTests() {
  console.log("=== Phase 50 Security & Penetration Probes ===");

  // 1. Unauthenticated request probe
  const unauthRes = await fetch("http://localhost:3001/api/v1/ai/tools", { method: "GET" });
  console.log(`[PROBE 1] Unauthenticated request to /ai/tools -> Status: ${unauthRes.status} (Expected: 401)`);

  // 2. Cross-user IDOR access probe
  const idorRes = await fetch("http://localhost:3001/api/v1/ai/conversations/00000000-0000-0000-0000-999999999999", {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`[PROBE 2] IDOR conversation access probe -> Status: ${idorRes.status} (Expected: 404/403)`);

  // 3. Unauthorized high-risk tool execution bypass
  const fakeActionRes = await fetch("http://localhost:3001/api/v1/ai/actions/fake-action-id/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ confirmed: true })
  });
  console.log(`[PROBE 3] Replay/Forged Action Execution -> Status: ${fakeActionRes.status} (Expected: 404)`);

  // 4. SQL Injection payload in Knowledge Search
  const sqlInjectionQuery = "' OR 1=1; --";
  const sqliRes = await fetch("http://localhost:3001/api/v1/ai/tools/search_knowledge_hub/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: sqlInjectionQuery })
  });
  const sqliData = await sqliRes.json();
  console.log(`[PROBE 4] SQL Injection probe in search_knowledge_hub -> Success: ${sqliData.success} | Returned: ${sqliData.data ? sqliData.data.success : false} (Safe: Parametrized)`);
}
runSecurityTests();

