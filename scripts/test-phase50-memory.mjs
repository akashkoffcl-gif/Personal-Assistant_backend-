const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ";

async function testMemory() {
  const categories = ['PREFERENCE', 'WORK_STYLE', 'COMMUNICATION', 'DASHBOARD', 'AUTOMATION'];
  console.log("--- Testing Memory Creation across 5 Categories ---");
  const createdIds = [];
  for (const cat of categories) {
    const res = await fetch("http://localhost:3001/api/v1/ai/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ category: cat, key: `Test_${cat}`, value: `Value for ${cat}` })
    });
    const data = await res.json();
    console.log(`[CREATE] Category: ${cat} -> Status: ${res.status} | ID: ${data.id}`);
    createdIds.push(data.id);
  }

  console.log("\n--- Testing Memory Retrieval ---");
  const listRes = await fetch("http://localhost:3001/api/v1/ai/memory", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const list = await listRes.json();
  console.log(`[RETRIEVE] Total Memories Retrieved: ${list.length}`);

  console.log("\n--- Testing Memory Deletion (User Control) ---");
  for (const id of createdIds) {
    const delRes = await fetch(`http://localhost:3001/api/v1/ai/memory/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const delData = await delRes.json();
    console.log(`[DELETE] ID: ${id} -> Status: ${delRes.status} | Success: ${delData.success}`);
  }
}
testMemory();

