import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { APP_BASE, HTTP_BASE, HTTP_PARITY, LIVE_API_BASE } from '../../lib/prepare';
import { PHASE_NOW } from '../../lib/scenarios';
import { expectAccessible } from '../../lib/a11y';

// Gate 7's "Sign-in e2e", in a browser — phase 07 § 7.5 and the checklist's own lines:
//
//   - "Request a link for an unknown email: the response is still 200."
//   - "Request a link for `jamie@ortizhomes.com`: the test mailbox (`/api/test/outbox`) receives
//      one message, verifying it lands on `/`, and reusing the token shows `That link was already
//      used. Request a new one.`"
//   - "The axe check on `/sign-in` passes."
//
// `apps/api/test/signin.test.ts` is the API half of the same list. This half is the part that can
// only be true in a browser: that `/sign-in` is MOUNTED and reachable (it was not until
// `apps/web/src/router.tsx` changed in this phase), that the screen's copy is what § 7.5
// specifies, that a magic link pasted into the address bar ends up on the dashboard, and that the
// second click on it says so.
//
// ================================================================================================
// WHERE THESE TESTS POINT, AND WHY IT IS NOT ALWAYS THE SAME PLACE
// ================================================================================================
//
//   APP_URL set            a deployment. `.github/workflows/post-deploy.yml`'s `staging` job runs
//                          `pnpm e2e --grep @smoke` against it, and that job is the reason the
//                          @smoke tag exists at all: before this file NOTHING carried it, so the
//                          job passed by running zero tests.
//   HTTP_PARITY (GATE=7)   the local http-mode server from `playwright.config.ts` — the SPA built
//                          with VITE_DATA_SOURCE=http, served by Fastify over a seeded Postgres,
//                          with NODE_ENV=test so `/api/test/outbox` exists.
//   neither                the fixture `vite preview` build. The page still renders and is still
//                          accessible there — `/sign-in` touches no repository and no clock — so
//                          the two @smoke page checks stay meaningful. The health check and the
//                          mailbox round trip need a real API, and skip with a reason.
//
// ================================================================================================
// WHAT @smoke MEANS HERE
// ================================================================================================
// post-deploy's staging job has NO fixture data: "its content is whatever is in that database and
// no golden applies. What IS checkable is that the deployment is alive and its public surface is
// sound: health, the sign-in page, and axe." So exactly three tests carry the tag, and each one
// holds against an empty database and an unknown viewer:
//
//   1. `/api/health` answers `{ ok: true }`     — the process is up and serving § 7.3's shape.
//   2. `/sign-in` renders § 7.5's card          — the SPA was built and the route is mounted.
//   3. axe finds nothing serious on /sign-in    — the one page an unauthenticated visitor can see.
//
// Nothing else may carry it. The mailbox round trip writes an `auth_tokens` row and mails a real
// link, which is not something to do to a deployment on a cron, and `/api/test/outbox` does not
// exist there anyway (NODE_ENV is not 'test').
//
// ================================================================================================
// ONE BROWSER CONTEXT, IN ORDER, AND THE MEASUREMENT THAT FORCED IT
// ================================================================================================
// § 9.4's global rate limit is "100 requests per minute per session", and `app.ts`'s
// `rateLimitKey` falls back to `ip:<address>` when there is no session cookie — which is every
// request an unauthenticated visitor makes, including every static asset, because the API serves
// the SPA itself.
//
// Measured against this build, cold, cookieless, counting responses in Chromium:
//
//   GET /sign-in   19 requests   (x-ratelimit-remaining 100 → 81)
//   GET /          54 requests   (→ 28; the dashboard's chunks plus the self-hosted fonts)
//
// Five tests in their own fresh contexts therefore spend ~97 of the 100 before global-setup's own
// three probes are counted, and the suite begins 429ing in the middle of a page load. That is
// exactly what it did: with Playwright's four workers the round-trip test hung in the second
// context's first paint and failed on a 30s timeout, and then again on a 120s one, while passing
// in 5.1s when run alone. The 429s are served as `{ error: … }` for the SPA's own JavaScript, so
// the app simply never boots and the symptom is a timeout with nothing in the log.
//
// Sharing one context does NOT fix it on its own, and that is worth writing down because it is the
// obvious move: `@fastify/static`'s default is `cache-control: public, max-age=0`, so a cached
// asset is REVALIDATED rather than skipped. The measurement above counts eight such 304s in the
// dashboard load, and a 304 is a request the limiter counts. Measured with the same five tests in
// one shared context, against a logged server: 149 requests, ELEVEN of them 429, and the failure
// landed in exactly the same place.
//
// So the suite asks the API how much budget is left before each page load, and waits out the
// window when the answer is "not enough" — `ensureRateBudget` below, using the API's own
// `x-ratelimit-remaining` and `x-ratelimit-reset` headers. That is deliberately not a `sleep`: it
// costs nothing on a fresh minute, it is self-correcting if the asset count changes, and it leaves
// the limit itself alone. Raising the limit, or handing each context a junk `ai_sid` to buy its own
// bucket (which `rateLimitKey` would accept — it hashes the cookie without verifying it), would
// both be tests editing the thing they are meant to be checking.
//
// The per-IP budget versus the SPA's own asset count is reported as a finding on `app.ts`, not
// worked around here beyond what this suite needs to run.
//
// ONE context, shared, in `mode: 'serial'`, so it has one writer at a time. Cookies are cleared
// before each test, so sharing the cache does not mean sharing a session — the round-trip test must
// start out signed out like any visitor. The cost of `serial` is that a failure skips the rest of
// the file, which is the right trade here: if `/api/health` does not answer, the deployment is
// broken and the two page checks have nothing to say.
test.describe.configure({ mode: 'serial' });

