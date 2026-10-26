// Captures phone screenshots of every user flow for the marketing kit.
// Usage: npx expo export -p web, serve dist/ (SPA fallback), then
//   node store/capture-walkthrough.js http://localhost:8090
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const { onboard, phoneContext, smoothScroll } = require('./lib/phone');

const BASE = process.argv[2] || 'http://localhost:8090';
const OUT = path.join(__dirname, 'walkthrough');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];

  const newPage = async (opts) => {
    const context = await phoneContext(browser, opts);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', (e) => errors.push(e.message));
    const shot = async (name) => {
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(OUT, `${name}.png`) });
      console.log('shot', name);
    };
    return { context, page, shot };
  };

  // 1. Setup: onboarding for a Zepbound user, ending at the paywall.
  {
    const { page, shot, context } = await newPage();
    const cont = () => page.getByTestId('onboarding-continue').click();
    await page.goto(`${BASE}/?reset=1`);
    await page.waitForTimeout(1200);
    await shot('setup-1-welcome');
    await page.getByTestId('onboarding-start').click();
    await cont();
    await page.getByText('Zepbound', { exact: true }).click();
    await shot('setup-2-medication');
    await cont();
    await page.getByText('7.5 mg', { exact: true }).click();
    await cont();
    await cont();
    await page.getByText('1–2 months ago', { exact: true }).click();
    await page.getByText('3 days ago', { exact: true }).click();
    await shot('setup-3-history');
    await cont();
    await page.locator('input').first().fill('214.6');
    await cont();
    await page.locator('input').first().fill('236');
    await cont();
    await cont();
    await page.locator('input').first().fill('190');
    await page.locator('input').first().blur();
    await shot('setup-4-goal');
    await cont();
    await cont();
    await cont();
    await page.getByText('Keeping my muscle', { exact: true }).click();
    await page.getByText('Managing side effects', { exact: true }).click();
    await cont();
    await page.locator('input').first().fill('Jordan');
    await cont();
    await page.waitForTimeout(1600);
    await shot('setup-5-building');
    await page.waitForTimeout(3000);
    await shot('setup-6-plan');
    await cont();
    await shot('setup-7-reminders');
    await page.getByText('Not now', { exact: true }).click();
    await page.waitForTimeout(3200);
    await shot('setup-8-paywall');
    await context.close();
  }

  // 2. Shot day with real history (premium).
  {
    const { page, shot, context } = await newPage();
    await page.goto(`${BASE}/?demo=1&premium=1&shotday=1`);
    await page.waitForTimeout(1500);
    await shot('daily-1-shot-day');
    await page.getByTestId('log-dose-cta').click();
    await page.waitForTimeout(900);
    await shot('daily-2-log-shot');
    await page.getByTestId('save-dose').click();
    await page.waitForTimeout(900);
    await page.getByLabel('Add +25g').click();
    await page.getByLabel('Add +8oz').click();
    await page.getByLabel('Add +8oz').click();
    await shot('daily-3-done');
    await page.goto(`${BASE}/log-symptoms`);
    await page.waitForTimeout(1000);
    await page.getByLabel('Nausea', { exact: true }).click();
    await page.getByLabel('Fatigue', { exact: true }).click();
    await page.getByText('Quiet', { exact: true }).click();
    await page.getByText('Good', { exact: true }).click();
    await shot('daily-4-check-in');
    await context.close();
  }

  // 3. Pill user: Wegovy pill with the 30-minute wait timer.
  {
    const { page, shot, context } = await newPage();
    await onboard(page, BASE, {
      medication: 'Wegovy pill',
      dose: '4 mg',
      started: '1–3 weeks ago',
      lastDose: 'Yesterday',
      weight: 198.2,
      startWeight: 204.5,
      goal: 170,
      concerns: ['Quieting food noise', 'Managing side effects'],
      name: 'Maya',
    });
    await page.waitForTimeout(4200);
    await page.getByTestId('onboarding-continue').click();
    await page.getByText('Not now', { exact: true }).click();
    await page.waitForTimeout(3200);
    await page.getByLabel('Close').click();
    await page.waitForTimeout(900);
    await shot('pill-1-pill-time');
    await page.getByTestId('log-dose-cta').click();
    await page.waitForTimeout(800);
    await page.getByTestId('save-dose').click();
    await page.waitForTimeout(1500);
    await page.clock.runFor(4 * 60_000 + 23_000);
    await shot('pill-2-wait-timer');
    await context.close();
  }

  // 4. Insights (premium demo data).
  {
    const { page, shot, context } = await newPage();
    await page.goto(`${BASE}/?demo=1&premium=1`);
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/meds`);
    await page.waitForTimeout(1200);
    await shot('insights-1-level');
    await page.goto(`${BASE}/progress`);
    await page.waitForTimeout(1200);
    await shot('insights-2-progress');
    await page.getByText('Results by dose', { exact: true }).scrollIntoViewIfNeeded();
    await smoothScroll(page, 260, { steps: 4 });
    await shot('insights-3-patterns');
    await page.goto(`${BASE}/share`);
    await page.waitForTimeout(1200);
    await shot('insights-4-share');
    await page.goto(`${BASE}/report`);
    await page.waitForTimeout(1200);
    await shot('insights-5-report');
    await context.close();
  }

  // 5. Free tier: the user's own data behind the Lifted+ lock.
  {
    const { page, shot, context } = await newPage();
    await page.goto(`${BASE}/?demo=1`);
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/meds`);
    await page.waitForTimeout(1200);
    await shot('free-1-locked-level');
    await context.close();
  }

  await browser.close();
  if (errors.length) {
    console.error('Page errors:\n' + errors.join('\n'));
    process.exitCode = 1;
  }
}

main();
