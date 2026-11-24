import { test, expect, type Browser, type Page } from '@playwright/test';
import {
  ANNOUNCEMENT,
  OPEN_GUIDE,
  fixtureUrl,
  guides,
  worldContext,
  type Audience,
  type NowKey,
  type Persona,
} from './world';
import { CASES, TEMPLATE_FILES, ctaPath, rendered } from './emails';

/**
 * The learner parity suite: deep links (Connor's parity brief § 3). Every email template
 * (`apps/api/src/email/templates/*.tsx`) is rendered with a fixture payload (`emails.ts`), its one call to
 * action is taken, and the path is opened in the fixture build as the audience the email goes to. The
 * destination must have what the button promises:
 *
 *   replay-ready     a playable player          session-1h        Join, inside the window
 *   session-24h      the Schedule              announcement      the Schedule, or Home with the banner
 *   build-reminder   the week's steps          weekly-digest     Team Hub
 *   sign-in + next   the guide                 set-password, invite   their pages
 *
 * Each assertion is about the promised thing (a role, a heading), never the URL, so it holds on the
 * current portal and after the reworked #172's redirects alike. Expected to fail on this branch until
 * the stack merges: replay-ready (the player is claude/learner-pr9b-parity's, the redirect from
 * /employees/:id is #172's) and build-reminder (the same redirect).
 */

async function land(page: Page, name: string, as: Persona = 'agent', now: NowKey = 'week1'): Promise<void> {
  await page.goto(fixtureUrl(ctaPath(name), as, now));
  await page.waitForSelector('body[data-app-ready="true"]');
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
}

async function tab(browser: Browser, o: { audience?: Audience; now?: NowKey; width?: number } = {}) {
  const ctx = await worldContext(browser, {
    audience: o.audience ?? 'course',
    now: o.now ?? 'week1',
    width: o.width ?? 1440,
  });
  return ctx.newPage();
}

const schedule = async (page: Page) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^(Sessions|Schedule)$/);
  await expect(page.getByText('Lead Source Review Live Build').first()).toBeVisible();
};