/**
 * Every string on this screen, verbatim from phase 07 § 7.5 and `routes/auth/SignIn.tsx`'s COPY.
 * D-132 made email and password the first form and the § 7.5 link the second (`?method=link`).
 */
const COPY = {
  h1: 'Sign In',
  sub: 'Use your work email and password.',
  // U+2019, not an ASCII apostrophe. CLAUDE.md: "Copy is exact."
  linkSub: 'We’ll email you a secure sign-in link.',
  label: 'Work Email',
  password: 'Password',
  signIn: 'Sign In',
  forgot: 'Forgot Password?',
  useLink: 'Email Me a Sign-In Link Instead',
  submit: 'Email Me a Sign-In Link',
  sentH1: 'Check Your Email',
  sent: (email: string) => `We sent a link to ${email}. It expires in 15 minutes.`,
  again: 'Use a Different Email',
  used: 'That link was already used. Request a new one.',
} as const;

const JAMIE = 'jamie@ortizhomes.com';
const UNKNOWN = 'nobody@example.com';

/**
 * Where the sign-in SCREEN is served from. Falls back to the fixture build, which renders it
 * identically — see the header.
 */
const SIGN_IN_BASE = LIVE_API_BASE ?? APP_BASE;

/** True only for the local http-mode server, which is the one place `/api/test/*` exists. */
const HAS_TEST_ROUTES = HTTP_PARITY && !process.env.APP_URL;

let ctx: BrowserContext;

test.beforeAll(async ({ browser }) => {
  // The zone and the locale are pinned here rather than through `test.use`, because the context is
  // ours: a failure in this file is never about the host's zone. `prepare.ts` pins the same pair
  // for every parity scenario.
  ctx = await browser.newContext({ timezoneId: 'America/Chicago', locale: 'en-US' });
});

test.afterAll(async () => {
  await ctx?.close();
});

/**
 * What one cookieless load of the sign-in card needs from § 9.4's per-minute budget.
 *
 * Measured at 19 requests — document, chunks and self-hosted fonts, every one of them in the
 * `ip:<address>` bucket because an unauthenticated visitor has no session to bucket by. 25 is that
 * plus the handful of `/api/auth/request`, `/api/auth/verify` and `/api/test/outbox` calls a test
 * makes around it, and a little room for the asset count to grow before this stops guarding
 * anything.
 */
const COLD_LOAD_REQUESTS = 25;

