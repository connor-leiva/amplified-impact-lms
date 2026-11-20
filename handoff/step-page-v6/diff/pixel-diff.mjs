// Pixel diff: renders a TARGET page and the REFERENCE mockup in the same Chrome, in the same states,
// and compares full-page screenshots with pixelmatch.
//
//   node diff/pixel-diff.mjs                       # harness vs mockup (serves both locally)
//   node diff/pixel-diff.mjs --target https://learn.amplifiedimpact.io/learn/week/0/step/2
//        [--storage-state auth.json]               # a deployed page vs the mockup (acceptance test)
//   options: --selector .page (element shot instead of full page)  --reference URL  --out results/  --chrome /usr/bin/google-chrome  --states default,hover-rail
//   14 states: 8 at 1280 and 390 wide, 6 hover states at 1280 only (22 checks).
//
// The target must keep the mockup's ids and classes (#pills .stp[data-n], #next, #ttoggle, .box-btn, #mark),
// which <StepPage> does. A deployed page gets the mockup's review-only fixtures added first (diff/fixtures.mjs),
// so the whole page can be compared without building a second reference. Writes results/<viewport>-<state>-{target,reference,diff}.png and results/report.json.
import { chromium } from 'playwright-core';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../harness/serve.mjs';
import { addFixtures } from './fixtures.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const here = fileURLToPath(new URL('.', import.meta.url));
const OUT = arg('out', here + '../results/');
const PORT = 4179;
let srv = null;
let target = arg('target'), reference = arg('reference');
if (!target || !reference) { srv = await serve(PORT); }
target ??= `http://localhost:${PORT}/harness/`;
reference ??= `http://localhost:${PORT}/mockup/step-2.html`;
const storage = arg('storage-state');
const selector = arg('selector'); // e.g. '.page' to compare only the step page's own box (both pages have it)
const VIEWPORTS = [{ name: 'desktop-1280', width: 1280, height: 800 }, { name: 'phone-390', width: 390, height: 844 }];
const wait = (pg, ms) => pg.waitForTimeout(ms);
// Springs settle in 560 ms, so every hover and click waits 800 ms before the shot (and the shot fast-forwards anything left).
const SETTLE = 800;
const into = (pg, sel) => pg.evaluate((s) => { const h = document.documentElement; h.style.scrollBehavior = 'auto'; document.querySelector(s).scrollIntoView({ block: 'center' }); h.style.scrollBehavior = ''; }, sel);
const checkAll = async (pg) => { for (const b of await pg.$$('.item .box-btn')) { await b.click(); await wait(pg, 120); } await wait(pg, SETTLE); };
// full: full-page shot, scrolled back to the top first.  view: the viewport as it is (hover states, so the pointer stays put).
// desktop: skipped at 390 px (phones have no hover).
const STATES = {
  default: { full: true, run: async () => {} },
  // desktop: the pointer on step 4, as in the video (reference/frames/02-top-hover-step-4.png); phones: the Next card
  'hover-rail': { full: true, run: async (pg, vp) => { await pg.hover(vp.width > 640 ? '#pills .stp[data-n="4"]' : '#next'); await wait(pg, SETTLE); } },
  'hover-next': { full: true, run: async (pg) => { await pg.hover('#next'); await wait(pg, SETTLE); } },
  'transcript-open': { full: true, run: async (pg) => { await pg.click('#ttoggle'); await wait(pg, SETTLE); await pg.mouse.move(0, 0); await wait(pg, SETTLE); } },
  'mark-locked': { full: true, run: async (pg) => { await pg.click('#mark', { force: true }); await wait(pg, 1200); } },
  'step-done': { full: true, run: async (pg) => { await checkAll(pg); await pg.click('#mark'); await wait(pg, 1600); await pg.mouse.move(0, 0); await wait(pg, SETTLE); } },
  // v6: the brand-motion hover looks (label rolled, outline to ink, no lift) and the spaced Reference accordion
  'hover-play': { desktop: true, run: async (pg) => { await into(pg, '#vframe'); await pg.hover('#vplay .vgo'); await wait(pg, SETTLE); } },
  'hover-chip': { desktop: true, run: async (pg) => { await into(pg, '#chaps-hs'); await pg.hover('#chaps .chip:nth-child(2)'); await wait(pg, SETTLE); } },
  'hover-arrow': { desktop: true, run: async (pg) => { await into(pg, '#chaps-hs'); await pg.hover('#chaps-hs .hs-next'); await wait(pg, SETTLE); } },
  'hover-secondary': { desktop: true, run: async (pg) => { await into(pg, '#know-btn'); await pg.hover('#know-btn'); await wait(pg, SETTLE); } },
  'hover-mark': { desktop: true, run: async (pg) => { await checkAll(pg); await into(pg, '#mark'); await pg.hover('#mark'); await wait(pg, SETTLE); } },
  'hover-done': { desktop: true, run: async (pg) => { await checkAll(pg); await into(pg, '#mark'); await pg.click('#mark'); await wait(pg, 1400); } },
  'acc-open-hover': { run: async (pg) => { await into(pg, '#reference'); await pg.click('#reference summary'); await wait(pg, SETTLE); await pg.hover('#reference summary'); await wait(pg, SETTLE); } },
  'know-open': { full: true, run: async (pg) => { await pg.click('#know-btn'); await wait(pg, 1200); await pg.mouse.move(0, 0); await wait(pg, SETTLE); } },
};
const only = arg('states')?.split(',');
const browser = await chromium.launch({ executablePath: arg('chrome', '/usr/bin/google-chrome'), args: ['--font-render-hinting=none', '--disable-lcd-text', '--hide-scrollbars'] });
const report = [];
mkdirSync(OUT, { recursive: true });
async function shot(url, vp, state, useStorage) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, reducedMotion: 'no-preference', ...(useStorage && storage ? { storageState: storage } : {}) });
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => console.log('  page error:', url, e.message));
  pg.on('console', (m) => { if (m.type() === 'error') console.log('  console error:', url, m.text()); });
  await pg.goto(url, { waitUntil: 'load' });
  await pg.evaluate(() => { try { localStorage.clear(); } catch { /* */ } });
  await pg.reload({ waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await addFixtures(pg); // review-only MOCKUP bar, styles link and section, only if the page lacks them (a deployed page)
  await wait(pg, 1200);   // the page's arrival rise (560 ms + 6 x 45 ms stagger) is over
  const st = STATES[state];
  await st.run(pg, vp);
  if (st.full) { await pg.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); }); await wait(pg, 400); }
  const buf = selector
    ? await pg.locator(selector).first().screenshot({ animations: 'disabled', caret: 'hide' })
    : await pg.screenshot({ fullPage: !!st.full, animations: 'disabled', caret: 'hide' });
  await ctx.close();
  return PNG.sync.read(buf);
}
function pad(img, w, h) {
  if (img.width === w && img.height === h) return img;
  const out = new PNG({ width: w, height: h }); out.data.fill(255);
  PNG.bitblt(img, out, 0, 0, Math.min(img.width, w), Math.min(img.height, h), 0, 0); return out;
}
for (const vp of VIEWPORTS) for (const state of Object.keys(STATES)) {
  if (only && !only.includes(state)) continue;
  if (STATES[state].desktop && vp.width <= 640) continue;
  const a = await shot(target, vp, state, true), b = await shot(reference, vp, state, false);
  const w = Math.max(a.width, b.width), h = Math.max(a.height, b.height);
  const A = pad(a, w, h), B = pad(b, w, h), D = new PNG({ width: w, height: h });
  const diff = pixelmatch(A.data, B.data, D.data, w, h, { threshold: 0.1, includeAA: false });
  const strict = pixelmatch(A.data, B.data, null, w, h, { threshold: 0, includeAA: true });
  const tag = `${vp.name}-${state}`;
  writeFileSync(`${OUT}${tag}-target.png`, PNG.sync.write(a)); writeFileSync(`${OUT}${tag}-reference.png`, PNG.sync.write(b)); writeFileSync(`${OUT}${tag}-diff.png`, PNG.sync.write(D));
  const row = { viewport: vp.name, state, size: { target: [a.width, a.height], reference: [b.width, b.height] }, diffPixels: diff, pct: +(100 * diff / (w * h)).toFixed(4), strictPixels: strict, strictPct: +(100 * strict / (w * h)).toFixed(4) };
  report.push(row); console.log(`${tag.padEnd(30)} ${String(row.pct).padStart(8)}%  (strict ${row.strictPct}%)  target ${a.width}x${a.height} ref ${b.width}x${b.height}`);
}
writeFileSync(`${OUT}report.json`, JSON.stringify({ target, reference, when: new Date().toISOString(), threshold: 0.1, report }, null, 2));
await browser.close(); srv?.close();
const worst = Math.max(...report.map((r) => r.pct));
console.log(worst < 0.1 ? `PASS: every state under 0.1% (worst ${worst}%)` : `FAIL: worst ${worst}% (target < 0.1%)`);
process.exit(worst < 0.1 ? 0 : 1);
