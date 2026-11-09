import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'chrome_p43_2_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${tempDir}`,
  '--remote-debugging-port=9238',
  'http://localhost:3000'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const ARTIFACT_DIR = 'C:/Users/Home/.gemini/antigravity/brain/2c35a3f9-e980-40a2-bc3e-29b52de8acfb';

async function run() {
  console.log('--- PHASE 43.2 BROWSER VERIFICATION START ---');
  await sleep(4000);

  const targetsRes = await fetch('http://127.0.0.1:9238/json/list');
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

  async function clickNavTab(tabName) {
    return await evaluate(`
      (() => {
        const nav = document.querySelector('nav') || document.querySelector('header');
        const buttons = Array.from((nav || document).querySelectorAll('button'));
        const target = buttons.find(b => {
          const t = b.textContent ? b.textContent.trim() : '';
          return t === '${tabName}' || t.startsWith('${tabName} ');
        });
        if (target) {
          target.click();
          return true;
        }
        return false;
      })()
    `);
  }

  async function closeAnyBackdropModal() {
    await evaluate(`
      (() => {
        const modals = document.querySelectorAll('.fixed.inset-0');
        modals.forEach(m => {
          const xBtn = m.querySelector('button');
          if (xBtn) xBtn.click();
        });
      })()
    `);
    await sleep(1000);
  }

  async function capture(filename, width, height) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    await sleep(1500);
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    if (screenshot && screenshot.data) {
      const buf = Buffer.from(screenshot.data, 'base64');
      const outPath = path.join(ARTIFACT_DIR, filename);
      fs.writeFileSync(outPath, buf);
      console.log(`Saved screenshot: ${filename} (${width}x${height})`);
    } else {
      console.error(`Failed to capture screenshot for ${filename}`);
    }
  }

  // Initial wait for application bootstrap
  console.log('Waiting 5s for initial bootstrap...');
  await sleep(5000);
  await closeAnyBackdropModal();

  // Inject LocalStorage Token and reload to guarantee authenticated React Query queries
  console.log('Setting localStorage auth token and reloading...');
  await evaluate(`
    localStorage.setItem('assistant_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ');
    localStorage.setItem('assistant_demo_mode', 'true');
    location.reload();
  `);
  await sleep(6000);
  await closeAnyBackdropModal();

  // 1. Capture Desktop Command Center
  console.log('\nCapturing Command Center 1920x1080...');
  await capture('phase43_2_command_center_1920x1080.png', 1920, 1080);

  // 2. Click My Day in Navbar
  console.log('\nNavigating to My Day tab via Navbar...');
  await evaluate(`
    (() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const myDayBtn = allButtons.find(b => b.textContent && b.textContent.trim().startsWith('My Day'));
      if (myDayBtn) {
        myDayBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        myDayBtn.click();
      }
    })()
  `);
  console.log('Waiting 14s for My Day render...');
  await sleep(14000);
  await closeAnyBackdropModal();
  console.log('Evaluating fetch inside browser context...');
  const fetchRes = await evaluate(`
    fetch('/api/v1/analytics/day-timeline?date=2026-11-05')
      .then(r => r.json())
      .then(d => ({ ok: true, data: d }))
      .catch(e => ({ ok: false, error: e.message }))
  `);
  console.log('Fetch result inside browser:', JSON.stringify(fetchRes).slice(0, 300));
  console.log('Capturing My Day Timeline 1920x1080...');
  await capture('phase43_2_my_day_timeline_1920x1080.png', 1920, 1080);

  // 3. Click Tasks in Navbar
  console.log('\nNavigating to Tasks tab via Navbar...');
  const clickedTasks = await clickNavTab('Tasks');
  console.log('Clicked Tasks:', clickedTasks);
  await sleep(6000);
  await closeAnyBackdropModal();
  console.log('Capturing Tasks List Workspace 1920x1080...');
  await capture('phase43_2_tasks_workspace_1920x1080.png', 1920, 1080);

  // Switch to Board View in Tasks
  console.log('\nSwitching Tasks to Board View...');
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const found = btns.find(b => b.textContent && b.textContent.includes('Board'));
      if (found) { found.click(); return true; }
      return false;
    })()
  `);
  await sleep(3000);
  await closeAnyBackdropModal();
  console.log('Capturing Tasks Board Workspace 1920x1080...');
  await capture('phase43_2_tasks_board_1920x1080.png', 1920, 1080);

  // 4. Click Projects in Navbar
  console.log('\nNavigating to Projects tab via Navbar...');
  const clickedProjects = await clickNavTab('Projects');
  console.log('Clicked Projects:', clickedProjects);
  await sleep(6000);
  await closeAnyBackdropModal();
  console.log('Capturing Projects Workspace 1920x1080...');
  await capture('phase43_2_projects_workspace_1920x1080.png', 1920, 1080);

  // 5. Mobile 390x844 Viewport - My Day Timeline
  console.log('\nNavigating to My Day on Mobile (390x844)...');
  await clickNavTab('My Day');
  await sleep(4000);
  await closeAnyBackdropModal();
  console.log('Capturing Mobile My Day Timeline (390x844)...');
  await capture('phase43_2_mobile_my_day_390x844.png', 390, 844);

  console.log('\n--- BROWSER VERIFICATION COMPLETE ---');
  ws.close();
  chrome.kill();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
  process.exit(0);
}

run().catch(err => {
  console.error('Browser run error:', err);
  chrome.kill();
  process.exit(1);
});