/**
 * Wait out § 9.4's minute if fewer than `need` requests are left in this address's budget.
 *
 * The numbers come from the API itself — `@fastify/rate-limit` sets `x-ratelimit-remaining` and
 * `x-ratelimit-reset` (seconds) on every response — so this stays correct if the SPA's asset count
 * or the limit changes. A missing header (a deployment behind a CDN that strips them, say) reads as
 * "plenty", which is the right default: the only cost of being wrong there is the failure this
 * suite would have had anyway.
 *
 * It costs one request and no waiting on a fresh minute. See the header for why it exists.
 */
async function ensureRateBudget(need: number): Promise<void> {
  if (LIVE_API_BASE === null) return;
  const res = await ctx.request.get(`${LIVE_API_BASE}/api/health`);
  const remaining = Number(res.headers()['x-ratelimit-remaining'] ?? Number.MAX_SAFE_INTEGER);
  if (!Number.isFinite(remaining) || remaining >= need) return;
  const reset = Number(res.headers()['x-ratelimit-reset'] ?? 60);
  const waitMs = (Number.isFinite(reset) ? Math.max(reset, 0) + 1 : 61) * 1000;
  // Printed, because a silent 60s pause is what makes a suite look hung. `lib/a11y.ts` logs its
  // allowed-defect summary the same way.
  console.log(
    `  signin.spec: ${remaining} of the API's per-minute budget left; waiting ${waitMs / 1000}s for § 9.4's window to reset.`,
  );
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}

/**
 * A page in the shared context, signed out, with the clock pinned to the API's `FIXED_NOW`.
 *
 * The clock matters less than it looks on the sign-in card — nothing there formats a time — but
 * the dashboard the magic link lands on does, and `data/boot.ts` calls `clock.useReal()` in http
 * mode, so without it the landing assertion would render the December cohort against the real wall
 * clock.
 */
async function freshPage(): Promise<Page> {
  // Cookies FIRST, then the budget probe: `ctx.request` shares this context's cookie jar, so a
  // probe sent while the round-trip test's `ai_sid` is still set would read that SESSION's budget
  // and learn nothing about the one the next page load actually spends.
  await ctx.clearCookies();
  await ensureRateBudget(COLD_LOAD_REQUESTS);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(PHASE_NOW.live));
  return page;
}

async function openSignIn(page: Page, path = '/sign-in'): Promise<void> {
  await page.goto(`${SIGN_IN_BASE}${path}`);
  // The screen marks the body itself — it renders outside `AppShell`, which is what normally does
  // it — and only after `document.fonts.ready`, so this is also the gate against measuring text in
  // a fallback face.
  await page.locator('[data-app-ready="true"]').waitFor();
}

interface Message {
  template: string;
  to: string;
  html: string | null;
}

/**
 * `GET /api/test/outbox`, which awaits `settleEmails()` server-side so this cannot race the send.
 *
 * EVERY assertion about it is a DELTA, never a total. The outbox is one in-memory array for the
 * life of the API process and nothing in its HTTP surface clears it (`resetOutbox` is in-process
 * only, which is right for a vitest suite and unreachable from a browser). With
 * `reuseExistingServer` — the default outside CI — a developer's second run inherits the first
 * run's messages, and a total would fail with "expected 1, received 2" on a suite that is working
 * perfectly. The checklist's claim is "receives one message" about ONE request, and a delta is
 * exactly that claim.
 */
async function outbox(): Promise<Message[]> {
  const res = await ctx.request.get(`${HTTP_BASE}/api/test/outbox`);
  expect(res.status(), 'GET /api/test/outbox').toBe(200);
  return (await res.json()).messages as Message[];
}

// ------------------------------------------------------------------------------------------------
// @smoke: what post-deploy's staging job checks
// ------------------------------------------------------------------------------------------------

