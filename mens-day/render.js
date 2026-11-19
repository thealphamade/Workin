// node render.js [scale] [out.png]  — renders poster.html to PNG
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const scale = Number(process.argv[2] || 2);
  const out = process.argv[3] || path.join(__dirname, 'mens-day-poster.png');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: scale });
  await page.goto('file://' + path.join(__dirname, 'poster.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.locator('#poster').screenshot({ path: out });
  await browser.close();
  console.log('wrote', out);
})();
