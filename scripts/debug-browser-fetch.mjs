import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'chrome_debug_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${tempDir}`,
  '--remote-debugging-port=9237',
  'http://localhost:3000/?tab=knowledge'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  await sleep(4000);
  const targets = await (await fetch('http://127.0.0.1:9237/json/list')).json();
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);

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

  await send('Runtime.enable');

  const res = await send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        if (!window.api) return { error: 'window.api not found' };
        const notes = await window.api.getNotes();
        const summary = await window.api.getKnowledgeSummary();
        return { notesCount: notes?.length, summary };
      } catch (e) {
        return { error: e.message, stack: e.stack };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('WINDOW.API RESULT:', res.result?.value);

  chrome.kill();
  process.exit(0);
}

run();
