import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'chrome_p41_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${tempDir}`,
  '--remote-debugging-port=9227',
  'http://localhost:3000'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- PHASE 41 GOOGLE ASSISTANT 3D AVATAR & INR VERIFICATION START ---');
  await sleep(3500);

  const targetsRes = await fetch('http://127.0.0.1:9227/json/list');
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

  // -------------------------------------------------------------
  // 1. Desktop 1920x1080: Command Center with 3D Avatar Docked
  // -------------------------------------------------------------
  console.log('\n[1/7] Navigating to Command Center (1920x1080)...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/?tab=dashboard' });
  await sleep(4000);

  const evalPresence = await send('Runtime.evaluate', {
    expression: `({
      hasAssistantStage: !!document.querySelector('aside[aria-label*="Google Assistant"]'),
      hasAvatarModel: !!document.querySelector('div[role="img"][aria-label*="AI Companion Avatar"]'),
      hasCommandBar: !!document.querySelector('div[role="search"][aria-label*="AI Voice and Command"]'),
      hasQuickSuggestions: !!document.querySelector('div[role="toolbar"][aria-label*="Quick voice"]'),
      hasINRinFinance: document.body.innerText.includes('₹')
    })`,
    returnByValue: true
  });
  console.log('  -> AIAssistantExperience presence:', evalPresence.result?.value);

  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase41_assistant_docked_1920x1080.png'), Buffer.from(shot1.data, 'base64'));
  console.log('  -> Saved phase41_assistant_docked_1920x1080.png');

  // -------------------------------------------------------------
  // 2. Trigger Suggestion Chip: Executive Briefing Spoken Output
  // -------------------------------------------------------------
  console.log('\n[2/7] Triggering Quick Suggestion "Brief my day."...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const chip = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Brief my day'));
      if (chip) chip.click();
    })()`
  });
  await sleep(3500);

  const shot2 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase41_briefing_transcript_1920x1080.png'), Buffer.from(shot2.data, 'base64'));
  console.log('  -> Saved phase41_briefing_transcript_1920x1080.png');

  // -------------------------------------------------------------
  // 3. Trigger Consequential Action Confirmation Card
  // -------------------------------------------------------------
  console.log('\n[3/7] Triggering Focus Session Voice Command for Action Card...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const chip = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('focus session'));
      if (chip) chip.click();
    })()`
  });
  await sleep(3500);

  const shot3 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase41_action_confirmation_1920x1080.png'), Buffer.from(shot3.data, 'base64'));
  console.log('  -> Saved phase41_action_confirmation_1920x1080.png');

  // -------------------------------------------------------------
  // 4. Expand Full Conversation Drawer
  // -------------------------------------------------------------
  console.log('\n[4/7] Expanding Full AI Conversation Drawer...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const expandBtn = document.querySelector('button[title*="conversation"]');
      if (expandBtn) expandBtn.click();
    })()`
  });
  await sleep(1500);

  const shot4 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase41_expanded_conversation_1920x1080.png'), Buffer.from(shot4.data, 'base64'));
  console.log('  -> Saved phase41_expanded_conversation_1920x1080.png');

  // Close expanded drawer
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('button[title="Minimize drawer"]');
      if (closeBtn) closeBtn.click();
    })()`
  });
  await sleep(600);

  // -------------------------------------------------------------
  // 5. Assistant Settings Modal
  // -------------------------------------------------------------
  console.log('\n[5/7] Opening AI Companion Settings Modal...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const settingsBtn = document.querySelector('button[title*="preferences"]');
      if (settingsBtn) settingsBtn.click();
    })()`
  });
  await sleep(1200);

  const shot5 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase41_assistant_settings_1920x1080.png'), Buffer.from(shot5.data, 'base64'));
  console.log('  -> Saved phase41_assistant_settings_1920x1080.png');

  // Close settings modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeSettings = document.querySelector('button[aria-label="Close settings"]');
      if (closeSettings) closeSettings.click();
    })()`
  });
  await sleep(600);

  // -------------------------------------------------------------
  // 6. Viewport Matrix Tests (1600x900, 1440x900, 1366x768)
  // -------------------------------------------------------------
  console.log('\n[6/7] Testing Desktop Matrix (1600x900, 1440x900, 1366x768)...');
  const desktopSizes = [
    { name: '1600x900', width: 1600, height: 900, file: 'phase41_command_center_1600x900.png' },
    { name: '1440x900', width: 1440, height: 900, file: 'phase41_command_center_1440x900.png' },
    { name: '1366x768', width: 1366, height: 768, file: 'phase41_command_center_1366x768.png' },
  ];

  for (const s of desktopSizes) {
    await send('Emulation.setDeviceMetricsOverride', { width: s.width, height: s.height, deviceScaleFactor: 1, mobile: false });
    await sleep(1000);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, s.file), Buffer.from(shot.data, 'base64'));
    console.log(`  -> Saved ${s.file}`);
  }

  // -------------------------------------------------------------
  // 7. Mobile Viewports (390x844 iPhone 14 & 360x800 Android)
  // -------------------------------------------------------------
  console.log('\n[7/7] Testing Mobile Responsive Viewports (390x844 & 360x800)...');
  const mobileSizes = [
    { name: '390x844', width: 390, height: 844, file: 'phase41_mobile_390x844.png' },
    { name: '360x800', width: 360, height: 800, file: 'phase41_mobile_360x800.png' },
  ];

  for (const m of mobileSizes) {
    await send('Emulation.setDeviceMetricsOverride', { width: m.width, height: m.height, deviceScaleFactor: 2, mobile: true });
    await sleep(1200);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, m.file), Buffer.from(shot.data, 'base64'));
    console.log(`  -> Saved ${m.file}`);
  }

  console.log('\n--- PHASE 41 ALL VISUAL EVIDENCE CAPTURED SUCCESSFULLY ---');
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

