// Piece review (test C): every piece of the step page, in each of its states, at 1280, 1100, 900, 720, 640 and
// 390 px wide. Each state is driven with real input (pointer, keyboard, wheel) on the TARGET and on the REFERENCE
// mockup alike, given 800 ms, and the piece is shot as an element screenshot on both and diffed with pixelmatch
// (threshold 0.1, antialiasing ignored, as test A counts). A state passes with 0 differing pixels; the strict count
// (threshold 0, antialiasing included) is reported beside it.
//
//   node diff/piece-review.mjs                                  # harness vs mockup (serves both locally)
//   node diff/piece-review.mjs --target <url> --storage-state <auth.json> --reset "<command>"
//        --reset     run before every load of the target: the states tick real boxes and mark the step done,
//                    so a deployed page needs its test learner put back each time (never a real buyer)
//        [--widths 1280,390] [--pieces back,pills] [--out results/pieces/] [--port 4181] [--chrome …]
//
// Hover and press states run at 1100 px and up. The On this page marker per section and the rail's sticky position
// run where the rail sits beside the content (1280); below that the rail is under the page and those states are not
// on screen. The playing video's picture is masked in the `started` state (course media); everything drawn over it
// is compared. Course media time is held still after a chapter is clicked (the video is paused at the chapter's
// start on both pages), so the chapter chip's progress fill is compared exactly.
// The review-only fixtures (MOCKUP bar, Text styles link and section) are added to the target first (fixtures.mjs).
// The page-level shots stop where the review-only section begins, and "scrolled to the footer" puts the footer at
// the bottom of the screen, so the review-only section (which the mockup's scroll-spy tracks and the LMS cannot) is
// never in a compared shot.
// Writes <out><width>-<piece>-<state>-{target,reference,diff}.png, <out>report.json and <out>piece-review.md.
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
const SETTLE = 800;
const POINTER_MIN = 1100; // hover and press states
const WIDE_MIN = 1280;    // the rail beside the content
const wait = (pg, ms) => pg.waitForTimeout(ms);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The API allows 100 requests a minute per session. On a target with a session, a load first waits until the
// page's own API requests over the last 61 s leave room for it and for what its chain will send.
const LIMIT = 100;
const api = [];
const recent = () => { const since = Date.now() - 61_000; while (api.length && api[0] < since) api.shift(); return api.length; };
const room = async (need) => { if (!storage) return; while (recent() + need > LIMIT) await sleep(500); };

// --- real input ------------------------------------------------------------------------------------------------
const off = async (pg) => { await pg.mouse.move(0, 0); await wait(pg, 300); };
const hover = (sel) => async (pg) => { await pg.hover(sel); await wait(pg, SETTLE); };
const focus = (sel) => async (pg) => { await pg.keyboard.press('Shift'); await pg.locator(sel).first().focus(); await wait(pg, SETTLE); };
// Released off the element after the shot, so a press never becomes a click (a link would navigate, a box toggle).
const press = (sel) => async (pg) => {
  const loc = pg.locator(sel).first(); await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await pg.mouse.down(); await wait(pg, SETTLE);
  return async () => { await pg.mouse.move(0, 0); await pg.mouse.up(); await wait(pg, 300); };
};
const click = (sel, ms = SETTLE) => async (pg) => { await pg.click(sel); await off(pg); await wait(pg, ms); };
const wheelOver = (sel, dx, dy) => async (pg) => {
  const loc = pg.locator(sel).first(); await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await pg.mouse.wheel(dx, dy); await wait(pg, 300); await off(pg); await wait(pg, SETTLE);
};
const scrollTo = (sel, block = 'start') => async (pg) => {
  await pg.evaluate(([s, b]) => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector(s).scrollIntoView({ block: b }); }, [sel, block]);
  await wait(pg, SETTLE + 400);
};
// The network stall HlsEngine reports: the media element's own `waiting`, which the page listens for.
const media = (type) => async (pg) => { await pg.evaluate((t) => document.getElementById('video').dispatchEvent(new Event(t)), type); await wait(pg, SETTLE); };
// After a chapter click: hold course media still at the chapter's start (the target plays the file, the mockup has none).
const holdAt = (t) => async (pg) => { await pg.evaluate((s) => { const v = document.getElementById('video'); try { v.pause(); v.currentTime = s; } catch { /* no media */ } }, t); await wait(pg, SETTLE); };
const resetRow = (sel) => async (pg) => { await pg.evaluate((s) => { const r = document.querySelector(s); if (r) r.scrollLeft = 0; }, sel); await wait(pg, SETTLE); };
const seq = (...fns) => async (pg) => { let undo = null; for (const f of fns) { const u = await f(pg); if (typeof u === 'function') undo = u; } return undo; };

