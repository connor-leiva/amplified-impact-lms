// Video parity: replays every steady moment of reference/interaction-demo.mp4 (reference/states.json) on a
// target page and compares the screen with the matching video frame (reference/frames/<state>.png).
//
//   node diff/video-parity.mjs                         # the mockup AND the harness (served locally)
//   node diff/video-parity.mjs --target https://learn.amplifiedimpact.io/learn/week/0/step/2 --storage-state auth.json
//   options: --states 01-top,22-step-done   --local mockup,harness,lms   --out results/video/   --chrome /usr/bin/google-chrome
//
// The target needs the mockup's ids and classes (StepPage keeps them) and the test learner at the recorded
// state: step 1 done, step 5 waiting, nothing checked on step 2, no video progress. Review-only fixtures
// (MOCKUP bar, "Text styles (review)" link and section) are added to the target if it lacks them; see fixtures.mjs.
// The playing video is masked (it is course media, not UI), and so is each element whose look Amplified Impact Motion v1
// changes on purpose (brandMask in states.json; test A checks those against the mockup). Exit code 0 only if every state passes.
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../harness/serve.mjs';
import { compareToFrame, sideBySide, LIMITS } from './compare.mjs';
import { addFixtures } from './fixtures.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const root = fileURLToPath(new URL('..', import.meta.url));
const spec = JSON.parse(readFileSync(root + 'reference/states.json', 'utf8'));
const OUT = arg('out', root + 'results/video/');
const PORT = 4180;
const only = arg('states')?.split(',');
let srv = null;
let targets = arg('target') ? [arg('target')] : null;
if (!targets) {
  srv = await serve(PORT);
  const local = { mockup: `http://localhost:${PORT}/mockup/step-2.html`, harness: `http://localhost:${PORT}/harness/`, lms: `http://localhost:${PORT}/harness/?lms` };
  targets = (arg('local', 'mockup,harness')).split(',').map((k) => local[k]);
}
const storage = arg('storage-state');
const browser = await chromium.launch({ executablePath: arg('chrome', '/usr/bin/google-chrome'), args: ['--font-render-hinting=none', '--disable-lcd-text', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] });
const wait = (pg, ms) => pg.waitForTimeout(ms);

async function run(pg, steps, mouse) {
  for (const s of steps) {
    switch (s.do) {
      case 'scroll':
        await pg.evaluate((y) => { const h = document.documentElement, b = h.style.scrollBehavior; h.style.scrollBehavior = 'auto'; window.scrollTo(0, y); h.style.scrollBehavior = b; }, s.y);
        await wait(pg, 150); break;
      case 'move': await pg.mouse.move(s.x, s.y); mouse.x = s.x; mouse.y = s.y; await wait(pg, 800); break;
      case 'click': await pg.mouse.click(s.x, s.y); mouse.x = s.x; mouse.y = s.y; break;
      case 'wait': await wait(pg, s.ms); break;
      case 'js': await pg.evaluate(s.code); break;
      case 'pauseVideo': await pg.evaluate(() => document.getElementById('video')?.pause()); break;
      case 'nudge': if (mouse.x != null) { await pg.mouse.move(mouse.x + 1, mouse.y); await pg.mouse.move(mouse.x, mouse.y); await wait(pg, 800); } break;
      case 'clickChapter': {
        await pg.evaluate((i) => { const r = document.getElementById('chaps'), c = r.children[i]; r.style.scrollBehavior = 'auto'; r.scrollLeft = c.offsetLeft - r.clientWidth / 2 + c.offsetWidth / 2; r.style.scrollBehavior = ''; }, s.index);
        await wait(pg, 200);
        const bb = await pg.locator('#chaps .chip').nth(s.index).boundingBox();
        await run(pg, [{ do: 'click', x: Math.round(bb.x + bb.width / 2), y: Math.round(bb.y + bb.height / 2) }, { do: 'pauseVideo' }, { do: 'wait', ms: 900 }], mouse);
        break;
      }
      case 'openTranscriptAt331':
        await run(pg, [{ do: 'scroll', y: 581 }, { do: 'clickChapter', index: 6 }, { do: 'click', x: 128, y: 525 }, { do: 'wait', ms: 700 }], mouse); break;
      case 'checkAll':
        for (const y of [342, 482, 623, 135]) { await pg.mouse.click(63, y); mouse.x = 63; mouse.y = y; await wait(pg, 700); }
        await wait(pg, 200); break;
      default: throw new Error('unknown step ' + s.do);
    }
  }
}

