/**
 * PHASE 51.6.3 — P0-C Monotonic Database-Boundary Fencing Harness
 * 
 * Verifies the exact sequence required by Phase 51.6.3:
 * 1. Worker A holds fencing version 10.
 * 2. Worker A pauses.
 * 3. Worker B acquires version 11.
 * 4. Worker A resumes and attempts domain mutation using version 10.
 * 5. Worker A is rejected at the database mutation boundary (HTTP 403 / Mutation rejected).
 * 6. Worker B commits using version 11.
 * 7. Exactly ONE entity exists in PostgreSQL.
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');
const { createHash } = require('crypto');

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

async function runMonotonicFencingTest() {
  console.log('================================================================');
  console.log('PHASE 51.6.3 — P0-C MONOTONIC DATABASE FENCING HARNESS');
  console.log('Target API:', BASE_URL);
  console.log('User ID:', TEST_USER_ID);
  console.log('================================================================\n');

  const workerTokenA = `worker-A-${Date.now()}`;
  const workerTokenB = `worker-B-${Date.now()}`;
  const projectTitle = `Monotonic Fenced Project ${Date.now()}`;

  const now = new Date();
  const step1 = {
    id: 'step-1',
    toolId: 'create_project',
    description: 'Create test project with monotonic fencing',
    input: { title: projectTitle, description: 'Monotonic fencing boundary race test' },
    dependencies: [],
    riskLevel: 'MEDIUM',
    status: 'READY',
  };

  const canonicalSteps = [{
    id: step1.id,
    toolId: step1.toolId,
    input: step1.input,
    dependencies: [...step1.dependencies].sort(),
    riskLevel: step1.riskLevel,
  }];
  const stepPayloadHash = createHash('sha256').update(JSON.stringify(canonicalSteps)).digest('hex');

  // Step 1: Worker A holds fencing version 10
  const fencingVersionA = 10;
  const shortLeaseExpiry = new Date(now.getTime() + 1000).toISOString(); // 1s lease
  const planPayload = {
    id: `wf-fencing-${Date.now()}`,
    userId: TEST_USER_ID,
    title: 'Monotonic Fencing Hardening Test',
    originalPrompt: 'Create project with database-boundary lease fencing',
    status: 'RUNNING',
    planVersion: 1,
    steps: [step1],
    approvalSignature: {
      approvedAt: now.toISOString(),
      approvedBy: TEST_USER_ID,
      expiresAt: new Date(now.getTime() + 600000).toISOString(),
      planVersion: 1,
      stepPayloadHash,
    },
    overallRisk: 'MEDIUM',
    requiresExplicitApproval: true,
    lease: {
      workflowId: '',
      workerOwnershipToken: workerTokenA,
      leaseExpiresAt: shortLeaseExpiry,
      lastHeartbeatAt: now.toISOString(),
      executionAttempt: 1,
      fencingVersion: fencingVersionA,
    },
    stepIdempotency: {},
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const action = await prisma.aIAction.create({
    data: {
      userId: TEST_USER_ID,
      actionType: 'MULTI_STEP_WORKFLOW',
      description: 'Monotonic Fencing Hardening Test',
      status: 'RUNNING',
      idempotencyKey: `fence-key-${Date.now()}`,
      payload: planPayload,
      createdAt: now,
    }
  });

  const workflowId = action.id;
  planPayload.id = workflowId;
  planPayload.lease.workflowId = workflowId;
  await prisma.aIAction.update({
    where: { id: workflowId },
    data: { payload: planPayload },
  });

  console.log(`[Step 1] Initialized Workflow ${workflowId}`);
  console.log(`  Worker A holds Token: ${workerTokenA} | Fencing Version: ${fencingVersionA}`);

  // Step 2: Worker A pauses; lease expires
  console.log(`[Step 2] Worker A pauses (1.5s delay)...`);
  await new Promise(r => setTimeout(r, 1500));

  // Step 3: Worker B acquires version 11 atomically
  console.log(`[Step 3] Worker B acquires lease with monotonically increasing fencing version 11...`);
  const fencingVersionB = 11;
  const newLeaseExpiry = new Date(Date.now() + 30000).toISOString();
  const claimCas = await prisma.aIAction.updateMany({
    where: { id: workflowId, status: 'RUNNING' },
    data: {
      payload: {
        ...planPayload,
        lease: {
          workflowId,
          workerOwnershipToken: workerTokenB,
          leaseExpiresAt: newLeaseExpiry,
          lastHeartbeatAt: new Date().toISOString(),
          executionAttempt: 2,
          fencingVersion: fencingVersionB,
        },
        updatedAt: new Date().toISOString(),
      }
    }
  });
  console.log(`  Worker B CAS claim count: ${claimCas.count} (Version: ${fencingVersionB})`);

  // Step 4 & 5: Worker A resumes and attempts domain mutation using version 10
  console.log(`[Step 4 & 5] Worker A resumes and attempts domain mutation using stale version 10...`);
  const workerARes = await request('POST', `/ai/tools/create_project/execute`, {
    ...step1.input,
    stepIdempotencyKey: `step-idem-${workflowId}-step-1`,
    workflowId,
    fencingVersion: fencingVersionA,
  });

  console.log(`  Worker A response HTTP status: ${workerARes.status}`);
  console.log(`  Worker A response body:`, workerARes.data);
  const workerAFenced = workerARes.status === 403 && (workerARes.data?.message?.includes('Stale worker fencing version') || workerARes.data?.error?.includes('Stale worker fencing version'));
  console.log(`  Assertion: Stale Worker A rejected at database mutation boundary? ${workerAFenced ? 'PASS (Fenced)' : 'FAIL'}`);

  // Step 6: Worker B commits using version 11
  console.log(`[Step 6] Worker B commits using valid active version 11...`);
  const workerBRes = await request('POST', `/ai/tools/create_project/execute`, {
    ...step1.input,
    stepIdempotencyKey: `step-idem-${workflowId}-step-1`,
    workflowId,
    fencingVersion: fencingVersionB,
  });

  console.log(`  Worker B response HTTP status: ${workerBRes.status}`);
  const workerBData = workerBRes.data?.data?.data || workerBRes.data?.data;
  console.log(`  Worker B committed entity ID: ${workerBData?.id}`);
  const workerBSuccess = (workerBRes.status === 200 || workerBRes.status === 201) && workerBData?.id;

  // Step 7: Direct PostgreSQL Assertions: Exactly 1 entity exists
  const matchingProjects = await prisma.project.findMany({
    where: { userId: TEST_USER_ID, title: projectTitle },
  });
  console.log(`[Step 7] Direct PostgreSQL Query Count: ${matchingProjects.length} project(s) created.`);
  const exactlyOneProjectInDb = matchingProjects.length === 1 && matchingProjects[0].id === workerBData?.id;
  console.log(`  Assertion: Exactly ONE domain entity exists in PostgreSQL? ${exactlyOneProjectInDb ? 'PASS' : 'FAIL'}`);

  const testPassed = workerAFenced && workerBSuccess && exactlyOneProjectInDb;
  console.log('\n================================================================');
  console.log('P0-C MONOTONIC FENCING RESULTS:');
  console.log(`Worker A Rejected at DB Boundary: ${workerAFenced ? 'PASS (403 Forbidden)' : 'FAIL'}`);
  console.log(`Worker B Committed with Version 11: ${workerBSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`PostgreSQL Row Count is Exactly 1: ${exactlyOneProjectInDb ? 'PASS' : 'FAIL'}`);
  console.log(`Overall Status: ${testPassed ? 'ALL FENCING TESTS PASSED (100%)' : 'TESTS FAILED'}`);
  console.log('================================================================');

  // Cleanup
  if (matchingProjects.length > 0) {
    await prisma.project.deleteMany({ where: { id: matchingProjects[0].id } });
  }
  await prisma.aIAction.deleteMany({ where: { id: workflowId } });
  await prisma.aIAction.deleteMany({ where: { idempotencyKey: `step-idem-${workflowId}-step-1` } });

  await prisma.$disconnect();
  process.exit(testPassed ? 0 : 1);
}

runMonotonicFencingTest().catch(async (e) => {
  console.error('Fatal crash in monotonic fencing test:', e);
  await prisma.$disconnect();
  process.exit(1);
});

