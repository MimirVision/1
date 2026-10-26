// Shared helpers for driving the web build like an iPhone when making marketing assets.
const STATUS_BAR = 50; // CSS px reserved at the top for a 9:41 status bar

const BACKGROUND = { light: '#F6F5FA', dark: '#0C0B11' };
const FOREGROUND = { light: '#17151F', dark: '#F4F3F8' };

/** Injected before the app loads: an iOS-style status bar and (optionally) tap indicators. */
function initScript({ scheme, taps }) {
  return `
    (() => {
      const bg = ${JSON.stringify(BACKGROUND[scheme])};
      const fg = ${JSON.stringify(FOREGROUND[scheme])};
      const install = () => {
        if (document.getElementById('__status')) return;
        const style = document.createElement('style');
        style.textContent = \`
          #root { position: fixed !important; top: ${STATUS_BAR}px !important; left: 0; right: 0; bottom: 0; height: auto !important; }
          *::-webkit-scrollbar { display: none } * { scrollbar-width: none }
          #__status { position: fixed; top: 0; left: 0; right: 0; height: ${STATUS_BAR}px; z-index: 99999; display: flex;
            align-items: center; justify-content: space-between; padding: 6px 30px 0 46px; box-sizing: border-box;
            font: 600 16px -apple-system, 'SF Pro Text', Inter, system-ui, sans-serif; color: \${fg}; background: \${bg}; }
          #__status svg { fill: \${fg}; }
          .__tap { position: fixed; z-index: 100000; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
            background: rgba(23,21,31,.28); border: 2px solid rgba(255,255,255,.9); pointer-events: none;
            animation: __tap .55s ease-out forwards; }
          @keyframes __tap { from { transform: scale(.55); opacity: 1 } to { transform: scale(1.35); opacity: 0 } }
        \`;
        document.head.appendChild(style);
        const bar = document.createElement('div');
        bar.id = '__status';
        bar.innerHTML = '<span>9:41</span><span style="display:flex;gap:6px;align-items:center">' +
          '<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>' +
          '<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.5c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .7 10.4 10.4 0 0 0 .8 3.6L2 4.9a8.6 8.6 0 0 1 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.6 6.6 0 0 0 8 4.3a6.6 6.6 0 0 0-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3Zm0 3.5-1.9 2 1.9 1.9 1.9-1.9-1.9-2Z"/></svg>' +
          '<svg width="27" height="12" viewBox="0 0 27 12"><rect x="0.5" y="0.5" width="23" height="11" rx="3.5" fill="none" stroke="currentColor" style="stroke:' + fg + '" opacity=".4"/><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="24.5" y="4" width="2" height="4" rx="1" opacity=".4"/></svg>' +
          '</span>';
        document.body.appendChild(bar);
        ${
          taps
            ? `document.addEventListener('pointerdown', (e) => {
                const dot = document.createElement('div');
                dot.className = '__tap';
                dot.style.left = e.clientX + 'px';
                dot.style.top = e.clientY + 'px';
                document.body.appendChild(dot);
                setTimeout(() => dot.remove(), 600);
              }, true);`
            : ''
        }
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
      else install();
    })();
  `;
}

/** A browser context that looks like an iPhone at 9:41 AM today. */
async function phoneContext(browser, { width = 393, height = 852, scale = 2, scheme = 'light', taps = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    isMobile: true,
    hasTouch: true,
    colorScheme: scheme,
  });
  const morning = new Date();
  morning.setHours(9, 41, 0, 0);
  await context.clock.install({ time: morning });
  await context.addInitScript(initScript({ scheme, taps }));
  return context;
}

/** Scroll the app's main scroll view smoothly by `dy` CSS px. */
async function smoothScroll(page, dy, { steps = 18, delay = 22 } = {}) {
  // Wheel events scroll whatever is under the pointer, so aim at the middle of the screen.
  const size = page.viewportSize();
  if (size) await page.mouse.move(size.width / 2, size.height / 2);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await page.waitForTimeout(delay);
  }
}

/** Walk the onboarding quiz. Options mirror what a user would pick. */
async function onboard(page, base, o) {
  const cont = () => page.getByTestId('onboarding-continue').click();
  const pause = (ms = 350) => page.waitForTimeout(ms);
  await page.goto(`${base}/?reset=1`);
  await page.waitForTimeout(1200);
  await page.getByTestId('onboarding-start').click();
  await pause();
  await cont(); // goal: lose weight
  await pause();
  await page.getByText(o.medication, { exact: true }).click();
  await cont();
  await pause();
  await page.getByText(o.dose, { exact: true }).click();
  await cont();
  await pause();
  await cont(); // schedule
  await pause();
  await page.getByText(o.started, { exact: true }).click();
  await page.getByText(o.lastDose, { exact: true }).click();
  await cont();
  await pause();
  await page.locator('input').first().fill(String(o.weight));
  await cont();
  await pause();
  if (o.startWeight) {
    await page.locator('input').first().fill(String(o.startWeight));
    await cont();
    await pause();
  }
  await cont(); // height
  await pause();
  await page.locator('input').first().fill(String(o.goal));
  await cont();
  await pause();
  await cont(); // sex
  await pause();
  await cont(); // strength
  await pause();
  for (const c of o.concerns) await page.getByText(c, { exact: true }).click();
  await cont();
  await pause();
  await page.locator('input').first().fill(o.name);
  await cont();
}

module.exports = { phoneContext, smoothScroll, onboard, STATUS_BAR };
