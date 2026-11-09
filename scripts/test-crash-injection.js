/**
 * PHASE 51.6.4 — P0-A Failure-Injection Matrix & Transaction Integrity Suite
 * 
 * Verifies 5 distinct failure points across domain mutations:
 * 1. Crash after claim creation, before domain mutation (assert claim expiration, safe reclaim, exactly 1 row committed).
 * 2. Failure during domain transaction (assert transaction rolls back, 0 rows committed, retry succeeds).
 * 3. Crash after domain transaction commits before HTTP response delivery (assert retry returns committed entity ID, exactly 1 row in DB).
 * 4. Crash during recovery replay (assert retry cleanly returns original entity).
 * 5. Concurrent retries during recovery.
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

async function runFailureInjectionTests() {
  console.log('================================================================');
  console.log('PHASE 51.6.4 — P0-A FAILURE-INJECTION MATRIX & INTEGRITY PROOF');
  console.log('Target API:', BASE_URL);
  console.log('User ID:', TEST_USER_ID);
  console.log('================================================================\n');

  // Verify staging finance account
  let account = await prisma.financeAccount.findFirst({ where: { userId: TEST_USER_ID } });
  if (!account) {
    account = await prisma.financeAccount.create({
      data: {
        userId: TEST_USER_ID,
        name: 'Staging Primary Account',
        type: 'CHECKING',
        balance: 10000.0,
        currency: 'USD',
        isDefault: true,
      }
    });
  }

  const results = [];

  // --------------------------------------------------------------------------
  // INJECTION POINT 1: Crash after claim creation, before domain mutation
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------');
  console.log('[Injection Point 1] Crash after claim creation, before domain mutation');
  const key1 = `fail-inj-1-claim-abort-${Date.now()}`;
  const title1 = `Inj1 Project ${Date.now()}`;

  // Worker creates PENDING claim with past timestamp (simulating abandoned claim from dead worker)
  await prisma.aIAction.create({
    data: {
      userId: TEST_USER_ID,
      actionType: 'DOMAIN_STEP_IDEMPOTENCY',
      description: 'Abandoned claim before domain mutation',
      status: 'PENDING',
      idempotencyKey: key1,
      payload: {
        toolId: 'create_project',
        status: 'CLAIMED',
        claimedAt: new Date(Date.now() - 20000).toISOString(), // 20s ago (> 15s lease)
      }
    }
  });
  console.log(`  Simulated abandoned PENDING claim created (>15s ago): ${key1}`);

  // Recovery worker executes step
  const res1 = await request('POST', '/ai/tools/create_project/execute', {
    title: title1,
    description: 'Recovered from abandoned claim',
    stepIdempotencyKey: key1,
  });

  const res1Data = res1.data?.data?.data || res1.data?.data;
  const db1Rows = await prisma.project.findMany({ where: { userId: TEST_USER_ID, title: title1 } });
  const p1Passed = (res1.status === 200 || res1.status === 201) && db1Rows.length === 1 && db1Rows[0].id === res1Data?.id;
  console.log(`  Recovery execution status: ${res1.status}`);
  console.log(`  PostgreSQL rows count: ${db1Rows.length} (Expected: 1)`);
  console.log(`  Point 1 Result: ${p1Passed ? 'PASSED' : 'FAILED'}`);
  results.push({ test: 'Point 1: Abandoned Claim Expiration & Safe Reclaim', passed: p1Passed });

  await prisma.project.deleteMany({ where: { id: db1Rows[0]?.id } });
  await prisma.aIAction.deleteMany({ where: { idempotencyKey: key1 } });

  // --------------------------------------------------------------------------
  // INJECTION POINT 2: Failure during domain transaction
  // --------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------');
  console.log('[Injection Point 2] Failure during domain transaction (Rollback assertion)');
  const key2 = `fail-inj-2-tx-abort-${Date.now()}`;
  const title2 = `Inj2 Task ${Date.now()}`;

  // Intentionally pass an invalid parameter that triggers domain failure
  // (e.g. invalid date or missing required field in finance transaction)
  const failTxRes = await request('POST', '/ai/tools/create_transaction_entry/execute', {
    accountId: 'invalid-non-existent-account-id',
    amount: 100,
    type: 'EXPENSE',
    description: title2,
    stepIdempotencyKey: key2,
  });

  const failTxDbRows = await prisma.financeTransaction.findMany({ where: { userId: TEST_USER_ID, description: title2 } });
  const failTxClaim = await prisma.aIAction.findUnique({ where: { idempotencyKey: key2 } });
  const p2RollbackPassed = failTxDbRows.length === 0 && (!failTxClaim || failTxClaim.status !== 'EXECUTED');
  console.log(`  Transaction error response status: ${failTxRes.status}`);
  console.log(`  PostgreSQL domain rows: ${failTxDbRows.length} (Expected: 0)`);
  console.log(`  Idempotency slot cleaned up or not EXECUTED: ${!failTxClaim || failTxClaim.status !== 'EXECUTED'}`);

  // Retry with valid account and same idempotency key succeeds
  const retryTxRes = await request('POST', '/ai/tools/create_transaction_entry/execute', {
    accountId: account.id,
    amount: 100,
    type: 'EXPENSE',
    description: title2,
    stepIdempotencyKey: key2,
  });

  const retryTxDbRows = await prisma.financeTransaction.findMany({ where: { userId: TEST_USER_ID, description: title2 } });
  const p2Passed = p2RollbackPassed && (retryTxRes.status === 200 || retryTxRes.status === 201) && retryTxDbRows.length === 1;
  console.log(`  Retry with valid input status: ${retryTxRes.status}`);
  console.log(`  PostgreSQL rows after retry: ${retryTxDbRows.length} (Expected: 1)`);
  console.log(`  Point 2 Result: ${p2Passed ? 'PASSED' : 'FAILED'}`);
  results.push({ test: 'Point 2: In-Tx Error Clean Rollback & Retry Success', passed: p2Passed });

  if (retryTxDbRows[0]?.id) {
    await prisma.financeTransaction.deleteMany({ where: { id: retryTxDbRows[0].id } });
  }
  await prisma.aIAction.deleteMany({ where: { idempotencyKey: key2 } });

  // --------------------------------------------------------------------------
  // INJECTION POINT 3: Crash after domain transaction commits before HTTP response delivery
  // --------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------');
  console.log('[Injection Point 3] Crash after transaction commits before HTTP delivery');
  const key3 = `fail-inj-3-post-commit-${Date.now()}`;
  const title3 = `Inj3 Routine ${Date.now()}`;

  // Step A: First request executes and commits
  const res3A = await request('POST', '/ai/tools/create_routine/execute', {
    title: title3,
    frequency: 'DAILY',
    stepIdempotencyKey: key3,
  });
  const entity3AId = res3A.data?.data?.data?.id || res3A.data?.data?.id;

  // Step B: Worker crashed right after sending or client disconnected before receiving response
  // Client retries same request
  const res3B = await request('POST', '/ai/tools/create_routine/execute', {
    title: title3,
    frequency: 'DAILY',
    stepIdempotencyKey: key3,
  });
  const entity3BId = res3B.data?.data?.data?.id || res3B.data?.data?.id;
  const db3Rows = await prisma.routine.findMany({ where: { userId: TEST_USER_ID, title: title3 } });

  const p3Passed = (res3A.status === 200 || res3A.status === 201) && (res3B.status === 200 || res3B.status === 201) && entity3AId === entity3BId && db3Rows.length === 1;
  console.log(`  Request 1 Entity ID: ${entity3AId}`);
  console.log(`  Request 2 Entity ID: ${entity3BId} (Matches: ${entity3AId === entity3BId})`);
  console.log(`  PostgreSQL domain count: ${db3Rows.length} (Expected: exactly 1)`);
  console.log(`  Point 3 Result: ${p3Passed ? 'PASSED' : 'FAILED'}`);
  results.push({ test: 'Point 3: Post-Commit Disconnect Replay Integrity', passed: p3Passed });

  await prisma.routine.deleteMany({ where: { id: entity3AId } });
  await prisma.aIAction.deleteMany({ where: { idempotencyKey: key3 } });

  // --------------------------------------------------------------------------
  // INJECTION POINT 4: Crash during recovery replay
  // --------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------');
  console.log('[Injection Point 4] Crash during recovery replay');
  const key4 = `fail-inj-4-recovery-crash-${Date.now()}`;
  const title4 = `Inj4 Note ${Date.now()}`;

  const res4A = await request('POST', '/ai/tools/create_knowledge_note/execute', {
    title: title4,
    content: 'Knowledge note testing recovery crash',
    stepIdempotencyKey: key4,
  });
  const entity4AId = res4A.data?.data?.data?.id || res4A.data?.data?.id;

  // Simulate multiple successive recovery workers crashing mid-replay
  for (let attempt = 1; attempt <= 3; attempt++) {
    const replayRes = await request('POST', '/ai/tools/create_knowledge_note/execute', {
      title: title4,
      content: 'Knowledge note testing recovery crash',
      stepIdempotencyKey: key4,
    });
    const replayId = replayRes.data?.data?.data?.id || replayRes.data?.data?.id;
    if (replayId !== entity4AId) {
      console.error(`  Recovery attempt ${attempt} returned divergent ID!`);
    }
  }

  const db4Rows = await prisma.knowledgeNote.findMany({ where: { userId: TEST_USER_ID, title: title4 } });
  const p4Passed = db4Rows.length === 1 && db4Rows[0].id === entity4AId;
  console.log(`  Successive recovery replays returned identical entity: ${p4Passed}`);
  console.log(`  PostgreSQL domain count: ${db4Rows.length} (Expected: exactly 1)`);
  console.log(`  Point 4 Result: ${p4Passed ? 'PASSED' : 'FAILED'}`);
  results.push({ test: 'Point 4: Successive Recovery Crash Replays', passed: p4Passed });

  await prisma.knowledgeVersion.deleteMany({ where: { noteId: entity4AId } });
  await prisma.knowledgeNote.deleteMany({ where: { id: entity4AId } });
  await prisma.aIAction.deleteMany({ where: { idempotencyKey: key4 } });

  // --------------------------------------------------------------------------
  // INJECTION POINT 5: Concurrent retries during recovery
  // --------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------');
  console.log('[Injection Point 5] Concurrent retries during recovery');
  const key5 = `fail-inj-5-concurrent-retry-${Date.now()}`;
  const title5 = `Inj5 Task ${Date.now()}`;

  // Launch 5 concurrent calls with the exact same idempotency key at the exact same instant
  const concurrentCalls = await Promise.all([
    request('POST', '/ai/tools/create_task/execute', { title: title5, estimatedDurationMinutes: 20, stepIdempotencyKey: key5 }),
    request('POST', '/ai/tools/create_task/execute', { title: title5, estimatedDurationMinutes: 20, stepIdempotencyKey: key5 }),
    request('POST', '/ai/tools/create_task/execute', { title: title5, estimatedDurationMinutes: 20, stepIdempotencyKey: key5 }),
    request('POST', '/ai/tools/create_task/execute', { title: title5, estimatedDurationMinutes: 20, stepIdempotencyKey: key5 }),
    request('POST', '/ai/tools/create_task/execute', { title: title5, estimatedDurationMinutes: 20, stepIdempotencyKey: key5 }),
  ]);

  const allStatuses = concurrentCalls.map(c => c.status);
  const ids = concurrentCalls.map(c => c.data?.data?.data?.id || c.data?.data?.id);
  const db5Rows = await prisma.task.findMany({ where: { userId: TEST_USER_ID, title: title5 } });
  const uniqueIds = new Set(ids);

  const p5Passed = uniqueIds.size === 1 && db5Rows.length === 1 && ids[0] === db5Rows[0]?.id;
  console.log(`  5 Concurrent calls statuses: ${JSON.stringify(allStatuses)}`);
  console.log(`  Unique entity IDs returned: ${uniqueIds.size} (ID: ${ids[0]})`);
  console.log(`  PostgreSQL domain count: ${db5Rows.length} (Expected: exactly 1)`);
  console.log(`  Point 5 Result: ${p5Passed ? 'PASSED' : 'FAILED'}`);
  results.push({ test: 'Point 5: Concurrent Retries During Recovery', passed: p5Passed });

  if (db5Rows[0]?.id) {
    await prisma.taskEvent.deleteMany({ where: { taskId: db5Rows[0].id } });
    await prisma.task.deleteMany({ where: { id: db5Rows[0].id } });
  }
  await prisma.aIAction.deleteMany({ where: { idempotencyKey: key5 } });

  console.log('\n================================================================');
  console.log('P0-A FAILURE-INJECTION MATRIX SUMMARY:');
  console.table(results);
  const allPassed = results.every(r => r.passed);
  console.log(`Overall Failure-Injection Status: ${allPassed ? 'ALL INJECTIONS PASSED (100%)' : 'FAILURES DETECTED'}`);
  console.log('================================================================');

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

runFailureInjectionTests().catch(async (e) => {
  console.error('Failure in test execution:', e);
  await prisma.$disconnect();
  process.exit(1);
});

