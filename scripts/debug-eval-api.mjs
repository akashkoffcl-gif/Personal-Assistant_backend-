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
  '--remote-debugging-port=9247',
  'http://localhost:3000/?tab=knowledge'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  await sleep(4000);
  const targets = await (await fetch('http://127.0.0.1:9247/json/list')).json();
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Console.messageAdded') {
      console.log('BROWSER LOG:', msg.params.message.text);
    }
  };

  await new Promise(resolve => {
    if (ws.readyState === WebSocket.OPEN) resolve();
    else ws.onopen = resolve;
  });

  ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));

  // Evaluate single fetch
  ws.send(JSON.stringify({
    id: 3,
    method: 'Runtime.evaluate',
    params: {
      expression: `window.api.getKnowledgeSummary()`,
      awaitPromise: true,
      returnByValue: true
    }
  }));

  await sleep(4000);
  chrome.kill();
  process.exit(0);
}

run();
