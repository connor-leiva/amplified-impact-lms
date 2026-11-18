import { test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { PHASE_NOW, VIEWPORTS, type Role, type Scenario, type Action } from './scenarios';
import { REGION, REFERENCE_HIDE_CSS } from './regions';

export type Target = 'reference' | 'app';

/**
 * Which app a scenario is opened against.
 *
 * `fixture`  the `vite preview` build on APP_PORT, data from `data/fixture.ts` in the browser.
 *            This is what gates 3-6 run and it is UNCHANGED by everything below.
 * `http`     the SAME screens, built with VITE_DATA_SOURCE=http, served by the Fastify API on
 *            HTTP_PORT, reading a real Postgres through `/api/snapshot`. Gate 7's "parity in http
 *            mode": the goldens are the same files, so a pass is proof the backend is invisible.
 */
export type AppMode = 'fixture' | 'http';

// 127.0.0.1 rather than `localhost`: on Windows `localhost` resolves to ::1 first, so a server
// bound only to IPv4 and one bound only to IPv6 can both "own" the same port and which one you
// reach depends on the client. Being explicit removes that ambiguity.
export const REF_PORT = Number(process.env.REF_PORT ?? 4400);

/**
 * Which fixture build this run is against (D-182). The learner portal's flag (`VITE_LEARNER_V2`) is read
 * at build time, so the two states are two builds:
 *
 * - **Flag off** (the default, `pnpm compliance` and `pnpm e2e`): `dist-fixture` on 4173, the first portal
 *   at `/` exactly as production serves it today. Every parity scenario and its goldens run here.
 * - **Flag on** (`LEARNER_V2=1`, `pnpm e2e:learn`): `dist-fixture-v2` on 4174, the learner portal at /learn
 *   for a learner with the course and every first-portal address of theirs redirected. The `learn-v2*`
 *   specs run here, and nothing else does.
 *
 * Two runs rather than one because the specs read one `APP_BASE` each, at import; a separate run moves
 * no spec. A flag-on run never starts the http-mode API (that build is the flag-off production build).
 */
export const LEARNER_V2_RUN = process.env.LEARNER_V2 === '1';
export const APP_PORT = Number(process.env.APP_PORT ?? (LEARNER_V2_RUN ? 4174 : 4173));
export const REF_BASE = `http://127.0.0.1:${REF_PORT}`;
export const APP_BASE = process.env.APP_URL ?? `http://127.0.0.1:${APP_PORT}`;

/**
 * The http-mode origin: ONE server, which is also why http mode is worth having.
 *
 * `apps/api/src/server.ts` serves `apps/web/dist` through `@fastify/static` and sends every
 * non-`/api/` path to `index.html`, so the SPA and the API share an origin exactly as they do on
 * Railway. That is what makes the session cookie (`SameSite=Lax`), `credentials: 'include'` and
 * the `/api/events` EventSource behave here the way they behave in production — a separate
 * `vite preview` with a proxy in front would be testing the proxy.
 */
export const HTTP_PORT = Number(process.env.HTTP_PORT ?? 4373);
export const HTTP_BASE = `http://127.0.0.1:${HTTP_PORT}`;

/**
 * Whether THIS RUN brings up the http-mode API at all.
 *
 * On for `pnpm gate 7` (which sets `GATE=7`) and for an explicit `HTTP_PARITY=1`. Off otherwise,
 * which is the point: `pnpm compliance` and `pnpm gate 6` keep behaving exactly as they do today,
 * against the fixture build and nothing else, with no database required. Gate 7's checklist asks
 * for a SECOND mode, not a replacement.
 *
 * Forced off for a remote target. `APP_URL` means the suite is pointed at a deployment
 * (post-deploy.yml), where there is no local API to start and no database to seed — and that job
 * takes its GATE from `.phase`, so it will cross 7 on its own.
 *
 * `HTTP_PARITY=0` forces it off even under GATE=7. That is the escape hatch for debugging a diff:
 * the `parity` project DEPENDS on `parity-http`, so Playwright skips fixture parity whenever http
 * parity fails, and `HTTP_PARITY=0 GATE=7 pnpm compliance --grep "@g5"` gets both sets of numbers
 * back in one run.
 */
export const HTTP_PARITY: boolean =
  !LEARNER_V2_RUN &&
  !process.env.APP_URL &&
  !process.env.REFERENCE_ONLY &&
  process.env.HTTP_PARITY !== '0' &&
  (process.env.HTTP_PARITY === '1' || Number(process.env.GATE ?? 0) >= 7);

/**
 * The origin whose `/api/*` is a REAL API, or null when this run has none.
 *
 * `APP_URL` first: `pnpm e2e --grep @smoke` against staging is the case the smoke tags exist for,
 * and there the deployment is the API. Then the local http-mode server. Null means a run with
 * only the fixture build, where `/api/health` is a 404 from `vite preview` — the sign-in suite
 * skips itself rather than failing on something it was never pointed at.
 */
export const LIVE_API_BASE: string | null = process.env.APP_URL ?? (HTTP_PARITY ? HTTP_BASE : null);

/**
 * Persona → `users.id`, for `POST /api/test/session`.
 *
 * The same three ids `apps/web/src/data/fixture.ts` hard-codes as `PERSONA`, which is what makes
 * the two modes comparable: fixture mode answers `viewer()` from that table, http mode signs the
 * same row in and lets `/api/me` derive the role from the database. They are duplicated rather
 * than imported because `compliance/` cannot resolve `@ai/core` (it is not a dependency of the
 * root package), and `fixture.ts` imports it.
 *
 * `scenarios.ts`'s `Role` is the key type, so a fourth persona cannot be added there without the
 * compiler asking for its id here.
 */
export const PERSONA_USER_ID: Record<Role, string> = {
  agent: 'u_jamie', // Agent tier, no team → `/api/me` role 'agent'
  owner: 'u_alex', // users.role 'Team Owner' → role 'owner'
  admin: 'st1', // staff → role 'admin'
};

/**
 * The mode the running project asks for, from its `metadata`.
 *
 * Project metadata rather than an environment variable because both projects run in ONE
 * `pnpm gate 7` invocation and share a process environment: `parity` (fixture) and `parity-http`
 * are distinguishable only per test, and `test.info()` is per test. Defaults to `fixture`, so
 * `capture.spec.ts` and `harness.spec.ts` — which declare no metadata — are untouched.
 */
function appMode(): AppMode {
  const declared = (test.info().project.metadata as { mode?: unknown } | undefined)?.mode;
  return declared === 'http' ? 'http' : 'fixture';
}

/**
 * Sign the scenario's persona in, before the first navigation.
 *
 * `ctx.request` shares its cookie jar with the browser context, so the `ai_sid` the test route
 * sets is already in place when `page.goto` runs. That matters more than it looks: the FIRST
 * document request then carries the session, so the shell's `/api/me` and `/api/snapshot` never
 * see a 401 — and `data/http.ts` answers a 401 with `location.assign('/sign-in')`, which would
 * replace the screen under test with the sign-in card and golden a redirect.
 *
 * It is also why the global rate limit is survivable (§ 9.4, 100/minute): `app.ts`'s
 * `rateLimitKey` buckets by session cookie when there is one, so each scenario's requests —
 * document, assets, fonts, three API calls — land in a bucket of their own instead of sharing
 * `ip:127.0.0.1` with all 24 of them. That holds whichever way `rateLimitKey`'s reported defect is
 * settled: this is a REAL signed session, so it buckets per session both as written (the raw
 * cookie) and once the key is taken from the unsigned value. Nothing here relies on the limiter
 * accepting a cookie it has not verified.
 */
async function signInAsPersona(ctx: BrowserContext, role: Role): Promise<void> {
  const userId = PERSONA_USER_ID[role];
  const res = await ctx.request.post(`${HTTP_BASE}/api/test/session`, { data: { userId } });
  if (!res.ok()) {
    throw new Error(
      `http mode: POST /api/test/session { userId: '${userId}' } answered ${res.status()}: ${await res.text()}\n` +
        '  404 means the API is not running with NODE_ENV=test (routes/test.ts registers nothing otherwise).\n' +
        `  404 { error: 'No user ${userId}' } means the database is not seeded — compliance/lib/global-setup.ts does that.`,
    );
  }
}

export async function open(browser: Browser, s: Scenario, target: Target) {
  const mode = target === 'app' ? appMode() : 'fixture';
  const http = mode === 'http';

  // Guarded rather than asserted in the project's `grep`, because the grep is a filter and this is
  // a fact about the API. `db/codec.ts`: "`Db.v`, `Db.phase` and `Db.base` are snapshot metadata,
  // not rows … and no `phase` at all". `Dashboard.vm.ts` reads an absent phase as 'live', so a
  // week0 or post scenario in http mode is not a near miss — it renders the live dashboard and the
  // diff would be read as a regression. See the report accompanying this change.
  if (http && (s.phase ?? 'live') !== 'live') {
    throw new Error(
      `http mode cannot run scenario '${s.id}': it needs phase '${s.phase}', and the snapshot ` +
        'codec stores no `phase` column, so `/api/snapshot` always describes the live cohort ' +
        '(apps/api/src/db/codec.ts). Fixture parity covers these two scenarios.',
    );
  }

  const ctx = await browser.newContext({
    viewport: VIEWPORTS[s.viewport ?? 'desktop'],
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: s.tz ?? 'America/Chicago',
    colorScheme: s.theme === 'dark' ? 'dark' : 'light',
  });
  if (http) await signInAsPersona(ctx, s.role);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(PHASE_NOW[s.phase ?? 'live']));
  const prefs = { phase: s.phase ?? 'live', theme: s.theme ?? 'light', tz: null, sidebar: s.sidebar ?? 'full' };
  // Seed preferences as a DEFAULT, not an override. addInitScript re-runs on every navigation, so
  // writing unconditionally would wipe whatever the page had just saved and make a reload look as
  // though nothing persisted — which is precisely what the persistence e2e tests assert.
  //
  // The same script in both modes, deliberately. `lib/prefs.ts` is the only reader of theme, zone
  // and sidebar in either build — `/api/me`'s `prefs` is served but nothing in the UI consumes it
  // yet — so the two modes are configured identically and a theme or zone difference in a diff is
  // about the snapshot, never about the harness.
  await page.addInitScript((p) => {
    if (!localStorage.getItem('ai-lms-prefs')) localStorage.setItem('ai-lms-prefs', JSON.stringify(p));
  }, prefs);

  const url =
    target === 'reference'
      ? `${REF_BASE}/${encodeURIComponent(s.refFile ?? 'Amplified Impact LMS.dc.html')}${s.ref ? `#${s.role}/${s.ref}` : ''}`
      : http
        ? // No `?as=` and no `?phase=`. CLAUDE.md: those params "exist only in fixture mode. They
          // must be impossible in http mode" — `data/boot.ts` reads them only when `isFixture`. The
          // persona arrives as a session cookie instead, which is the whole point of the mode.
          `${HTTP_BASE}${s.path}`
        : `${APP_BASE}${s.path}${s.path.includes('?') ? '&' : '?'}as=${s.role}&phase=${s.phase ?? 'live'}`;
  await page.goto(url);
  await settle(page, target, mode);
  if (target === 'reference') await page.addStyleTag({ content: REFERENCE_HIDE_CSS });
  for (const a of s.actions ?? []) await act(page, a, target);
  await settle(page, target, mode);
  return { ctx, page };
}

