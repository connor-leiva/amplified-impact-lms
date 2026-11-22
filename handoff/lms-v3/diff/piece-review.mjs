// Piece review (PROMPT.md Phase 3 B; IMPLEMENTATION-SPEC Phase 11 step 2): every piece of every page, in every state,
// at seven widths, as an element screenshot on the TARGET and on the REFERENCE mockup, diffed. Pass = 0 different pixels
// (pixelmatch threshold 0.1, anti-aliasing ignored, as diff/pixel-diff.mjs) and the same size, for every piece.
//
//   node diff/piece-review.mjs                                  # harness vs mockup (serves both locally): must be all 0
//   node diff/piece-review.mjs --target <origin>/learn/week/0 --target-schedule <…>/learn/schedule
//        --target-community <…>/learn/community --target-thread <…>/learn/community/2 --storage-state auth.json
//        --target-turnin <…>/learn/week/1/step/4 (a step that asks for a file: its Turn in button opens the drawer)
//   options: --views week,week-collapsed,week-calendar,week-form,week-turnin,schedule,community,community-start,thread
//            --widths 1440,1280,1100,900,820,640,390   --states rest,hover,focus,pressed
//            --inject-target '<css>' (a scratch change on the target only, to prove the review catches it)
//            --out results/   --chrome /usr/bin/google-chrome   --tag name
//
// THE PIECES are found, not listed: on each view, every visible link, button, summary, input and focusable element in
// the app (`#sh-app`), and every block the page is built from (every element with an id, every step, kit row, week row,
// session line, accordion, thread row and post). Both pages are the same components, so the n-th piece of one is the
// n-th piece of the other; a different count is itself a difference. Each piece is compared at rest; each interactive
// piece hovered and pressed (above 640 px, where there is a pointer to hover with) and keyboard-focused. A press is the
// pointer held down on the piece, then moved off before it is let go, so nothing is ever clicked: no link is followed,
// no calendar file saved, no "Mark as deployed", no Join. The views with a state of their own: the collapsed rail, the
// top bar's calendar menu open, the form drawer open, the Turn in drawer open (the mockup's MOCKUP bar opens it; in the
// LMS the step's own button does) and the Start a thread drawer open. An open menu or drawer is reviewed on its own
// (the page under it is its own view), wherever the page puts it, and a press in it is let go inside it: let go on the
// scrim or outside the menu, it would close it. Between states nothing stays selected or focused, and a text field is
// focused with its caret at the start. On a deployed page a drawer is only opened, never typed into; nothing is sent.
import { chromium } from 'playwright-core';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../harness/serve.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? process.argv[i + 1] : d;
};
const here = fileURLToPath(new URL('.', import.meta.url));
const OUT = arg('out', here + '../results/');
const PORT = +arg('port', 4182);
const remote = !!arg('target');
const srv = await serve(PORT);
const LOCAL = `http://localhost:${PORT}/harness/`;
const REFERENCE = arg('reference', `http://localhost:${PORT}/mockup/index.html`);
const storage = arg('storage-state');
const NOW = '2026-11-20T21:18:00Z';
const SETTLE = +arg('settle', 120);
const injectTarget = arg('inject-target', '');
const WIDTHS = (arg('widths', '1440,1280,1100,900,820,640,390') || '').split(',').map(Number);
const STATES = (arg('states', 'rest,hover,focus,pressed') || '').split(',');

// A view: where it is on each side, and what puts the page in the state it is reviewed in.
const target = {
  week: arg('target', LOCAL),
  schedule: arg('target-schedule', remote ? null : LOCAL),
  community: arg('target-community', remote ? null : LOCAL),
  thread: arg('target-thread', remote ? null : LOCAL),
  turnin: arg('target-turnin', remote ? null : LOCAL),
};
const hash = { week: '#week-0', schedule: '#schedule', community: '#community', thread: '#thread-2', turnin: '#week-0' };
const click = async (pg, sel, ms = 900) => {
  await pg.click(sel);
  await pg.waitForTimeout(ms);
};
/** A click in the page itself, for a control that isn't drawn (the MOCKUP bar, hidden beside a deployed page). */
const clickIn = async (pg, sel, ms = 900) => {
  await pg.evaluate((s) => document.querySelector(s).click(), sel);
  await pg.waitForTimeout(ms);
};
const VIEWS = {
  week: { page: 'week' },
  'week-collapsed': { page: 'week', desktop: true, setup: (pg) => click(pg, '#sh-collapse', 1200) },
  // An open menu or drawer is reviewed on its own (`scope`: the page under it has its own view), and a press in it is
  // let go inside it (`letGo`): let go on the scrim or outside the menu, it would close it.
  'week-calendar': { page: 'week', scope: '#sh-next .sc-cal', letGo: '#sh-next .sc-menu', setup: (pg) => click(pg, '#sh-next .sc-cal button') },
  'week-form': { page: 'week', scope: '.aim-drawer', letGo: '.aim-drawer__panel', setup: async (pg) => { await pg.evaluate(() => document.querySelector('[data-act="form"]').scrollIntoView({ block: 'center' })); await click(pg, '[data-act="form"]', 1600); } },
  'week-turnin': { page: 'turnin', scope: '.aim-drawer', letGo: '.aim-drawer__panel', setup: (pg, isTarget) => (isTarget && remote ? click(pg, '[data-act="turnin"]', 1600) : clickIn(pg, '[data-turnin="report"]', 1600)) },
  schedule: { page: 'schedule' },
  community: { page: 'community' },
  'community-start': { page: 'community', scope: '.aim-drawer', letGo: '.aim-drawer__panel', setup: (pg) => click(pg, '#cm-start', 1600) },
  thread: { page: 'thread' },
};
const onlyViews = arg('views')?.split(',');

