// Motion review (PROMPT.md Phase 3 C and D; IMPLEMENTATION-SPEC Phase 11 step 2): the TARGET moves exactly as the
// REFERENCE mockup does.
//
//   node diff/motion-review.mjs                                 # harness vs mockup (serves both locally): must be all 0
//   node diff/motion-review.mjs --target <origin>/learn/week/0 --target-schedule <…>/learn/schedule
//        --target-community <…>/learn/community --target-thread <…>/learn/community/2 --storage-state auth.json
//        --target-turnin <…>/learn/week/1/step/4 (a step that asks for a file: its Turn in button opens the drawer)
//   options: --views week,schedule,community,thread,turnin   --widths 1440,390   --parts props,frames,reduced   --motions rail-collapse,…
//            --inject-target '<css>' (a scratch change on the target only, to prove the review catches it)
//            --out results/   --chrome /usr/bin/google-chrome   --tag name
//
// 1. PROPS. Every visible element in the app (`#sh-app`), in document order on both pages: its computed transition-*,
//    animation-*, transform and opacity, at rest, and for each interactive element hovered and pressed (its own and its
//    descendants'). Any looping animation is held at its start first, so a pulse caught mid-beat isn't a difference.
//    Pass: every value the same.
// 2. FRAMES. Each motion (the list below) is started on both pages with the page's own timers stopped (the mockup stages
//    its motions with them), and both pages are walked through the same milliseconds of their own time: 10 ms a step,
//    the timers run that far, and every animation the motion started is set to its own age. The motion's region is
//    shot at 0, 60, 120, 240, 400, 560 and 900 ms, from the viewport (the page is never scrolled or resized for a shot).
//    Animations run on the main thread (--disable-threaded-animation), so one is drawn where it is set. Pass: 0
//    different pixels in every frame (pixelmatch 0.1, anti-aliasing ignored), as diff/pixel-diff.mjs.
// 3. REDUCED. With prefers-reduced-motion and with `.aim-reduced` on <html>: each motion lands as the mockup's does (the
//    target's region 50 ms and 1.2 s into the motion, walked the same way, the same as the reference's). Where the
//    mockup itself is still moving at 50 ms, the report says so beside the result.
// A press is let go off the piece, so nothing is clicked by it. The motions click only what changes this page (a
// filter, an accordion, the rail, a menu, a drawer); nothing deploys, joins, saves a calendar file or leaves the site.
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
const PORT = +arg('port', 4184);
const remote = !!arg('target');
const srv = await serve(PORT);
const LOCAL = `http://localhost:${PORT}/harness/`;
const REFERENCE = arg('reference', `http://localhost:${PORT}/mockup/index.html`);
const storage = arg('storage-state');
const NOW = '2026-11-20T21:18:00Z';
const injectTarget = arg('inject-target', '');
const WIDTHS = (arg('widths', '1440,390') || '').split(',').map(Number);
const PARTS = (arg('parts', 'props,frames,reduced') || '').split(',');
const FRAMES = [0, 60, 120, 240, 400, 560, 900];
const target = {
  week: arg('target', LOCAL),
  schedule: arg('target-schedule', remote ? null : LOCAL),
  community: arg('target-community', remote ? null : LOCAL),
  thread: arg('target-thread', remote ? null : LOCAL),
  turnin: arg('target-turnin', remote ? null : LOCAL),
};
const hash = { week: '#week-0', schedule: '#schedule', community: '#community', thread: '#thread-2', turnin: '#week-0' };
const onlyViews = arg('views')?.split(',');
const onlyMotions = arg('motions')?.split(',');
const NOT_BAR = ':not(.wkx-flag, .wkx-flag *)';
const INTERACTIVE = ['a[href]', 'button', 'summary', 'input', 'textarea'].map((x) => `#sh-app ${x}${NOT_BAR}`).join(', ');
const NEVER_PRESS = '#wk-deploy, #wk-undo, [data-act="join"], .sc-menu a, a[href^="http"], a[download]';
const PROPS = ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay', 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-fill-mode', 'animation-direction', 'transform', 'opacity'];

