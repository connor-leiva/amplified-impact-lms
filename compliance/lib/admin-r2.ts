import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import type { Browser, Page } from '@playwright/test';

// ================================================================================================
// ADMIN REDESIGN R2: pixel parity against the signed-off mockup (D-160, BUILD-SPEC § 6)
// ================================================================================================
//
// `pnpm parity:admin-r2` captures each BUILT admin screen at each reference width, compares it with
// the matching PNG in `design-reference/admin-redesign-r2/ref/`, and writes a report. It is its own
// Playwright config (`compliance/admin-r2.config.ts`), so the `parity`, `parity-http` and `e2e`
// projects and their goldens never see it.
//
// The rule (BUILD-SPEC § 6.3, never loosened): pixelmatch at a per-pixel threshold of 0.1 with
// `includeAA: false`, and a cell passes only with IDENTICAL width × height AND at most 0.1% of its
// pixels differing. Masks are for genuinely dynamic text only, each listed with a reason in
// `compliance/parity/admin-r2-masks.json` (expected: none).
//
// REPORT-ONLY until a cell is enforced. A built cell that fails is reported as FAIL and the run
// still passes; an ENFORCED cell that fails fails the run. A cell with no built screen is reported
// as "not built", never as a pass. R2-0 builds nothing and enforces nothing; each later R2 PR adds
// its screens to ROUTES and its cells to ENFORCED.

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const R2_DIR = join(ROOT, 'design-reference/admin-redesign-r2');
export const REF_DIR = join(R2_DIR, 'ref');
/**
 * The R2 renderer's fallback fonts (D-160, option A): → from FreeSans, ⌘ from IPAGothic, because the
 * self-hosted Geist latin subset has neither. The refs were rendered with it; every capture uses it.
 */
export const R2_FONTCONFIG = join(R2_DIR, 'harness/fonts.conf');
export const OUT_DIR = join(ROOT, 'compliance/parity/out');
export const CELLS_DIR = join(OUT_DIR, 'cells');
export const MASKS_FILE = join(ROOT, 'compliance/parity/admin-r2-masks.json');

/** BUILD-SPEC § 6.3. Constants, not options: there is no flag that widens them. */
export const PIXEL_THRESHOLD = 0.1;
export const MAX_DIFF_RATIO = 0.001;

export const WIDTHS = [1440, 1280, 1024, 390] as const;
export type Width = (typeof WIDTHS)[number];

/**
 * The ref file stems, in the harness's order (`render-mockup.mjs` `ALL`, with its `NAME` renames:
 * `cohorts` → `cohorts-sessions`, `workspace` → `workspace-detail`), plus the Roles confirm frame.
 * 31 × 4 = 124 cells, one per PNG in `ref/MANIFEST.tsv`.
 */
export const SCREENS = [
  'overview', 'health', 'curriculum', 'builder', 'vault', 'cohorts-sessions', 'announce', 'learners',
  'workspaces', 'users', 'masquerade', 'tiers', 'billing', 'usage', 'incidents', 'audit', 'api', 'jobs',
  'email', 'integrations', 'deploys', 'db', 'flags', 'roles', 'workspace-detail', 'user', 'incident', 'as',
  'missing', 'denied', 'roles-confirm',
] as const;
export type Screen = (typeof SCREENS)[number];

export const cellId = (screen: Screen, width: Width) => `${screen}-${width}`;

/**
 * How a screen is opened in the app. `frame: 'viewport'` captures the W×H viewport at the page top
 * instead of the full page (the Roles confirm dialog, as the harness does); `prepare` runs after the
 * page is ready and before the capture (open a dialog, pick a tab).
 */
export interface Route {
  path: string;
  frame?: 'full' | 'viewport';
  prepare?: (page: Page) => Promise<void>;
}

/**
 * screen → app route. EMPTY in R2-0: nothing is built yet, so every cell reports "not built".
 * R2-1 fills this in with the parity fixture (below) and the routes its PR builds.
 */
export const ROUTES: Partial<Record<Screen, Route>> = {};

/**
 * The cells whose failure fails the run, as `cellId`s (`'curriculum-1280'`). EMPTY in R2-0. A PR
 * adds the cells for the screens it builds; enforcing a cell with no route is itself an error.
 */
export const ENFORCED: readonly string[] = [];

// ------------------------------------------------------------------------------------------------
// The parity fixture seam (BUILD-SPEC § 6.1). Fixture mode only, never in the production bundle.
// ------------------------------------------------------------------------------------------------

/**
 * The mockup's "now": Thursday, Dec 10, 2026, about 9:30 AM MST. America/Phoenix has no daylight
 * saving time, so it is UTC−7 all year and 9:30 AM MST is 16:30 UTC.
 */
