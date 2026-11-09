/**
 * PHASE 51.6.4 — P0-B True Database-Boundary Fencing Race Test
 * 
 * Verifies exact race scenario:
 * 1. Worker A creates workflow plan with lease fencingVersion = 10.
 * 2. Worker A prepares to execute a domain step (e.g. create_task) under fencingVersion = 10.
 * 3. Concurrent event occurs: Worker B recovers workflow and increments lease fencingVersion = 11.
 * 4. Worker A attempts domain mutation inside PostgreSQL transaction with stale fencingVersion = 10.
 * 5. PostgreSQL transaction aborts/rejects Worker A's stale write with 403 Forbidden.
 * 6. Worker B executes step with active fencingVersion = 11 and commits successfully.
 * 7. Direct database assertion: Exactly 1 task entity exists in PostgreSQL, committed by Worker B.
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'x-user-id': TEST_USER_ID,
        'x-user-email': `${TEST_USER_ID}@assistant.local`,
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(buf || '{}');
          resolve({ status: res.statusCode, data: parsed });
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

async function runFencingRaceTest() {
  console.log('================================================================');
  console.log('PHASE 51.6.4 — P0-B IN-TRANSACTION DATABASE FENCING RACE TEST');
  console.log('Target API:', BASE_URL);
  console.log('User ID:', TEST_USER_ID);
  console.log('================================================================\n');

  // Step 1: Create a workflow record with lease fencingVersion = 10
  const workflowId = `wf-fence-race-${Date.now()}`;
  const stepKey = `wf-step-fence-key-${Date.now()}`;
  const testTitle = `Fenced Task Race ${Date.now()}`;

  await prisma.aIAction.create({
    data: {
      id: workflowId,
      userId: TEST_USER_ID,
      actionType: 'WORKFLOW_EXECUTION',
      description: 'Fencing race test workflow',
      status: 'RUNNING',
      idempotencyKey: `wf-init-${workflowId}`,
      payload: {
        lease: {
          workerToken: 'worker-a-token',
          acquiredAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          fencingVersion: 10,
        }
      }
    }
  });
  console.log(`[Step 1] Workflow initialized in PostgreSQL: ID=${workflowId}, Lease fencingVersion=10`);

  // Step 2: Worker B supersedes Worker A by acquiring lease with fencingVersion = 11
  console.log('[Step 2] Simulating Worker B acquiring lease and incrementing fencingVersion to 11...');
  await prisma.aIAction.update({
    where: { id: workflowId },
    data: {
      payload: {
        lease: {
          workerToken: 'worker-b-token',
          acquiredAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          fencingVersion: 11,
        }
      }
    }
  });
  console.log('  Database active lease fencingVersion updated to 11.');

  // Step 3: Stale Worker A attempts to execute domain mutation with fencingVersion = 10
  console.log('\n[Step 3] Stale Worker A attempting transactional domain mutation with fencingVersion=10...');
  const staleRes = await request('POST', '/ai/tools/create_task/execute', {
    title: testTitle,
    estimatedDurationMinutes: 45,
    workflowId,
    fencingVersion: 10,
    stepIdempotencyKey: stepKey,
  });

  console.log(`  Worker A response HTTP status: ${staleRes.status}`);
  const staleRejected = staleRes.status === 403;
  console.log(`  Assertion: Worker A rejected with 403 Forbidden? ${staleRejected ? 'YES' : 'NO'}`);
  console.log(`  Worker A error details:`, staleRes.data?.message || staleRes.data?.error || staleRes.data);

  // Direct PostgreSQL check: verify Worker A's transaction did NOT write any task
  const postStaleRows = await prisma.task.findMany({ where: { userId: TEST_USER_ID, title: testTitle } });
  console.log(`  PostgreSQL task rows after stale attempt: ${postStaleRows.length} (Expected: 0)`);
  const workerARollbackPassed = postStaleRows.length === 0;

  // Step 4: Active Worker B executes domain mutation with fencingVersion = 11
  console.log('\n[Step 4] Active Worker B attempting transactional domain mutation with fencingVersion=11...');
  const activeRes = await request('POST', '/ai/tools/create_task/execute', {
    title: testTitle,
    estimatedDurationMinutes: 45,
    workflowId,
    fencingVersion: 11,
    stepIdempotencyKey: stepKey,
  });

  console.log(`  Worker B response HTTP status: ${activeRes.status}`);
  const activeAccepted = activeRes.status === 200 || activeRes.status === 201;
  const workerBData = activeRes.data?.data?.data || activeRes.data?.data;
  console.log(`  Assertion: Worker B committed successfully? ${activeAccepted ? 'YES' : 'NO'} (Task ID: ${workerBData?.id})`);

  // Direct PostgreSQL check: exactly 1 entity exists in DB
  const postActiveRows = await prisma.task.findMany({ where: { userId: TEST_USER_ID, title: testTitle } });
  console.log(`  PostgreSQL task rows after Worker B commit: ${postActiveRows.length} (Expected: 1)`);
  const exactlyOneTask = postActiveRows.length === 1 && postActiveRows[0].id === workerBData?.id;

  // Step 5: Worker A tries again or another stale worker attempts with version 10
  console.log('\n[Step 5] Verify idempotency replay with stale fencing version is still rejected...');
  const staleReplayRes = await request('POST', '/ai/tools/create_task/execute', {
    title: testTitle,
    estimatedDurationMinutes: 45,
    workflowId,
    fencingVersion: 10,
    stepIdempotencyKey: stepKey,
  });
  console.log(`  Stale replay HTTP status: ${staleReplayRes.status} (Expected: 403)`);
  const replayFencingBlocked = staleReplayRes.status === 403;

  const allPassed = staleRejected && workerARollbackPassed && activeAccepted && exactlyOneTask && replayFencingBlocked;

  console.log('\n================================================================');
  console.log('P0-B IN-TX FENCING RACE TEST SUMMARY:');
  console.log(`1. Stale Worker A (v10) Rejected:         ${staleRejected ? 'PASS' : 'FAIL'}`);
  console.log(`2. Worker A 0 Rows in Database (Rollback): ${workerARollbackPassed ? 'PASS' : 'FAIL'}`);
  console.log(`3. Active Worker B (v11) Committed:       ${activeAccepted ? 'PASS' : 'FAIL'}`);
  console.log(`4. Exactly 1 Row in Database:              ${exactlyOneTask ? 'PASS' : 'FAIL'}`);
  console.log(`5. Stale Replay Fencing Protection:       ${replayFencingBlocked ? 'PASS' : 'FAIL'}`);
  console.log(`Overall Status:                           ${allPassed ? 'ALL PASS (100%)' : 'FAIL'}`);
  console.log('================================================================');

  // Cleanup
  if (workerBData?.id) {
    await prisma.taskEvent.deleteMany({ where: { taskId: workerBData.id } });
    await prisma.task.deleteMany({ where: { id: workerBData.id } });
  }
  await prisma.aIAction.deleteMany({ where: { id: workflowId } });
  await prisma.aIAction.deleteMany({ where: { idempotencyKey: stepKey } });

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

runFencingRaceTest().catch(async (e) => {
  console.error('Fatal crash in fencing test:', e);
  await prisma.$disconnect();
  process.exit(1);
});