// --- the review ------------------------------------------------------------------------------------------------
// A chain starts from a fresh load (the test learner reset first). Its steps run in order on both pages; a step
// photographs its `shots` after its input. `pointer` steps run at 1100 px and up, `wide` steps at 1280. After a step
// the pointer moves off, focus is dropped and the page returns to the top; what the chain builds on (a box checked,
// a panel open) stays. `reset` puts back anything else a step moved (a scrolled row, a copied label).
const S = (piece, state, sel, opts = {}) => ({ piece, state, sel, ...opts });
const PILLS = [['done', 1], ['current', 2], ['upcoming', 3], ['waiting', 5]];
const ITEMS = [
  ['watch', 's2-watch', '.item[data-id="s2-watch"] [data-seek]', 'play-from-0'],
  ['words', 's2-words', '#know-btn', 'open-words'],
  ['rhythm', 's2-rhythm', '.item[data-id="s2-rhythm"] .btn', 'add-to-calendar'],
  ['questions', 's2-questions', '.item[data-id="s2-questions"] .btn', 'ask-us'],
];
const row = (id) => `.item[data-id="${id}"]`;
const NAV = '.rail nav.card', KIT = '.rail > section:nth-of-type(1)', STUCK = '.rail > section:nth-of-type(2)';

const clean = [
  { shots: [S('back', 'rest', '.back'), S('pills', 'start', '#pills-hs'), S('head', 'progress-0', '.head'), S('vframe', 'rest', '#vframe'),
    S('chapters', 'rest', '.chapters'), S('tbar', 'closed', '.tbar'), ...ITEMS.map(([n, id]) => S(`item-${n}`, 'unchecked', row(id))),
    S('tip', 'rest', '#list .callout.tip'), S('reference', 'closed', '#reference .acc'), S('foot', 'locked', '#foot'),
    S('rail-nav', 'watch-current-0-checked', NAV), S('rail-kit', 'rest', KIT), S('rail-stuck', 'rest', STUCK),
    S('page', 'top', null, { shot: 'full' })] },
  { run: hover('.back'), pointer: true, shots: [S('back', 'hover', '.back')] },
  { run: focus('.back'), shots: [S('back', 'focus-visible', '.back')] },
  { run: press('.back'), pointer: true, shots: [S('back', 'pressed', '.back')] },
  ...PILLS.flatMap(([kind, n]) => {
    const pill = `#pills .stp[data-n="${n}"]`;
    return [
      { run: hover(pill), pointer: true, shots: [S('pills', `${kind}-hover`, '#pills-hs')], reset: resetRow('#pills') },
      { run: focus(pill), shots: [S('pills', `${kind}-focus-visible`, '#pills-hs')], reset: resetRow('#pills') },
      { run: press(pill), pointer: true, shots: [S('pills', `${kind}-pressed`, '#pills-hs')], reset: resetRow('#pills') },
    ];
  }),
  { run: async (pg) => { const half = await pg.evaluate(() => { const r = document.getElementById('pills'); return Math.round((r.scrollWidth - r.clientWidth) / 2); }); await wheelOver('#pills', half, 0)(pg); },
    shots: [S('pills', 'scrolled-middle', '#pills-hs')], reset: resetRow('#pills') },
  { run: wheelOver('#pills', 5000, 0), shots: [S('pills', 'scrolled-end', '#pills-hs')], reset: resetRow('#pills') },
  { run: hover('#vplay .vgo'), pointer: true, shots: [S('vframe', 'play-hover', '#vframe')] },
  { run: press('#vplay'), pointer: true, shots: [S('vframe', 'play-pressed', '#vframe')] },
  { run: focus('#vplay'), shots: [S('vframe', 'play-focus-visible', '#vframe')] },
  { run: media('waiting'), shots: [S('vframe', 'buffering', '#vframe')], reset: media('playing') },
  { run: hover('#chaps .chip:nth-child(2)'), pointer: true, shots: [S('chapters', 'chip-hover', '.chapters')] },
  { run: press('#chaps .chip:nth-child(2)'), pointer: true, shots: [S('chapters', 'chip-pressed', '.chapters')] },
  { run: hover('#chaps .chip:nth-child(1)'), pointer: true, shots: [S('chapters', 'current-chip-hover', '.chapters')] },
  { run: hover('#chaps-hs .hs-next'), pointer: true, shots: [S('chapters', 'next-arrow-hover', '.chapters')] },
  { run: press('#chaps-hs .hs-next'), pointer: true, shots: [S('chapters', 'next-arrow-pressed', '.chapters')] },
  { run: focus('#chaps .chip:nth-child(2)'), shots: [S('chapters', 'chip-focus-visible', '.chapters')], reset: resetRow('#chaps') },
  { run: hover('#ttoggle'), pointer: true, shots: [S('tbar', 'show-hover', '.tbar')] },
  { run: focus('#ttoggle'), shots: [S('tbar', 'show-focus-visible', '.tbar')] },
  ...ITEMS.flatMap(([n, id, btn, label]) => [
    { run: hover(`${row(id)} .box-btn`), pointer: true, shots: [S(`item-${n}`, 'box-hover', row(id))] },
    { run: focus(`${row(id)} .box-btn`), shots: [S(`item-${n}`, 'box-focus-visible', row(id))] },
    { run: press(`${row(id)} .box-btn`), pointer: true, shots: [S(`item-${n}`, 'box-pressed', row(id))] },
    { run: hover(btn), pointer: true, shots: [S(`item-${n}`, `${label}-hover`, row(id))] },
    { run: press(btn), pointer: true, shots: [S(`item-${n}`, `${label}-pressed`, row(id))] },
    { run: focus(btn), shots: [S(`item-${n}`, `${label}-focus-visible`, row(id))] },
  ]),
  { run: hover('#reference summary'), pointer: true, shots: [S('reference', 'closed-hover', '#reference .acc')] },
  { run: focus('#reference summary'), shots: [S('reference', 'focus-visible', '#reference .acc')] },
  { run: hover('#next'), pointer: true, shots: [S('foot', 'next-hover', '#foot')] },
  { run: press('#next'), pointer: true, shots: [S('foot', 'next-pressed', '#foot')] },
  { run: focus('#next'), shots: [S('foot', 'next-focus-visible', '#foot')] },
  { run: hover(`${NAV} a[href="#reference"]`), pointer: true, shots: [S('rail-nav', 'link-hover', NAV)] },
  { run: click(`${NAV} a[href="#checklist"]`, 1200), wide: true, shots: [S('rail-nav', 'checklist-current', NAV)] },
  { run: click(`${NAV} a[href="#reference"]`, 1200), wide: true, shots: [S('rail-nav', 'reference-current', NAV)] },
  { run: hover(`${KIT} .res .btn:not([data-copy])`), pointer: true, shots: [S('rail-kit', 'view-hover', KIT)] },
  { run: press(`${KIT} .res .btn:not([data-copy])`), pointer: true, shots: [S('rail-kit', 'view-pressed', KIT)] },
  { run: hover(`${KIT} [data-copy]`), pointer: true, shots: [S('rail-kit', 'copy-hover', KIT)] },
  { run: press(`${KIT} [data-copy]`), pointer: true, shots: [S('rail-kit', 'copy-pressed', KIT)] },
  { run: click(`${KIT} [data-copy]`, 300), shots: [S('rail-kit', 'copied', KIT)], reset: async (pg) => wait(pg, 1400) },
  { run: hover(`${STUCK} a.card-link:nth-of-type(1)`), pointer: true, shots: [S('rail-stuck', 'email-hover', STUCK)] },
  { run: hover(`${STUCK} a.card-link:nth-of-type(2)`), pointer: true, shots: [S('rail-stuck', 'office-hours-hover', STUCK)] },
  { run: scrollTo('#checklist'), wide: true, shots: [S('rail', 'sticky-scrolled', null, { shot: 'viewport' })] },
  { run: scrollTo('#watch'), shots: [S('page', 'scrolled-video', null, { shot: 'viewport' })] },
  { run: scrollTo('#checklist'), shots: [S('page', 'scrolled-checklist', null, { shot: 'viewport' })] },
  { run: scrollTo('#foot', 'end'), shots: [S('page', 'scrolled-footer', null, { shot: 'viewport' })] },
];

