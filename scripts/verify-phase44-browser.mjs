import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'chrome_p44_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${tempDir}`,
  '--remote-debugging-port=9244',
  'http://localhost:3000'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const ARTIFACT_DIR = 'C:/Users/Home/.gemini/antigravity/brain/2c35a3f9-e980-40a2-bc3e-29b52de8acfb';
const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ';

async function run() {
  console.log('--- PHASE 44 BROWSER VERIFICATION START ---');
  await sleep(4000);

  const targetsRes = await fetch('http://127.0.0.1:9244/json/list');
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
    return new Promise((resolve) => {
      const msgId = id++;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return res?.result?.value;
  }

  async function screenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    if (res?.data) {
      const buffer = Buffer.from(res.data, 'base64');
      const targetPath = path.join(ARTIFACT_DIR, filename);
      fs.writeFileSync(targetPath, buffer);
      console.log(`Saved screenshot: ${filename}`);
    }
  }

  // Set Auth Token and AI Settings
  console.log('Setting localStorage auth token...');
  await evaluate(`
    localStorage.setItem('assistant_token', '${DEMO_TOKEN}');
    localStorage.setItem('assistant_ai_settings', JSON.stringify({
      assistantName: 'Nova',
      wakeWordEnabled: true,
      voiceURI: '',
      speechRate: 1.0,
      autoVoiceResponse: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      maskFinanceAmounts: true,
      hapticFeedback: true,
      autoBackgroundAnalysis: false
    }));
    location.reload();
  `);

  await sleep(6000);

  // Close any modal backdrop if popped up
  await evaluate(`
    (() => {
      const backdrops = Array.from(document.querySelectorAll('div')).filter(d => d.className.includes('fixed inset-0') && d.className.includes('bg-black'));
      backdrops.forEach(b => {
        const btn = b.parentElement ? b.parentElement.querySelector('button') : null;
        if (btn) btn.click();
      });
    })()
  `);
  await sleep(1000);

  // 1. Verify Clean Command Center with AI Companion HIDDEN
  console.log('Capturing Desktop Command Center with AI Assistant HIDDEN...');
  await screenshot('phase44_clean_desktop_hidden_assistant_1920x1080.png');

  // Verify that floating assistant is hidden in DOM
  const isHidden = await evaluate(`
    !document.querySelector('aside[aria-label="Google Assistant 3D AI On-Demand Interface"]')
  `);
  console.log('[VERIFIED] Floating Assistant is hidden by default:', isHidden);

  // 2. Trigger on-demand invocation
  console.log('Invoking Assistant on-demand via toggle event...');
  await evaluate(`
    window.dispatchEvent(new CustomEvent('ai-assistant:toggle-expand'));
  `);
  await sleep(2000);

  console.log('Capturing On-Demand Activated Assistant...');
  await screenshot('phase44_ondemand_assistant_active_1920x1080.png');

  // 3. Dismiss Assistant
  console.log('Dismissing Assistant...');
  await evaluate(`
    (() => {
      const dismissBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dismiss'));
      if (dismissBtn) dismissBtn.click();
    })()
  `);
  await sleep(1500);

  console.log('Capturing Post-Dismiss State...');
  await screenshot('phase44_post_dismiss_hidden_1920x1080.png');

  // 4. Capture My Day Tab under Phase 44
  console.log('Navigating to My Day tab...');
  await evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const myDayBtn = buttons.find(b => b.textContent.trim().startsWith('My Day'));
      if (myDayBtn) myDayBtn.click();
    })()
  `);
  await sleep(4000);

  console.log('Capturing My Day Workspace under Phase 44...');
  await screenshot('phase44_my_day_timeline_1920x1080.png');

  // 5. Mobile Viewport (390x844)
  console.log('Capturing Mobile Viewport (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(2000);
  await screenshot('phase44_mobile_clean_390x844.png');

  console.log('--- PHASE 44 BROWSER VERIFICATION COMPLETE ---');
  chrome.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Browser run error:', err);
  if (chrome) chrome.kill();
  process.exit(1);
});

