// Renders the app icon set from the SVG sources: `node assets/source/render-icons.js`
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const src = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const out = (f) => path.join(__dirname, '..', 'images', f);

async function render(page, svg, size, file, { transparent = false, scale = 1, background } = {}) {
  const inner = svg.replace(/width="1024" height="1024"/, `width="${size * scale}" height="${size * scale}"`);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:${background ?? 'transparent'};display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${inner}</body></html>`,
  );
  await page.screenshot({ path: out(file), omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', file);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const icon = src('icon.svg');
  const mark = src('mark.svg');
  const mono = src('monochrome.svg');
  await render(page, icon, 1024, 'icon.png', { background: '#5B3DF5' });
  await render(page, icon, 48, 'favicon.png', { background: '#5B3DF5' });
  await render(page, mark, 512, 'splash-icon.png', { transparent: true });
  // Android adaptive icons: foreground mark inside the 66% safe zone.
  await render(page, mark, 512, 'android-icon-foreground.png', { transparent: true, scale: 0.72 });
  await render(page, '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B3DF5"/><stop offset="0.62" stop-color="#8B5CF6"/><stop offset="1" stop-color="#FF7A59"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/></svg>', 512, 'android-icon-background.png');
  await render(page, mono, 432, 'android-icon-monochrome.png', { transparent: true, scale: 0.72 });
  await browser.close();
})();
