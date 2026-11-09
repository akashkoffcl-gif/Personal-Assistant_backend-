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

const DIALOGUES = [
  {
    name: 'Dialogue 1: Casual Conversation & Work Progress (Multi-turn)',
    turns: [
      'Hey Nova, honestly today has been pretty hectic so far.',
      'I was finally able to finish the initial UI Design for the Website Launch.',
      'Now I am thinking what should be the logical next step before we show the client?'
    ]
  },
  {
    name: 'Dialogue 2: Frustration & Decision Overload',
    turns: [
      'This whole deployment setup is turning into a total mess and I hate debugging Docker networking.',
      'Should I just roll back to staging or keep pushing through the proxy errors?'
    ]
  },
  {
    name: 'Dialogue 3: Personal Memory & Preference Update',
    turns: [
      'Remember that going forward I do not take any meetings before 11 AM.',
      'What are my current schedule constraints for tomorrow morning?'
    ]
  },
  {
    name: 'Dialogue 4: Tamil-English Mixed Natural Communication',
    turns: [
      'Nova, inaiku morning focus session mudinjidha? What is next on my list?'
    ]
  },
  {
    name: 'Dialogue 5: Action Safety & Anti-Unsolicited Task Mutation',
    turns: [
      'I am feeling totally overwhelmed by the 10 different bugs reported today.',
      'Do not touch anything in the database right now, just give me a structured perspective.'
    ]
  }
];

async function runRealWorldDialogues() {
  console.log('=== RUNNING REAL-WORLD DIALOGUE AUDIT FOR PHASE 53.2 ===\n');
  const dialogueResults = [];

  for (const d of DIALOGUES) {
    console.log(`>>> Starting ${d.name}...`);
    let convId = null;
    const turnRecords = [];

    for (let i = 0; i < d.turns.length; i++) {
      const turnInput = d.turns[i];
      const start = Date.now();
      const res = await request('POST', '/ai/chat', {
        message: turnInput,
        conversationId: convId || undefined
      });
      const latency = Date.now() - start;

      const payload = res.data?.data || res.data;
      if (payload?.conversationId) {
        convId = payload.conversationId;
      }

      const intent = payload?.intentAnalysis?.primaryIntent || 'UNKNOWN';
      const policy = payload?.intentAnalysis?.decisionPolicy || 'UNKNOWN';
      const emotion = payload?.intentAnalysis?.detectedEmotion || 'NONE';
      const actionProposed = !!payload?.proposedAction;
      const toolUsed = payload?.toolUsed || null;
      const responseText = payload?.message?.content || '';

      const record = {
        turnIndex: i + 1,
        input: turnInput,
        intent,
        policy,
        emotion,
        actionProposed,
        toolUsed,
        latencyMs: latency,
        response: responseText
      };

      turnRecords.push(record);
      console.log(`  [Turn ${i+1}] Input: "${turnInput}"`);
      console.log(`  Intent: ${intent} | Policy: ${policy} | Emotion: ${emotion} | Action Proposed: ${actionProposed} | Latency: ${latency}ms`);
      console.log(`  Response Preview: ${responseText.slice(0, 150).replace(/\n/g, ' ')}...\n`);
    }

    dialogueResults.push({
      name: d.name,
      conversationId: convId,
      turns: turnRecords
    });
  }

  return dialogueResults;
}

runRealWorldDialogues()
  .then(res => {
    console.log('=== REAL-WORLD DIALOGUE AUDIT COMPLETE ===');
    console.log(JSON.stringify(res, null, 2));
  })
  .catch(console.error);