// The motions (PROMPT.md Phase 3 C): what starts each, on which view, at which widths. `start` runs in the page, so the
// animations can be held the moment they begin; `before` puts the page in the state the motion starts from.
const inPage = (pg, fn, a) => pg.evaluate(fn, a);
const clickIn = (sel) => (pg) => inPage(pg, (s) => document.querySelector(s).click(), sel);
const key = (k) => (pg) => inPage(pg, (x) => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: x, bubbles: true })), k);
const MOTIONS = [
  { name: 'arrival', view: 'week', region: '#sh-main', start: async (pg) => { await pg.reload({ waitUntil: 'load' }); } },
  { name: 'filter-operator', view: 'week', region: '#steps', start: clickIn('#wk-seg [data-role="operator"]') },
  { name: 'accordion-open', view: 'week', region: '#wk-accs', before: (pg) => inPage(pg, () => document.querySelector('.wk-acc summary').scrollIntoView({ block: 'center', behavior: 'instant' })), start: clickIn('.wk-acc summary') },
  { name: 'accordion-close', view: 'week', region: '#wk-accs', before: async (pg) => { await inPage(pg, () => { const s = document.querySelector('.wk-acc summary'); s.scrollIntoView({ block: 'center', behavior: 'instant' }); s.click(); }); await pg.waitForTimeout(1200); }, start: clickIn('.wk-acc summary') },
  { name: 'rail-collapse', view: 'week', desktop: true, region: '#sh-side', start: clickIn('#sh-collapse') },
  { name: 'rail-expand', view: 'week', desktop: true, region: '#sh-side', before: async (pg) => { await inPage(pg, () => document.querySelector('#sh-collapse').click()); await pg.waitForTimeout(1400); }, start: clickIn('#sh-collapse') },
  { name: 'calendar-open', view: 'week', start: clickIn('#sh-next .sc-cal button') },
  { name: 'calendar-close', view: 'week', before: async (pg) => { await inPage(pg, () => document.querySelector('#sh-next .sc-cal button').click()); await pg.waitForTimeout(900); }, start: key('Escape') },
  { name: 'nav-menu-open', view: 'week', phone: true, start: clickIn('#sh-menu') },
  { name: 'form-in', view: 'week', region: '.aim-drawer__panel', before: (pg) => inPage(pg, () => document.querySelector('[data-act="form"]').scrollIntoView({ block: 'center', behavior: 'instant' })), start: clickIn('[data-act="form"]') },
  { name: 'form-out', view: 'week', region: '.aim-drawer__panel', before: async (pg) => { await inPage(pg, () => { const b = document.querySelector('[data-act="form"]'); b.scrollIntoView({ block: 'center', behavior: 'instant' }); b.click(); }); await pg.waitForTimeout(1600); }, start: key('Escape') },
  { name: 'schedule-calendar-open', view: 'schedule', region: '#sc-hero', start: clickIn('#sc-hero .sc-cal button, #sc-cal button') },
  { name: 'compose-in', view: 'community', region: '.aim-drawer__panel', start: clickIn('#cm-start') },
  // Turn in: the mockup's MOCKUP bar opens the drawer (hidden beside a deployed page, so clicked in the page); in the
  // LMS the step's own button does.
  { name: 'turnin-in', view: 'turnin', region: '.aim-drawer__panel', start: (pg, isTarget) => clickIn(isTarget && remote ? '[data-act="turnin"]' : '[data-turnin="report"]')(pg) },
  { name: 'reply-focus', view: 'thread', region: '#cm-replybox', before: (pg) => inPage(pg, () => document.querySelector('#cm-replybox textarea').scrollIntoView({ block: 'center', behavior: 'instant' })), start: (pg) => inPage(pg, () => document.querySelector('#cm-replybox textarea').focus()) },
];