const opened = [
  { run: click('#know-btn', 1200), shots: [S('item-words', 'know-open', row('s2-words'))] },
  { run: hover('#know-btn'), pointer: true, shots: [S('item-words', 'hide-words-hover', row('s2-words'))] },
  { run: press('#know-btn'), pointer: true, shots: [S('item-words', 'hide-words-pressed', row('s2-words'))] },
  { run: focus('#know-btn'), shots: [S('item-words', 'hide-words-focus-visible', row('s2-words'))] },
  { run: click('#reference summary', 1000), shots: [S('reference', 'open', '#reference .acc')] },
  { run: hover('#reference summary'), pointer: true, shots: [S('reference', 'open-hover', '#reference .acc')] },
  { run: async (pg) => { await pg.click('#mark', { force: true }); await off(pg); await wait(pg, 1200); }, shots: [S('foot', 'locked-click', '#foot')] },
  { run: click('#chaps-hs .hs-next', 1000), shots: [S('chapters', 'after-one-arrow-click', '.chapters')] },
  { run: hover('#chaps-hs .hs-prev'), pointer: true, shots: [S('chapters', 'prev-arrow-hover', '.chapters')] },
  { run: press('#chaps-hs .hs-prev'), pointer: true, shots: [S('chapters', 'prev-arrow-pressed', '.chapters')] },
  { run: click('#chaps-hs .hs-next', 1000), shots: [S('chapters', 'after-two-arrow-clicks', '.chapters')] },
  { run: seq(click('#chaps .chip:nth-child(7)', 1000), holdAt(211.13)),
    shots: [S('chapters', 'chapter-clicked', '.chapters'), S('vframe', 'started', '#vframe', { mask: 'video' })] },
  { run: click('#ttoggle', 1000), shots: [S('tbar', 'open', '.tbar'), S('tpanel', 'open-current-row', '#tpanel')] },
  { run: hover('#tscroll .cue[aria-current="true"] + .cue'), pointer: true, shots: [S('tpanel', 'cue-hover', '#tpanel')] },
  { run: click('#tcopy', 300), shots: [S('tbar', 'copied', '.tbar')], reset: async (pg) => wait(pg, 1400) },
  { run: wheelOver('#tscroll', 0, 1500), shots: [S('tpanel', 'back-to-current', '#tpanel')] },
];

