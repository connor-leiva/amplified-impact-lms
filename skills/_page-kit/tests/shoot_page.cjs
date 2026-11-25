// Screenshots and a Letter PDF of one built page (skills/README.md, Page Kit).
//
//   node skills/_page-kit/tests/shoot_page.cjs <page.html>
//
// Writes, beside the page: <name>-1280.png and <name>-390.png (full page, 1 CSS pixel per image pixel,
// so the widths are exactly 1280 and 390, as a reader first sees it), <name>-1280-expanded.png (every
// Show The Details and Why Ask This opened), and <name>.pdf (Letter, the template's own print styles,
// which hide the buttons, open every Show The Math block and show every table row). Fails when the
// page throws or logs an error, or scrolls sideways at either width. Uses the preinstalled Playwright.
// Each PNG is then reduced to a 128-color palette with Python's Pillow, when it is installed, so the
// committed screenshots stay small (the page is flat color, so they look the same); without Pillow
// the full-color PNG stays.

const { chromium } = require('playwright');
const { resolve, dirname, basename, join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');

const SHRINK = 'import sys\nfrom PIL import Image\nfor f in sys.argv[1:]:\n    Image.open(f).convert("RGB").quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(f, optimize=True)\n';

(async () => {
  const file = resolve(process.argv[2]);
  const stem = join(dirname(file), basename(file, '.html'));
  const browser = await chromium.launch();
  let failed = false;
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(pathToFileURL(file).href);
    await page.evaluate(() => document.fonts.ready);
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: `${stem}-${width}.png`, fullPage: true });
    console.log(`${width}px: ${basename(stem)}-${width}.png, errors ${errors.length}, sideways scroll ${sideways}px`);
    if (errors.length || sideways > 0) {
      failed = true;
      for (const e of errors) console.error(`  ${e}`);
    }
    if (width === 1280) {
      await page.evaluate(() => document.querySelectorAll('.disc-toggle[aria-expanded="false"], .why-toggle[aria-expanded="false"]').forEach((b) => b.click()));
      await page.screenshot({ path: `${stem}-1280-expanded.png`, fullPage: true });
      console.log(`1280px expanded: ${basename(stem)}-1280-expanded.png`);
      await page.emulateMedia({ media: 'print' });
      await page.pdf({ path: `${stem}.pdf`, preferCSSPageSize: true, printBackground: true });
      console.log(`print: ${basename(stem)}.pdf`);
    }
    await page.close();
  }
  await browser.close();
  const shrink = spawnSync('python3', ['-c', SHRINK, `${stem}-1280.png`, `${stem}-390.png`, `${stem}-1280-expanded.png`], { encoding: 'utf8' });
  console.log(shrink.status === 0 ? 'PNGs reduced to a 128-color palette' : 'Pillow not found: PNGs left in full color');
  process.exit(failed ? 1 : 0);
})();