test('the API answers /api/health @g7 @smoke', async () => {
  test.skip(
    LIVE_API_BASE === null,
    'No real API in this run. Set APP_URL for a deployment, or run with GATE=7 / HTTP_PARITY=1 for the local http-mode server.',
  );
  const res = await ctx.request.get(`${LIVE_API_BASE}/api/health`);
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { ok?: unknown; version?: unknown };
  // § 7.3's contract: `{ ok: true, version: RAILWAY_GIT_COMMIT_SHA ?? 'dev' }`. `version` is
  // asserted as a non-empty string rather than a value, because it IS the deployed commit — which
  // is the one field that makes this check able to tell a stale deploy from a fresh one.
  expect(body.ok).toBe(true);
  expect(typeof body.version).toBe('string');
  expect(body.version).not.toBe('');
});

test('/sign-in renders § 7.5s card @g7 @smoke', async () => {
  const page = await freshPage();
  await openSignIn(page);

  // The heading and the sub, exactly: the password form first (D-132).
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(COPY.h1);
  await expect(page.getByText(COPY.sub, { exact: true })).toBeVisible();

  // The fields are reached BY THEIR LABELS, which is also the accessibility contract: `getByLabel`
  // resolves through the `label`/`for` pair `Field` renders, so a field that lost its label fails
  // here rather than only in the axe check.
  await expect(page.getByLabel(COPY.label)).toBeVisible();
  await expect(page.getByLabel(COPY.password, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: COPY.signIn, exact: true })).toBeEnabled();
  await expect(page.getByRole('link', { name: COPY.forgot })).toBeVisible();

  // § 7.5's link, one click away.
  await page.getByRole('button', { name: COPY.useLink }).click();
  await expect(page.getByText(COPY.linkSub, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: COPY.submit })).toBeEnabled();

  // CLAUDE.md's brand landmark. § 7.5 had a mark and a wordmark at the top; the brand guide puts the
  // single `ai academy` app lockup on login screens (D-031), so there is one. tests/e2e/brand.spec.ts
  // checks that the variant shown matches the theme.
  await expect(page.locator('[data-brand-slot]')).toHaveCount(1);
  await page.close();
});

test('/sign-in passes the axe check @g7 @smoke', async () => {
  const page = await freshPage();
  await openSignIn(page);
  // Zero serious or critical violations, with only the reference's own known contrast defects
  // allowed (D-010) — the same gate every parity scenario goes through. This screen is net-new, so
  // none of those allowances should even be reachable on it.
  await expectAccessible(page);
  await page.close();
});

// ------------------------------------------------------------------------------------------------
// The checklist's own sign-in flow
// ------------------------------------------------------------------------------------------------

test('an unknown address is answered exactly like a known one @g7', async () => {
  test.skip(LIVE_API_BASE === null, 'Needs a real /api/auth/request. Run with GATE=7 or HTTP_PARITY=1.');
  const page = await freshPage();
  await openSignIn(page, '/sign-in?method=link');
  const before = HAS_TEST_ROUTES ? (await outbox()).length : null;

  await page.getByLabel(COPY.label).fill(UNKNOWN);
  await page.getByRole('button', { name: COPY.submit }).click();

  // § 7.5: "Always returns 200 {ok:true}, so it does not reveal whether an account exists." The
  // checklist's line is about the status; this is the half that makes it worth anything — the
  // SCREEN must not branch either, or the status is a formality and the UI is the side channel.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(COPY.sentH1);
  await expect(page.getByText(COPY.sent(UNKNOWN), { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: COPY.again })).toBeVisible();

  // And nothing was sent, which is what makes the identical screen honest rather than a bluff:
  // login is invite-only, so there is no account to mail. Skipped against a deployment, which has
  // no mailbox to read.
  if (before !== null) expect((await outbox()).length).toBe(before);
  await page.close();
});

