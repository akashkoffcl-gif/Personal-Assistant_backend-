import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '56e1cc13-e9af-45ef-81af-98c2b86c43b4';
const token = jwt.sign(
  { sub: '00000000-0000-0000-0000-000000000001', email: 'demo@assistant.local', aud: 'authenticated', iss: 'supabase' },
  JWT_SECRET,
  { algorithm: 'HS256', expiresIn: '2h' }
);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'chrome_p42_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${tempDir}`,
  '--remote-debugging-port=9245',
  'http://localhost:3000'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('====================================================');
  console.log('🚀 PHASE 42 KNOWLEDGE INTELLIGENCE BROWSER UI VERIFICATION');
  console.log('====================================================\n');

  await sleep(4000);

  const targetsRes = await fetch('http://127.0.0.1:9245/json/list');
  const targets = await targetsRes.json();
  const pageTarget = targets.find(t => t.type === 'page');

  if (!pageTarget) {
    console.error('No page target found');
    chrome.kill();
    process.exit(1);
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };

  await new Promise(resolve => {
    if (ws.readyState === WebSocket.OPEN) resolve();
    else ws.onopen = resolve;
  });

  function send(method, params = {}) {
    return new Promise(resolve => {
      const msgId = id++;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  const artifactDir = 'C:\\Users\\Home\\.gemini\\antigravity\\brain\\2c35a3f9-e980-40a2-bc3e-29b52de8acfb';

  async function capture(fileName) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const fullPath = path.join(artifactDir, fileName);
    fs.writeFileSync(fullPath, Buffer.from(shot.data, 'base64'));
    console.log(`  -> Saved screenshot: ${fileName}`);
  }

  // Set desktop viewport and seed auth token
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000' });
  await sleep(2500);

  console.log('Seeding authentication token into localStorage...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      localStorage.setItem('assistant_token', '${token}');
      localStorage.setItem('assistant_demo_mode', 'true');
    })()`
  });

  // Navigate directly to knowledge tab
  console.log('\n[1/9] Navigating to Knowledge Workspace Overview (1920x1080)...');
  await send('Page.navigate', { url: 'http://localhost:3000/?tab=knowledge' });
  await sleep(3500);

  // Ensure Overview tab is clicked
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().startsWith('Overview'));
      if (btn) btn.click();
    })()`
  });
  await sleep(2000);
  await capture('phase42_knowledge_overview_1920x1080.png');

  // 2. View: All Notes
  console.log('\n[2/9] Switching to All Notes view...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('All Notes'));
      if (btn) btn.click();
    })()`
  });
  await sleep(2500);
  await capture('phase42_all_notes_grid_1920x1080.png');

  // 3. Open Note Editor Modal (Markdown Preview & Edit)
  console.log('\n[3/9] Opening Note Editor Modal...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('New Note'));
      if (btn) btn.click();
    })()`
  });
  await sleep(2000);
  await capture('phase42_note_editor_markdown_1920x1080.png');

  // 4. Open Note with Revision History
  console.log('\n[4/9] Opening Note with Revision History...');
  // Close new note modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === '✕' || b.innerText === 'Close');
      if (closeBtn) closeBtn.click();
    })()`
  });
  await sleep(1000);

  // Click on the first note card title to open its detail/history
  await send('Runtime.evaluate', {
    expression: `(() => {
      const cardTitle = document.querySelector('h3.cursor-pointer');
      if (cardTitle) cardTitle.click();
    })()`
  });
  await sleep(1500);

  // Switch to History tab in modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const histTab = Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'History');
      if (histTab) histTab.click();
    })()`
  });
  await sleep(1500);
  await capture('phase42_revision_history_1920x1080.png');

  // Close modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === '✕' || b.innerText === 'Close');
      if (closeBtn) closeBtn.click();
    })()`
  });
  await sleep(1000);

  // 5. View: Documents & Attachments Hub
  console.log('\n[5/9] Switching to Documents & Attachments Hub...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Documents'));
      if (btn) btn.click();
    })()`
  });
  await sleep(2500);
  await capture('phase42_documents_hub_1920x1080.png');

  // 6. View: Knowledge Graph
  console.log('\n[6/9] Switching to Knowledge Graph View...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Knowledge Graph'));
      if (btn) btn.click();
    })()`
  });
  await sleep(2500);
  await capture('phase42_knowledge_graph_1920x1080.png');

  // 7. View: AI Search & Grounded Ask
  console.log('\n[7/9] Switching to AI Search & Ask View and executing query...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('AI Search & Ask'));
      if (btn) btn.click();
    })()`
  });
  await sleep(1500);

  // Type in question and submit
  await send('Runtime.evaluate', {
    expression: `(() => {
      const input = document.querySelector('input[placeholder*="Ask any question"]');
      if (input) {
        input.value = 'What is Redis used for in this architecture?';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const askBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Ask AI'));
      if (askBtn) askBtn.click();
    })()`
  });
  await sleep(4000);
  await capture('phase42_ai_search_citations_1920x1080.png');

  // 8. View: Daily Journal
  console.log('\n[8/9] Switching to Daily Journal View...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Daily Journal'));
      if (btn) btn.click();
    })()`
  });
  await sleep(2000);
  await capture('phase42_daily_journal_1920x1080.png');

  // 9. Mobile Viewport (390x844)
  console.log('\n[9/9] Testing Mobile Viewport (390x844 iPhone 12/13/14)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:3000/?tab=knowledge' });
  await sleep(3500);
  await capture('phase42_knowledge_mobile_390x844.png');

  console.log('\n====================================================');
  console.log('✅ ALL 9 VIEWPORT SCREENSHOTS CAPTURED SUCCESSFULLY!');
  console.log('====================================================');

  chrome.kill();
  process.exit(0);
}

run().catch((e) => {
  console.error('Fatal verification error:', e);
  chrome.kill();
  process.exit(1);
});
