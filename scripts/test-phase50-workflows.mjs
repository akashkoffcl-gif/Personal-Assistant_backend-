const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ";

async function runWorkflows() {
  const workflows = [
    { name: "Workflow A (Project Workspace & Task Creation)", prompt: "Nova, organize my workspace for project management and create a task named Launch Sprint Alpha" },
    { name: "Workflow B (Daily Planning & Schedule Conflict)", prompt: "Nova, plan my day for today with smart buffers and resolve conflicts" },
    { name: "Workflow C (Focus Analytics & Schedule Suggestion)", prompt: "Nova, analyze my focus time and productivity progress" },
    { name: "Workflow D (Financial Expense & Budget Analysis)", prompt: "How much did I spend this month and what is my financial summary?" },
    { name: "Workflow E (Knowledge Retrieval & Note Creation)", prompt: "Search my notes for architecture and create a note titled Phase 50 Verification" },
    { name: "Workflow F (Emergency Shift Mode)", prompt: "I have an emergency, shift my non-critical tasks" }
  ];

  for (const wf of workflows) {
    const t0 = Date.now();
    try {
      const res = await fetch("http://localhost:3001/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message: wf.prompt })
      });
      const data = await res.json();
      const elapsed = Date.now() - t0;
      console.log(`[PASS] ${wf.name} -> Latency: ${elapsed}ms | ToolUsed: ${data.toolUsed || "None"} | ProposedAction: ${data.proposedAction ? data.proposedAction.actionType : "None"}`);
    } catch (err) {
      console.error(`[FAIL] ${wf.name} -> ${err.message}`);
    }
  }
}
runWorkflows();

