// Builds App Store screenshots (1290×2796, 6.9" slot) from the web build with demo data.
// Usage: npx expo export -p web && node store/make-screenshots.js http://localhost:8090
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:8090';
const OUT = path.join(__dirname, 'screenshots');
const RAW = path.join(OUT, 'raw');

const SHOTS = [
  { id: '01-today', url: '/', title: 'Lose the fat.\nKeep the muscle.', sub: 'Your daily GLP-1 companion' },
  { id: '02-level', url: '/meds', title: 'See your\nmedication level', sub: 'Estimated from your own dose log' },
  { id: '03-progress', url: '/progress', title: 'Every pound.\nEvery dose.', sub: 'Your trend with dose changes marked' },
  { id: '04-patterns', url: '/progress', scrollTo: 'Results by dose', title: 'Know when side\neffects hit', sub: 'Patterns by day after your shot' },
  { id: '05-log', url: '/log-dose', title: 'Never lose track\nof a shot', sub: 'Reminders + injection site rotation' },
  { id: '06-share', url: '/share', title: 'Share your wins,\nprivately', sub: 'Percent-only cards. Your weight stays yours.' },
  { id: '07-report', url: '/report', title: 'Walk into every\nappointment ready', sub: 'One-page doctor report PDF' },
];

const statusBar = `
<div class="status">
  <span>9:41</span>
  <span class="glyphs">
    <svg width="54" height="34" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="48" height="34" viewBox="0 0 16 12"><path d="M8 2.5c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .7 10.4 10.4 0 0 0 .8 3.6L2 4.9a8.6 8.6 0 0 1 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.6 6.6 0 0 0 8 4.3a6.6 6.6 0 0 0-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3Zm0 3.5-1.9 2 1.9 1.9 1.9-1.9-1.9-2Z"/></svg>
    <svg width="80" height="34" viewBox="0 0 27 12"><rect x="0.5" y="0.5" width="23" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="24.5" y="4" width="2" height="4" rx="1" opacity=".4"/></svg>
  </span>
</div>`;

function frame({ title, sub, image }) {
  return `<!doctype html><html><head><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1290px; height: 2796px; overflow: hidden; font-family: -apple-system, 'SF Pro Display', Inter, system-ui, sans-serif;
    background: linear-gradient(160deg, #5B3DF5 0%, #8B5CF6 58%, #FF7A59 100%); display: flex; flex-direction: column; align-items: center; }
  h1 { color: #fff; font-size: 116px; line-height: 1.04; font-weight: 800; letter-spacing: -3px; text-align: center; margin-top: 150px; white-space: pre-line; }
  p { color: rgba(255,255,255,.88); font-size: 50px; font-weight: 500; margin-top: 36px; text-align: center; }
  .device { margin-top: 110px; width: 1100px; border-radius: 120px; background: #0C0B11; padding: 26px; box-shadow: 0 60px 120px rgba(20,10,60,.45); }
  .screen { border-radius: 96px; overflow: hidden; background: #F6F5FA; position: relative; }
  .status { height: 150px; display: flex; justify-content: space-between; align-items: center; padding: 30px 90px 0 110px; font-size: 50px; font-weight: 600; color: #17151F; }
  .glyphs { display: flex; gap: 14px; align-items: center; fill: #17151F; color: #17151F; }
  .island { position: absolute; top: 36px; left: 50%; transform: translateX(-50%); width: 360px; height: 104px; border-radius: 60px; background: #0C0B11; }
  .shot { display: block; width: 100%; }
</style></head><body>
  <h1>${title}</h1><p>${sub}</p>
  <div class="device"><div class="screen"><div class="island"></div>${statusBar}<img class="shot" src="data:image/png;base64,${image}"/></div></div>
</body></html>`;
}

(async () => {
  fs.mkdirSync(RAW, { recursive: true });
  const browser = await chromium.launch();
  const app = await browser.newContext({ viewport: { width: 393, height: 790 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'light' });
  const page = await app.newPage();
  page.setDefaultTimeout(10000);
  // Match the 9:41 status bar: freeze the app's clock at 9:41 AM.
  const morning = new Date();
  morning.setHours(9, 41, 0, 0);
  await page.clock.setFixedTime(morning);
  await page.goto(`${BASE}/?demo=1&premium=1`);
  await page.waitForTimeout(1500);
  for (const s of SHOTS) {
    await page.goto(`${BASE}${s.url}`);
    await page.waitForTimeout(1300);
    if (s.scrollTo) {
      await page.getByText(s.scrollTo, { exact: true }).first().scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 420);
      await page.waitForTimeout(600);
    }
    await page.addStyleTag({ content: '*::-webkit-scrollbar{display:none} *{scrollbar-width:none}' });
    await page.screenshot({ path: path.join(RAW, `${s.id}.png`) });
  }
  const composer = await browser.newPage({ viewport: { width: 1290, height: 2796 }, deviceScaleFactor: 1 });
  for (const s of SHOTS) {
    const image = fs.readFileSync(path.join(RAW, `${s.id}.png`)).toString('base64');
    await composer.setContent(frame({ ...s, image }));
    await composer.waitForTimeout(200);
    await composer.screenshot({ path: path.join(OUT, `${s.id}.png`) });
    console.log('wrote', s.id);
  }
  await browser.close();
})();
