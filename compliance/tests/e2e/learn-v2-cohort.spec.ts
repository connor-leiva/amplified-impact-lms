import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
// The course as the API sends it for each cohort, and the fixture's own snapshot (relative: `compliance/` can't resolve
// `@ai/core`).
import { createCohortFromShape } from '../../../packages/core/src/cohort-actions';
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { DB_KEY } from '../../../packages/core/src/constants';
import { seed } from '../../../packages/core/src/seed';
import type { Db } from '../../../packages/core/src/types';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

// R-5 Phase 4 (D-261): the learner portal reads its own cohort. In the flag-on fixture build (`pnpm e2e:learn`), with
// `GET /api/course` answered as the API answers each cohort's learner (Connor's January, made by the real admin
// action, and December), and the fixture's learner placed in that cohort:
//   - the January learner sees January's weeks (1 to 6) on January's dates, its own cadence, and its own calendar file;
//     a week January doesn't take is no page of theirs, by its address or by an old `/employees/:id` one;
//   - the December learner sees December, as before.
// The API's own proof (each refused the other's sessions, threads, files and replays) is `apps/api/test/
// learner-cohort.test.ts`; this is what the screens draw from it.

const NOW = '2026-11-25T12:00:00-07:00';
const at = Date.parse(NOW);
const deployed = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const made = createCohortFromShape(
  deployed,
  { kind: 'staff', staffId: 'st_owner' },
  {
    name: 'January 2027 Cohort',
    start: '2027-01-03',
    sourceCohortId: 'dec26',
    picks: [1, 2, 3, 4, 5, 6].map((n) => `accelerator-week-${n}`),
    shape: {
      setupWeek: true,
      slots: [
        { day: 2, time: '12:00', kind: 'live_build', mins: 90 },
        { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
      ],
      hosts: 'Connor Leiva and Spring',
    },
  },
  { now: at, id: ((n) => (p: string) => `${p}_e${n++}`)(1) },
);
const both = made.db;
const JAN = made.cohort!.cohortId;

const payloadOf = (cohortId: string) => ({
  open: true,
  preview: false,
  prelaunch: true,
  course: courseFor(both, at, { open: true, preview: true }, cohortId),
  sessions: courseSessions(both, cohortId),
  copy: Object.fromEntries((both.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value])),
});

/** The fixture's snapshot with its learner (Jamie) in a cohort: January's row and sessions added when it is January. */
function snapshotIn(cohortId: string): string {
  const db: Db = seed('live');
  if (cohortId !== 'dec26') {
    db.cohorts.push(both.cohorts.find((c) => c.id === cohortId)!);
    db.sessions.push(...both.sessions.filter((s) => s.cohortId === cohortId));
  }
  db.users = db.users.map((u) => (u.id === 'u_jamie' ? { ...u, cohortId } : u));
  return JSON.stringify(db);
}

async function visit(browser: Browser, cohortId: string, path: string, width = 1440): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'America/Denver' });
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [DB_KEY, snapshotIn(cohortId)] as const);
  const page = await ctx.newPage();
  const payload = payloadOf(cohortId);
  await page.route('**/api/course', (r) => r.fulfill({ json: payload }));
  const [where, hash = ''] = path.split('#');
  await page.goto(`${APP_BASE}${where}${where!.includes('?') ? '&' : '?'}as=agent&now=${encodeURIComponent(NOW)}${hash ? `#${hash}` : ''}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  return page;
}

const pathOf = (page: Page): string => new URL(page.url()).pathname;
const title = (n: number): string => deployed.modules.find((m) => m.id === `accelerator-week-${n}`)!.course!.title;

test.describe('the learner portal reads its own cohort (R-5 Phase 4) @g9', () => {
  test('January’s learner: January’s schedule, its cadence and its own calendar file', async ({ browser }) => {
    const page = await visit(browser, JAN, '/learn/schedule');
    const main = page.locator('main');
    await expect(main.getByText('Tue live build and Thu office hours')).toBeVisible();
    await expect(main).toContainText('Tue, Jan 5');
    await expect(main).not.toContainText('Wed, Dec 2');
    await expect(main.getByRole('link', { name: 'Add all to calendar' })).toHaveAttribute('href', `/calendar/schedule.ics?cohort=${JAN}`);
    await expectAccessible(page);
    await page.context().close();
  });

  test('December’s learner: December’s schedule and the welcome page’s calendar file, as before', async ({ browser }) => {
    const page = await visit(browser, 'dec26', '/learn/schedule');
    const main = page.locator('main');
    await expect(main).toContainText('Wed, Dec 2');
    await expect(main).not.toContainText('Tue, Jan 5');
    await expect(main.getByRole('link', { name: 'Add all to calendar' })).toHaveAttribute('href', '/calendar/schedule.ics');
    await page.context().close();
  });

  test('January’s weeks are 1 to 6: /course/week-3 is its third week, and a week it doesn’t take is no page of theirs', async ({ browser }) => {
    const page = await visit(browser, JAN, '/course/week-3');
    await expect.poll(() => pathOf(page)).toBe('/learn/week/3');
    await expect(page.locator('h1')).toContainText(title(3));
    await page.context().close();

    const seven = await visit(browser, JAN, '/learn/week/7');
    await expect.poll(() => pathOf(seven)).toBe('/learn');
    await seven.context().close();

    const old = await visit(browser, JAN, '/employees/accelerator-week-7');
    await expect.poll(() => pathOf(old)).toBe('/learn');
    await old.context().close();
  });

  test('December’s weeks are 0 to 8, as before', async ({ browser }) => {
    const old = await visit(browser, 'dec26', '/employees/accelerator-week-7');
    await expect.poll(() => pathOf(old)).toBe('/learn/week/7');
    await expect(old.locator('h1')).toContainText(title(7));
    await old.context().close();
  });

  test('January’s schedule on a phone: accessible, nothing sideways', async ({ browser }) => {
    const page = await visit(browser, JAN, '/learn/schedule', 390);
    await expectAccessible(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.context().close();
  });
});
