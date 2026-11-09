/**
 * PHASE 51.6.2 — P0-A Domain Mutation Idempotency & Crash Recovery Verification
 * 
 * Target Mutations:
 * 1. create_project (PROJECT_MANAGEMENT)
 * 2. create_task (TASK_MANAGEMENT)
 * 3. create_routine (CALENDAR_ROUTINES / recurring schedule)
 * 4. create_knowledge_note (KNOWLEDGE_MANAGEMENT)
 * 5. create_transaction_entry (FINANCIAL_INTELLIGENCE)
 * 
 * Verifies:
 * - Stable key per logical workflow step across retries/recovery
 * - Commit domain mutation -> simulate worker crash before workflow plan persists completion
 * - Resume recovery on same step with same idempotency key
 * - PostgreSQL assertion: exact original entity is returned and exactly 1 record exists in domain table (NO duplicate row)
 * - Concurrent requests with identical keys are safe
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

async function runTest() {
  console.log('================================================================');
  console.log('PHASE 51.6.2 — P0-A DOMAIN MUTATION IDEMPOTENCY & CRASH RECOVERY');
  console.log('Target API:', BASE_URL);
  console.log('User ID:', TEST_USER_ID);
  console.log('================================================================\n');

  // Find or create default finance account for financial transaction test
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
    console.log(`[Setup] Created staging finance account ${account.id}`);
  }

  const testCases = [
    {
      mutation: 'create_project',
      toolId: 'create_project',
      input: { title: `P51.6.2 Project Idempotency ${Date.now()}`, description: 'Testing crash recovery idempotency' },
      queryDb: async (title) => prisma.project.findMany({ where: { userId: TEST_USER_ID, title } }),
      cleanUp: async (id) => prisma.project.deleteMany({ where: { id } }),
      titleField: 'title'
    },
    {
      mutation: 'create_task',
      toolId: 'create_task',
      input: { title: `P51.6.2 Task Idempotency ${Date.now()}`, estimatedDurationMinutes: 45 },
      queryDb: async (title) => prisma.task.findMany({ where: { userId: TEST_USER_ID, title } }),
      cleanUp: async (id) => prisma.task.deleteMany({ where: { id } }),
      titleField: 'title'
    },
    {
      mutation: 'create_routine',
      toolId: 'create_routine',
      input: { title: `P51.6.2 Routine Idempotency ${Date.now()}`, frequency: 'DAILY', targetTime: '08:00' },
      queryDb: async (title) => prisma.routine.findMany({ where: { userId: TEST_USER_ID, title } }),
      cleanUp: async (id) => prisma.routine.deleteMany({ where: { id } }),
      titleField: 'title'
    },
    {
      mutation: 'create_knowledge_note',
      toolId: 'create_knowledge_note',
      input: { title: `P51.6.2 Note Idempotency ${Date.now()}`, content: 'Durable idempotency note body' },
      queryDb: async (title) => prisma.knowledgeNote.findMany({ where: { userId: TEST_USER_ID, title } }),
      cleanUp: async (id) => {
        await prisma.knowledgeVersion.deleteMany({ where: { noteId: id } });
        await prisma.knowledgeNote.deleteMany({ where: { id } });
      },
      titleField: 'title'
    },
    {
      mutation: 'create_transaction_entry',
      toolId: 'create_transaction_entry',
      input: { accountId: account.id, amount: 150.50, type: 'EXPENSE', description: `P51.6.2 Tx Idempotency ${Date.now()}` },
      queryDb: async (desc) => prisma.financeTransaction.findMany({ where: { userId: TEST_USER_ID, description: desc } }),
      cleanUp: async (id) => prisma.financeTransaction.deleteMany({ where: { id } }),
      titleField: 'description'
    }
  ];

  let allPassed = true;
  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const uniqueKey = `wf-crash-step-${tc.mutation}-${Date.now()}`;
    const testTitle = tc.input[tc.titleField];
    console.log(`\n------------------------------------------------------------`);
    console.log(`[Test ${i + 1}/${testCases.length}] Mutation: ${tc.mutation}`);
    console.log(`Idempotency Key: ${uniqueKey}`);

    // Step 1: Initial Execution (Worker commits domain mutation)
    const run1 = await request('POST', `/ai/tools/${tc.toolId}/execute`, {
      ...tc.input,
      stepIdempotencyKey: uniqueKey,
    });

    const run1Data = run1.data?.data?.data || run1.data?.data;
    if ((run1.status !== 200 && run1.status !== 201) || !run1Data) {
      console.error(`  FAIL: Initial execution failed:`, run1);
      allPassed = false;
      continue;
    }

    const entity1 = run1Data;
    const entityId1 = entity1.id;
    console.log(`  Initial Execution Committed: Entity ID = ${entityId1}`);

    // Step 2: SIMULATE CRASH & RECOVERY
    // Worker crashed before updating its parent workflow record.
    // Recovery worker wakes up and executes the EXACT same step with the same idempotency key.
    console.log(`  Simulating worker crash and recovery replay with same idempotency key...`);
    const run2 = await request('POST', `/ai/tools/${tc.toolId}/execute`, {
      ...tc.input,
      stepIdempotencyKey: uniqueKey,
    });

    const run2Data = run2.data?.data?.data || run2.data?.data;
    if ((run2.status !== 200 && run2.status !== 201) || !run2Data) {
      console.error(`  FAIL: Recovery replay execution failed:`, run2);
      allPassed = false;
      continue;
    }

    const entity2 = run2Data;
    const entityId2 = entity2.id;
    const cachedFromIdem = run2.data?.data?.cachedFromIdempotency;
    console.log(`  Recovery Execution Returned: Entity ID = ${entityId2} (CachedFromIdem: ${cachedFromIdem})`);

    // Step 3: Direct Database Assertions
    const recordsInDb = await tc.queryDb(testTitle);
    console.log(`  Direct PostgreSQL Query Count: ${recordsInDb.length} record(s) matching title/description.`);

    const idMatched = entityId1 === entityId2;
    const exactlyOneInDb = recordsInDb.length === 1;
    const entityIdMatchedDb = recordsInDb[0]?.id === entityId1;

    console.log(`  Assertion: Entity ID preserved across crash replay? ${idMatched ? 'YES' : 'NO'}`);
    console.log(`  Assertion: Exactly 1 record created in PostgreSQL? ${exactlyOneInDb ? 'YES' : 'NO'}`);
    console.log(`  Assertion: Persisted DB ID matches returned ID? ${entityIdMatchedDb ? 'YES' : 'NO'}`);

    // Step 4: Concurrent Execution Test with identical keys
    console.log(`  Testing concurrent race with identical idempotency key...`);
    const [c1, c2] = await Promise.all([
      request('POST', `/ai/tools/${tc.toolId}/execute`, { ...tc.input, stepIdempotencyKey: uniqueKey }),
      request('POST', `/ai/tools/${tc.toolId}/execute`, { ...tc.input, stepIdempotencyKey: uniqueKey }),
    ]);

    const c1Data = c1.data?.data?.data || c1.data?.data;
    const c2Data = c2.data?.data?.data || c2.data?.data;

    const concurrentRecords = await tc.queryDb(testTitle);
    const concurrentSafe = concurrentRecords.length === 1 && c1Data?.id === entityId1 && c2Data?.id === entityId1;
    console.log(`  Assertion: Concurrent requests with identical key safe (Count = ${concurrentRecords.length})? ${concurrentSafe ? 'YES' : 'NO'}`);

    const passed = idMatched && exactlyOneInDb && entityIdMatchedDb && concurrentSafe;
    if (!passed) allPassed = false;

    results.push({
      mutation: tc.mutation,
      entityId: entityId1,
      idempotencyKey: uniqueKey,
      singleRowInDb: exactlyOneInDb,
      entityMatch: idMatched,
      concurrentSafe,
      passed
    });

    // Cleanup created test records
    await tc.cleanUp(entityId1);
    await prisma.aIAction.deleteMany({ where: { idempotencyKey: uniqueKey } });
  }

  console.log('\n================================================================');
  console.log('P0-A DOMAIN IDEMPOTENCY CRASH TEST SUMMARY:');
  console.table(results);
  console.log(`Overall Status: ${allPassed ? 'ALL TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`);
  console.log('================================================================');

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

runTest().catch(async (e) => {
  console.error('Fatal crash in test harness:', e);
  await prisma.$disconnect();
  process.exit(1);
});

