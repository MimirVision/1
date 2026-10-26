// Records the App Store app preview: a scripted session in the real app, captured frame by frame
// and encoded to Apple's spec (886×1920 portrait, 30 fps H.264, stereo AAC track, ≤30 s).
// Usage: serve the web build, then `node store/make-preview-video.js http://localhost:8090`
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { phoneContext, smoothScroll } = require('./lib/phone');

const BASE = process.argv[2] || 'http://localhost:8090';
const OUT_DIR = path.join(__dirname, 'preview');
const WIDTH = 886;
const HEIGHT = 1920;
const MAX_SECONDS = 29.5;

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifted-preview-'));
  const browser = await chromium.launch();
  const context = await phoneContext(browser, { width: WIDTH / 2, height: HEIGHT / 2, scale: 2, taps: true });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);

  await page.goto(`${BASE}/?demo=1&premium=1&shotday=1`);
  await page.waitForTimeout(1800);

  // Open every screen once before recording so no route shows a blank frame while its code loads.
  const close = () => page.getByLabel('Close').filter({ visible: true }).click();
  await page.getByLabel('Share progress').filter({ visible: true }).click();
  await page.waitForTimeout(900);
  await close();
  await page.getByTestId('log-dose-cta').click();
  await page.waitForTimeout(900);
  await close();
  for (const href of ['/meds', '/progress', '/']) {
    await page.locator(`[href="${href}"]`).first().click();
    await page.waitForTimeout(900);
  }

  const frames = [];
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = path.join(frameDir, `f${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: WIDTH, maxHeight: HEIGHT, everyNthFrame: 1 });

  const wait = (ms) => page.waitForTimeout(ms);
  const tap = async (locator, after = 500) => {
    await locator.click();
    await wait(after);
  };

  // 1. Shot day → log the shot with the suggested injection site.
  await wait(1400);
  await tap(page.getByTestId('log-dose-cta'), 1100);
  await smoothScroll(page, 260);
  await wait(500);
  await tap(page.getByTestId('save-dose'), 900);

  // 2. Muscle Shield: protein, water, strength.
  await tap(page.getByLabel('Add +25g'), 450);
  await tap(page.getByLabel('Add +10g'), 450);
  await tap(page.getByLabel('Add +8oz'), 400);
  await tap(page.getByLabel('Add +8oz'), 400);
  await tap(page.getByRole('checkbox').first(), 1000);

  // 3. Medication level with today's dose rising.
  await tap(page.locator('[href="/meds"]').first(), 1500);
  await tap(page.getByText('1M', { exact: true }).filter({ visible: true }), 1400);

  // 4. Progress: trend, results by dose, side-effect patterns.
  await tap(page.locator('[href="/progress"]').first(), 1400);
  await smoothScroll(page, 640, { steps: 26, delay: 28 });
  await wait(900);
  await smoothScroll(page, 820, { steps: 30, delay: 28 });
  await wait(1800);

  // 5. Share a progress card (percent only).
  await tap(page.locator('[href="/"]').first(), 700);
  await tap(page.getByLabel('Share progress').filter({ visible: true }), 1300);
  await tap(page.getByText('Sunset', { exact: true }), 1100);
  await tap(page.getByText('Ocean', { exact: true }), 1700);

  await cdp.send('Page.stopScreencast');
  await browser.close();

  // Each captured frame lasts until the next one; the last frame holds briefly.
  const start = frames[0].t;
  let list = 'ffconcat version 1.0\n';
  frames.forEach((f, i) => {
    const next = frames[i + 1]?.t ?? f.t + 0.8;
    const duration = Math.max(1 / 60, next - f.t);
    list += `file '${f.file}'\nduration ${duration.toFixed(4)}\n`;
  });
  list += `file '${frames[frames.length - 1].file}'\n`;
  const listFile = path.join(frameDir, 'frames.ffconcat');
  fs.writeFileSync(listFile, list);
  const total = frames[frames.length - 1].t + 0.8 - start;
  console.log(`captured ${frames.length} frames, ${total.toFixed(1)} s`);

  const output = path.join(OUT_DIR, 'app-preview.mp4');
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-f', 'concat', '-safe', '0', '-i', listFile,
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
      '-vf', `scale=${WIDTH}:${HEIGHT}:flags=lanczos,fps=30,format=yuv420p`,
      '-t', String(Math.min(MAX_SECONDS, total)),
      '-c:v', 'libx264', '-profile:v', 'high', '-level:v', '4.0', '-preset', 'slow', '-crf', '17',
      '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
      '-shortest', '-movflags', '+faststart',
      output,
    ],
    { stdio: 'inherit' },
  );
  // Poster frame for the kit page.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1', '-i', output, '-frames:v', '1', '-q:v', '3', path.join(OUT_DIR, 'poster.jpg')]);
  fs.rmSync(frameDir, { recursive: true, force: true });
  console.log('wrote', output);
}

main();
