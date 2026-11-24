// Mockup-vs-build pairs for the $37 buyer (D-241): each page of the approved mockup (../buyer.html) beside the same page
// of the built app, at 1280 and 390, with the share of pixels that differ.
//
//   (cd apps/web && VITE_DATA_SOURCE=http npx vite build --mode parity --outDir dist-buyer --emptyOutDir)
//   pnpm --filter @ai/api exec tsx ../../handoff/lms-mockup/tools/pairs.ts --out <dir> [--b64] [--diff]
//
// The build is the production build (http data, VITE_LEARNER_V2 and VITE_LMS_V3 unset), served by `vite preview`, with
// every /api call answered here: the mockup's buyer (Alex Morgan, who bought Team P&L Review, Appointment Follow-Up, or
// Team P&L Review and FUB Pipeline Review), the real catalog (`buyer.test-data.ts`) and each locked guide's real step
// titles (the web build's skill-guides.json), and the course's outline as the API answers a buyer (`outline.ts`). Both
// sides: reduced motion, Mountain time, the clock at 2:00 PM.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { seed } from '../../../packages/core/src/seed';
import { previewOf } from '../../../packages/core/src/skill-guides';
import type { SkillGuide } from '../../../packages/core/src/skill-guides';
import { catalogAnswer } from '../../../apps/web/src/routes/learn/buyer/buyer.test-data';
import { deployedOutline } from './outline';

const root = resolve(fileURLToPath(import.meta.url), '../../../..');
const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1]! : d;
};
// `pnpm --filter … exec` runs in apps/api, so a relative --out is read from the repository's root, whoever runs it.
const out = resolve(root, arg('out', 'handoff/lms-mockup/pairs'));
const b64 = process.argv.includes('--b64');
const withDiff = process.argv.includes('--diff');
const PORT = Number(arg('port', '4480'));

const BOUGHT = { owner: ['team-pnl-review'], agent: ['appointment-follow-up'], two: ['team-pnl-review', 'fub-pipeline-review'] } as const;
type Bought = keyof typeof BOUGHT;
export const PAIRS: { name: string; hash: string; path: string; bought?: Bought; what: string }[] = [
  { name: 'home', hash: 'home', path: '/learn', what: 'Home' },
  { name: 'library', hash: 'library', path: '/learn/skills', what: 'Skill Library' },
  { name: 'locked-skill', hash: 'skill-database-health-check', path: '/learn/skills/database-health-check', what: 'A locked skill (Database Health Check)' },
  { name: 'training', hash: 'training', path: '/learn/training', what: 'Weekly Live Training, locked' },
  { name: 'office-hours', hash: 'office-hours', path: '/learn/office-hours', what: 'Office Hours, locked' },
  { name: 'accelerator', hash: 'week-0', path: '/learn/week/0', what: 'The AI Accelerator: Week 0 and the hires' },
  { name: 'home-agent', hash: 'home', path: '/learn', bought: 'agent', what: 'Home, an agent skill buyer' },
  { name: 'library-two', hash: 'library', path: '/learn/skills', bought: 'two', what: 'Skill Library, a buyer of two skills' },
];
const WIDTHS = [1280, 390];
const CLOCK = new Date('2026-11-24T14:00:00-07:00');

