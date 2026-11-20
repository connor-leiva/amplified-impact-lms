// Piece review (test C): every piece of the step page, in each of its states, at 1280, 1100, 900, 720, 640 and
// 390 px wide, as an element screenshot of the TARGET next to the same element of the REFERENCE mockup, in the
// same Chrome. A piece passes with 0 differing pixels (pixelmatch threshold 0.1, antialiasing ignored, as test A
// counts them); the strict count (threshold 0, antialiasing included) is reported beside it.
//
//   node diff/piece-review.mjs                                  # harness vs mockup (serves both locally)
//   node diff/piece-review.mjs --target <url> --storage-state <auth.json>
//        [--reset "<command>"]   run before the target loads and after every state that writes (ticks a box,
//                                marks the step done); required for a deployed page, never a real buyer
//        [--widths 1280,390] [--pieces back,pills] [--out results/pieces/] [--port 4181] [--chrome /usr/bin/google-chrome]
//
// Hover states are skipped at 640 px and under (phones have no hover), as test A does. The review-only fixtures
// (MOCKUP bar, Text styles link and section) are added to the target first (fixtures.mjs), so both pages line up.
// Writes <out><width>-<piece>-<state>-{target,reference,diff}.png and <out>report.json.
import { chromium } from 'playwright-core';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../harness/serve.mjs';
import { addFixtures } from './fixtures.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const here = fileURLToPath(new URL('.', import.meta.url));
const OUT = arg('out', here + '../results/pieces/');
const PORT = Number(arg('port', 4181));
let srv = null;
let target = arg('target'), reference = arg('reference');
if (!target || !reference) srv = await serve(PORT);
target ??= `http://localhost:${PORT}/harness/?lms`;
reference ??= `http://localhost:${PORT}/mockup/step-2.html`;
const storage = arg('storage-state');
const resetCmd = arg('reset');
const WIDTHS = (arg('widths') ?? '1280,1100,900,720,640,390').split(',').map(Number);
const only = arg('pieces')?.split(',');
// The API allows 100 requests a minute per session. On a target with a session, a reload or a state that writes
// first waits until the page's own API requests over the last 61 s leave room for it.
const LIMIT = 100;
const api = [];
const recent = () => { const since = Date.now() - 61_000; while (api.length && api[0] < since) api.shift(); return api.length; };
const room = async (need) => { if (!storage) return; while (recent() + need > LIMIT) await sleep(500); };
const SETTLE = 800;
const wait = (pg, ms) => pg.waitForTimeout(ms);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const hover = (sel) => async (pg) => { await pg.hover(sel); await wait(pg, SETTLE); };
const focus = (sel) => async (pg) => { await pg.keyboard.press('Shift'); await pg.locator(sel).first().focus(); await wait(pg, SETTLE); };
const press = (sel) => async (pg) => {
  const box = await pg.locator(sel).first().boundingBox();
  await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await pg.mouse.down(); await wait(pg, 400);
  // Released off the element, so the press never becomes a click (a link would navigate, a box would toggle).
  return async () => { await pg.mouse.move(0, 0); await pg.mouse.up(); };
};
const click = (sel, ms = SETTLE) => async (pg) => { await pg.click(sel); await wait(pg, ms); await pg.mouse.move(0, 0); await wait(pg, SETTLE); };
const checkAll = async (pg) => { for (const b of await pg.$$('.item .box-btn')) { await b.click(); await wait(pg, 120); } await pg.mouse.move(0, 0); await wait(pg, SETTLE); };
const scrollRow = (sel) => async (pg) => { await pg.evaluate((s) => { const r = document.querySelector(s); r.scrollLeft = r.scrollWidth; }, sel); await wait(pg, SETTLE); };