async function settle(page: Page, target: Target, mode: AppMode = 'fixture') {
  // `networkidle` is unreachable in http mode and this is not a flake: `data/http.ts` opens an
  // `EventSource('/api/events')` as soon as a screen subscribes, the stream stays open for the life
  // of the page by design (§ 7.6), and Playwright counts it as an in-flight request forever — so
  // the wait times out on every single scenario. `load` plus the app's own readiness marker is the
  // stronger signal anyway: `data-app-ready` goes on the body only after `useDb()` has stopped
  // suspending, which means the snapshot has arrived and rendered.
  await page.waitForLoadState(mode === 'http' ? 'load' : 'networkidle');
  await page.evaluate(() => document.fonts.ready);
  if (target === 'reference') await page.waitForFunction(() => !document.body.innerText.includes('Loading…'));
  else await page.locator('[data-app-ready="true"]').waitFor();
  await page.waitForTimeout(350); // drawers 240ms, modals 200ms
  await settleAnimations(page);
}

/**
 * Wait until every finite animation has finished.
 *
 * The fixed 350ms above covers the drawer (240ms) and modal (200ms) transitions when the machine is
 * idle, but under the full 55-scenario parallel run it is not always enough: a drawer was captured
 * mid-transition roughly once in five full runs, which is fatal to the zero-diff golden
 * requirement while being invisible in an isolated run.
 *
 * Infinite animations (`ai-skeleton`, `ai-pulse`) are excluded — they never finish by design, and
 * `screenshot({ animations: 'disabled' })` resets them to their first frame anyway.
 */
export async function settleAnimations(page: Page) {
  await page
    .waitForFunction(
      () =>
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .every((a) => a.playState === 'finished' || a.playState === 'idle'),
      null,
      { timeout: 5_000 },
    )
    .catch(() => {
      /* A page with a genuinely stuck finite animation still gets captured, as before. */
    });
}

async function act(page: Page, a: Action, target: Target) {
  if ('press' in a) return page.keyboard.press(a.press);
  if ('scroll' in a) return page.locator('main').evaluate((el, y) => el.scrollTo(0, y), a.scroll.y);
  if ('fill' in a) return page.getByLabel(a.fill.label).fill(a.fill.value);
  const { role, name, within, nth = 0 } = a.click;
  const scope = within ? page.locator(REGION[within]!) : page;
  // Reference rows are plain divs; the table is the last place a name appears on the page.
  if (role === 'row' && target === 'reference')
    return (a.click.nth != null ? scope.getByText(name).nth(nth) : scope.getByText(name).last()).click();
  return scope
    .getByRole(role, { name, exact: typeof name === 'string' })
    .nth(nth)
    .click();
}
