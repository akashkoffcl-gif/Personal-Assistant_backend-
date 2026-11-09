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
          resolve({ status: res.statusCode, data: buf });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const SCENARIOS = [
  { id: 1, name: 'Simple factual question', input: 'What is the speed of light?' },
  { id: 2, name: 'Multi-turn contextual question - Turn 1', input: 'I am working on the website project.' },
  { id: 3, name: 'Multi-turn contextual question - Turn 2 (Pronoun resolution)', input: 'The client wants it finished this week. What should I do first?' },
  { id: 4, name: 'Historical conversation reference', input: 'Which project did I just mention?' },
  { id: 5, name: 'Personal preference retrieval', input: 'What are my deep work focus preferences?' },
  { id: 6, name: 'Implicit request for assistance', input: 'I have a lot to finish today.' },
  { id: 7, name: 'Frustrated user interaction', input: 'This project is becoming a mess.' },
  { id: 8, name: 'Uncertain user interaction', input: "I don't know what to focus on." },
  { id: 9, name: 'Time-sensitive request', input: 'Quickly tell me what I need to do.' },
  { id: 10, name: 'Ambiguous instruction', input: 'Organize things.' },
  { id: 11, name: 'Topic switching', input: 'By the way, what was my spending this month?' },
  { id: 12, name: 'Correction of previous information', input: 'Actually, that is not what I meant. Focus on the UI first.' },
  { id: 13, name: 'Mixed technical and conversational discussion', input: 'How does BullMQ handle delayed retries in our worker architecture?' },
  { id: 14, name: 'Request requiring no workflow', input: 'Thanks Nova, that helps a lot.' },
  { id: 15, name: 'Request requiring one tool', input: 'What tasks are on my schedule today?' },
  { id: 16, name: 'Request requiring multiple tools / plan', input: 'Plan my day with morning focus sessions.' },
  { id: 17, name: 'Unauthorized action request', input: 'Delete user database tables.' },
  { id: 18, name: 'Memory correction', input: 'Remember that I prefer morning deep work sessions.' },
  { id: 19, name: 'Tamil-English mixed input', input: 'Enaku inaiku enna tasks iruku?' },
  { id: 20, name: 'Voice conversation follow-up', input: 'And how long will that take?' }
];

async function runEvaluation() {
  console.log('=== STARTING NOVA PHASE 53.1 20-SCENARIO EVALUATION ===');
  let convId = null;
  const results = [];

  for (const s of SCENARIOS) {
    const start = Date.now();
    try {
      const res = await request('POST', '/ai/chat', {
        message: s.input,
        conversationId: convId || undefined
      });
      const latency = Date.now() - start;

      if (res.data?.conversationId) {
        convId = res.data.conversationId;
      }

      const payload = res.data?.data || res.data;
      const intent = payload?.intentAnalysis?.primaryIntent || 'UNKNOWN';
      const policy = payload?.intentAnalysis?.decisionPolicy || 'UNKNOWN';
      const actionProposed = !!payload?.proposedAction;
      const toolUsed = payload?.toolUsed || null;
      const content = payload?.message?.content || '';

      const record = {
        scenarioId: s.id,
        name: s.name,
        input: s.input,
        primaryIntent: intent,
        decisionPolicy: policy,
        actionProposed,
        toolUsed,
        latencyMs: latency,
        preview: content.slice(0, 100).replace(/\n/g, ' '),
        status: (res.status === 201 || res.status === 200) && intent !== 'UNKNOWN' ? 'PASS' : 'FAIL'
      };

      results.push(record);
      console.log(`[#${s.id}] ${s.name} -> Intent: ${intent} | Policy: ${policy} | Action: ${actionProposed} | Latency: ${latency}ms [${record.status}]`);
    } catch (err) {
      console.error(`[#${s.id}] ${s.name} ERROR:`, err.message);
      results.push({
        scenarioId: s.id,
        name: s.name,
        input: s.input,
        status: 'FAIL',
        error: err.message
      });
    }
  }

  console.log('\n=== EVALUATION SUMMARY ===');
  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.status === 'PASS').length}`);
  console.log(`Failed: ${results.filter(r => r.status === 'FAIL').length}`);

  return results;
}

runEvaluation().catch(console.error);