mkdirSync(OUT, { recursive: true });
const report = []; let allPass = true;
for (const target of targets) {
  const tag = target.includes('/harness/?lms') ? 'lms-sim' : target.includes('/harness') ? 'harness' : target.includes('/mockup') ? 'mockup' : 'target';
  console.log(`\n${tag}: ${target}`);
  for (const st of spec.states) {
    if (only && !only.includes(st.id)) continue;
    const ctx = await browser.newContext({ viewport: { width: spec.viewport.width, height: spec.viewport.height }, deviceScaleFactor: 1, reducedMotion: 'no-preference', ...(storage && tag === 'target' ? { storageState: storage } : {}) });
    const pg = await ctx.newPage();
    await pg.goto(target, { waitUntil: 'load' });
    await pg.evaluate(() => { try { localStorage.clear(); } catch { /* */ } });
    await pg.reload({ waitUntil: 'load' });
    await pg.evaluate(() => document.fonts.ready);
    const added = await addFixtures(pg);
    await wait(pg, 1200);   // the page's arrival rise (brand .aim-rise, about 0.8 s) is over, as in the recording's first frames
    const mouse = { x: null, y: null };
    // the recording starts at the very top; a reload can restore a 1 px scroll (Chrome scroll restoration on React pages)
    await run(pg, [{ do: 'scroll', y: 0 }, ...st.steps], mouse);
    await wait(pg, 300);
    // elements whose look the brand motion changes on purpose: left out here, checked against the mockup by test A
    const brandMasks = [];
    for (const m of st.brandMask ?? []) {
      const bb = await pg.locator(m.sel).first().boundingBox();
      if (bb) brandMasks.push([Math.floor(bb.x - m.pad), Math.floor(bb.y - m.pad), Math.ceil(bb.x + bb.width + m.pad), Math.ceil(bb.y + bb.height + m.pad)]);
    }
    const shot = PNG.sync.read(await pg.screenshot({ caret: 'hide', animations: 'disabled' }));
    await ctx.close();
    const frame = PNG.sync.read(readFileSync(root + `reference/frames/${st.id}.png`));
    const r = compareToFrame(frame, shot, [...(st.mask ?? []), ...brandMasks]);
    writeFileSync(`${OUT}${tag}-${st.id}.png`, PNG.sync.write(sideBySide(frame, shot, r.heat)));
    allPass &&= r.pass;
    report.push({ target, tag, state: st.id, pass: r.pass, brandMasks: brandMasks.length ? { boxes: brandMasks, why: st.brandWhy } : undefined, edge: { worstRegion: r.edge.worstRegion, worstBox: r.edge.worstBox, hotPixels: r.edge.hotPixels }, tone: { worstRegion: r.tone.worstRegion, worstBox: r.tone.worstBox, hotPixels: r.tone.hotPixels }, fixtures: added });
    console.log(`  ${r.pass ? 'pass' : 'FAIL'}${brandMasks.length ? '*' : ' '} ${st.id.padEnd(28)} edge worst ${String(r.edge.worstRegion).padStart(5)} px  tone worst ${String(r.tone.worstRegion).padStart(5)} px${r.pass ? '' : `   at edge ${JSON.stringify(r.edge.worstBox)} tone ${JSON.stringify(r.tone.worstBox)}`}`);
  }
}
writeFileSync(`${OUT}report.json`, JSON.stringify({ when: new Date().toISOString(), video: spec.video, limits: LIMITS, report }, null, 2));
await browser.close(); srv?.close();
console.log(allPass ? '\nPASS: every state matches the video (* = brand-motion element masked, see reference/states.json)' : '\nFAIL: see results/video/*.png (frame | target | heat: red = edges, orange = tone)');
process.exit(allPass ? 0 : 1);
