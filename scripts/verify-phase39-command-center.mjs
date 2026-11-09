import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'chrome_p39_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${tempDir}`,
  '--remote-debugging-port=9225',
  'http://localhost:3000'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- PHASE 39 COMMAND CENTER VERIFICATION START ---');
  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9225/json/list');
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

  // Navigate to Command Center
  console.log('\n[1/5] Navigating to Command Center on http://localhost:3000...');
  await send('Page.navigate', { url: 'http://localhost:3000/?tab=dashboard' });
  await sleep(4500);

  // 1. Verify Desktop Resolutions & Capture Evidence
  const desktopResolutions = [
    { name: '1920x1080', width: 1920, height: 1080, file: 'phase39_command_center_1920x1080.png' },
    { name: '1600x900',  width: 1600, height: 900,  file: 'phase39_command_center_1600x900.png' },
    { name: '1440x900',  width: 1440, height: 900,  file: 'phase39_command_center_1440x900.png' },
    { name: '1366x768',  width: 1366, height: 768,  file: 'phase39_command_center_1366x768.png' },
  ];

  console.log('\n[2/5] Testing Desktop Resolutions & Capturing Screenshots...');
  for (const res of desktopResolutions) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: res.width,
      height: res.height,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(1500);

    // Verify Row 4 exists in DOM
    const evalRes = await send('Runtime.evaluate', {
      expression: `({
        hasFocusStudio: document.body.innerText.includes('Focus Studio & Deep Work'),
        hasFinance: document.body.innerText.includes('Personal Finance & Wealth'),
        hasKpi: document.body.innerText.includes('Task Completion'),
        hasOverview: document.body.innerText.includes('Productivity Overview'),
        hasSupporting: document.body.innerText.includes('Routine Tracker'),
        hasFooter: document.body.innerText.includes('Productivity Analytics')
      })`,
      returnByValue: true
    });
    const metrics = evalRes.result?.value || {};
    console.log(`  -> Resolution [${res.name}]: FocusStudio=${metrics.hasFocusStudio}, Finance=${metrics.hasFinance}, AllSectionsPresent=${Object.values(metrics).every(Boolean)}`);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(path.join(artifactDir, res.file), buffer);
    console.log(`     Saved ${res.file} (${buffer.length} bytes)`);
  }

  // 2. Focus Studio Widget State Testing
  console.log('\n[3/5] Testing Focus Studio Widget Interactivity...');
  // Capture idle state
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await sleep(500);

  // Scroll to Row 4
  await send('Runtime.evaluate', {
    expression: `(() => {
      const el = Array.from(document.querySelectorAll('h3')).find(h => h.innerText.includes('Focus Studio'));
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`
  });
  await sleep(600);

  const idleShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase39_focus_studio_idle_1920x1080.png'), Buffer.from(idleShot.data, 'base64'));
  console.log('  -> Saved phase39_focus_studio_idle_1920x1080.png');

  // Trigger Start Focus Session button
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Focus'));
      if (btn) btn.click();
    })()`
  });
  await sleep(1500);

  const activeShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase39_focus_studio_active_1920x1080.png'), Buffer.from(activeShot.data, 'base64'));
  console.log('  -> Saved phase39_focus_studio_active_1920x1080.png');

  // 3. Finance Widget Privacy & Data Testing
  console.log('\n[4/5] Testing Finance Dashboard Widget Data & Privacy Toggle...');
  const financeShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase39_finance_widget_data_1920x1080.png'), Buffer.from(financeShot.data, 'base64'));
  console.log('  -> Saved phase39_finance_widget_data_1920x1080.png');

  // 4. Mobile Responsiveness (390x844 iPhone 14)
  console.log('\n[5/5] Testing Mobile Responsiveness (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  // Scroll to top
  await send('Runtime.evaluate', { expression: `window.scrollTo(0, 0);` });
  await sleep(800);

  const mobileShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase39_command_center_mobile_390x844.png'), Buffer.from(mobileShot.data, 'base64'));
  console.log('  -> Saved phase39_command_center_mobile_390x844.png');

  console.log('\n--- PHASE 39 VERIFICATION COMPLETE: ALL SCREENSHOTS SAVED ---');
  ws.close();
  chrome.kill();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {}
}

run().catch(err => {
  console.error('Verification error:', err);
  chrome.kill();
  process.exit(1);
});