// [state, run, { hover, writes }]. A run may return a cleanup (a press releases after the shot).
const PIECES = {
  back: { sel: '.back', states: [['rest'], ['hover', hover('.back'), { hover: true }], ['focus-visible', focus('.back')], ['pressed', press('.back')]] },
  pills: {
    sel: '#pills-hs',
    states: [
      ['start'],
      ['hover-step-4', hover('#pills .stp[data-n="4"]'), { hover: true }],
      ['focus-visible-step-3', focus('#pills .stp[data-n="3"]')],
      ['pressed-step-3', press('#pills .stp[data-n="3"]')],
      ['scrolled-end', scrollRow('#pills')],
    ],
  },
  header: { sel: '.head', states: [['rest'], ['one-checked', click('.item .box-btn'), { writes: true }]] },
  video: {
    sel: '#vframe',
    states: [['rest'], ['hover-play', hover('#vplay .vgo'), { hover: true }], ['focus-visible-play', focus('#vplay')], ['pressed-play', press('#vplay')]],
  },
  chapters: {
    sel: '.chapters',
    states: [
      ['start'],
      ['hover-chip-2', hover('#chaps .chip:nth-child(2)'), { hover: true }],
      ['hover-arrow', hover('#chaps-hs .hs-next'), { hover: true }],
      ['focus-visible-chip-2', focus('#chaps .chip:nth-child(2)')],
      ['pressed-chip-2', press('#chaps .chip:nth-child(2)')],
      ['scrolled-end', scrollRow('#chaps')],
    ],
  },
  'transcript-bar': {
    sel: '.tbar',
    states: [['closed'], ['hover-toggle', hover('#ttoggle'), { hover: true }], ['focus-visible-toggle', focus('#ttoggle')], ['open', click('#ttoggle')]],
  },
  'transcript-panel': { sel: '#tpanel', states: [['open', click('#ttoggle')]] },
  checklist: {
    sel: '#checklist',
    states: [
      ['rest'],
      ['hover-box', hover('.item .box-btn'), { hover: true }],
      ['focus-visible-box', focus('.item .box-btn')],
      ['pressed-box', press('.item .box-btn')],
      ['hover-secondary', hover('#know-btn'), { hover: true }],
      ['know-open', click('#know-btn', 1200)],
      ['one-checked', click('.item .box-btn'), { writes: true }],
      ['all-checked', checkAll, { writes: true }],
    ],
  },
  reference: {
    sel: '#reference',
    states: [['closed'], ['hover-summary', hover('#reference summary'), { hover: true }], ['focus-visible-summary', focus('#reference summary')], ['open', click('#reference summary')]],
  },
  footer: {
    sel: '#foot',
    states: [
      ['locked'],
      ['hover-next', hover('#next'), { hover: true }],
      ['focus-visible-next', focus('#next')],
      ['locked-clicked', async (pg) => { await pg.click('#mark', { force: true }); await wait(pg, 1200); await pg.mouse.move(0, 0); await wait(pg, SETTLE); }],
      ['ready', checkAll, { writes: true }],
      ['hover-mark', async (pg) => { await checkAll(pg); await hover('#mark')(pg); }, { hover: true, writes: true }],
      ['done', async (pg) => { await checkAll(pg); await pg.click('#mark'); await wait(pg, 1600); await pg.mouse.move(0, 0); await wait(pg, SETTLE); }, { writes: true }],
    ],
  },
  sidebar: {
    sel: '.rail',
    states: [
      ['rest'],
      ['hover-view', hover('.rail .res .btn'), { hover: true }],
      ['hover-help', hover('.rail .card-link'), { hover: true }],
      ['focus-visible-link', focus('.rail nav.card a[href="#checklist"]')],
      ['one-checked', click('.item .box-btn'), { writes: true }],
    ],
  },
};

const browser = await chromium.launch({ executablePath: arg('chrome', '/usr/bin/google-chrome'), args: ['--font-render-hinting=none', '--disable-lcd-text', '--hide-scrollbars'] });
mkdirSync(OUT, { recursive: true });
const report = [];

