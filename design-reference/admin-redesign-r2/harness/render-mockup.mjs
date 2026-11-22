// Renders the signed-off admin mockup (AdminRedesign.jsx) into reference PNGs.
// Source of truth for pixel parity. Deterministic: local Geist fonts, network blocked, DPR 1.
//
// Usage (from repo root):
//   node design-reference/admin-redesign-r2/harness/render-mockup.mjs \
//     [--out design-reference/admin-redesign-r2/ref] [--widths 1440,1280,1024,390] \
//     [--screens all|curriculum,overview,...] [--dpr 1]
// Env: CHROME=/path/to/chrome (optional; else Playwright's bundled Chromium).
// Needs: esbuild, playwright (or playwright-core), react@18, react-dom@18 resolvable from the repo.
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('playwright-core')); }

const HERE = dirname(fileURLToPath(import.meta.url));
const R2 = resolve(HERE, '..');                       // design-reference/admin-redesign-r2
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const JSX = resolve(arg('jsx', join(R2, 'AdminRedesign.jsx')));
const FONTS = resolve(arg('fonts', join(R2, '..', 'fonts')));   // design-reference/fonts (geist-*.woff2)
const OUT = resolve(arg('out', join(R2, 'ref')));
const DPR = Number(arg('dpr', '1'));
const WIDTHS = arg('widths', '1440,1280,1024,390').split(',').map(Number);
const ALL = ['overview','health','curriculum','builder','vault','cohorts','announce','learners','workspaces','users','masquerade','tiers','billing','usage','incidents','audit','api','jobs','email','integrations','deploys','db','flags','roles','workspace','user','incident','as','missing','denied'];
const sArg = arg('screens', 'all');
const SCREENS = sArg === 'all' ? ALL : sArg.split(',');
const NAME = { workspace: 'workspace-detail', cohorts: 'cohorts-sessions' };
const PHONE_H = 844, DESK_H = 900;                    // viewport heights for the modal (confirm) frames

const tmp = mkdtempSync(join(tmpdir(), 'mock-r2-'));
mkdirSync(join(tmp, 'fonts'));
for (const f of readdirSync(FONTS)) if (f.endsWith('.woff2')) copyFileSync(join(FONTS, f), join(tmp, 'fonts', f));
// Bundle from the JSX's own folder so react/react-dom resolve once, from the repo's node_modules.
await build({ stdin: { contents: `import React from 'react';import { createRoot } from 'react-dom/client';import M from ${JSON.stringify(JSX)};createRoot(document.getElementById('root')).render(React.createElement(M));`, resolveDir: dirname(JSX), loader: 'jsx' },
  bundle: true, outfile: join(tmp, 'bundle.js'), loader: { '.jsx': 'jsx', '.svg': 'dataurl' }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning' });
writeFileSync(join(tmp, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Geist';font-style:normal;font-weight:100 900;src:url('fonts/geist-latin-wght-normal.woff2') format('woff2')}
@font-face{font-family:'Geist Mono';font-style:normal;font-weight:100 900;src:url('fonts/geist-mono-latin-wght-normal.woff2') format('woff2')}
html,body{margin:0;height:100%}</style></head><body><div id="root"></div><script src="bundle.js"></script></body></html>`);

// Strip mockup chrome: hide the toolbar, unscale the artboard, drop its 1px frame border, expand internal scrollers.
const BASE = `.mk{display:none!important}.stg{padding:0!important}.ax{border:0!important;transform:none!important}`;
const FULL = BASE + `.arx{height:auto!important}.stg{overflow:visible!important}.hold{height:auto!important}.ax{position:relative!important;height:auto!important}.shell{min-height:0}.main{overflow:visible!important}`;

mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ['--no-sandbox', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
const errors = [];
async function open(w, h) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: DPR });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  p.on('pageerror', e => errors.push(`${w}: ${e.message}`));
  await p.goto('file://' + join(tmp, 'index.html'));
  await p.waitForSelector('.mk');
  await p.click(`.mk .sg button:text-is("${w}")`);
  return p;
}
async function settle(p) { await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400); }
const made = [];
for (const w of WIDTHS) {
  for (const s of SCREENS) {
    const p = await open(w, w < 768 ? PHONE_H : DESK_H);
    await p.selectOption('select[aria-label="Screen"]', s);
    await p.addStyleTag({ content: FULL });
    await settle(p);
    const f = `${NAME[s] || s}-${w}.png`;
    await (await p.$('.ax')).screenshot({ path: join(OUT, f), animations: 'disabled', caret: 'hide' });
    made.push(f); await p.close();
  }
  if (SCREENS.includes('roles')) {
    // Roles confirm dialog: viewport-height frame (page top), first enabled non-Owner box clicked, as in review.
    const h = w < 768 ? PHONE_H : DESK_H;
    const p = await open(w, h);
    await p.selectOption('select[aria-label="Screen"]', 'roles');
    await p.addStyleTag({ content: BASE + `.arx{height:auto!important}.stg{overflow:visible!important}.hold{height:auto!important}.ax{position:relative!important;height:${h}px!important}` });
    await settle(p);
    const boxes = await p.$$('.ax input.chk:not([disabled])');
    await boxes[2].click(); await p.waitForSelector('.scrim');
    await p.evaluate(() => { document.querySelector('.ax .main').scrollTop = 0; }); await settle(p);   // frame = page top with the dialog open
    const f = `roles-confirm-${w}.png`;
    await p.screenshot({ path: join(OUT, f), clip: { x: 0, y: 0, width: w, height: h }, animations: 'disabled', caret: 'hide' });
    made.push(f); await p.close();
  }
}
await b.close();
console.log(JSON.stringify({ out: OUT, count: made.length, errors }, null, 0));
if (errors.length) process.exit(1);