// Never pressed, even though a press is let go off the piece: what would deploy, undo, join or leave the site.
const NEVER_PRESS = '#wk-deploy, #wk-undo, [data-act="join"], .sc-menu a, a[href^="http"], a[download]';
// The pieces, each group matched in document order on both pages. Interactive pieces are one group (the same
// components draw the same controls in the same order); each kind of block is its own group; and every element with
// an id on BOTH pages is a piece of its own (the mockup names a few elements the components leave unnamed).
const NOT_BAR = ':not(.wkx-flag, .wkx-flag *)';
const ALL = ':is(#sh-app, .aim-drawer)'; // the app, and a drawer wherever the page puts it
/** The interactive pieces inside `inside` (the app, or an open menu or drawer). */
const interactive = (inside) => ['a[href]', 'button', 'summary', 'input', 'textarea', '[tabindex]:not([tabindex="-1"])'].map((x) => `${inside} ${x}${NOT_BAR}`).join(', ');
const BLOCKS = ['#sh-weeks > li', '.wk-step', '.wk-kit-a', '.wk-acc', '.wk-card', '.sc-week', '.sc-line', '.sc-break', '.cm-row', '.cm-post', '.fm-q', '.fm-field', '.fm-chip', '.fm-foot', '.fm-head', '.up-drop', '.up-file', '.up-fields', '.up-sent', '.up-privacy'];

const browser = await chromium.launch({ executablePath: arg('chrome', '/usr/bin/google-chrome'), args: ['--font-render-hinting=none', '--disable-lcd-text', '--hide-scrollbars'] });
mkdirSync(`${OUT}pieces/`, { recursive: true });

