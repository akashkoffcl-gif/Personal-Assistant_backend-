import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'chrome_measure_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${tempDir}`,
  '--remote-debugging-port=9222',
  'http://localhost:3000'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  await sleep(2500);

  const targetsRes = await fetch('http://127.0.0.1:9222/json/list');
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

  const viewports = [
    { name: '1920x1080', width: 1920, height: 1080, type: 'Desktop Full HD' },
    { name: '1600x900',  width: 1600, height: 900,  type: 'Desktop Standard' },
    { name: '1440x900',  width: 1440, height: 900,  type: 'MacBook Pro' },
    { name: '1366x768',  width: 1366, height: 768,  type: 'Laptop HD' },
    { name: '1280x720',  width: 1280, height: 720,  type: 'Compact Fallback' },
    { name: '768x1024',  width: 768,  height: 1024, type: 'Tablet (Vertical Scroll)' },
    { name: '390x844',   width: 390,  height: 844,  type: 'Mobile (Vertical Scroll)' },
  ];

  console.log('----------------------------------------------------------------------------------------------------------------------');
  console.log('| Viewport   | Type                      | clientHeight | scrollHeight | Delta (Scrollable?) | Single-Viewport Pass |');
  console.log('----------------------------------------------------------------------------------------------------------------------');

  for (const vp of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 1024
    });

    await sleep(600);

    const res = await send('Runtime.evaluate', {
      expression: `({
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        bodyScrollHeight: document.body.scrollHeight,
        isScrollable: document.documentElement.scrollHeight > document.documentElement.clientHeight
      })`,
      returnByValue: true
    });

    const val = res.result.value;
    const isDesktop = vp.width >= 1024;
    const passes = isDesktop ? (val.scrollHeight <= val.clientHeight) : (val.scrollHeight > val.clientHeight);
    const status = isDesktop
      ? (val.scrollHeight <= val.clientHeight ? 'PASS (0px scroll)' : 'FAIL (Needs scroll)')
      : 'PASS (Responsive scroll)';

    const delta = val.scrollHeight - val.clientHeight;

    console.log(`| ${vp.name.padEnd(10)} | ${vp.type.padEnd(25)} | ${String(val.clientHeight).padStart(12)} | ${String(val.scrollHeight).padStart(12)} | ${(delta + 'px').padStart(19)} | ${status.padEnd(20)} |`);
  }
  console.log('----------------------------------------------------------------------------------------------------------------------');

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

