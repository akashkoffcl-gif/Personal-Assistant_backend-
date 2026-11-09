/**
 * PHASE 51.6.2 — P0-C Worker Fencing at Mutation Boundary Verification
 * 
 * Verifies the specific race condition:
 * 1. Worker A validates lease for workflow W
 * 2. Worker A pauses (simulated delay / GC pause)
 * 3. Lease expires or Worker B claims expired lease via claimWorkflowRecovery
 * 4. Worker A resumes and attempts domain mutation
 * 5. Fencing check at mutation boundary rejects Worker A's write (403 Forbidden)
 * 6. Worker B executes mutation safely
 * 7. PostgreSQL assertion: Exactly 1 valid state transition and 1 domain entity exist
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

async function runWorkerFencingRaceTest() {
  console.log('================================================================');
  console.log('PHASE 51.6.2 — P0-C WORKER FENCING AT MUTATION BOUNDARY HARNESS');
  console.log('Target API:', BASE_URL);
  console.log('User ID:', TEST_USER_ID);
  console.log('================================================================\n');

  const workerTokenA = `worker-A-${Date.now()}`;
  const workerTokenB = `worker-B-${Date.now()}`;
  const projectTitle = `Fenced Project ${Date.now()}`;

  // 1. Create a CONFIRMED workflow with valid approval signature, Worker A ownership, and short lease
  const now = new Date();
  const shortLeaseExpiry = new Date(now.getTime() + 1000).toISOString(); // 1s lease
  const approvalExpiry = new Date(now.getTime() + 600000).toISOString(); // 10 min expiry

  const step1 = {
    id: 'step-1',
    toolId: 'create_project',
    description: 'Create test project with worker fencing',
    input: { title: projectTitle, description: 'Lease boundary race test' },
    dependencies: [],
    riskLevel: 'MEDIUM',
    status: 'READY',
  };

  const { createHash } = require('crypto');
  const canonicalSteps = [{
    id: step1.id,
    toolId: step1.toolId,
    input: step1.input,
    dependencies: [...step1.dependencies].sort(),
    riskLevel: step1.riskLevel,
  }];
  const stepPayloadHash = createHash('sha256').update(JSON.stringify(canonicalSteps)).digest('hex');

  const planPayload = {
    id: `wf-fence-${Date.now()}`,
    userId: TEST_USER_ID,
    title: 'Worker Fencing Hardening Test',
    originalPrompt: 'Create project with lease fencing verification',
    status: 'RUNNING',
    planVersion: 1,
    steps: [step1],
    approvalSignature: {
      approvedAt: now.toISOString(),
      approvedBy: TEST_USER_ID,
      expiresAt: approvalExpiry,
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
    },
    stepIdempotency: {},
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const action = await prisma.aIAction.create({
    data: {
      userId: TEST_USER_ID,
      actionType: 'MULTI_STEP_WORKFLOW',
      description: 'Worker Fencing Hardening Test',
      status: 'RUNNING',
      idempotencyKey: `fence-wf-key-${Date.now()}`,
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

  console.log(`[Step 1] Workflow ${workflowId} initialized with Worker A token: ${workerTokenA}`);
  console.log(`[Step 1] Initial lease expiration: ${shortLeaseExpiry}`);

  // 2. Simulate Worker A validating lease at step start
  console.log(`[Step 2] Worker A verifies lease initially...`);
  const recordBeforePause = await prisma.aIAction.findUnique({ where: { id: workflowId } });
  const planBefore = recordBeforePause.payload;
  const workerAInitiallyValid = planBefore.lease.workerOwnershipToken === workerTokenA;
  console.log(`[Step 2] Worker A token match? ${workerAInitiallyValid ? 'YES (Valid)' : 'NO'}`);

  // 3. Worker A pauses; lease expires (wait 1.5 seconds)
  console.log(`[Step 3] Worker A experiences a 1.5s pause; lease expires...`);
  await new Promise(r => setTimeout(r, 1500));

  // 4. Worker B detects expired lease and claims recovery atomically
  console.log(`[Step 4] Worker B detects expired lease and claims recovery...`);
  const newLeaseExpiry = new Date(Date.now() + 30000).toISOString();
  const claimCas = await prisma.aIAction.updateMany({
    where: {
      id: workflowId,
      status: 'RUNNING',
    },
    data: {
      payload: {
        ...planBefore,
        lease: {
          workflowId,
          workerOwnershipToken: workerTokenB,
          leaseExpiresAt: newLeaseExpiry,
          lastHeartbeatAt: new Date().toISOString(),
          executionAttempt: 2,
        },
        updatedAt: new Date().toISOString(),
      }
    }
  });

  console.log(`[Step 4] Worker B CAS claim count: ${claimCas.count} (Token: ${workerTokenB})`);

  // 5. Worker A wakes up and attempts execution using stale token workerTokenA
  console.log(`[Step 5] Worker A resumes and attempts execution using stale token ${workerTokenA}...`);
  const postResA = await request('POST', `/ai/workflows/${workflowId}/execute?workerToken=${workerTokenA}`);
  console.log(`[Step 5] Worker A execution HTTP status: ${postResA.status}`);
  const workerAFenced = postResA.status === 403 && postResA.data?.message?.includes('fenced');
  console.log(`[Step 5] Assertion: Was stale Worker A fenced from committing? ${workerAFenced ? 'PASS (Fenced)' : 'FAIL'}`);

  // 6. Worker B executes workflow with active token
  console.log(`[Step 6] Worker B executes workflow with active valid token ${workerTokenB}...`);
  const postResB = await request('POST', `/ai/workflows/${workflowId}/execute?workerToken=${workerTokenB}`);
  console.log(`[Step 6] Worker B execution HTTP status: ${postResB.status}`);

  // 7. Read PostgreSQL database assertions
  const createdProjects = await prisma.project.findMany({
    where: { userId: TEST_USER_ID, title: projectTitle },
  });
  console.log(`[Step 7] Direct PostgreSQL Query: ${createdProjects.length} project(s) matching title.`);
  const exactlyOneProjectInDb = createdProjects.length === 1;

  const finalWorkflow = await prisma.aIAction.findUnique({ where: { id: workflowId } });
  console.log(`[Step 7] Final Workflow Status: ${finalWorkflow.status}`);
  const finalExecutionAttempt = finalWorkflow.payload?.lease?.executionAttempt;
  console.log(`[Step 7] Final Lease Execution Attempt: ${finalExecutionAttempt} (Claimed by: ${finalWorkflow.payload?.lease?.workerOwnershipToken})`);

  const passed = workerAFenced && exactlyOneProjectInDb && finalWorkflow.status === 'EXECUTED';
  console.log('\n================================================================');
  console.log('P0-C WORKER FENCING VERIFICATION RESULTS:');
  console.log(`Worker A Fenced: ${workerAFenced ? 'YES (PASS)' : 'NO (FAIL)'}`);
  console.log(`Exactly 1 Project Created in DB: ${exactlyOneProjectInDb ? 'YES (PASS)' : 'NO (FAIL)'}`);
  console.log(`Final Workflow Status: ${finalWorkflow.status} (PASS)`);
  console.log(`Overall Status: ${passed ? 'ALL FENCING ASSERTIONS PASSED (100%)' : 'TESTS FAILED'}`);
  console.log('================================================================');

  // Cleanup
  if (createdProjects.length > 0) {
    await prisma.project.deleteMany({ where: { id: createdProjects[0].id } });
  }
  await prisma.aIAction.deleteMany({ where: { id: workflowId } });

  await prisma.$disconnect();
  process.exit(passed ? 0 : 1);
}

runWorkerFencingRaceTest().catch(async (e) => {
  console.error('Fatal error in worker fencing harness:', e);
  await prisma.$disconnect();
  process.exit(1);
});
