import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:3001/api/v1';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '56e1cc13-e9af-45ef-81af-98c2b86c43b4';

const token = 'Bearer ' + jwt.sign(
  { sub: '00000000-0000-0000-0000-000000000001', email: 'demo@assistant.local', aud: 'authenticated', iss: 'supabase' },
  JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '2h' }
);

async function req(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: data.data !== undefined ? data.data : data };
}

async function run() {
  console.log('====================================================');
  console.log('🚀 PHASE 43.1 AI ASSISTANT REPAIR & VOICE AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  // 1. Test Chat API Endpoint
  console.log('--- 1. Testing AI Chat Endpoint ---');
  const chatRes = await req('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Good morning. Brief me.',
      assistantName: 'Nova',
    }),
  });
  assert(chatRes.status === 201 && chatRes.data.message?.content, 'AI Chat POST /ai/chat returns 201 with assistant response', `status: ${chatRes.status}`);

  // 2. Test Customizable Assistant Name
  console.log('\n--- 2. Testing Customizable Assistant Name ---');
  const customNameRes = await req('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Who are you and what is your name?',
      assistantName: 'Jarvis',
    }),
  });
  const jarvisContent = customNameRes.data.message?.content || '';
  assert(jarvisContent.includes('Jarvis'), 'AI Assistant responds with customized name (Jarvis)', `content: ${jarvisContent.slice(0, 80)}`);

  // 3. Test Autonomous Backend User Progress Analysis
  console.log('\n--- 3. Testing Autonomous User Progress Analysis ---');
  const progressRes = await req('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Analyze my user progress across the entire workspace',
      assistantName: 'Friday',
    }),
  });
  assert(
    progressRes.data.toolUsed === 'get_user_progress_analysis',
    'Backend triggers get_user_progress_analysis tool',
    `toolUsed: ${progressRes.data.toolUsed}`
  );
  const progressContent = progressRes.data.message?.content || '';
  assert(
    progressContent.includes('Friday') && progressContent.includes('progress'),
    'Assistant synthesizes progress data with custom name',
    `content: ${progressContent.slice(0, 100)}`
  );

  // 4. Test Briefing Endpoint
  console.log('\n--- 4. Testing Briefing Endpoint ---');
  const briefingRes = await req('/ai/briefing');
  assert(briefingRes.status === 200, 'GET /ai/briefing returns 200 OK', `status: ${briefingRes.status}`);

  // 5. Test Action Proposal & Execution
  console.log('\n--- 5. Testing Action Proposal & Execution ---');
  const actionRes = await req('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Create a high priority task to review Phase 43 architecture',
      assistantName: 'Nova',
    }),
  });
  assert(actionRes.status === 201, 'Action proposal query returned 201', `status: ${actionRes.status}`);

  // 6. Test Cross-User Isolation
  console.log('\n--- 6. Testing Cross-User Tenant Isolation ---');
  const user2Token = 'Bearer ' + jwt.sign(
    { sub: '00000000-0000-0000-0000-000000000002', email: 'auditor@assistant.local', aud: 'authenticated', iss: 'supabase' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
  const convId = chatRes.data.conversationId;
  if (convId) {
    const leakRes = await fetch(`${API_BASE}/ai/conversations/${convId}`, {
      headers: { Authorization: user2Token },
    });
    assert(leakRes.status === 404, 'User 2 cannot access User 1 conversation (404 Not Found)', `status: ${leakRes.status}`);
  }

  console.log('\n====================================================');
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