async function open(url, width, useStorage) {
  const ctx = await browser.newContext({ viewport: { width, height: width <= 640 ? 844 : 800 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', ...(useStorage && storage ? { storageState: storage } : {}) });
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => console.log('  page error:', url, e.message));
  if (useStorage) pg.on('request', (q) => { if (new URL(q.url()).pathname.startsWith('/api/')) api.push(Date.now()); });
  await load(pg, url, useStorage, true);
  return { ctx, pg };
}
async function load(pg, url, isTarget, first) {
  if (isTarget && storage) {
    await room(30);
    if (resetCmd) execSync(resetCmd, { stdio: 'inherit' });
  }
  if (first) await pg.goto(url, { waitUntil: 'load' });
  await pg.evaluate(() => { try { localStorage.clear(); } catch { /* */ } }); // the transcript remembers it was open
  await pg.reload({ waitUntil: 'load' });
  await pg.waitForSelector('.page #foot', { timeout: 30_000 }); // the app draws after `load`; the mockup by then
  await pg.evaluate(() => document.fonts.ready);
  await addFixtures(pg);
  await wait(pg, 1200);
  // A reload can restore the old scroll position, which moves the scroll-spy; every state starts at the top.
  await rest(pg);
  await wait(pg, SETTLE);
}
async function rest(pg) {
  await pg.mouse.move(0, 0);
  await pg.evaluate(() => { document.activeElement?.blur?.(); document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
  await wait(pg, 400);
}
async function shotOf(pg, sel, run) {
  // Scrolled into view and settled first: the scroll-spy and the springs answer a scroll a frame or more later
  // (React re-renders after the observer fires), so a shot taken during the scroll would catch them mid-way.
  await pg.locator(sel).first().scrollIntoViewIfNeeded();
  await wait(pg, SETTLE);
  const undo = run ? await run(pg) : null;
  const buf = await pg.locator(sel).first().screenshot({ animations: 'disabled', caret: 'hide' });
  if (typeof undo === 'function') await undo();
  return PNG.sync.read(buf);
}

for (const width of WIDTHS) {
  const t = await open(target, width, true);
  const r = await open(reference, width, false);
  for (const [piece, { sel, states }] of Object.entries(PIECES)) {
    if (only && !only.includes(piece)) continue;
    for (const [state, run, opts = {}] of states) {
      if (opts.hover && width <= 640) continue;
      if (opts.writes) await room(60);
      const a = await shotOf(t.pg, sel, run), b = await shotOf(r.pg, sel, run);
      const tag = `${width}-${piece}-${state}`;
      let row;
      if (a.width !== b.width || a.height !== b.height) {
        row = { width, piece, state, size: { target: [a.width, a.height], reference: [b.width, b.height] }, diffPixels: null, strictPixels: null, pass: false };
      } else {
        const D = new PNG({ width: a.width, height: a.height });
        const diff = pixelmatch(a.data, b.data, D.data, a.width, a.height, { threshold: 0.1, includeAA: false });
        const strict = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0, includeAA: true });
        writeFileSync(`${OUT}${tag}-diff.png`, PNG.sync.write(D));
        row = { width, piece, state, size: { target: [a.width, a.height], reference: [b.width, b.height] }, diffPixels: diff, strictPixels: strict, pass: diff === 0 };
      }
      writeFileSync(`${OUT}${tag}-target.png`, PNG.sync.write(a)); writeFileSync(`${OUT}${tag}-reference.png`, PNG.sync.write(b));
      report.push(row);
      console.log(`${tag.padEnd(40)} ${row.pass ? 'pass' : 'FAIL'}  ${row.diffPixels === null ? `size ${a.width}x${a.height} vs ${b.width}x${b.height}` : `${row.diffPixels} px (strict ${row.strictPixels})`}`);
      if (opts.writes) { await load(t.pg, target, true, false); await load(r.pg, reference, false, false); }
      else { await rest(t.pg); await rest(r.pg); if (/open|clicked|scrolled/.test(state)) { await load(t.pg, target, true, false); await load(r.pg, reference, false, false); } }
    }
  }
  await t.ctx.close(); await r.ctx.close();
}
writeFileSync(`${OUT}report.json`, JSON.stringify({ target, reference, when: new Date().toISOString(), threshold: 0.1, report }, null, 2));
await browser.close(); srv?.close();
const failed = report.filter((x) => !x.pass);
console.log(failed.length ? `FAIL: ${failed.length} of ${report.length} piece states differ` : `PASS: all ${report.length} piece states at 0 differing pixels`);
process.exit(failed.length ? 1 : 0);
