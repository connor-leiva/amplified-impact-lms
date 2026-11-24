// Screenshots of the $37 buyer mockup (../buyer.html) at 1280 and 390, light and dark, for review.
//
//   node handoff/lms-mockup/tools/capture.mjs --out <dir> [--b64] [--only home,library] [--scale 1]
//
// Serves the repo root itself (the mockup links ../lms-v3 and apps/web/src/styles/tokens.css), opens each view with the
// MOCKUP bar hidden (?bar=0), reduced motion (every entrance at its end state) and a fixed clock (2:00 PM, for the
// greeting), and writes <view>-<width>[-dark].png, or .png.b64 (one line of base64) with --b64.
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(fileURLToPath(import.meta.url), '../../../..');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const out = resolve(arg('out', join(root, 'handoff/lms-mockup/screens')));
const b64 = process.argv.includes('--b64');
const scale = Number(arg('scale', '1'));
const only = arg('only', '')?.split(',').filter(Boolean);

export const SHOTS = [
  { name: 'home', hash: 'home', what: 'Home: the skill they bought first, what else is in the Academy, the one upgrade' },
  { name: 'library', hash: 'library', what: 'Skill Library: their skill on top, the upgrade, every other skill to preview' },
  { name: 'locked-skill', hash: 'skill-database-health-check', what: 'A locked skill: Insiders first, $37 for just this one, its real setup steps' },
  { name: 'training', hash: 'training', what: 'Weekly Live Training, locked: Upgrade to the Agent Plan, $117/Month' },
  { name: 'office-hours', hash: 'office-hours', what: 'Office Hours, locked: in Amplified Insiders' },
  { name: 'accelerator', hash: 'accelerator', what: 'Week 0 and the AI hires, locked: part of the AI Accelerator' },
  { name: 'home-agent', hash: 'home', bought: 'agent', themes: ['light'], what: 'Home for an agent skill buyer: Agent Insiders, $79/Month' },
  { name: 'library-two', hash: 'library', bought: 'two', themes: ['light'], what: 'Skill Library for a buyer of two skills' },
];
const WIDTHS = [1280, 390];

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try { if (!path.startsWith(root) || !statSync(path).isFile()) throw 0; res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }); res.end(readFileSync(path)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/handoff/lms-mockup/buyer.html`;

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const shot of SHOTS.filter((s) => !only?.length || only.includes(s.name))) {
  for (const theme of shot.themes ?? ['light', 'dark']) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: width > 900 ? 900 : 844 }, deviceScaleFactor: scale, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date('2026-11-24T14:00:00'));
      await page.goto(`${base}?bar=0&theme=${theme}&bought=${shot.bought ?? 'owner'}#${shot.hash}`);
      await page.waitForSelector('body[data-app-ready="true"]');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const png = await page.screenshot({ fullPage: true });
      const file = join(out, `${shot.name}-${width}${theme === 'dark' ? '-dark' : ''}.png${b64 ? '.b64' : ''}`);
      writeFileSync(file, b64 ? png.toString('base64') : png);
      console.log(file);
      await ctx.close();
    }
  }
}
await browser.close();
server.close();
