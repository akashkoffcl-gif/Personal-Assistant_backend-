import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'chrome_p24_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${tempDir}`,
  '--remote-debugging-port=9223',
  'http://localhost:3000'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9223/json/list');
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

  // 1. Verify Application Usage Analytics viewports
  console.log('Testing Usage Analytics Viewports...');
  await send('Page.navigate', { url: 'http://localhost:3000/?tab=usage-analytics' });
  await sleep(1500);

  const desktopVps = [
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '1600x900',  width: 1600, height: 900 },
    { name: '1440x900',  width: 1440, height: 900 },
    { name: '1366x768',  width: 1366, height: 768 },
  ];

  for (const vp of desktopVps) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(600);

    const res = await send('Runtime.evaluate', {
      expression: `({
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
        delta: document.documentElement.scrollHeight - document.documentElement.clientHeight
      })`,
      returnByValue: true
    });

    const val = res.result.value;
    console.log(`Usage Analytics [${vp.name}]: clientHeight=${val.clientHeight}, scrollHeight=${val.scrollHeight}, delta=${val.delta}px (${val.delta === 0 ? 'PASS 0px' : 'FAIL'})`);
  }

  // 2. Capture Screenshots of tabs
  const captures = [
    { name: 'phase24_command_center_1920x1080.png', url: 'http://localhost:3000/?tab=command-center', width: 1920, height: 1080 },
    { name: 'phase24_usage_analytics_1920x1080.png', url: 'http://localhost:3000/?tab=usage-analytics', width: 1920, height: 1080 },
    { name: 'phase24_wellness_1920x1080.png', url: 'http://localhost:3000/?tab=wellness', width: 1920, height: 1080 },
    { name: 'phase24_calendar_planning_1920x1080.png', url: 'http://localhost:3000/?tab=calendar', width: 1920, height: 1080 },
  ];

  for (const cap of captures) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: cap.width,
      height: cap.height,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send('Page.navigate', { url: cap.url });
    await sleep(1500);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(path.join(artifactDir, cap.name), buffer);
    console.log(`Saved screenshot: ${cap.name}`);
  }

  ws.close();
  chrome.kill();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
}

run().catch(err => {
  console.error(err);
  chrome.kill();
  process.exit(1);
});
