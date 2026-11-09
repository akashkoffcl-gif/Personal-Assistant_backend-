import http from 'http';

const API_BASE = 'http://127.0.0.1:3001/api/v1';
const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ';

async function req(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEMO_TOKEN}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: data.data !== undefined ? data.data : data };
}

async function runFullModuleAudit() {
  console.log('====================================================');
  console.log('PHASE 44 FULL APPLICATION MODULE-BY-MODULE AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Command Center
  const cc = await req('/analytics/command-center');
  assert(cc.ok && (cc.data.kpi || cc.data.kpis), 'Command Center KPIs and operational aggregates');

  // 2. My Day Timeline
  const md = await req('/analytics/day-timeline?date=2026-11-05');
  assert(md.ok && Array.isArray(md.data.timeline), 'My Day Chronological Execution Stream');

  // 3. Tasks Workspace
  const tasks = await req('/tasks');
  assert(tasks.ok && Array.isArray(tasks.data), 'Tasks Workspace collection');

  // 4. Projects Workspace
  const projects = await req('/projects');
  assert(projects.ok && Array.isArray(projects.data), 'Projects Portfolio collection');

  // 5. Routines Hub
  const routines = await req('/routines');
  assert(routines.ok && Array.isArray(routines.data), 'Routines collection');

  // 6. Routine Occurrences
  const occ = await req('/routines/occurrences/2026-11-05');
  assert(occ.ok && Array.isArray(occ.data), 'Routine daily occurrences');

  // 7. Focus Studio
  const focus = await req('/focus/analytics');
  assert(focus.ok && focus.data, 'Focus Studio Analytics');

  // 8. Goals & Milestones
  const goals = await req('/goals');
  assert(goals.ok && Array.isArray(goals.data), 'Goals & Milestones collection');

  // 9. Personal Knowledge Hub (Documents)
  const docs = await req('/knowledge/documents');
  assert(docs.ok && Array.isArray(docs.data), 'Knowledge Hub Documents');

  // 10. Personal Knowledge Hub (Graph)
  const kg = await req('/knowledge/graph');
  assert(kg.ok && kg.data.nodes, 'Knowledge Hub Graph Network');

  // 11. Personal Finance (Summary)
  const finSummary = await req('/finance/summary');
  assert(finSummary.ok && finSummary.data, 'Personal Finance Net Worth & Cash Flow Summary');

  // 12. Personal Finance (Accounts)
  const finAcc = await req('/finance/accounts');
  assert(finAcc.ok && Array.isArray(finAcc.data), 'Personal Finance Accounts');

  // 13. Life Balance
  const lb = await req('/analytics/life-balance');
  assert(lb.ok && lb.data.overallBalanceScore, 'Life Balance Score & Dimensions');

  // 14. Predictive Analytics
  const pa = await req('/analytics/predictive');
  assert(pa.ok && pa.data.focusHealth, 'Predictive Productivity Analytics');

  // 15. Activity Timeline
  const tl = await req('/analytics/timeline?limit=10');
  assert(tl.ok && Array.isArray(tl.data), 'Unified Activity Timeline');

  // 16. Automation Rules
  const auto = await req('/automation/rules');
  assert(auto.ok && Array.isArray(auto.data), 'Automation Rules Hub');

  // 17. Notifications Center
  const notif = await req('/notifications?limit=10');
  assert(notif.ok && (Array.isArray(notif.data) || Array.isArray(notif.data.notifications)), 'Notification Center stream');

  // 18. AI Conversations
  const aiConv = await req('/ai/conversations');
  assert(aiConv.ok && Array.isArray(aiConv.data), 'AI Conversations Hub');

  // 19. User Settings & Profile
  const me = await req('/auth/me');
  assert(me.ok && me.data.user && me.data.user.email, 'User Authentication Profile');

  // 20. Smart Day Planner
  const plan = await req('/plans/2026-11-05');
  assert(plan.status === 200 || plan.status === 404, 'Smart Day Planner endpoint reachable');

  console.log('\n====================================================');
  console.log(`FULL MODULE AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runFullModuleAudit().catch((err) => {
  console.error('Audit runner error:', err);
  process.exit(1);
});
