import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Home/.gemini/antigravity/brain/2c35a3f9-e980-40a2-bc3e-29b52de8acfb';
const DEMO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRlbW9AYXNzaXN0YW50LmxvY2FsIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkzNzg0MTYzLCJleHAiOjIxMDkxNDQxNjN9.aDrGqYBqyJj6f-jPGccklhumzCQtlT3pFafjOYFmANQ';

async function runBrowserVerification() {
  console.log('--- PHASE 44 BROWSER & UI VERIFICATION START ---');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  // Monitor uncaught console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok) => {
    localStorage.setItem('assistant_token', tok);
    localStorage.setItem('assistant_ai_settings', JSON.stringify({
      assistantName: 'Nova',
      wakeWordEnabled: true,
      voiceURI: '',
      speechRate: 1.0,
      autoVoiceResponse: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      maskFinanceAmounts: true,
      hapticFeedback: true,
      autoBackgroundAnalysis: false
    }));
  }, DEMO_TOKEN);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Close any proactive modal
  await page.evaluate(() => {
    const backdrop = document.querySelector('div.fixed.inset-0.bg-black\\/50');
    if (backdrop) {
      const closeBtn = backdrop.parentElement?.querySelector('button');
      if (closeBtn) closeBtn.click();
    }
  });
  await page.waitForTimeout(1000);

  // 1. Verify Clean Default Desktop (Assistant is HIDDEN)
  console.log('Capturing Clean Desktop Command Center (Assistant is HIDDEN)...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'phase44_clean_desktop_hidden_assistant_1920x1080.png'),
    fullPage: false
  });

  // Verify that floating avatar / command bar are NOT in the DOM
  const isAssistantPresent = await page.evaluate(() => {
    return Boolean(document.querySelector('aside[aria-label="Google Assistant 3D AI On-Demand Interface"]'));
  });
  console.log('Is Assistant visible by default?', isAssistantPresent);

  // 2. Trigger Assistant on-demand via Navbar Mic / Event
  console.log('Activating assistant on-demand via event...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('ai-assistant:toggle-expand'));
  });
  await page.waitForTimeout(2000);

  console.log('Capturing On-Demand Activated Assistant...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'phase44_ondemand_assistant_active_1920x1080.png'),
    fullPage: false
  });

  // 3. Dismiss Assistant and verify clean return to hidden
  console.log('Dismissing assistant...');
  await page.evaluate(() => {
    const dismissBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dismiss'));
    if (dismissBtn) dismissBtn.click();
  });
  await page.waitForTimeout(1500);

  console.log('Capturing Post-Dismiss Clean State...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'phase44_post_dismiss_hidden_1920x1080.png'),
    fullPage: false
  });

  // 4. Verify My Day Timeline remains pristine
  console.log('Navigating to My Day tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const myDayTab = tabs.find(t => t.textContent.includes('My Day'));
    if (myDayTab) myDayTab.click();
  });
  await page.waitForTimeout(3000);

  console.log('Capturing My Day Tab under Phase 44...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'phase44_my_day_timeline_1920x1080.png'),
    fullPage: false
  });

  // 5. Mobile Viewport (390x844)
  console.log('Switching to mobile viewport (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2000);

  console.log('Capturing Mobile Clean Viewport...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'phase44_mobile_clean_390x844.png'),
    fullPage: false
  });

  console.log('Console error count during run:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Sample console errors:', consoleErrors.slice(0, 5));
  }

  await browser.close();
  console.log('--- PHASE 44 BROWSER & UI VERIFICATION COMPLETE ---');
}

runBrowserVerification().catch(err => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});

