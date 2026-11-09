import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'chrome_p40_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${tempDir}`,
  '--remote-debugging-port=9226',
  'http://localhost:3000'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- PHASE 40 AI EXPERIENCE & SYSTEM VERIFICATION START ---');
  await sleep(3000);

  const targetsRes = await fetch('http://127.0.0.1:9226/json/list');
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
  // 1. Command Center: Verify Productivity Analytics footer strip removal
  // -------------------------------------------------------------
  console.log('\n[1/6] Navigating to Command Center on http://localhost:3000/?tab=dashboard...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/?tab=dashboard' });
  await sleep(4000);

  const evalCheck = await send('Runtime.evaluate', {
    expression: `({
      hasProductivityAnalyticsStrip: document.body.innerText.includes('Productivity Analytics') && (document.body.innerText.includes('Total Focus:') || document.body.innerText.includes('Most Productive:')),
      hasFocusStudio: document.body.innerText.includes('Focus Studio & Deep Work'),
      hasFinance: document.body.innerText.includes('Personal Finance & Wealth'),
      hasKpi: document.body.innerText.includes('Task Completion'),
      hasOverview: document.body.innerText.includes('Productivity Overview')
    })`,
    returnByValue: true
  });
  console.log('  -> Command Center audit:', evalCheck.result?.value);

  const shot1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase40_command_center_no_analytics_1920x1080.png'), Buffer.from(shot1.data, 'base64'));
  console.log('  -> Saved phase40_command_center_no_analytics_1920x1080.png');

  // -------------------------------------------------------------
  // 2. Voice Assistant Modal: Idle & Listening & Speaking
  // -------------------------------------------------------------
  console.log('\n[2/6] Opening Voice Assistant Modal...');
  // Click the microphone button in the top navbar or trigger state
  await send('Runtime.evaluate', {
    expression: `(() => {
      // Find voice button in navbar (aria-label="Voice Assistant" or svg mic)
      const micBtn = document.querySelector('button[aria-label*="Voice"]') || 
                     document.querySelector('button[title*="Voice"]') ||
                     Array.from(document.querySelectorAll('button')).find(b => b.innerHTML.includes('lucide-mic') || b.querySelector('svg.lucide-mic'));
      if (micBtn) {
        micBtn.click();
        return 'Clicked mic button';
      }
      return 'Mic button not found';
    })()`,
    returnByValue: true
  });
  await sleep(1500);

  // Capture Idle State
  const shotIdle = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase40_voice_assistant_idle_1920x1080.png'), Buffer.from(shotIdle.data, 'base64'));
  console.log('  -> Saved phase40_voice_assistant_idle_1920x1080.png');

  // Switch to Listening State
  console.log('  -> Simulating Voice Listening state...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tap to Speak') || b.innerText.includes('Start Listening'));
      if (startBtn) startBtn.click();
    })()`
  });
  await sleep(1000);

  const shotListening = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase40_voice_assistant_listening_1920x1080.png'), Buffer.from(shotListening.data, 'base64'));
  console.log('  -> Saved phase40_voice_assistant_listening_1920x1080.png');

  // Trigger Briefing Action / Speaking State
  console.log('  -> Triggering Executive Briefing pill...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const briefBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Brief me'));
      if (briefBtn) briefBtn.click();
    })()`
  });
  await sleep(3500);

  const shotSpeaking = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase40_voice_assistant_speaking_1920x1080.png'), Buffer.from(shotSpeaking.data, 'base64'));
  console.log('  -> Saved phase40_voice_assistant_speaking_1920x1080.png');

  // Trigger Action Confirmation Card
  console.log('  -> Triggering Focus Studio voice action...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const focusBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start 25m Focus') || b.innerText.includes('Focus'));
      if (focusBtn) focusBtn.click();
    })()`
  });
  await sleep(3500);

  const shotAction = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase40_voice_assistant_action_1920x1080.png'), Buffer.from(shotAction.data, 'base64'));
  console.log('  -> Saved phase40_voice_assistant_action_1920x1080.png');

  // Close Voice Modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('button[aria-label="Close modal"]') || 
                       document.querySelector('button[aria-label="Close"]') ||
                       Array.from(document.querySelectorAll('button')).find(b => b.innerHTML.includes('lucide-x') || b.querySelector('svg.lucide-x'));
      if (closeBtn) closeBtn.click();
    })()`
  });
  await sleep(1000);

  // -------------------------------------------------------------
  // 3. AI Chat Workspace (Desktop 1920x1080)
  // -------------------------------------------------------------
  console.log('\n[3/6] Navigating to AI Chat Workspace (tab=ai-chat)...');
  await send('Page.navigate', { url: 'http://localhost:3000/?tab=ai-chat' });
  await sleep(3500);

  // Test sending a question in the composer
  await send('Runtime.evaluate', {
    expression: `(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = 'What are my top priorities and active goals today?';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const sendBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Send') || b.querySelector('svg.lucide-arrow-up') || b.querySelector('svg.lucide-send'));
      if (sendBtn) sendBtn.click();
    })()`
  });
  await sleep(4000);

  const shotChatDesk = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase40_ai_chat_workspace_1920x1080.png'), Buffer.from(shotChatDesk.data, 'base64'));
  console.log('  -> Saved phase40_ai_chat_workspace_1920x1080.png');

  // -------------------------------------------------------------
  // 4. AI Chat Workspace (Mobile 390x844)
  // -------------------------------------------------------------
  console.log('\n[4/6] Testing AI Chat Workspace Mobile Responsiveness (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(1500);

  const shotChatMobile = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase40_ai_chat_mobile_390x844.png'), Buffer.from(shotChatMobile.data, 'base64'));
  console.log('  -> Saved phase40_ai_chat_mobile_390x844.png');

  // -------------------------------------------------------------
  // 5. Notification Preferences Modal: Voice & Push Configuration
  // -------------------------------------------------------------
  console.log('\n[5/6] Opening Notification Preferences Modal...');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:3000/?tab=dashboard' });
  await sleep(3000);

  // Click Notification Bell to open modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const bell = document.querySelector('button[aria-label*="Notification"]') ||
                   Array.from(document.querySelectorAll('button')).find(b => b.innerHTML.includes('lucide-bell') || b.querySelector('svg.lucide-bell'));
      if (bell) bell.click();
    })()`
  });
  await sleep(1500);

  // Switch to Preferences tab inside notification modal
  await send('Runtime.evaluate', {
    expression: `(() => {
      const prefTab = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Preferences') || b.innerText.includes('Settings'));
      if (prefTab) prefTab.click();
    })()`
  });
  await sleep(1500);

  const shotNotif = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'phase40_notification_preferences_1920x1080.png'), Buffer.from(shotNotif.data, 'base64'));
  console.log('  -> Saved phase40_notification_preferences_1920x1080.png');

  console.log('\n[6/6] --- PHASE 40 ALL VISUAL VERIFICATIONS COMPLETED SUCCESSFULLY ---');
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