export const PARITY_NOW = '2026-12-10T16:30:00.000Z';
export const PARITY_TZ = 'America/Phoenix';
/** The mockup's viewer: the Owner (Connor Leiva). */
export const PARITY_VIEWER = 'owner' as const;

/**
 * The app's fixture build (the same `pnpm --filter @ai/web preview:fixture` the `parity` project
 * opens). Never a deployment: the parity fixture does not exist outside fixture mode.
 */
export const APP_PORT = Number(process.env.APP_PORT ?? 4173);
export const APP_BASE = `http://127.0.0.1:${APP_PORT}`;

/**
 * The query string that selects the parity fixture and the Owner viewer. R2-1 defines it in the
 * fixture build (fixture mode only, like `?as=`); until then no route exists to use it.
 */
export function parityUrl(route: Route): string {
  return `${APP_BASE}${route.path}`;
}

/** Viewport height: W×900 on desktop, W×844 on a phone (BUILD-SPEC § 6.2, the harness's PHONE_H/DESK_H). */
export const viewportFor = (w: Width) => ({ width: w, height: w < 768 ? 844 : 900 });

/**
 * The test-only stylesheet that does what the harness's `FULL` CSS does to the mockup: the shell
 * grows to its content (height auto, min-height 0) and the main and table scrollers stop scrolling,
 * so a full-page screenshot is max(sidebar, content) tall, exactly like the refs.
 *
 * Selectors are the required landmarks (CLAUDE.md), so they hold for any shell: the shell is the
 * element whose child is the Primary aside, the main column is the element whose child is `main`.
 * A table that scrolls inside its card carries `data-parity-scroll` (R2-1's Table primitive).
 */
export const PARITY_FULL_CSS = [
  'html,body,#root{height:auto!important;min-height:0!important;overflow:visible!important}',
  ':has(> aside[aria-label="Primary"]),:has(> main){height:auto!important;min-height:0!important}',
  'main,[data-parity-scroll]{overflow:visible!important}',
].join('\n');

/** Open one built cell in the app, settled and ready to capture. */
export async function openCell(browser: Browser, route: Route, width: Width) {
  if (process.env.APP_URL) throw new Error('parity:admin-r2 runs against the fixture build only, never APP_URL.');
  const ctx = await browser.newContext({
    viewport: viewportFor(width),
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: PARITY_TZ,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(PARITY_NOW));
  await page.goto(parityUrl(route));
  await page.locator('body[data-app-ready="true"]').waitFor();
  await page.addStyleTag({ content: PARITY_FULL_CSS });
  if (route.prepare) await route.prepare(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400); // the harness's settle()
  return { ctx, page };
}

/** Capture a cell the way the harness captured its ref. */
export async function capture(page: Page, route: Route, width: Width): Promise<Buffer> {
  const opts = { animations: 'disabled', caret: 'hide' } as const;
  if (route.frame === 'viewport') return page.screenshot({ ...opts, clip: { x: 0, y: 0, ...viewportFor(width) } });
  return page.screenshot({ ...opts, fullPage: true });
}

// ------------------------------------------------------------------------------------------------
// Masks
// ------------------------------------------------------------------------------------------------

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Mask {
  selector?: string;
  rect?: Rect;
  screen: Screen;
  widths: Width[];
  reason: string;
}

/** Load and validate `admin-r2-masks.json`. A malformed entry is an error, never ignored. */
export function loadMasks(): Mask[] {
  const raw: unknown = JSON.parse(readFileSync(MASKS_FILE, 'utf8'));
  if (!Array.isArray(raw)) throw new Error(`${MASKS_FILE}: expected a JSON array.`);
  return raw.map((m: any, i) => {
    const where = `${MASKS_FILE}[${i}]`;
    if (!m || typeof m !== 'object') throw new Error(`${where}: not an object.`);
    if ((m.selector == null) === (m.rect == null)) throw new Error(`${where}: give exactly one of "selector" or "rect".`);
    if (m.selector != null && (typeof m.selector !== 'string' || !m.selector)) throw new Error(`${where}: "selector" must be a CSS selector.`);
    if (m.rect != null && !['x', 'y', 'width', 'height'].every((k) => Number.isFinite(m.rect[k])))
      throw new Error(`${where}: "rect" needs numeric x, y, width and height.`);
    if (!SCREENS.includes(m.screen)) throw new Error(`${where}: unknown screen "${m.screen}".`);
    if (!Array.isArray(m.widths) || !m.widths.length || !m.widths.every((w: number) => (WIDTHS as readonly number[]).includes(w)))
      throw new Error(`${where}: "widths" must list some of ${WIDTHS.join(', ')}.`);
    if (typeof m.reason !== 'string' || !m.reason.trim()) throw new Error(`${where}: every mask needs a one-line "reason".`);
    return m as Mask;
  });
}

/** The rects a cell's masks cover in the app capture (selectors resolved on the live page). */
export async function maskRects(page: Page, masks: Mask[]): Promise<Rect[]> {
  const rects: Rect[] = [];
  for (const m of masks) {
    if (m.rect) rects.push(m.rect);
    else
      rects.push(
        ...(await page.locator(m.selector!).evaluateAll((els) =>
          els.map((e) => {
            const b = e.getBoundingClientRect();
            return { x: b.x + window.scrollX, y: b.y + window.scrollY, width: b.width, height: b.height };
          }),
        )),
      );
  }
  return rects;
}

// ------------------------------------------------------------------------------------------------
// Compare
// ------------------------------------------------------------------------------------------------

export interface CellResult {
  cell: string;
  screen: Screen;
  width: Width;
  status: 'pass' | 'fail' | 'not built';
  enforced: boolean;
  dimsOk?: boolean;
  appDims?: string;
  refDims?: string;
  diffPx?: number;
  diffPct?: number;
  masks?: number;
  browser?: string;
}

const readPng = (buf: Buffer) => PNG.sync.read(buf);

/** Paint the masked rects identically in both images, so they cannot differ there. */
function applyMask(img: PNG, rects: Rect[]) {
  for (const r of rects)
    for (let y = Math.max(0, Math.floor(r.y)); y < Math.min(img.height, Math.ceil(r.y + r.height)); y++)
      for (let x = Math.max(0, Math.floor(r.x)); x < Math.min(img.width, Math.ceil(r.x + r.width)); x++) {
        const i = (y * img.width + x) * 4;
        img.data[i] = 255;
        img.data[i + 1] = 0;
        img.data[i + 2] = 255;
        img.data[i + 3] = 255;
      }
}

/** A side-by-side: app on the left, ref on the right, 16px apart, on the mockup's stage grey. */
function sideBySide(app: PNG, ref: PNG): PNG {
  const gap = 16;
  const out = new PNG({ width: app.width + gap + ref.width, height: Math.max(app.height, ref.height) });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 0xd9;
    out.data[i + 1] = 0xd5;
    out.data[i + 2] = 0xca;
    out.data[i + 3] = 255;
  }
  PNG.bitblt(app, out, 0, 0, app.width, app.height, 0, 0);
  PNG.bitblt(ref, out, 0, 0, ref.width, ref.height, app.width + gap, 0);
  return out;
}

