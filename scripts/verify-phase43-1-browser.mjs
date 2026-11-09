import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'chrome_p43_1_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${tempDir}`,
  '--remote-debugging-port=9229',
  'http://localhost:3000'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- PHASE 43.1 BROWSER VERIFICATION START ---');
  await sleep(4000);

  const targetsRes = await fetch('http://127.0.0.1:9229/json/list');
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
    console.log(`Saved screenshot: ${fileName}`);
  }

  // 1. Desktop 1920x1080 - Command Center with 3D Avatar & Interactive Command Bar
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000' });
  await sleep(4000);
  await capture('phase43_1_command_center_avatar_1920x1080.png');

  // 2. Open Settings Modal & verify customizable name input
  console.log('Opening Assistant Settings Modal...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[title*="preferences"]');
      if (btn) btn.click();
    })()`
  });
  await sleep(1500);
  await capture('phase43_1_assistant_custom_name_settings_1920x1080.png');

  // 3. Open Expanded Conversation Drawer
  console.log('Opening Expanded Conversation Drawer...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('button[aria-label="Close settings"]');
      if (closeBtn) closeBtn.click();
      const expandBtn = document.querySelector('button[aria-label="Toggle Conversation History"]');
      if (expandBtn) expandBtn.click();
    })()`
  });
  await sleep(1500);
  await capture('phase43_1_expanded_drawer_1920x1080.png');

  // 4. Test Mobile Viewport 390x844
  console.log('Testing Mobile Viewport (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(2000);
  await capture('phase43_1_mobile_390x844.png');

  console.log('--- ALL BROWSER SCREENSHOTS CAPTURED SUCCESSFULLY ---');
  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Error during browser verification:', err);
  chrome.kill();
  process.exit(1);
});