const written = [
  ...ITEMS.map(([n, id], k) => ({
    run: click(`${row(id)} .box-btn`, 1000),
    shots: [S('head', `progress-${k + 1}`, '.head'), S('rail-nav', `mirror-${k + 1}-checked`, NAV), S(`item-${n}`, 'checked', row(id)),
      ...(k === ITEMS.length - 1 ? [S('foot', 'ready', '#foot')] : [])],
  })),
  { run: hover('#mark'), pointer: true, shots: [S('foot', 'mark-hover', '#foot')] },
  { run: press('#mark'), pointer: true, shots: [S('foot', 'mark-pressed', '#foot')] },
  { run: focus('#mark'), shots: [S('foot', 'mark-focus-visible', '#foot')] },
  { run: click('#mark', 1600), shots: [S('foot', 'done', '#foot'), S('pills', 'current-after-done', '#pills-hs')] },
  { run: hover('#mark'), pointer: true, shots: [S('foot', 'done-hover', '#foot')] },
  { run: hover('#undo'), pointer: true, shots: [S('foot', 'undo-hover', '#foot')] },
];

const CHAINS = [['clean', clean], ['opened', opened], ['written', written]];

// --- running it ------------------------------------------------------------------------------------------------
const browser = await chromium.launch({ executablePath: arg('chrome', '/usr/bin/google-chrome'), args: ['--font-render-hinting=none', '--disable-lcd-text', '--hide-scrollbars'] });
mkdirSync(OUT, { recursive: true });
const report = [];