test('jamie@ortizhomes.com gets one link, it lands on `/`, and the second click says so @g7', async () => {
  test.skip(
    !HAS_TEST_ROUTES,
    'Needs the local http-mode server: /api/test/outbox exists only when NODE_ENV is exactly "test". Run `GATE=7 pnpm e2e --grep @g7` or set HTTP_PARITY=1.',
  );
  // Three loads of the real SPA plus two round trips through Railway's Postgres proxy. Measured at
  // 5.1s run alone; the allowance is for a cold server and a busy machine, not for the rate-limit
  // stall the header describes — that one is fixed by sharing the context, not by waiting longer.
  test.setTimeout(120_000);

  const page = await freshPage();
  await openSignIn(page, '/sign-in?method=link');
  const before = await outbox();

  await page.getByLabel(COPY.label).fill(JAMIE);
  // The response is watched, not just the screen, and the reason is § 7.5's OTHER rate limit:
  // "5 per hour per email". `SignIn.tsx` shows "Check Your Email" for a 429 exactly as it does for
  // a 200 — that is the design, so the screen cannot reveal whether an account exists — so without
  // this the failure is "expected 1 message, received 0" with nothing to say why. The budget lives
  // in the plugin instance, so it accumulates across runs whenever `reuseExistingServer` keeps the
  // same API process alive (the default outside CI); six local runs of this file within an hour is
  // enough. Measured: the sixth produced a 429 and an empty outbox.
  const [requested] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/auth/request')),
    page.getByRole('button', { name: COPY.submit }).click(),
  ]);
  expect(
    requested.status(),
    'POST /api/auth/request. A 429 here is § 7.5s "5 per hour per email" budget, spent by earlier runs against this same API process — restart it (or run with CI=1, which disables reuseExistingServer).',
  ).toBe(200);
  await expect(page.getByText(COPY.sent(JAMIE), { exact: true })).toBeVisible();

  // "the test mailbox receives ONE message". Exactly one NEW message (see `outbox`): two would mean
  // a learner holding two live links, the second of which reports `used` after they click the first.
  const after = await outbox();
  expect(after.length - before.length, 'messages this one request produced').toBe(1);
  const message = after[after.length - 1]!;
  expect(message.template).toBe('sign-in');
  expect(message.to).toBe(JAMIE);

  // The link comes out of the rendered BODY, which is the only copy a learner has. A template that
  // started emitting a relative href would pass every status-code assertion and leave a dead
  // button in the inbox; this fails instead.
  const html = message.html ?? '';
  const link = new RegExp(`${HTTP_BASE}/sign-in\\?token=[A-Za-z0-9\\-._~%]+`).exec(html)?.[0];
  expect(link, `no ${HTTP_BASE}/sign-in?token=… link in the email. Body began: ${html.slice(0, 300)}`).toBeTruthy();

  // ---- clicking it lands on `/` ---------------------------------------------------------------
  await page.goto(link!);
  // `SignIn.tsx` navigates with `replace`, so the spent token is not left in the history.
  await expect(page).toHaveURL(`${HTTP_BASE}/`);
  await page.locator('[data-app-ready="true"]').waitFor();
  // The dashboard, as Jamie: the shell's own landmark plus the signed-in learner's name. Asserting
  // the name and not just the landmark is what distinguishes "the dashboard rendered" from "the
  // dashboard rendered for somebody" — and from a silent bounce back to /sign-in, which is what a
  // 401 on `/api/snapshot` would produce (`data/http.ts` → `location.assign('/sign-in')`).
  const sidebar = page.locator('aside[aria-label="Primary"]');
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByText('Jamie Ortiz')).toBeVisible();

  // ---- clicking it again shows § 7.5's single-use copy ----------------------------------------
  // A second page with the cookies cleared, so this is the LINK being spent rather than a
  // signed-in viewer reloading it: the second click in real life is usually from the other device
  // the learner opened the email on.
  const other = await freshPage();
  await other.goto(link!);
  await other.locator('[data-app-ready="true"]').waitFor();
  // The sentence, not the code. The API answers `{ error: 'used' }` and the screen owns the copy —
  // which is why this assertion lives in a browser and `apps/api/test/signin.test.ts` asserts the
  // code instead.
  await expect(other.getByRole('alert')).toHaveText(COPY.used);
  // And it is back on the form, so "Request a new one." is something the viewer can actually do.
  await expect(other.getByRole('heading', { level: 1 })).toHaveText(COPY.h1);
  await expect(other.getByRole('button', { name: COPY.submit })).toBeEnabled();
  await other.close();
  await page.close();
});