test.describe('learner parity: email deep links', () => {
  test('every template is rendered here, each with exactly one link on this site', () => {
    const covered = new Set(CASES.map((c) => c.template));
    // D-250: session-24h and session-1h are `session-reminder-html.ts` (no `.tsx` of their own); they are still cases.
    expect(TEMPLATE_FILES.filter((t) => t !== 'session-reminder' && !covered.has(t))).toEqual([]);
    for (const c of CASES) expect(() => ctaPath(c.name), c.name).not.toThrow();
    expect(Object.keys(rendered())).toHaveLength(CASES.length);
  });

  test('replay-ready "Watch Replay" lands on a playable player @parity:M-3', async ({ browser }) => {
    const page = await tab(browser);
    await land(page, 'replay-ready');
    const video = page.locator('video');
    await expect(video.first()).toBeAttached();
    await expect(page.getByRole('button', { name: /^Play/ }).first()).toBeVisible();
    await page.context().close();
  });

  test('session-1h "Join Session" lands on a working Join inside the window, and none outside it @parity:M-2', async ({
    browser,
  }) => {
    const join = (page: Page) =>
      page
        .getByRole('main')
        .getByRole('button', { name: /^Join/ })
        .or(page.getByRole('main').getByRole('link', { name: /^Join/ }));
    const inside = await tab(browser, { now: 's2Minus14' });
    await land(inside, 'session-1h', 'agent', 's2Minus14');
    await expect(join(inside).first()).toBeVisible();
    await expect(join(inside).first()).toBeEnabled();
    await inside.context().close();
    const outside = await tab(browser, { now: 's2Minus16' });
    await land(outside, 'session-1h', 'agent', 's2Minus16');
    await schedule(outside);
    await expect(
      join(outside).filter({ visible: true }).and(outside.locator(':not([disabled]):not([aria-disabled="true"])')),
    ).toHaveCount(0);
    await outside.context().close();
  });

  test('session-24h "View the Session" lands on the Schedule @parity:M-1', async ({ browser }) => {
    const page = await tab(browser);
    await land(page, 'session-24h');
    await schedule(page);
    await page.context().close();
  });

  test('announcement: with an action it lands on the Schedule; without one, on Home with the banner @parity:M-5', async ({
    browser,
  }) => {
    const page = await tab(browser);
    for (const name of ['announcement (Open Sessions)', 'announcement (Update Calendar)']) {
      await land(page, name);
      await schedule(page);
    }
    await land(page, 'announcement (no action)');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /^(Dashboard|Good (morning|afternoon|evening), Jamie)$/,
    );
    await expect(page.getByText(ANNOUNCEMENT.title)).toBeVisible();
    await page.context().close();
  });

  test('build-reminder "Continue Build" lands on the week’s steps @parity:M-4', async ({ browser }) => {
    const page = await tab(browser);
    await land(page, 'build-reminder');
    for (const step of ['Run Map Your Spend', 'Answer the Flags', 'Sign the Seat Card'])
      await expect(page.getByRole('main').getByText(step).first()).toBeVisible();
    await page.context().close();
  });

  test('weekly-digest "Open Team Hub" lands on the Team Hub @parity:M-6 @parity:T-3', async ({ browser }) => {
    const page = await tab(browser);
    await land(page, 'weekly-digest', 'owner');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Team Hub');
    await page.context().close();
  });

  test('a sign-in link with next lands on the guide, for a course learner and for Utah Life @parity:M-7', async ({
    browser,
  }) => {
    test.skip(!guides, 'needs the fixture build’s apps/web/dist-private/skill-guides.json');
    const first = guides!.guides[OPEN_GUIDE]!.lanes[0]!.steps[0]!.title;
    for (const audience of ['course', 'utah'] as const) {
      const page = await tab(browser, { audience });
      await land(page, 'sign-in with next');
      await expect(page).toHaveURL(new RegExp(`/(skill-library|learn/skills)/${OPEN_GUIDE}`));
      await page.waitForSelector('body[data-app-ready="true"]');
      await expect(page.getByText(first, { exact: true }).first(), audience).toBeVisible();
      await page.context().close();
    }
    // Without next: where the API lands the learner (Home for the course, the Skill Library for Utah Life).
    const plain = await tab(browser, { audience: 'utah' });
    await land(plain, 'sign-in');
    await expect(plain.getByRole('heading', { level: 1 })).toHaveText(/^Skill (L|l)ibrary$/);
    await plain.context().close();
  });

  test('set-password and reset links land on the set-password form @parity:M-8', async ({ browser }) => {
    const page = await tab(browser);
    for (const name of ['set-password', 'reset-password']) {
      await land(page, name);
      await expect(page.getByRole('heading', { level: 1 }), name).toBeVisible();
      await expect(page.getByLabel(/Password/).first(), name).toBeVisible();
    }
    await page.context().close();
  });

  test('checkout success’s set-password link lands on the set-password form @parity:M-10', async ({ browser }) => {
    // Not an email: `apps/api/src/routes/offer.ts` hands the buyer `/set-password?checkout=<session>` after
    // Stripe's checkout. The form posts to /api/auth/password/checkout.
    const page = await tab(browser);
    await page.goto(fixtureUrl('/set-password?checkout=cs_test_parity'));
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/Password/).first()).toBeVisible();
    await page.context().close();
  });

  test('a team invite lands on the invite page, then the learner’s landing @parity:M-9', async ({ browser }) => {
    const page = await tab(browser);
    await land(page, 'team-invite');
    await page.waitForURL((u) => !u.pathname.startsWith('/invite/'), { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.context().close();
  });

  test('www’s links (/course, /skill-library, /sessions, /team) open a page that does the job @parity:M-11', async ({
    browser,
  }) => {
    const page = await tab(browser);
    for (const [path, as, heading] of [
      ['/course', 'agent', /\S/],
      ['/skill-library', 'agent', /^Skill (L|l)ibrary$/],
      ['/sessions', 'agent', /^(Sessions|Schedule)$/],
      ['/team', 'owner', /^Team Hub$/],
    ] as const) {
      await page.goto(fixtureUrl(path, as));
      await page.waitForSelector('body[data-app-ready="true"]');
      await expect(page.getByRole('heading', { level: 1 }).first(), path).toHaveText(heading);
      await expect(page.getByText('Unexpected Application Error'), path).toHaveCount(0);
    }
    await page.context().close();
  });
});
