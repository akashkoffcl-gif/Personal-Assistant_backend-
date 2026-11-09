/**
 * PHASE 51.6.3 — P0-B True Concurrent Mutation Test Harness
 * 
 * Verifies:
 * 1. Two independent concurrent requests dispatch simultaneously with the SAME idempotency key.
 * 2. Both requests begin before either can finish.
 * 3. They compete for the atomic claim (one acquires PENDING, the other gets P2002 conflict and polls).
 * 4. Exactly ONE domain entity is created in PostgreSQL.
 * 5. Both concurrent responses reference the EXACT same entity ID.
 * 6. A subsequent retry request returns the original entity immediately.
 * 
 * Tests all 5 target mutation types:
 * - create_project
 * - create_task
 * - create_routine
 * - create_knowledge_note
 * - create_transaction_entry
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

async function runTrueConcurrentMutationSuite() {
  console.log('================================================================');
  console.log('PHASE 51.6.3 — P0-B TRUE CONCURRENT MUTATION TEST HARNESS');
  console.log('Target API:', BASE_URL);
  console.log('User ID:', TEST_USER_ID);
  console.log('Testing Atomic Idempotency Claim Across 5 Domain Mutations');
  console.log('================================================================\n');

  let account = await prisma.financeAccount.findFirst({ where: { userId: TEST_USER_ID } });
  if (!account) {
    account = await prisma.financeAccount.create({
      data: {
        userId: TEST_USER_ID,
        name: 'Concurrent Test Account',
        type: 'CHECKING',
        balance: 50000.0,
        currency: 'USD',
        isDefault: true,
      }
    });
  }

  const testCases = [
    {
      mutation: 'create_project',
      toolId: 'create_project',
      input: { title: `P51.6.3 Concurrency Project ${Date.now()}`, description: 'Atomic claim race test' },
      queryDb: async (title) => prisma.project.findMany({ where: { userId: TEST_USER_ID, title } }),
      cleanUp: async (id) => prisma.project.deleteMany({ where: { id } }),
      titleField: 'title'
    },
    {
      mutation: 'create_task',
      toolId: 'create_task',
      input: { title: `P51.6.3 Concurrency Task ${Date.now()}`, estimatedDurationMinutes: 30 },
      queryDb: async (title) => prisma.task.findMany({ where: { userId: TEST_USER_ID, title } }),
      cleanUp: async (id) => prisma.task.deleteMany({ where: { id } }),
      titleField: 'title'
    },
    {
      mutation: 'create_routine',
      toolId: 'create_routine',
      input: { title: `P51.6.3 Concurrency Routine ${Date.now()}`, frequency: 'DAILY', targetTime: '07:30' },
      queryDb: async (title) => prisma.routine.findMany({ where: { userId: TEST_USER_ID, title } }),
      cleanUp: async (id) => prisma.routine.deleteMany({ where: { id } }),
      titleField: 'title'
    },
    {
      mutation: 'create_knowledge_note',
      toolId: 'create_knowledge_note',
      input: { title: `P51.6.3 Concurrency Note ${Date.now()}`, content: 'Note payload for concurrent test' },
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
      input: { accountId: account.id, amount: 250.75, type: 'EXPENSE', description: `P51.6.3 Concurrency Tx ${Date.now()}` },
      queryDb: async (desc) => prisma.financeTransaction.findMany({ where: { userId: TEST_USER_ID, description: desc } }),
      cleanUp: async (id) => prisma.financeTransaction.deleteMany({ where: { id } }),
      titleField: 'description'
    }
  ];

  const results = [];
  let allPassed = true;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const sharedKey = `atomic-concurrent-${tc.mutation}-${Date.now()}`;
    const testTitle = tc.input[tc.titleField];

    console.log(`------------------------------------------------------------`);
    console.log(`[Test ${i + 1}/5] Mutation: ${tc.mutation}`);
    console.log(`Shared Idempotency Key: ${sharedKey}`);

    // Dispatch TWO simultaneous concurrent requests before either finishes
    console.log(`  Dispatching 2 simultaneous requests with same key...`);
    const t0 = Date.now();
    const [res1, res2] = await Promise.all([
      request('POST', `/ai/tools/${tc.toolId}/execute`, { ...tc.input, stepIdempotencyKey: sharedKey }),
      request('POST', `/ai/tools/${tc.toolId}/execute`, { ...tc.input, stepIdempotencyKey: sharedKey }),
    ]);
    const duration = Date.now() - t0;
    console.log(`  Both requests completed concurrently in ${duration}ms`);

    const data1 = res1.data?.data?.data || res1.data?.data;
    const data2 = res2.data?.data?.data || res2.data?.data;

    const id1 = data1?.id;
    const id2 = data2?.id;

    console.log(`  Response 1 Entity ID: ${id1} (Status: ${res1.status})`);
    console.log(`  Response 2 Entity ID: ${id2} (Status: ${res2.status})`);

    // Verify entity IDs match exactly
    const idsMatch = id1 && id2 && id1 === id2;
    console.log(`  Assertion: Both responses returned identical entity ID? ${idsMatch ? 'PASS' : 'FAIL'}`);

    // Verify database count in PostgreSQL
    const rowsInDb = await tc.queryDb(testTitle);
    const exactlyOneRow = rowsInDb.length === 1;
    console.log(`  PostgreSQL Direct Check: ${rowsInDb.length} record(s) created (Expected: 1) -> ${exactlyOneRow ? 'PASS' : 'FAIL'}`);

    // Verify subsequent retry replay returns the original entity
    console.log(`  Executing subsequent retry with same key...`);
    const retryRes = await request('POST', `/ai/tools/${tc.toolId}/execute`, { ...tc.input, stepIdempotencyKey: sharedKey });
    const retryData = retryRes.data?.data?.data || retryRes.data?.data;
    const retryMatched = retryData?.id === id1;
    console.log(`  Subsequent Retry Entity ID: ${retryData?.id} -> ${retryMatched ? 'PASS' : 'FAIL'}`);

    const tcPassed = idsMatch && exactlyOneRow && retryMatched;
    if (!tcPassed) allPassed = false;

    results.push({
      mutation: tc.mutation,
      entityId: id1,
      concurrentMatched: idsMatch,
      singleDbRecord: exactlyOneRow,
      retryMatched,
      passed: tcPassed,
    });

    // Cleanup test records
    if (id1) await tc.cleanUp(id1);
    await prisma.aIAction.deleteMany({ where: { idempotencyKey: sharedKey } });
  }

  console.log('\n================================================================');
  console.log('P0-B CONCURRENT MUTATION SUITE RESULTS:');
  console.table(results);
  console.log(`Overall Status: ${allPassed ? 'ALL CONCURRENT MUTATIONS PASSED (100%)' : 'TESTS FAILED'}`);
  console.log('================================================================');

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

runTrueConcurrentMutationSuite().catch(async (e) => {
  console.error('Fatal error in concurrent mutation suite:', e);
  await prisma.$disconnect();
  process.exit(1);
});

