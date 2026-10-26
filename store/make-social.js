// Builds social and press images from the walkthrough captures.
// Usage: node store/capture-walkthrough.js <url> first, then `node store/make-social.js`
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WALK = path.join(__dirname, 'walkthrough');
const OUT = path.join(__dirname, 'social');
const MARK = fs.readFileSync(path.join(__dirname, '..', 'assets', 'source', 'mark.svg'), 'utf8').replace('width="1024" height="1024"', 'width="100%" height="100%"');

const img = (name) => `data:image/png;base64,${fs.readFileSync(path.join(WALK, `${name}.png`)).toString('base64')}`;

const phone = (name, width, extra = '') => `
  <div class="phone" style="width:${width}px;${extra}">
    <div class="screen"><img src="${img(name)}"/><div class="island"></div></div>
  </div>`;

const base = (w, h, body) => `<!doctype html><html><head><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: ${w}px; height: ${h}px; overflow: hidden; position: relative;
    font-family: -apple-system, 'SF Pro Display', Inter, system-ui, sans-serif; color: #fff;
    background: radial-gradient(120% 90% at 85% 100%, #FF7A59 0%, rgba(255,122,89,0) 55%), linear-gradient(155deg, #4B2FE6 0%, #6D4BFF 45%, #8B5CF6 100%); }
  .phone { position: absolute; border-radius: 15% / 7%; background: #0C0B11; padding: 1.6%; box-shadow: 0 40px 90px rgba(18,8,60,.45); }
  .screen { position: relative; border-radius: 13.5% / 6.3%; overflow: hidden; background: #F6F5FA; }
  .screen img { display: block; width: 100%; }
  .island { position: absolute; top: 1.4%; left: 50%; transform: translateX(-50%); width: 31%; height: 3.6%; border-radius: 999px; background: #0C0B11; }
  .brand { display: flex; align-items: center; gap: 14px; font-weight: 700; letter-spacing: -.5px; }
  .mark { background: #fff; border-radius: 26%; display: grid; place-items: center; }
  .mark svg { width: 70%; height: 70%; }
  h1 { font-weight: 800; letter-spacing: -2px; line-height: 1.02; }
  p { color: rgba(255,255,255,.9); font-weight: 500; }
  .pill { display: inline-block; background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.3); border-radius: 999px; font-weight: 600; }
</style></head><body>${body}</body></html>`;

const brand = (size) => `
  <div class="brand" style="font-size:${size}px">
    <div class="mark" style="width:${size * 1.6}px;height:${size * 1.6}px">${MARK.replace(/fill="#FFFFFF"/, 'fill="#ECE8FF"')}</div>Lifted
  </div>`;

const ASSETS = [
  {
    file: 'press-banner-1200x630.png',
    w: 1200,
    h: 630,
    html: `
      <div style="position:absolute;left:64px;top:64px;width:560px;display:flex;flex-direction:column;gap:26px">
        ${brand(30)}
        <h1 style="font-size:66px">Lose the fat.<br/>Keep the muscle.</h1>
        <p style="font-size:24px;line-height:1.4">The GLP-1 companion for shots, pills, side effects and progress.</p>
        <div><span class="pill" style="font-size:18px;padding:10px 18px">Coming soon for iPhone</span></div>
      </div>
      ${phone('daily-1-shot-day', 300, 'left:870px;top:70px;transform:rotate(4deg)')}
      ${phone('insights-2-progress', 300, 'left:640px;top:120px;transform:rotate(-5deg)')}`,
  },
  {
    file: 'post-1080x1080.png',
    w: 1080,
    h: 1080,
    html: `
      <div style="position:absolute;left:72px;top:80px;width:460px;display:flex;flex-direction:column;gap:30px">
        ${brand(30)}
        <h1 style="font-size:76px">Shot day,<br/>sorted.</h1>
        <p style="font-size:28px;line-height:1.4">Reminders, site rotation and your estimated medication level, in one GLP-1 app.</p>
      </div>
      ${phone('daily-2-log-shot', 420, 'left:590px;top:120px;transform:rotate(3deg)')}`,
  },
  {
    file: 'story-1080x1920.png',
    w: 1080,
    h: 1920,
    html: `
      <div style="position:absolute;left:0;right:0;top:150px;display:flex;flex-direction:column;align-items:center;gap:34px;text-align:center">
        ${brand(34)}
        <h1 style="font-size:96px">Know when side<br/>effects hit.</h1>
        <p style="font-size:34px">See which day after your shot nausea peaks.</p>
      </div>
      ${phone('insights-3-patterns', 640, 'left:220px;top:720px')}`,
  },
  {
    file: 'story-pill-1080x1920.png',
    w: 1080,
    h: 1920,
    html: `
      <div style="position:absolute;left:0;right:0;top:150px;display:flex;flex-direction:column;align-items:center;gap:34px;text-align:center">
        ${brand(34)}
        <h1 style="font-size:96px">On the Wegovy pill?<br/>We’ll time it.</h1>
        <p style="font-size:34px">A 30-minute wait timer, then protein first.</p>
      </div>
      ${phone('pill-2-wait-timer', 640, 'left:220px;top:720px')}`,
  },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const asset of ASSETS) {
    const page = await browser.newPage({ viewport: { width: asset.w, height: asset.h } });
    await page.setContent(base(asset.w, asset.h, asset.html));
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, asset.file) });
    await page.close();
    console.log('wrote', asset.file);
  }
  await browser.close();
})();