const browser = await chromium.launch({ executablePath: arg('chrome', '/usr/bin/google-chrome'), args: ['--font-render-hinting=none', '--disable-lcd-text', '--hide-scrollbars', '--disable-threaded-animation'] });
mkdirSync(`${OUT}motion/`, { recursive: true });

async function open(view, width, isTarget, reduced = false) {
  const url = isTarget ? (remote ? target[view] : target[view] + hash[view]) : REFERENCE + hash[view];
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference', ...(isTarget && storage ? { storageState: storage } : {}) });
  // The page's own requestAnimationFrame, kept before Playwright's clock replaces it: a step waits for real frames.
  await ctx.addInitScript(() => {
    window.__frame = window.requestAnimationFrame.bind(window);
  });
  const pg = await ctx.newPage();
  await pg.clock.setFixedTime(new Date(NOW));
  pg.on('pageerror', (e) => console.log('  page error:', url, e.message));
  await pg.goto(url, { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(1400);
  const css = `${!isTarget && remote ? '.wkx-flag{display:none!important}' : ''}${isTarget && injectTarget ? injectTarget : ''}`;
  if (css) await pg.addStyleTag({ content: css });
  await pg.mouse.move(2, 400);
  await pg.waitForTimeout(300);
  return { ctx, pg };
}

/** Holds every looping animation at its start, so a pulse caught mid-beat reads the same on both pages. */
const holdLoops = (pg) =>
  pg.evaluate(() => {
    for (const a of document.getAnimations()) {
      const t = a.effect?.getTiming?.();
      if (t && t.iterations === Infinity) {
        a.pause();
        a.currentTime = 0;
      }
    }
  });

/** Every visible element's motion values, in document order. `scope` limits it to one element and what it holds. */
const props = (pg, scope = null) =>
  pg.evaluate(
    ([props, scope, notBar]) => {
      const seen = (e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && !e.closest('.wkx-flag');
      };
      const root = scope ? document.querySelectorAll(scope)[0] : document.querySelector('#sh-app');
      if (!root) return [];
      const els = [root, ...root.querySelectorAll(`*${notBar}`)].filter(seen);
      return els.map((e) => {
        const cs = getComputedStyle(e);
        return { name: `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${[...e.classList].slice(0, 2).map((c) => '.' + c).join('')}`, v: props.map((p) => cs.getPropertyValue(p).replace(/\s+/g, ' ').trim()) };
      });
    },
    [PROPS, scope, NOT_BAR],
  );

/**
 * The two pages' values, element by element. The elements are aligned as sequences (longest common subsequence of
 * their tag and classes; an id alone doesn't make two elements different), so one wrapper the other page lacks doesn't
 * shift every element after it. An element on one page only is a difference only when it carries motion.
 */
const MOVES = (v) => v[1].split(',').some((d) => parseFloat(d) > 0) || v[4] !== 'none' || (v[11] !== 'none' && v[11] !== '') || (v[12] !== '1' && v[12] !== '');
function compareProps(t, r, where) {
  const out = [];
  const bare = (n) => n.replace(/#[^.]*/, '');
  const a = t.map((x) => bare(x.name)), b = r.map((x) => bare(x.name));
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      PROPS.forEach((p, k) => {
        if (t[i].v[k] !== r[j].v[k]) out.push(`${where}: ${t[i].name} ${p}: target "${t[i].v[k]}", reference "${r[j].v[k]}"`);
      });
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) {
      if (MOVES(t[i].v)) out.push(`${where}: ${t[i].name} is only on the target, and it moves`);
      i++;
    } else {
      if (MOVES(r[j].v)) out.push(`${where}: ${r[j].name} is only on the reference, and it moves`);
      j++;
    }
  }
  for (; i < n; i++) if (MOVES(t[i].v)) out.push(`${where}: ${t[i].name} is only on the target, and it moves`);
  for (; j < m; j++) if (MOVES(r[j].v)) out.push(`${where}: ${r[j].name} is only on the reference, and it moves`);
  return out;
}

const diffPng = (a, b) => {
  const w = Math.max(a.width, b.width), h = Math.max(a.height, b.height);
  const pad = (img) => {
    if (img.width === w && img.height === h) return img;
    const o = new PNG({ width: w, height: h });
    o.data.fill(255);
    PNG.bitblt(img, o, 0, 0, img.width, img.height, 0, 0);
    return o;
  };
  const A = pad(a), B = pad(b), D = new PNG({ width: w, height: h });
  return { px: pixelmatch(A.data, B.data, D.data, w, h, { threshold: 0.1, includeAA: false }), same: a.width === b.width && a.height === b.height, D };
};
const shotNow = async (pg) => PNG.sync.read(await pg.screenshot({ caret: 'hide' }));

/** The page's own time per step: its timers run this far, then every animation the motion started is set to match. */
const STEP = 10;
/** Waits for `n` frames the browser really draws (the page's own requestAnimationFrame, which the clock doesn't hold). */
const frames = (pg, n) =>
  pg.evaluate(
    (n) =>
      new Promise((done) => {
        const raf = window.__frame ?? window.requestAnimationFrame.bind(window);
        let left = n;
        const tick = () => (--left <= 0 ? done() : raf(tick));
        raf(tick);
      }),
    n,
  );

/**
 * Starts a motion with the page's own time stopped, and returns `at(ms)`: the motion's region `ms` after it began.
 * Both pages are walked through the same milliseconds of their own time, 10 ms a step:
 * - the page's timers (Playwright's clock) run that far: the mockup stages its motions with them (the rail's labels
 *   fade, then the layout changes; a drawer leaves, then is removed);
 * - the page's animation timeline stands still (DevTools' Animation domain, rate 0), so every animation the motion
 *   starts, a pseudo-element's too (an accordion's ::details-content), waits where it began; each is set to its own
 *   age at every step (the time since the step it began in). One set past its end has finished, so what the page does
 *   at its end happens then.
 * What the page starts in answer to a step (a React render, an animation's end) lands a frame or two later; each step
 * waits for real frames until nothing more starts, and that is born at the same moment.
 * The page's own arrival is the exception: every animation is held as it is created, and all begin with the page.
 */
async function startHeld(pg, m, isTarget) {
  if (m.before) await m.before(pg);
  await pg.waitForTimeout(300);
  await holdLoops(pg);
  if (m.name === 'arrival') return arrivalHeld(pg, m, isTarget);
  const cdp = await pg.context().newCDPSession(pg);
  const born = new Map(); // animation id -> the ms of the page's time it began
  let fresh = [];
  let listening = false;
  cdp.on('Animation.animationStarted', ({ animation: a }) => {
    const n = a.source?.iterations;
    if (listening && !(n == null || n === Infinity || n > 1e9)) fresh.push(a.id); // a loop stays at its start
  });
  cdp.on('Animation.animationCanceled', ({ id }) => born.delete(id));
  await cdp.send('Animation.enable');
  await frames(pg, 2);
  listening = true; // what was running before the motion isn't part of it
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  await pg.clock.pauseAt(await pg.evaluate(() => Date.now()));
  await m.start(pg, isTarget);
  /** Sets every animation the motion started to its age at `at`; returns how many began since the last step. */
  const step = async (at) => {
    const started = fresh.length;
    for (const id of fresh) born.set(id, at);
    fresh = [];
    const byAge = new Map();
    for (const [id, from] of born) byAge.set(at - from, [...(byAge.get(at - from) ?? []), id]);
    for (const [age, ids] of byAge) {
      await cdp.send('Animation.seekAnimations', { animations: ids, currentTime: age }).catch(async () => {
        for (const id of ids) await cdp.send('Animation.seekAnimations', { animations: [id], currentTime: age }).catch(() => born.delete(id)); // gone
      });
    }
    return started;
  };
  /** Real frames until two looks in a row find nothing new (React answers an event a frame or two after it). */
  const settle = async (at) => {
    for (let i = 0, quiet = 0; i < 10 && quiet < 2; i++) {
      await frames(pg, 3);
      quiet = (await step(at)) ? 0 : quiet + 1;
    }
  };
  let now = 0;
  await settle(0);
  await step(0);
  // The steps-done figure at every step (PROMPT.md Phase 3 C: during a count-up it steps through the same values).
  const figures = [];
  const figure = async () =>
    figures.push(
      await pg.evaluate(() => {
        const n = document.querySelector('#wk-n'); // the one on screen: the mockup keeps its week page, hidden, on every view
        return n && n.getClientRects().length ? n.textContent : '';
      }),
    );
  await figure();
  /** `stride`: the step, 10 ms; a coarser one only where nothing is compared on the way (the reduced check's 1.2 s). */
  const at = async (ms, stride = STEP) => {
    while (now < ms) {
      const d = Math.min(stride, ms - now);
      await pg.clock.runFor(d);
      now += d;
      await step(now);
      await settle(now);
      await figure();
    }
    await frames(pg, 2);
    await pg.waitForTimeout(40);
    return shoot(pg, m.region);
  };
  at.figures = figures;
  return at;
}

/** The page's arrival: reloaded with every animation held as it is created, all of them begun with the page. */
async function arrivalHeld(pg, m, isTarget) {
  await pg.addInitScript(() => {
    const hold = () => document.getAnimations().forEach((a) => a.pause());
    new MutationObserver(hold).observe(document, { subtree: true, childList: true, attributes: true });
  });
  await m.start(pg, isTarget);
  const step = (at) =>
    pg.evaluate((at) => {
      for (const a of document.getAnimations()) {
        const timing = a.effect?.getTiming?.();
        if (!timing || timing.iterations === Infinity || a.playState === 'idle') continue;
        const end = a.effect.getComputedTiming().endTime ?? 0;
        try {
          if (at >= end) {
            if (a.playState !== 'finished') a.finish();
          } else {
            a.pause();
            a.currentTime = at;
          }
        } catch {
          /* an animation that can't be set (a zero rate) is left where it is */
        }
      }
    }, at);
  return async (ms) => {
    await step(ms);
    await frames(pg, 3);
    await step(ms);
    await frames(pg, 2);
    await pg.waitForTimeout(40);
    return shoot(pg, m.region);
  };
}

/**
 * The viewport, or the part of it the region covers. The page is never scrolled or resized for the shot (an element
 * shot scrolls it into view and draws a tall one beyond the viewport, which moves what is mid-motion).
 */
async function shoot(pg, region) {
  if (!region) return shotNow(pg);
  const box = await pg.evaluate((sel) => {
    const e = [...document.querySelectorAll(sel)].find((x) => {
      const r = x.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(x).visibility !== 'hidden';
    });
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x0: Math.max(0, Math.floor(r.left)), y0: Math.max(0, Math.floor(r.top)), x1: Math.min(innerWidth, Math.ceil(r.right)), y1: Math.min(innerHeight, Math.ceil(r.bottom)) };
  }, region);
  if (!box || box.x1 <= box.x0 || box.y1 <= box.y0) return null;
  const full = await shotNow(pg);
  const out = new PNG({ width: box.x1 - box.x0, height: box.y1 - box.y0 });
  PNG.bitblt(full, out, box.x0, box.y0, out.width, out.height, 0, 0);
  return out;
}

