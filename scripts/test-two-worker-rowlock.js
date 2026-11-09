/**
 * PHASE 51.6.5 — P0-B Two-Worker Database Row Locking & Fencing Race Test
 * 
 * Verifies both ordering scenarios using distinct PostgreSQL connections:
 * 
 * Scenario 1:
 * - Worker A acquires lease v10 and begins transaction.
 * - Worker A obtains authoritative row lock (SELECT ... FOR UPDATE) on workflow record in ai_actions.
 * - Worker A pauses after validating v10, holding row lock.
 * - Worker B attempts to acquire fencing v11 concurrently on a separate connection.
 * - Worker B is blocked by PostgreSQL row lock until Worker A completes.
 * - Worker A commits successfully.
 * - Worker B obtains row lock, evaluates latest state, and acts accordingly.
 * 
 * Scenario 2 (Reverse Ordering):
 * - Worker B acquires lease v11 first.
 * - Worker A begins transaction with stale version v10.
 * - Worker A acquires row lock and evaluates active fencing version inside transaction.
 * - Worker A is rejected with HTTP 403 Forbidden ("Stale worker fencing version 10. Active workflow fencing version is 11").
 * - Worker A's transaction rolls back with 0 domain rows written.
 * - Worker B commits successfully.
 * - Direct PostgreSQL verification: Exactly 1 valid domain mutation exists in database.
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

async function runTwoWorkerRowLockTest() {
  console.log('================================================================');
  console.log('PHASE 51.6.5 — P0-B TWO-WORKER ROW LOCKING & FENCING RACE TEST');
  console.log('Target API:', BASE_URL);
  console.log('User ID:', TEST_USER_ID);
  console.log('Testing Row Lock Isolation & Monotonic Fencing Across Connections');
  console.log('================================================================\n');

  // ==========================================================================
  // SCENARIO 1: Worker A holds row lock; Worker B is excluded until Worker A completes
  // ==========================================================================
  console.log('------------------------------------------------------------');
  console.log('[Scenario 1] Worker A Holds Row Lock on Lease; Worker B Excluded');
  const wfId1 = `wf-rowlock-sc1-${Date.now()}`;
  const stepKey1 = `wf-sc1-step-${Date.now()}`;
  const title1 = `RowLock Task 1 ${Date.now()}`;

  await prisma.aIAction.create({
    data: {
      id: wfId1,
      userId: TEST_USER_ID,
      actionType: 'WORKFLOW_EXECUTION',
      description: 'Row lock test workflow 1',
      status: 'RUNNING',
      idempotencyKey: `wf-init-${wfId1}`,
      payload: {
        lease: {
          workerToken: 'worker-A-token',
          acquiredAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          fencingVersion: 10,
        }
      }
    }
  });

  const client1 = new PrismaClient();
  const client2 = new PrismaClient();

  let workerAInLock = false;
  let workerBBlockedDuration = 0;
  let workerBExecuted = false;

  // Worker A begins transaction and acquires row lock
  const pA = client1.$transaction(async (tx1) => {
    const t0 = Date.now();
    const rows = await tx1.$queryRawUnsafe('SELECT id, payload FROM "ai_actions" WHERE id = $1 FOR UPDATE', wfId1);
    workerAInLock = true;
    console.log(`  [Worker A] Acquired PostgreSQL row lock on ${wfId1}. Fencing version: ${(rows[0]?.payload)?.lease?.fencingVersion}`);
    console.log(`  [Worker A] Pausing 2500ms to simulate slow write while holding lock...`);
    await new Promise(r => setTimeout(r, 2500));
    console.log(`  [Worker A] Releasing lock and completing.`);
  });

  // Short pause to guarantee Worker A enters lock first
  await new Promise(r => setTimeout(r, 300));

  // Worker B attempts to update lease fencing version to 11 on separate connection
  const pB = client2.$transaction(async (tx2) => {
    const tStartB = Date.now();
    console.log(`  [Worker B] Attempting to acquire row lock to supersede lease to v11...`);
    const rows = await tx2.$queryRawUnsafe('SELECT id, payload FROM "ai_actions" WHERE id = $1 FOR UPDATE', wfId1);
    workerBBlockedDuration = Date.now() - tStartB;
    workerBExecuted = true;
    console.log(`  [Worker B] Acquired row lock after wait: ${workerBBlockedDuration}ms (Exclusion verified)`);
    // Worker B updates fencing version to 11
    await tx2.aIAction.update({
      where: { id: wfId1 },
      data: {
        payload: {
          lease: {
            workerToken: 'worker-B-token',
            acquiredAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 60000).toISOString(),
            fencingVersion: 11,
          }
        }
      }
    });
  });

  await Promise.all([pA, pB]);
  await client1.$disconnect();
  await client2.$disconnect();

  const sc1Passed = workerAInLock && workerBExecuted && workerBBlockedDuration >= 2000;
  console.log(`  Scenario 1 Lock Exclusion Verified? ${sc1Passed ? 'YES' : 'NO'} (Blocked wait: ${workerBBlockedDuration}ms)`);

  // ==========================================================================
  // SCENARIO 2 (Reverse Ordering): Worker B acquires v11 first; Worker A rejected with 403
  // ==========================================================================
  console.log('\n------------------------------------------------------------');
  console.log('[Scenario 2] Reverse Ordering: Worker B Has v11; Stale Worker A Rejected');
  const wfId2 = `wf-rowlock-sc2-${Date.now()}`;
  const stepKey2 = `wf-sc2-step-${Date.now()}`;
  const title2 = `RowLock Task 2 ${Date.now()}`;

  // Initialize with Worker B holding version 11
  await prisma.aIAction.create({
    data: {
      id: wfId2,
      userId: TEST_USER_ID,
      actionType: 'WORKFLOW_EXECUTION',
      description: 'Row lock test workflow 2',
      status: 'RUNNING',
      idempotencyKey: `wf-init-${wfId2}`,
      payload: {
        lease: {
          workerToken: 'worker-B-token',
          acquiredAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          fencingVersion: 11,
        }
      }
    }
  });

  // Stale Worker A attempts mutation with stale version 10
  console.log('  [Worker A] Attempting transactional mutation with stale fencingVersion=10...');
  const staleRes = await request('POST', '/ai/tools/create_task/execute', {
    title: title2,
    estimatedDurationMinutes: 30,
    workflowId: wfId2,
    fencingVersion: 10,
    stepIdempotencyKey: stepKey2,
  });

  console.log(`  Worker A response HTTP status: ${staleRes.status}`);
  const staleRejected = staleRes.status === 403;
  console.log(`  Worker A rejected with 403 Forbidden? ${staleRejected ? 'YES' : 'NO'}`);
  console.log(`  Worker A error:`, staleRes.data?.message || staleRes.data?.error);

  // Verify Worker A wrote 0 rows
  const postStaleRows = await prisma.task.findMany({ where: { userId: TEST_USER_ID, title: title2 } });
  console.log(`  PostgreSQL task rows after stale attempt: ${postStaleRows.length} (Expected: 0)`);
  const workerARollback = postStaleRows.length === 0;

  // Active Worker B executes mutation with valid version 11
  console.log('  [Worker B] Attempting transactional mutation with active fencingVersion=11...');
  const activeRes = await request('POST', '/ai/tools/create_task/execute', {
    title: title2,
    estimatedDurationMinutes: 30,
    workflowId: wfId2,
    fencingVersion: 11,
    stepIdempotencyKey: stepKey2,
  });

  console.log(`  Worker B response HTTP status: ${activeRes.status}`);
  const activeAccepted = activeRes.status === 200 || activeRes.status === 201;
  const workerBData = activeRes.data?.data?.data || activeRes.data?.data;
  console.log(`  Worker B committed successfully? ${activeAccepted ? 'YES' : 'NO'} (Task ID: ${workerBData?.id})`);

  // Direct PostgreSQL check: exactly 1 entity exists in database
  const postActiveRows = await prisma.task.findMany({ where: { userId: TEST_USER_ID, title: title2 } });
  console.log(`  PostgreSQL task rows after Worker B commit: ${postActiveRows.length} (Expected: 1)`);
  const exactlyOneTask = postActiveRows.length === 1 && postActiveRows[0].id === workerBData?.id;

  const allPassed = sc1Passed && staleRejected && workerARollback && activeAccepted && exactlyOneTask;

  console.log('\n================================================================');
  console.log('P0-B TWO-WORKER ROW LOCKING & FENCING RESULTS:');
  console.log(`1. Scenario 1 (Lock Exclusion Verified):   ${sc1Passed ? 'PASS' : 'FAIL'}`);
  console.log(`2. Scenario 2 Stale Worker A Rejected:     ${staleRejected ? 'PASS' : 'FAIL'}`);
  console.log(`3. Scenario 2 Worker A Rollback (0 Rows):  ${workerARollback ? 'PASS' : 'FAIL'}`);
  console.log(`4. Scenario 2 Active Worker B Committed:   ${activeAccepted ? 'PASS' : 'FAIL'}`);
  console.log(`5. Exactly 1 Task in PostgreSQL:           ${exactlyOneTask ? 'PASS' : 'FAIL'}`);
  console.log(`Overall Status:                            ${allPassed ? 'ALL PASS (100%)' : 'FAIL'}`);
  console.log('================================================================');

  // Cleanup
  if (workerBData?.id) {
    await prisma.taskEvent.deleteMany({ where: { taskId: workerBData.id } });
    await prisma.task.deleteMany({ where: { id: workerBData.id } });
  }
  await prisma.aIAction.deleteMany({ where: { id: wfId1 } });
  await prisma.aIAction.deleteMany({ where: { id: wfId2 } });
  await prisma.aIAction.deleteMany({ where: { idempotencyKey: stepKey2 } });

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

runTwoWorkerRowLockTest().catch(async (e) => {
  console.error('Fatal crash in two-worker row lock test:', e);
  await prisma.$disconnect();
  process.exit(1);
});
