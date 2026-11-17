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
// as "not built", never as a pass. R2-0 built nothing; R2-1b builds the shell, the 404 and Denied
// and enforces their eight cells; R2-1c the Support records (Workspaces, Workspace, Users, User); each
// later R2 PR adds its screens to ROUTES and its cells to ENFORCED.

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
 * screen → app route. R2-1b (D-160) builds the shell, the Console 404 and Denied: `missing` is any
 * `/admin/…` address that is no screen, and `denied` is the mockup's standalone "Access denied" screen,
 * which the fixture build serves at `/admin/denied` (fixture only; the http build has no such route).
 * Each later R2 PR adds the screens it builds.
 */
export const ROUTES: Partial<Record<Screen, Route>> = {
  missing: { path: '/admin/no-such-page' },
  denied: { path: '/admin/denied' },
  // R2-2: the Build screens. The builder opens m1, as the mockup's `route.id || 'm1'` does.
  curriculum: { path: '/admin/curriculum' },
  builder: { path: '/admin/curriculum/m1' },
  vault: { path: '/admin/vault' },
  'cohorts-sessions': { path: '/admin/cohorts' },
  announce: { path: '/admin/announcements' },
  // R2-3a: the Overview, Learners & Teams and Tiers & Upgrades.
  overview: { path: '/admin' },
  learners: { path: '/admin/learners' },
  tiers: { path: '/admin/tiers' },
  // R2-3b: the Audit Log and Roles & Permissions, editable (Connor, Nov 16, 2026, 8:27 AM MST).
  audit: { path: '/admin/audit' },
  roles: { path: '/admin/roles' },
  // BUILD-SPEC § 6.2: "viewport frame at page top with the 'Remove this permission from Admin?' dialog
  // open (third enabled checkbox, i.e. Admin's 'Start and extend masquerade')". The harness clicks the
  // mockup's third enabled box; here the same box (the third enabled one in the app too) by its name.
  'roles-confirm': {
    path: '/admin/roles',
    frame: 'viewport',
    prepare: async (page) => {
      await page.getByRole('checkbox', { name: 'Start and extend masquerade, Admin', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Remove this permission from Admin?' });
      await dialog.waitFor();
      // The preview has answered: the action is on.
      await dialog.getByRole('button', { name: 'Remove permission' }).and(page.locator(':enabled')).waitFor();
      // The harness's `main.scrollTop = 0`: the frame is the page top with the dialog open.
      await page.evaluate(() => {
        for (const el of [document.scrollingElement, ...Array.from(document.querySelectorAll('*'))]) if (el && el.scrollTop) el.scrollTop = 0;
      });
      await page.mouse.move(0, 0);
    },
  },
  // R2-1c (D-160): the Support records, on the mockup's own `WS` and `USERS` (the Console fixture
  // answers with them): Northshore Group and Elena Vargas are the mockup's detail records.
  workspaces: { path: '/admin/workspaces' },
  'workspace-detail': { path: '/admin/workspaces/ws_northshore' },
  users: { path: '/admin/users' },
  user: { path: '/admin/users/u_1042' },
  // D-162 3b (Masquerade on R2): the page, and the mockup's learner view (`as`), which with no session
  // (always, in the Console, by D2) is its "No masquerade session is active" empty state.
  masquerade: { path: '/admin/masquerade' },
  as: { path: '/admin/masquerade/learner-view' },
  // R2-4a (D-163): Billing's Summary tab, the mockup's default (`route.tab || 'summary'`).
  billing: { path: '/admin/billing' },
  // D-165: API & Webhooks (its Endpoints tab, the mockup's default `route.tab || 'endpoints'`) and
  // Scheduled Jobs, on the mockup's `ENDPOINTS`, `HOOKS` and `JOBS` (the Console fixture answers with them).
  api: { path: '/admin/api' },
  jobs: { path: '/admin/jobs' },
};

/**
 * The cells whose failure fails the run, as `cellId`s (`'curriculum-1280'`). A PR adds the cells for
 * the screens it builds; enforcing a cell with no route is itself an error. R2-1b: `missing` and
 * `denied` at all four widths; R2-2a: `curriculum` and `builder` at all four; R2-2b: `vault` and
 * `announce` at all four, `cohorts-sessions` at 1440, 1280 and 1024; R2-3a: `overview`, `learners`
 * and `tiers` at all four; R2-3b: `audit`, `roles` and `roles-confirm` at all four; R2-1c part 1:
 * `workspaces` at all four, `workspace-detail` at 1440, 1280 and 1024 (and 390 as an approved
 * exception, `admin-r2-exceptions.ts`); R2-1c part 2: `users` at all four, `user` at 1440, 1280 and
 * 1024 (and 390 as an approved exception); Masquerade 3b (D-162): `masquerade` and `as` at all four;
 * R2-4a (D-163): `billing` at all four; D-165: `api` and `jobs` at all four.
 */
export const ENFORCED: readonly string[] = WIDTHS.flatMap((w) => [
  `missing-${w}`,
  `denied-${w}`,
  // R2-2a (D-160): Curriculum and the Module Builder, at all four widths.
  `curriculum-${w}`,
  `builder-${w}`,
  // R2-2b (D-160): the Resource Vault and Announcements at all four widths, Cohorts & Sessions at three.
  // cohorts-sessions-390 is not here: the mockup draws its key-fact values at 15px on a phone, under the
  // 16px floor the build keeps, so it is an approved exception (`admin-r2-exceptions.ts`, D-160).
  `vault-${w}`,
  `announce-${w}`,
  ...(w === 390 ? [] : [`cohorts-sessions-${w}`]),
  // R2-3a (D-160): the Overview, Learners & Teams and Tiers & Upgrades, at all four widths.
  `overview-${w}`,
  `learners-${w}`,
  `tiers-${w}`,
  // R2-3b (D-160): the Audit Log at all four widths. Editable Roles (Connor, Nov 16, 2026, 8:27 AM
  // MST): `roles` and `roles-confirm` at all four. The five boxes past `CONSOLE_CAPS` that the mockup
  // draws as plain toggles are drawn so (the server refuses them and the confirm says why); the only
  // difference left is Support's Export box, which `PERMS0` checks and the ceiling refuses.
  `audit-${w}`,
  `roles-${w}`,
  `roles-confirm-${w}`,
  // R2-1c part 1 (D-160): Workspaces at all four widths; Workspace at 1440, 1280 and 1024.
  // `workspace-detail-390` is not here: the mockup sets the key-facts values at 15px on a phone, under
  // the 16px floor the build keeps, so it is an approved exception (`admin-r2-exceptions.ts`, D-160).
  `workspaces-${w}`,
  ...(w === 390 ? [] : [`workspace-detail-${w}`]),
  // R2-1c part 2 (D-160): Users at all four widths; User at 1440, 1280 and 1024. `user-390` is not here,
  // for `workspace-detail-390`'s reason (its key-facts values, 15px in the mockup on a phone, 16px here):
  // it is an approved exception (`admin-r2-exceptions.ts`, D-160).
  `users-${w}`,
  ...(w === 390 ? [] : [`user-${w}`]),
  // D-162 3b: Masquerade and its learner view (`as`), at all four widths.
  `masquerade-${w}`,
  `as-${w}`,
  // R2-4a (D-163): Billing's Summary at all four widths.
  `billing-${w}`,
  // D-165: API & Webhooks and Scheduled Jobs, at all four widths.
  `api-${w}`,
  `jobs-${w}`,
]);

// ------------------------------------------------------------------------------------------------
// The parity fixture seam (BUILD-SPEC § 6.1). Fixture mode only, never in the production bundle.
// ------------------------------------------------------------------------------------------------

/**
 * The mockup's "now": Thursday, Dec 10, 2026, about 9:30 AM MST. America/Phoenix has no daylight
 * saving time, so it is UTC−7 all year and 9:30 AM MST is 16:30 UTC.
 */
export const PARITY_NOW = '2026-12-10T16:30:00.000Z';
export const PARITY_TZ = 'America/Phoenix';
/** The mockup's viewer: the Owner (Connor Leiva), the fixture's admin persona. */
export const PARITY_VIEWER = 'owner' as const;

/**
 * The app's fixture build (the same `pnpm --filter @ai/web preview:fixture` the `parity` project
 * opens). Never a deployment: the parity fixture does not exist outside fixture mode.
 */
export const APP_PORT = Number(process.env.APP_PORT ?? 4173);
export const APP_BASE = `http://127.0.0.1:${APP_PORT}`;

/**
 * The query string that selects the parity fixture (D-160 R2-1b, `apps/web/src/data/parity-r2.ts`):
 * the admin persona (`as=admin`, the fixture's Owner), the mockup's data (`parity=r2`) and the
 * mockup's "now" on the app's own clock (`now=`), which Playwright's clock then freezes. All three are
 * fixture-mode only: the http build reads none of them.
 */
export const PARITY_QUERY = `as=admin&parity=r2&now=${encodeURIComponent(PARITY_NOW)}`;

export function parityUrl(route: Route): string {
  return `${APP_BASE}${route.path}${route.path.includes('?') ? '&' : '?'}${PARITY_QUERY}`;
}

/** Viewport height: W×900 on desktop, W×844 on a phone (BUILD-SPEC § 6.2, the harness's PHONE_H/DESK_H). */
export const viewportFor = (w: Width) => ({ width: w, height: w < 768 ? 844 : 900 });

/**
 * The admin shell's frame, the app's counterpart of the mockup's `.ax` (`data-r2-shell`, D-160 R2-1b).
 * A full-frame cell is a screenshot of this element, as the harness's refs are screenshots of `.ax`.
 */
export const FRAME = '[data-r2-shell]';

/**
 * The test-only stylesheet that does what the harness's `FULL` CSS does to the mockup: the frame and
 * the shell grow to their content (height auto, min-height 0) and the main and table scrollers stop
 * scrolling, so the frame is max(sidebar, content) tall, exactly like the refs.
 *
 * Selectors are the frame and the required landmarks (CLAUDE.md), so they hold for any shell: the
 * shell is the element whose child is the Primary aside, the main column is the element whose child is
 * `main`. A table that scrolls inside its card carries `data-parity-scroll` (R2-1c's Table primitive).
 */
export const PARITY_FULL_CSS = [
  'html,body,#root{height:auto!important;min-height:0!important;overflow:visible!important}',
  `${FRAME},:has(> aside[aria-label="Primary"]),:has(> main){height:auto!important;min-height:0!important}`,
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
  // A viewport frame is the screen as it opens, W×H, as the harness's confirm frame is: its frame is
  // the viewport's height, not grown to its content.
  if (route.frame !== 'viewport') await page.addStyleTag({ content: PARITY_FULL_CSS });
  if (route.prepare) await route.prepare(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400); // the harness's settle()
  return { ctx, page };
}

/**
 * Capture a cell the way the harness captured its ref: the frame element (the harness screenshots
 * `.ax`), or the W×H viewport at the page top for a `viewport` cell.
 *
 * Not a full-page screenshot (D-160 R2-1b): Chromium's full page is never shorter than the viewport,
 * so a screen shorter than 900px (the 404 and Denied are 609px at 1280) would come out 900px tall,
 * while the ref, an element screenshot, is the frame's own height. The frame's box is the same
 * max(sidebar, content) the full page would have been for anything taller.
 */
export async function capture(page: Page, route: Route, width: Width): Promise<Buffer> {
  const opts = { animations: 'disabled', caret: 'hide' } as const;
  if (route.frame === 'viewport') return onStage(await page.screenshot({ ...opts, clip: { x: 0, y: 0, ...viewportFor(width) } }));
  return page.locator(FRAME).screenshot(opts);
}

/**
 * Where the harness's viewport frame puts the mockup (`render-mockup.mjs`, the roles-confirm refs): it
 * screenshots the PAGE at (0, 0), and on that page the artboard is not at x = 0. The mockup scales its
 * artboard to the stage, `sc = (stage width − 32) / W`, and centres a `.hold` of `W × sc` in it; the
 * harness's CSS undoes the scale (`transform: none`) but not the centring, so the full-width `.ax`
 * starts 16px in. Every confirm ref is that: 16 columns of the stage's grey (#D9D5CA, which the scrim
 * does not cover), then the frame's first W − 16 columns. The app's viewport capture is placed the
 * same way. Not a mask: every app pixel still in the ref's frame is compared.
 */
export const STAGE_X = 16;
export const STAGE_RGB = [0xd9, 0xd5, 0xca] as const;
export function onStage(buf: Buffer): Buffer {
  const app = PNG.sync.read(buf);
  const out = new PNG({ width: app.width, height: app.height });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = STAGE_RGB[0];
    out.data[i + 1] = STAGE_RGB[1];
    out.data[i + 2] = STAGE_RGB[2];
    out.data[i + 3] = 255;
  }
  PNG.bitblt(app, out, 0, 0, app.width - STAGE_X, app.height, STAGE_X, 0);
  return PNG.sync.write(out);
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
