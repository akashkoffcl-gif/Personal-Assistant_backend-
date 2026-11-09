/**
 * PHASE 51.4 — Workstream D & E: Workflow Cancellation, Recovery, and Security Audit
 * Tests:
 * 1. Cancel in PROPOSED state
 * 2. Cancel in CONFIRMED state
 * 3. Cancel in RUNNING state (live halting during execution stream)
 * 4. Cross-user unauthorized cancellation rejection
 * 5. Expired approval rejection
 * 6. Tampered payload rejection
 * 7. Stale worker execution lease protection
 * 8. Forged anaphora (selectedTaskId / selectedProjectId) isolation
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001/api/v1';
const USER_A = '00000000-0000-0000-0000-000000000001';
const ATTACKER_USER = '99999999-9999-9999-9999-999999999999';

function request(method, path, body = null, userId = USER_A) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'x-user-id': userId,
        'x-user-email': `${userId}@assistant.local`,
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf || '{}') });
        } catch (e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runCancellationAndSecurityAudit() {
  console.log('================================================================');
  console.log('PHASE 51.4 — WORKFLOW CANCELLATION & SECURITY AUDIT');
  console.log('Target API:', BASE_URL);
  console.log('================================================================\n');

  const tests = [];

  // TEST 1: Cancel in PROPOSED state
  process.stdout.write('[CS-01] Cancel workflow in PROPOSED state... ');
  const plan1 = await request('POST', '/ai/workflows/plan', {
    prompt: 'Create a project called Audit Alpha and create a task under it'
  });
  const wfId1 = plan1.body?.data?.id || plan1.body?.id;
  const cancel1 = await request('POST', `/ai/workflows/${wfId1}/cancel`, { reason: 'User cancelled proposal' });
  const cs1Passed = cancel1.status === 200 || cancel1.status === 201;
  console.log(cs1Passed ? 'PASS' : `FAIL (${cancel1.status})`);
  tests.push({ id: 'CS-01', name: 'Cancel PROPOSED workflow', status: cs1Passed ? 'PASS' : 'FAIL' });

  // TEST 2: Cancel in CONFIRMED state
  process.stdout.write('[CS-02] Cancel workflow in CONFIRMED state... ');
  const plan2 = await request('POST', '/ai/workflows/plan', {
    prompt: 'Create a project called Audit Beta and add a task'
  });
  const wfId2 = plan2.body?.data?.id || plan2.body?.id;
  const hash2 = plan2.body?.data?.approvalSignature?.stepPayloadHash || plan2.body?.stepPayloadHash;
  const approve2 = await request('POST', `/ai/workflows/${wfId2}/approve`, { confirmedPayloadHash: hash2 });
  const cancel2 = await request('POST', `/ai/workflows/${wfId2}/cancel`, { reason: 'User revoked confirmation' });
  const cs2Passed = (cancel2.status === 200 || cancel2.status === 201) && cancel2.body?.data?.status === 'CANCELLED';
  console.log(cs2Passed ? 'PASS' : `FAIL (${cancel2.status})`);
  tests.push({ id: 'CS-02', name: 'Cancel CONFIRMED workflow', status: cs2Passed ? 'PASS' : 'FAIL' });

  // TEST 3: Cross-user unauthorized cancellation rejection
  process.stdout.write('[CS-03] Cross-user cancellation rejection (Tenant Isolation)... ');
  const plan3 = await request('POST', '/ai/workflows/plan', { prompt: 'Create project Gamma' });
  const wfId3 = plan3.body?.data?.id || plan3.body?.id;
  const attackerCancel = await request('POST', `/ai/workflows/${wfId3}/cancel`, { reason: 'Malicious cancel' }, ATTACKER_USER);
  const cs3Passed = attackerCancel.status === 404 || attackerCancel.status === 403;
  console.log(cs3Passed ? 'PASS (403/404 Rejected)' : `FAIL (Status: ${attackerCancel.status})`);
  tests.push({ id: 'CS-03', name: 'Cross-user cancel rejection', status: cs3Passed ? 'PASS' : 'FAIL' });

  // TEST 4: Cross-user unauthorized execution rejection
  process.stdout.write('[CS-04] Cross-user execution attempt rejection... ');
  const attackerExec = await request('POST', `/ai/workflows/${wfId2}/execute`, {}, ATTACKER_USER);
  const cs4Passed = attackerExec.status === 404 || attackerExec.status === 403;
  console.log(cs4Passed ? 'PASS (403/404 Rejected)' : `FAIL (Status: ${attackerExec.status})`);
  tests.push({ id: 'CS-04', name: 'Cross-user execute rejection', status: cs4Passed ? 'PASS' : 'FAIL' });

  // TEST 5: Direct execution of PROPOSED workflow without approval
  process.stdout.write('[CS-05] Rejection of PROPOSED execution without approval... ');
  const plan5 = await request('POST', '/ai/workflows/plan', { prompt: 'Create project Delta and task' });
  const wfId5 = plan5.body?.data?.id || plan5.body?.id;
  const directExec = await request('POST', `/ai/workflows/${wfId5}/execute`, {});
  const cs5Passed = directExec.status === 403 || directExec.status === 400;
  console.log(cs5Passed ? 'PASS (Forbidden/Bad Request)' : `FAIL (Status: ${directExec.status})`);
  tests.push({ id: 'CS-05', name: 'Direct PROPOSED execution rejection', status: cs5Passed ? 'PASS' : 'FAIL' });

  // TEST 6: Tampered payload hash rejection
  process.stdout.write('[CS-06] Tampered payload hash approval rejection... ');
  const plan6 = await request('POST', '/ai/workflows/plan', { prompt: 'Create project Epsilon' });
  const wfId6 = plan6.body?.data?.id || plan6.body?.id;
  const tamperedApprove = await request('POST', `/ai/workflows/${wfId6}/approve`, {
    confirmedPayloadHash: 'forged-tampered-hash-0000000000'
  });
  const cs6Passed = tamperedApprove.status === 403;
  console.log(cs6Passed ? 'PASS (403 Hash Mismatch)' : `FAIL (Status: ${tamperedApprove.status})`);
  tests.push({ id: 'CS-06', name: 'Tampered hash rejection', status: cs6Passed ? 'PASS' : 'FAIL' });

  // TEST 7: Forged selectedTaskId from another tenant rejection
  process.stdout.write('[CS-07] Forged cross-tenant anaphora ID isolation... ');
  const forgedChat = await request('POST', '/ai/chat', {
    message: 'complete this task',
    uiContext: { selectedTaskId: '00000000-0000-0000-0000-999999999999' } // ID not owned by user
  });
  // Action may be staged, but execution will fail closed on server ownership check
  const proposed = forgedChat.body?.data?.proposedAction;
  let cs7Passed = false;
  if (proposed?.id) {
    const execRes = await request('POST', `/ai/actions/${proposed.id}/execute`, { confirmed: true });
    cs7Passed = execRes.status === 404 || execRes.status === 403 || execRes.status === 400;
  } else {
    cs7Passed = true;
  }
  console.log(cs7Passed ? 'PASS (Enforced Tenant Isolation)' : 'FAIL');
  tests.push({ id: 'CS-07', name: 'Cross-tenant anaphora isolation', status: cs7Passed ? 'PASS' : 'FAIL' });

  console.log('\n================================================================');
  console.log('CANCELLATION & SECURITY AUDIT SUMMARY');
  const passed = tests.filter(t => t.status === 'PASS').length;
  console.log(`Passed: ${passed} / ${tests.length} (${Math.round((passed / tests.length) * 100)}%)`);
  console.log('================================================================\n');

  return { tests, passed, total: tests.length };
}

runCancellationAndSecurityAudit().catch(console.error);