const report = [];
for (const width of WIDTHS) {
  for (const view of ['week', 'schedule', 'community', 'thread', 'turnin']) {
    if (onlyViews && !onlyViews.includes(view)) continue;
    if (!target[view]) continue;
    // 1. PROPS
    if (PARTS.includes('props') && view !== 'turnin') { // (the Turn in view is the week page, whose props are above)
      const [T, R] = await Promise.all([open(view, width, true), open(view, width, false)]);
      await Promise.all([holdLoops(T.pg), holdLoops(R.pg)]);
      const different = compareProps(await props(T.pg), await props(R.pg), 'rest');
      if (width > 640) {
        const n = Math.min(await T.pg.locator(`${INTERACTIVE} >> visible=true`).count(), await R.pg.locator(`${INTERACTIVE} >> visible=true`).count());
        for (let i = 0; i < n; i++) {
          for (const state of ['hover', 'pressed']) {
            const one = async (pg) => {
              const el = pg.locator(`${INTERACTIVE} >> visible=true`).nth(i);
              const never = await el.evaluate((e, s) => e.matches(s), NEVER_PRESS);
              if (state === 'pressed' && never) return null;
              await el.scrollIntoViewIfNeeded().catch(() => {});
              const b = await el.boundingBox();
              if (!b) return null;
              await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
              if (state === 'pressed') await pg.mouse.down();
              await pg.waitForTimeout(80);
              // Where it lands, not where a transition happens to be: run this piece's transitions to their end (their
              // durations and curves are compared as values).
              await el.evaluate((e) => {
                e.setAttribute('data-mr', '1');
                for (const a of e.getAnimations({ subtree: true })) if (a.effect?.getTiming?.().iterations !== Infinity) a.finish();
              });
              const got = await props(pg, '[data-mr="1"]');
              await el.evaluate((e) => e.removeAttribute('data-mr'));
              await pg.mouse.move(2, 400); // off the piece first, so letting go clicks nothing
              if (state === 'pressed') await pg.mouse.up();
              await pg.waitForTimeout(40);
              return got;
            };
            const t = await one(T.pg), r = await one(R.pg);
            if (t && r) different.push(...compareProps(t, r, `${state} interactive ${i}`));
          }
        }
      }
      await Promise.all([T.ctx.close(), R.ctx.close()]);
      report.push({ part: 'props', view, width, different });
      console.log(`props   ${view.padEnd(10)} ${String(width).padStart(4)}  ${different.length ? `${different.length} different` : 'all the same'}`);
    }
    // 2. FRAMES and 3. REDUCED
    for (const m of MOTIONS.filter((x) => x.view === view && !(x.desktop && width <= 900) && !(x.phone && width > 900) && (!onlyMotions || onlyMotions.includes(x.name)))) {
      if (PARTS.includes('frames')) {
        const [T, R] = await Promise.all([open(view, width, true), open(view, width, false)]);
        const [ft, fr] = await Promise.all([startHeld(T.pg, m, true), startHeld(R.pg, m, false)]);
        const different = [];
        for (const ms of FRAMES) {
          const a = await ft(ms), b = await fr(ms);
          if (!a && !b) continue;
          if (!a || !b) {
            different.push(`${ms} ms: the ${a ? 'reference' : 'target'} has nothing at ${m.region}`);
            continue;
          }
          const d = diffPng(a, b);
          if (d.px || !d.same) {
            different.push(`${ms} ms: ${d.px} px${d.same ? '' : ' (sizes differ)'}`);
            const tag = `${m.name}-${width}-${ms}`;
            writeFileSync(`${OUT}motion/${tag}-target.png`, PNG.sync.write(a));
            writeFileSync(`${OUT}motion/${tag}-reference.png`, PNG.sync.write(b));
            writeFileSync(`${OUT}motion/${tag}-diff.png`, PNG.sync.write(d.D));
          }
        }
        // The steps-done figure, step by step (a count-up steps through the same values on both pages).
        const runs = (xs) => (xs ?? []).filter((x, i) => i === 0 || x !== xs[i - 1]).join(' → ');
        if (ft.figures && ft.figures.join() !== fr.figures?.join()) different.push(`the steps-done figure, every 10 ms: the target's ${runs(ft.figures) || 'none'}, the reference's ${runs(fr.figures) || 'none'}`);
        await Promise.all([T.ctx.close(), R.ctx.close()]);
        report.push({ part: 'frames', view, width, motion: m.name, different });
        console.log(`frames  ${m.name.padEnd(24)} ${String(width).padStart(4)}  ${different.length ? `${different.length} of ${FRAMES.length} frames different` : 'all 0'}`);
      }
      if (PARTS.includes('reduced') && m.name !== 'arrival') {
        // Reduced motion lands as the mockup's does: target and reference the same 50 ms after the start and at 1.2 s
        // (of the page's own time, stepped as the frames are).
        const different = [];
        const still = [];
        for (const how of ['os', 'class']) {
          const shots = {};
          for (const isTarget of [true, false]) {
            const P = await open(view, width, isTarget, how === 'os');
            if (how === 'class') await P.pg.evaluate(() => document.documentElement.classList.add('aim-reduced'));
            // Walked through the page's own time as the frames are, so 50 ms is 50 ms on both pages.
            const at = await startHeld(P.pg, m, isTarget);
            const early = await at(50).catch(() => null);
            const late = await at(1200, 50).catch(() => null);
            shots[isTarget ? 't' : 'r'] = { early, late };
            if (early && late && diffPng(early, late).px) still.push(`${how === 'os' ? 'prefers-reduced-motion' : '.aim-reduced'} on the ${isTarget ? 'target' : 'reference'}`);
            await P.ctx.close();
          }
          for (const when of ['early', 'late']) {
            const a = shots.t[when], b = shots.r[when];
            if (!a && !b) continue;
            const d = a && b ? diffPng(a, b) : null;
            if (!d || d.px || !d.same) different.push(`${how === 'os' ? 'prefers-reduced-motion' : '.aim-reduced'}, ${when === 'early' ? '50 ms' : '1.2 s'} after the start: ${d ? `${d.px} px` : 'one page has nothing there'}`);
          }
        }
        report.push({ part: 'reduced', view, width, motion: m.name, different, note: still.length ? `still moving at 50 ms (as the mockup): ${still.join(', ')}` : '' });
        console.log(`reduced ${m.name.padEnd(24)} ${String(width).padStart(4)}  ${different.length ? different.join('; ') : 'the same as the mockup'}${still.length ? ` (still moving at 50 ms: ${still.length})` : ''}`);
      }
    }
  }
}