// --- the mockup, served from the repo (it links ../lms-v3) ------------------------------------------
const TYPES: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const path = join(root, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname));
  try {
    if (!path.startsWith(root) || !statSync(path).isFile()) throw new Error('no file');
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(readFileSync(path));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const address = server.address();
const mockup = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/handoff/lms-mockup/buyer.html`;

// --- the build, served by vite preview --------------------------------------------------------------
const preview = spawn('pnpm', ['--filter', '@ai/web', 'exec', 'vite', 'preview', '--outDir', 'dist-buyer', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
const build = `http://127.0.0.1:${PORT}`;
for (let i = 0; ; i++) {
  try {
    if ((await fetch(build)).ok) break;
  } catch {
    /* not up yet */
  }
  if (i > 120) throw new Error('vite preview did not start');
  await new Promise((r) => setTimeout(r, 500));
}

// --- the API the build reads ------------------------------------------------------------------------
const guides = Object.values((JSON.parse(readFileSync(join(root, 'apps/web/dist-private/skill-guides.json'), 'utf8')) as { guides: Record<string, SkillGuide> }).guides);
const db = seed('live');
db.users = db.users.map((u) => (u.id === 'u_jamie' ? { ...u, name: 'Alex Morgan' } : u));
const CARTS = ['insiders-monthly', 'insiders-agent-monthly', 'agent-monthly'];

async function answerApi(ctx: BrowserContext, bought: Bought): Promise<void> {
  await ctx.route(/\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === '/api/me') return json({ viewer: { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' }, prefs: {} });
    if (path === '/api/snapshot') return json(db);
    if (path === '/api/skills') return json(catalogAnswer(BOUGHT[bought]));
    // A buyer: the course is not in their plan, and comes as its outline (D-241).
    if (path === '/api/course') return json({ open: false, error: 'The AI Accelerator isn’t in your plan.', outline: deployedOutline() }, 403);
    if (path === '/api/offer') return json({ carts: CARTS.map((id) => ({ id, paymentLink: `https://buy.stripe.com/review-${id}` })) });
    if (path.startsWith('/api/skill-guides/')) {
      const slug = decodeURIComponent(path.split('/').pop() ?? '');
      const g = guides.find((x) => x.slug === slug);
      return g ? json({ slug, skill: g.skill, title: g.title, state: 'locked', opensAt: null, preview: previewOf(g), sample: null, guide: null, ui: null }) : json({ error: 'Not found' }, 404);
    }
    if (path === '/api/events') return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: 'retry: 600000\n\n' });
    return json({ error: 'not answered by the pairs script' }, 404);
  });
}

// --- capture ----------------------------------------------------------------------------------------
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const shoot = async (url: string, width: number, bought: Bought, api: boolean): Promise<Buffer> => {
  const ctx = await browser.newContext({ viewport: { width, height: width > 900 ? 900 : 844 }, reducedMotion: 'reduce', timezoneId: 'America/Denver', locale: 'en-US' });
  if (api) await answerApi(ctx, bought);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(CLOCK);
  await page.goto(url);
  await page.waitForSelector('body[data-app-ready="true"]');
  await page.waitForSelector('main#main .wk-page');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const png = await page.screenshot({ fullPage: true });
  await ctx.close();
  return png;
};
const rows: string[] = [];
for (const p of PAIRS) {
  for (const width of WIDTHS) {
    const bought = p.bought ?? 'owner';
    const a = await shoot(`${mockup}?bar=0&bought=${bought}#${p.hash}`, width, bought, false);
    const b = await shoot(`${build}${p.path}`, width, bought, true);
    const ia = PNG.sync.read(a), ib = PNG.sync.read(b);
    const w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
    const crop = (img: PNG) => {
      const c = new PNG({ width: w, height: h });
      PNG.bitblt(img, c, 0, 0, w, h, 0, 0);
      return c;
    };
    const diff = new PNG({ width: w, height: h });
    const n = pixelmatch(crop(ia).data, crop(ib).data, diff.data, w, h, { threshold: 0.1 });
    const write = (suffix: string, png: Buffer) => writeFileSync(join(out, `${p.name}-${width}.${suffix}.png${b64 ? '.b64' : ''}`), b64 ? png.toString('base64') : png);
    write('mockup', a);
    write('build', b);
    if (withDiff) writeFileSync(join(out, `${p.name}-${width}.diff.png`), PNG.sync.write(diff));
    rows.push(`| ${p.name} | ${width} | ${ia.height} / ${ib.height} | ${((n / (w * h)) * 100).toFixed(3)}% |`);
    console.log(rows[rows.length - 1]);
  }
}
await browser.close();
server.close();
preview.kill();
writeFileSync(join(out, 'pairs.md'), ['| Page | Width | Height, mockup / build | Pixels that differ |', '|---|---|---|---|', ...rows].join('\n') + '\n');
