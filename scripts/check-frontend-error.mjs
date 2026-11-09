import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'chrome_err_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${tempDir}`,
  '--remote-debugging-port=9231',
  'http://localhost:3000/?tab=knowledge'
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  await sleep(3000);
  const targets = await (await fetch('http://127.0.0.1:9231/json/list')).json();
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));
    ws.send(JSON.stringify({ id: 3, method: 'Runtime.enable' }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      console.log('EXCEPTION:', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
    }
    if (msg.method === 'Console.messageAdded') {
      console.log('BROWSER CONSOLE:', msg.params.message.level, msg.params.message.text);
    }
    if (msg.method === 'Network.responseReceived') {
      if (msg.params.response.status >= 400) {
        console.log('NETWORK ERROR URL:', msg.params.response.status, msg.params.response.url);
      }
    }
  };

  await sleep(4000);
  chrome.kill();
  process.exit(0);
}

run();