async function open(url, width, isTarget) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference', ...(isTarget && storage ? { storageState: storage } : {}) });
  const pg = await ctx.newPage();
  await pg.clock.setFixedTime(new Date(NOW));
  pg.on('pageerror', (e) => console.log('  page error:', url, e.message));
  await pg.goto(url, { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(1200); // the arrival rise is over
  if (!isTarget && remote) await pg.addStyleTag({ content: '.wkx-flag{display:none!important}' }); // the MOCKUP bar isn't part of a deployed page
  if (isTarget && injectTarget) await pg.addStyleTag({ content: injectTarget });
  await pg.waitForTimeout(200);
  return { ctx, pg };
}

/** This page's pieces: per group, how many there are and what each is (its tag and classes, or its id). */
const pieces = (pg, inside) =>
  pg.evaluate(([interactive, blocks, never, notBar, inside, ids]) => {
    const seen = (e) => {
      if (e.closest('.wkx-flag')) return false;
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && (e.offsetParent !== null || cs.position === 'fixed');
    };
    const name = (e) => (e.id ? `#${e.id}` : `${e.tagName.toLowerCase()}${[...e.classList].slice(0, 2).map((c) => '.' + c).join('')}`);
    const group = (sel) => [...document.querySelectorAll(sel)].filter(seen);
    const out = { interactive: group(interactive).map((e) => ({ name: name(e), press: !e.matches(never) })) };
    for (const b of blocks) out[b] = group(`${inside} ${b}${notBar}`).map((e) => ({ name: name(e), press: false }));
    out.ids = [...document.querySelectorAll(`${ids} [id]${notBar}`)].filter(seen).map((e) => e.id);
    return out;
  }, [interactive(inside), BLOCKS, NEVER_PRESS, NOT_BAR, inside, inside === ALL ? '#sh-app' : inside]);

/** The CSS selector of a group's elements, and how a piece is found: its group's n-th visible match. */
const groupSel = (g, inside) => (g === 'interactive' ? interactive(inside) : g.startsWith('#') && !g.includes(' ') ? `${inside === ALL ? '#sh-app' : inside} ${g}` : `${inside} ${g}${NOT_BAR}`);
const locate = (pg, g, i, inside) => pg.locator(`${groupSel(g, inside)} >> visible=true`).nth(i);

/**
 * Back to rest: the pointer off every piece, nothing focused, and nothing selected (a press is let go off its piece,
 * which drags a selection across the page; a page's selection colour is its own, and no piece at rest has one).
 */
const reset = async (pg) => {
  await pg.mouse.move(2, 400);
  await pg.evaluate(() => {
    document.activeElement?.blur?.();
    window.getSelection()?.removeAllRanges();
  });
  await pg.waitForTimeout(SETTLE);
};
/** One piece in one state on one page: the element's own screenshot, or null when it isn't there to shoot. */
async function shoot(pg, g, i, state, v) {
  const el = locate(pg, g, i, v.scope ?? ALL);
  if (!(await el.count())) return null;
  await el.scrollIntoViewIfNeeded().catch(() => {});
  if (state === 'hover') await el.hover({ force: true });
  // A text field is focused with its caret at the start, as a click there puts it: where a page leaves the caret
  // depends on how it filled the field (an attribute, or React's property), which is no part of how the field looks.
  if (state === 'focus')
    await el.evaluate((e) => {
      try {
        e.setSelectionRange?.(0, 0);
      } catch {
        /* a field without a caret */
      }
      e.focus();
    });
  if (state === 'pressed') {
    const b = await el.boundingBox();
    if (!b) return null;
    await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await pg.mouse.down();
  }
  await pg.waitForTimeout(SETTLE);
  let png = null;
  try {
    png = PNG.sync.read(await el.screenshot({ animations: 'disabled', caret: 'hide', timeout: 5000 }));
  } catch {
    png = null;
  }
  if (state === 'pressed') {
    // Off the piece first, so letting go clicks nothing: beside the page, or inside the open menu or drawer.
    const inside = v.letGo ? await pg.locator(`${v.letGo} >> visible=true`).first().boundingBox().catch(() => null) : null;
    await pg.mouse.move(inside ? inside.x + 3 : 2, inside ? inside.y + 3 : 400);
    await pg.mouse.up();
  }
  await reset(pg);
  return png;
}

const report = [];
const failures = [];
for (const [view, v] of Object.entries(VIEWS)) {
  if (onlyViews && !onlyViews.includes(view)) continue;
  const tgt = target[v.page];
  if (!tgt) continue;
  for (const width of WIDTHS) {
    if (v.desktop && width <= 900) continue; // the rail is a desktop state
    const tUrl = remote ? tgt : tgt + hash[v.page];
    const [T, R] = await Promise.all([open(tUrl, width, true), open(REFERENCE + hash[v.page], width, false)]);
    if (v.setup) await Promise.all([v.setup(T.pg, true), v.setup(R.pg, false)]);
    // Keyboard modality, so a focused piece shows :focus-visible as it does after a Tab.
    await Promise.all([T.pg.keyboard.press('Shift'), R.pg.keyboard.press('Shift')]);
    const [tp, rp] = await Promise.all([pieces(T.pg, v.scope ?? ALL), pieces(R.pg, v.scope ?? ALL)]);
    // Every id on both pages is a piece of its own (as a group of one).
    const ids = tp.ids.filter((x) => rp.ids.includes(x));
    const groups = [['interactive', tp.interactive, rp.interactive], ...BLOCKS.map((b) => [b, tp[b], rp[b]]), ...ids.map((x) => [`#${x}`, [{ name: `#${x}`, press: false }], [{ name: `#${x}`, press: false }]])];
    const row = { view, width, pieces: { target: 0, reference: 0 }, compared: 0, different: [] };
    for (const [g, ta, ra] of groups) {
      row.pieces.target += ta.length;
      row.pieces.reference += ra.length;
      if (ta.length !== ra.length) row.different.push({ piece: g, state: '-', detail: `target has ${ta.length}, reference ${ra.length}` });
      const n = Math.min(ta.length, ra.length);
      for (let i = 0; i < n; i++) {
        const a = ta[i], b = ra[i];
        const label = `${g === 'interactive' ? '' : `${g} `}${i} ${a.name}`;
        if (g === 'interactive' && a.name.replace(/^#[^.]*/, '') !== b.name.replace(/^#[^.]*/, '') && !a.name.startsWith('#') && !b.name.startsWith('#')) {
          row.different.push({ piece: label, state: '-', detail: `the reference's is ${b.name}` });
          continue;
        }
        const interactive = g === 'interactive';
        const states = STATES.filter((st) => st === 'rest' || (interactive && (st === 'focus' || (width > 640 && (st === 'hover' || (st === 'pressed' && a.press && b.press))))));
        for (const state of states) {
          const tshot = await shoot(T.pg, g, i, state, v);
          const rshot = await shoot(R.pg, g, i, state, v);
          if (!tshot && !rshot) continue;
          row.compared++;
          const tag = `${view}-${width}-${g.replace(/[^a-z0-9]+/gi, '_')}-${i}-${state}`;
          if (!tshot || !rshot) {
            row.different.push({ piece: label, state, detail: `${tshot ? 'reference' : 'target'} has no screenshot` });
            continue;
          }
          const w = Math.max(tshot.width, rshot.width), h = Math.max(tshot.height, rshot.height);
          const pad = (img) => {
            if (img.width === w && img.height === h) return img;
            const o = new PNG({ width: w, height: h });
            o.data.fill(255);
            PNG.bitblt(img, o, 0, 0, img.width, img.height, 0, 0);
            return o;
          };
          const A = pad(tshot), B = pad(rshot), D = new PNG({ width: w, height: h });
          const px = pixelmatch(A.data, B.data, D.data, w, h, { threshold: 0.1, includeAA: false });
          const same = tshot.width === rshot.width && tshot.height === rshot.height;
          if (px || !same) {
            row.different.push({ piece: label, state, detail: `${px} px${same ? '' : `, target ${tshot.width}×${tshot.height} vs reference ${rshot.width}×${rshot.height}`}` });
            writeFileSync(`${OUT}pieces/${tag}-target.png`, PNG.sync.write(tshot));
            writeFileSync(`${OUT}pieces/${tag}-reference.png`, PNG.sync.write(rshot));
            writeFileSync(`${OUT}pieces/${tag}-diff.png`, PNG.sync.write(D));
            failures.push(tag);
          }
        }
      }
    }
    await Promise.all([T.ctx.close(), R.ctx.close()]);
    report.push(row);
    console.log(`${view.padEnd(16)} ${String(width).padStart(4)}  ${String(row.pieces.target).padStart(3)} pieces, ${String(row.compared).padStart(4)} compared, ${row.different.length ? `${row.different.length} different` : 'all 0'}`);
    write(false); // as it goes, so a long run that is stopped keeps what it found
  }
}

const tag = arg('tag') ? `.${arg('tag')}` : '';
write(true);
await browser.close();
srv.close();
const total = report.reduce((s, r) => s + r.compared, 0);
const bad = report.reduce((s, r) => s + r.different.length, 0);
console.log(bad ? `FAIL: ${bad} differences in ${total} comparisons (results/piece-review${tag}.md)` : `PASS: ${total} comparisons, no different pixel in any piece`);
process.exit(bad ? 1 : 0);

/** The report so far (`done` false while the run is still going). */
function write(done) {
  const tag = arg('tag') ? `.${arg('tag')}` : '';
  writeFileSync(`${OUT}piece-review${tag}.json`, JSON.stringify({ target, reference: REFERENCE, clock: NOW, inject: injectTarget || undefined, when: new Date().toISOString(), done, report }, null, 2));
  const lines = [
    `# Piece review${arg('tag') ? ` (${arg('tag')})` : ''}`,
    '',
    `Target: ${remote ? Object.values(target).filter(Boolean).join(', ') : 'the local harness'}. Reference: the mockup. Clock ${NOW}.${injectTarget ? ` Injected on the target: \`${injectTarget}\`.` : ''}`,
    'Pass: every piece the same size, and 0 different pixels (pixelmatch 0.1, anti-aliasing ignored), at rest, hovered, focused and pressed.',
    ...(done ? [] : ['', '**Still running:** the views and widths below are the ones done so far.']),
    '',
    '| View | Width | Pieces (target / reference) | Compared | Result |',
    '|---|---|---|---|---|',
    ...report.map((r) => `| ${r.view} | ${r.width} | ${r.pieces.target} / ${r.pieces.reference} | ${r.compared} | ${r.different.length ? `**${r.different.length} different**` : 'all 0'} |`),
    '',
    ...report.flatMap((r) => (r.different.length ? [`## ${r.view} at ${r.width}`, '', ...r.different.map((d) => `- piece ${d.piece}, ${d.state}: ${d.detail}`), ''] : [])),
  ];
    writeFileSync(`${OUT}piece-review${tag}.md`, lines.join('\n') + '\n');
}