async function open(url, width, isTarget) {
  const ctx = await browser.newContext({ viewport: { width, height: width <= 640 ? 844 : 800 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', ...(isTarget && storage ? { storageState: storage } : {}) });
  const pg = await ctx.newPage();
  pg.on('pageerror', (e) => console.log('  page error:', url, e.message));
  if (isTarget) pg.on('request', (q) => { if (new URL(q.url()).pathname.startsWith('/api/')) api.push(Date.now()); });
  return { ctx, pg, url, isTarget, loaded: false };
}
async function load(p, need = 30) {
  if (p.isTarget && storage) { await room(need); if (resetCmd) execSync(resetCmd, { stdio: 'inherit' }); }
  if (!p.loaded) { await p.pg.goto(p.url, { waitUntil: 'load' }); p.loaded = true; }
  await p.pg.evaluate(() => { try { localStorage.clear(); } catch { /* */ } }); // the transcript remembers it was open
  await p.pg.reload({ waitUntil: 'load' });
  await p.pg.waitForSelector('.page #foot', { timeout: 30_000 }); // the app draws after `load`; the mockup by then
  await p.pg.evaluate(() => document.fonts.ready);
  await addFixtures(p.pg);
  await wait(p.pg, 1200);
  await rest(p.pg); // a reload can restore the old scroll position, which moves the scroll-spy
  await wait(p.pg, SETTLE);
}
async function rest(pg) {
  await pg.mouse.move(0, 0);
  await pg.evaluate(() => { document.activeElement?.blur?.(); document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
  await wait(pg, 400);
}
const wanted = (shot) => !only || only.includes(shot.piece);
// One step on one page: settle the first wanted piece in view, run the input, shoot every wanted piece, then undo.
async function stepOn(pg, step) {
  const shots = step.shots.filter(wanted);
  const first = shots.find((s) => s.sel && (s.shot ?? 'element') === 'element');
  if (first) { await pg.locator(first.sel).first().scrollIntoViewIfNeeded(); await wait(pg, SETTLE); }
  const undo = step.run ? await step.run(pg) : null;
  const out = [];
  for (const s of shots) {
    const kind = s.shot ?? 'element';
    let buf, mask = null;
    if (kind === 'full') {
      // The page the LMS ships: it ends where the review-only "Text styles" section (a fixture) begins.
      const clip = await pg.evaluate(() => { const st = document.getElementById('styles'); const h = document.documentElement.scrollHeight; return { x: 0, y: 0, width: document.documentElement.clientWidth, height: st ? Math.floor(st.getBoundingClientRect().top + scrollY) : h }; });
      buf = await pg.screenshot({ fullPage: true, clip, animations: 'disabled', caret: 'hide' });
    }
    else if (kind === 'viewport') buf = await pg.screenshot({ animations: 'disabled', caret: 'hide' });
    else {
      const loc = pg.locator(s.sel).first();
      if (s.mask === 'video') {
        const [e, v] = [await loc.boundingBox(), await pg.locator('#video').boundingBox()];
        mask = [Math.round(v.x - e.x) + 1, Math.round(v.y - e.y) + 1, Math.round(v.width) - 2, Math.round(v.height) - 2];
      }
      buf = await loc.screenshot({ animations: 'disabled', caret: 'hide' });
    }
    out.push({ shot: s, png: PNG.sync.read(buf), mask });
  }
  if (typeof undo === 'function') await undo();
  if (step.reset) await step.reset(pg);
  await rest(pg);
  return out;
}
const paint = (png, [x, y, w, h]) => { for (let j = y; j < y + h && j < png.height; j++) for (let i = x; i < x + w && i < png.width; i++) { const o = (j * png.width + i) * 4; png.data[o] = 255; png.data[o + 1] = 0; png.data[o + 2] = 255; png.data[o + 3] = 255; } };

for (const width of WIDTHS) {
  const t = await open(target, width, true), r = await open(reference, width, false);
  for (const [chain, steps] of CHAINS) {
    const live = steps.filter((st) => !(st.pointer && width < POINTER_MIN) && !(st.wide && width < WIDE_MIN));
    if (only && !live.some((st) => st.shots.some(wanted))) continue;
    await load(t, chain === 'written' ? 75 : 30); await load(r);
    for (const st of live) {
      if (only && !st.shots.some(wanted) && !st.run) continue;
      const a = await stepOn(t.pg, st), b = await stepOn(r.pg, st);
      for (let k = 0; k < a.length; k++) {
        const { shot } = a[k]; const A = a[k].png, B = b[k].png;
        for (const m of [a[k].mask, b[k].mask]) if (m) { paint(A, m); paint(B, m); }
        const tag = `${width}-${shot.piece}-${shot.state}`;
        const res = { width, piece: shot.piece, state: shot.state, size: { target: [A.width, A.height], reference: [B.width, B.height] }, masked: !!a[k].mask, files: { target: `${tag}-target.png`, reference: `${tag}-reference.png`, diff: null } };
        if (A.width !== B.width || A.height !== B.height) Object.assign(res, { diffPixels: null, strictPixels: null, pass: false });
        else {
          const D = new PNG({ width: A.width, height: A.height });
          const diff = pixelmatch(A.data, B.data, D.data, A.width, A.height, { threshold: 0.1, includeAA: false });
          const strict = pixelmatch(A.data, B.data, null, A.width, A.height, { threshold: 0, includeAA: true });
          writeFileSync(`${OUT}${tag}-diff.png`, PNG.sync.write(D));
          Object.assign(res, { diffPixels: diff, strictPixels: strict, pass: diff === 0 }); res.files.diff = `${tag}-diff.png`;
        }
        writeFileSync(`${OUT}${tag}-target.png`, PNG.sync.write(A)); writeFileSync(`${OUT}${tag}-reference.png`, PNG.sync.write(B));
        report.push(res);
        console.log(`${tag.padEnd(52)} ${res.pass ? 'pass' : 'FAIL'}  ${res.diffPixels === null ? `size ${A.width}x${A.height} vs ${B.width}x${B.height}` : `${res.diffPixels} px (strict ${res.strictPixels})`}${res.masked ? '  [video picture masked]' : ''}`);
      }
    }
  }
  await t.ctx.close(); await r.ctx.close();
}

const failed = report.filter((x) => !x.pass);
writeFileSync(`${OUT}report.json`, JSON.stringify({ target, reference, when: new Date().toISOString(), threshold: 0.1, widths: WIDTHS, report }, null, 2));
const md = [
  '# Piece review', '',
  `Target: ${target}  `, `Reference: ${reference}  `, `Run: ${new Date().toISOString()}. Pass = 0 differing pixels (pixelmatch threshold 0.1, antialiasing ignored).`, '',
  failed.length ? `**FAIL: ${failed.length} of ${report.length} piece states differ.**` : `**PASS: all ${report.length} piece states at 0 differing pixels.**`, '',
  '| Width | Piece | State | Differing px | Strict px | Images (target / reference / diff) |', '|---|---|---|---|---|---|',
  ...report.map((x) => `| ${x.width} | ${x.piece} | ${x.state}${x.masked ? ' (video picture masked)' : ''} | ${x.diffPixels ?? `size ${x.size.target.join('x')} vs ${x.size.reference.join('x')}`} | ${x.strictPixels ?? ''} | ${x.files.target} / ${x.files.reference} / ${x.files.diff ?? ''} |`),
  '',
];
writeFileSync(`${OUT}piece-review.md`, md.join('\n'));
await browser.close(); srv?.close();
console.log(failed.length ? `FAIL: ${failed.length} of ${report.length} piece states differ` : `PASS: all ${report.length} piece states at 0 differing pixels`);
process.exit(failed.length ? 1 : 0);
