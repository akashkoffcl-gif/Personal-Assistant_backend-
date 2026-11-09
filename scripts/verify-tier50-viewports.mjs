import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'chrome_viewports_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${tempDir}`,
  '--remote-debugging-port=9250',
  'http://localhost:3000'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const ARTIFACT_DIR = 'C:/Users/Home/.gemini/antigravity/brain/2c35a3f9-e980-40a2-bc3e-29b52de8acfb';
const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ';

async function run() {
  console.log('--- MULTI-VIEWPORT AUDIT START ---');
  await sleep(4000);

  const targetsRes = await fetch('http://127.0.0.1:9250/json/list');
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

  await evaluate(`
    localStorage.setItem('assistant_token', '${DEMO_TOKEN}');
    location.reload();
  `);
  await sleep(5000);

  const viewports = [
    { name: '1920x1080', width: 1920, height: 1080, mobile: false },
    { name: '1600x900', width: 1600, height: 900, mobile: false },
    { name: '1440x900', width: 1440, height: 900, mobile: false },
    { name: '1366x768', width: 1366, height: 768, mobile: false },
    { name: '390x844', width: 390, height: 844, mobile: true },
  ];

  for (const vp of viewports) {
    console.log(`Setting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.mobile ? 2 : 1,
      mobile: vp.mobile
    });
    await sleep(1500);

    // Dismiss any modal
    await evaluate(`
      (() => {
        const backdrops = Array.from(document.querySelectorAll('div')).filter(d => d.className.includes('fixed inset-0') && d.className.includes('bg-black'));
        backdrops.forEach(b => {
          const btn = b.parentElement ? b.parentElement.querySelector('button') : null;
          if (btn) btn.click();
        });
      })()
    `);
    await sleep(500);

    await screenshot(`tier50_viewport_${vp.name}.png`);
  }

  console.log('--- MULTI-VIEWPORT AUDIT COMPLETE ---');
  chrome.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Viewport run error:', err);
  if (chrome) chrome.kill();
  process.exit(1);
});

