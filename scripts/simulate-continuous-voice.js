const http = require('http');

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
          resolve({ status: res.statusCode, data: JSON.parse(buf || '{}') });
        } catch {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runContinuousVoiceSimulation() {
  console.log('================================================================');
  console.log('PHASE 52.0 — MULTI-TURN CONTINUOUS VOICE INTERACTION SIMULATION');
  console.log('Target API:', BASE_URL);
  console.log('User ID:', TEST_USER_ID);
  console.log('================================================================\n');

  const turns = [
    { turn: 1, message: 'Hey Nova, what are my tasks today?' },
    { turn: 2, message: 'Which one is the most important?' },
    { turn: 3, message: 'Move it to tomorrow morning.' },
    { turn: 4, message: 'Show me more details about that.' },
    { turn: 5, message: 'Summarize my schedule for the rest of the week.' },
    { turn: 6, message: 'What about my financial summary?' },
    { turn: 7, message: 'How many routines do I have left today?' },
    { turn: 8, message: 'Log 500ml of water intake.' },
    { turn: 9, message: 'What is my current productivity score?' },
    { turn: 10, message: 'Start a 25 minute focus session.' },
    { turn: 11, message: 'Pause the session.' },
    { turn: 12, message: 'Resume it now.' },
    { turn: 13, message: 'Check my recent memories.' },
    { turn: 14, message: 'Remember that I prefer morning meetings.' },
    { turn: 15, message: 'What did you just remember?' },
    { turn: 16, message: 'Create a reminder to check email at 5pm.' },
    { turn: 17, message: 'What reminders are pending?' },
    { turn: 18, message: 'Show my current projects.' },
    { turn: 19, message: 'What is the target date for the first project?' },
    { turn: 20, message: 'Stop listening, goodbye Nova.' }
  ];

  let conversationId = null;
  const results = [];

  for (const t of turns) {
    const t0 = Date.now();
    console.log(`[Turn ${t.turn}/20] User: "${t.message}"`);
    try {
      const res = await request('POST', '/ai/chat', {
        message: t.message,
        conversationId: conversationId || undefined
      });

      const latency = Date.now() - t0;
      const reply = res.data?.message?.content || res.data?.reply || 'Processed';
      if (res.data?.conversationId && !conversationId) {
        conversationId = res.data.conversationId;
      }

      const passed = res.status === 200 || res.status === 201;
      console.log(`   └─ Nova (${latency}ms): "${reply.substring(0, 100)}..." (Status: ${res.status})\n`);
      results.push({ turn: t.turn, status: res.status, latency, passed });
    } catch (err) {
      console.error(`   └─ Error:`, err.message);
      results.push({ turn: t.turn, status: 500, error: err.message, passed: false });
    }
  }

  const passedCount = results.filter(r => r.passed).length;
  console.log('================================================================');
  console.log(`CONTINUOUS VOICE SIMULATION RESULT: ${passedCount}/20 TURNS PASSED`);
  console.log('Persistent Conversation ID:', conversationId);
  console.log('================================================================');
}

runContinuousVoiceSimulation();