/**
 * Compare one app capture with its ref and write the evidence: the app PNG, the diff PNG (when the
 * dimensions match) and the side-by-side, under `compliance/parity/out/`.
 */
export function compare(cell: string, appBuf: Buffer, rects: Rect[]) {
  const ref = readPng(readFileSync(join(REF_DIR, `${cell}.png`)));
  const app = readPng(appBuf);
  for (const d of ['app', 'diff', 'side']) mkdirSync(join(OUT_DIR, d), { recursive: true });
  writeFileSync(join(OUT_DIR, 'app', `${cell}.png`), appBuf);
  writeFileSync(join(OUT_DIR, 'side', `${cell}.png`), PNG.sync.write(sideBySide(app, ref)));
  const dimsOk = app.width === ref.width && app.height === ref.height;
  const res = { dimsOk, appDims: `${app.width}×${app.height}`, refDims: `${ref.width}×${ref.height}` };
  if (!dimsOk) return { ...res, diffPx: undefined, diffPct: undefined, pass: false };
  applyMask(app, rects);
  applyMask(ref, rects);
  const diff = new PNG({ width: ref.width, height: ref.height });
  const diffPx = pixelmatch(app.data, ref.data, diff.data, ref.width, ref.height, { threshold: PIXEL_THRESHOLD, includeAA: false });
  writeFileSync(join(OUT_DIR, 'diff', `${cell}.png`), PNG.sync.write(diff));
  const ratio = diffPx / (ref.width * ref.height);
  return { ...res, diffPx, diffPct: 100 * ratio, pass: ratio <= MAX_DIFF_RATIO };
}

export function writeCell(r: CellResult) {
  mkdirSync(CELLS_DIR, { recursive: true });
  writeFileSync(join(CELLS_DIR, `${r.cell}.json`), JSON.stringify(r, null, 2) + '\n');
}

/** `ref/MANIFEST.tsv`: file, width, height, sha256 (the handoff's, from Chrome 156). */
export function readManifest(): { file: string; width: number; height: number; sha256: string }[] {
  const lines = readFileSync(join(REF_DIR, 'MANIFEST.tsv'), 'utf8').trim().split('\n').slice(1);
  return lines.map((l) => {
    const [file = '', width = '', height = '', sha256 = ''] = l.split('\t');
    return { file, width: Number(width), height: Number(height), sha256 };
  });
}
