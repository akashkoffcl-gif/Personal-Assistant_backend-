import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

dotenv.config();

const API_BASE = 'http://localhost:3001/api/v1';
const WEB_BASE = 'http://localhost:3000';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'test-jwt-secret-key-32-chars-minimum-length';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getBearer(userId, email) {
  return 'Bearer ' + jwt.sign(
    { sub: userId, email, aud: 'authenticated', iss: 'supabase' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '2h' }
  );
}

async function runUsageAnalyticsAudit() {
  console.log('================================================================');
  console.log('AUDIT SECTION 6: APPLICATION USAGE ANALYTICS AUDIT');
  console.log('================================================================');

  const testUser = crypto.randomUUID();
  const token = getBearer(testUser, `usage-${Date.now()}@test.local`);
  const auditResults = [];

  // 1. Ingest telemetry events for testing
  console.log('\n--- 1. Ingesting Idempotent Telemetry Events ---');
  const eventPayloads = [
    { eventName: 'task_created', module: 'tasks', feature: 'quick_create', action: 'create', status: 'success' },
    { eventName: 'routine_completed', module: 'routines', feature: 'streak_increment', action: 'complete', status: 'success' },
    { eventName: 'rule_executed', module: 'automation', feature: 'focus_trigger', action: 'evaluate', status: 'success' },
    { eventName: 'reminder_dispatched', module: 'reminders', feature: 'web_push', action: 'deliver', status: 'success' },
    { eventName: 'sync_failed', module: 'network', feature: 'offline_queue', action: 'retry', status: 'failed' },
  ];

  for (const ev of eventPayloads) {
    const ingRes = await fetch(`${API_BASE}/analytics/usage/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(ev)
    });
    console.log(`Ingested event ${ev.eventName}: status ${ingRes.status}`);
  }

  // 2. Query Overview KPIs
  console.log('\n--- 2. Verifying 8 Application Usage Overview KPIs ---');
  const overRes = await fetch(`${API_BASE}/analytics/usage/overview?days=7`, {
    headers: { Authorization: token }
  });
  console.log(`GET /analytics/usage/overview status: ${overRes.status}`);
  const overJson = await overRes.json();
  const overview = overJson.data || overJson;
  console.log('Overview returned:', overview);

  const kpis = [
    { name: '1. Total Interactions', val: overview.totalInteractions, valid: typeof overview.totalInteractions === 'number' },
    { name: '2. Active Days', val: overview.activeDays, valid: typeof overview.activeDays === 'number' },
    { name: '3. Top Module', val: overview.mostUsedModule, valid: typeof overview.mostUsedModule === 'string' },
    { name: '4. Top Feature', val: overview.mostUsedFeature, valid: typeof overview.mostUsedFeature === 'string' },
    { name: '5. Adoption Rate', val: overview.featuresAdoptedPercent + '%', valid: typeof overview.featuresAdoptedPercent === 'number' },
    { name: '6. Automation Success Rate', val: overview.automationSuccessRatePercent + '%', valid: typeof overview.automationSuccessRatePercent === 'number' },
    { name: '7. Push Notification Outcomes', val: overview.reminderSuccessRatePercent + '%', valid: typeof overview.reminderSuccessRatePercent === 'number' },
    { name: '8. Failed Actions', val: overview.failedActionsCount, valid: typeof overview.failedActionsCount === 'number' },
  ];

  for (const kpi of kpis) {
    auditResults.push({
      test: `Usage KPI: ${kpi.name}`,
      status: kpi.valid ? 'PASS' : 'FAIL',
      details: `Value: ${kpi.val}`
    });
  }

  // 3. Secondary Analytical Endpoints
  console.log('\n--- 3. Verifying Secondary Analytical Modules ---');
  const secEndpoints = [
    { name: 'Daily Interaction Trends', path: '/analytics/usage/trends?days=7' },
    { name: 'Module Distribution', path: '/analytics/usage/modules?days=7' },
    { name: 'Feature Adoption Catalog', path: '/analytics/usage/features?days=7' },
    { name: 'Automation Reliability Summary', path: '/analytics/usage/automation?days=7' },
    { name: 'Reminder Delivery Outcomes', path: '/analytics/usage/reminders?days=7' },
    { name: 'Audit Log Query & Search', path: '/analytics/usage/events?limit=10' },
  ];

  for (const ep of secEndpoints) {
    const res = await fetch(`${API_BASE}${ep.path}`, {
      headers: { Authorization: token }
    });
    console.log(`GET ${ep.path}: status ${res.status}`);
    auditResults.push({
      test: `Secondary Section: ${ep.name}`,
      status: res.status === 200 ? 'PASS' : 'FAIL',
      details: `Endpoint ${ep.path} returned HTTP ${res.status}`
    });
  }

  // 4. Viewport Verification (0px scroll delta on Desktop)
  console.log('\n--- 4. Desktop Viewport Single-Screen Verification (Chrome CDP) ---');
  const tempDir = path.join(os.tmpdir(), 'chrome_audit_usage_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${tempDir}`,
    '--remote-debugging-port=9226',
    `${WEB_BASE}/?tab=usage-analytics`
  ]);

  try {
    await sleep(2500);
    const targetsRes = await fetch('http://127.0.0.1:9226/json/list');
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page');

    if (pageTarget) {
      const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
      let msgId = 1;
      const pending = new Map();

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && pending.has(msg.id)) {
          pending.get(msg.id)(msg.result);
          pending.delete(msg.id);
        }
      };

      await new Promise(r => ws.onopen = r);

      function send(method, params = {}) {
        return new Promise(resolve => {
          const id = msgId++;
          pending.set(id, resolve);
          ws.send(JSON.stringify({ id, method, params }));
        });
      }

      await send('Page.navigate', { url: `${WEB_BASE}/?tab=usage-analytics` });
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
        console.log(`Viewport ${vp.name}: clientHeight=${val.clientHeight}, scrollHeight=${val.scrollHeight}, delta=${val.delta}px`);
        auditResults.push({
          test: `Usage Analytics Viewport (${vp.name})`,
          status: val.delta === 0 ? 'PASS (0px Scroll)' : `FAIL (${val.delta}px)`,
          details: `clientHeight: ${val.clientHeight}px, scrollHeight: ${val.scrollHeight}px`
        });
      }

      ws.close();
    }
  } catch (err) {
    console.error('CDP Viewport audit error:', err.message);
  } finally {
    chrome.kill();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }

  // 5. Telemetry Privacy & Data Hygiene Verification
  console.log('\n--- 5. Telemetry Privacy & Data Hygiene Verification ---');
  const eventsListRes = await fetch(`${API_BASE}/analytics/usage/events?limit=50`, {
    headers: { Authorization: token }
  });
  const eventsListJson = await eventsListRes.json();
  const rawEvents = eventsListJson.data?.items || eventsListJson.items || [];
  const stringified = JSON.stringify(rawEvents).toLowerCase();

  const containsPasswords = stringified.includes('password') || stringified.includes('secret') || stringified.includes('token');
  const containsWellnessDetails = stringified.includes('hydration_notes') || stringified.includes('medical') || stringified.includes('fatigue_score');

  auditResults.push({
    test: 'Telemetry Data Hygiene: Zero Credential Leaks',
    status: !containsPasswords ? 'PASS' : 'FAIL',
    details: 'Zero passwords, secrets, or bearer tokens in event payloads'
  });

  auditResults.push({
    test: 'Telemetry Separation: Zero Wellness Details',
    status: !containsWellnessDetails ? 'PASS' : 'FAIL',
    details: 'Domain B events strictly isolated from Domain A personal wellness records'
  });

  console.log('\n--- SECTION 6 AUDIT SUMMARY ---');
  console.table(auditResults);
  return auditResults;
}

runUsageAnalyticsAudit().catch(console.error);