const tag = arg('tag') ? `.${arg('tag')}` : '';
writeFileSync(`${OUT}motion-review${tag}.json`, JSON.stringify({ target, reference: REFERENCE, clock: NOW, inject: injectTarget || undefined, frames: FRAMES, when: new Date().toISOString(), report }, null, 2));
const bad = report.filter((r) => r.different.length);
const lines = [
  `# Motion review${arg('tag') ? ` (${arg('tag')})` : ''}`,
  '',
  `Target: ${remote ? Object.values(target).filter(Boolean).join(', ') : 'the local harness'}. Reference: the mockup. Clock ${NOW}.${injectTarget ? ` Injected on the target: \`${injectTarget}\`.` : ''}`,
  `Props: every element's ${PROPS.join(', ')}, at rest, hovered and pressed. Frames: each motion held at ${FRAMES.join(', ')} ms of the page's own time, 0 different pixels, and the steps-done figure the same at every 10 ms. Reduced (prefers-reduced-motion and .aim-reduced): the region 50 ms and 1.2 s into each motion the same as the reference's.`,
  '',
  '| Part | View or motion | Width | Result |',
  '|---|---|---|---|',
  ...report.map((r) => `| ${r.part} | ${r.motion ?? r.view} | ${r.width} | ${r.different.length ? `**${r.different.length} different**` : r.part === 'props' ? 'all the same' : r.part === 'frames' ? 'all 0' : 'the same as the mockup'}${r.note ? `; ${r.note}` : ''} |`),
  '',
  ...bad.flatMap((r) => [`## ${r.part}: ${r.motion ?? r.view} at ${r.width}`, '', ...r.different.slice(0, 40).map((d) => `- ${d}`), ...(r.different.length > 40 ? [`- … and ${r.different.length - 40} more`] : []), '']),
];
writeFileSync(`${OUT}motion-review${tag}.md`, lines.join('\n') + '\n');
await browser.close();
srv.close();
console.log(bad.length ? `FAIL: ${bad.length} of ${report.length} checks differ (results/motion-review${tag}.md)` : `PASS: ${report.length} checks, the motion is the same`);
process.exit(bad.length ? 1 : 0);
