import type { Browser, BrowserContextOptions, Page } from '@playwright/test';
import { APP_BASE } from './prepare';
import { launchDb } from './launch-db';
import { DB_KEY } from '../../packages/core/src/constants';
import { ACCELERATOR_MODULE_IDS, DEFAULT_COHORT_ID } from '../../packages/core/src/accelerator';
import { createCohortFromShape, keepCohortOverlap, saveCohortWords } from '../../packages/core/src/cohort-actions';
import type { Actor, Ctx } from '../../packages/core/src/mutations';
import type { Db } from '../../packages/core/src/types';

// D-262 (R-5 Phase 5): the world the selling e2e spec and Phase 5's screenshots share. The launch database
// (`launch-db.ts`) with Connor's January made in it, every Before It Opens line done but its two Stripe lines, and
// the fixture's Stripe answering for January's keys and links once they are entered (`FIXTURE_FACTS_KEY`, read by
// `apps/web/src/data/fixture-cohort-facts.ts`). Test-only: the fixture build, `?as=admin`.

/** Fri, Nov 27, 2026, noon MT: Phase 5 deployed, December's founding still open. */
export const NOW = '2026-11-27T19:00:00.000Z';
export const OWNER: Actor = { kind: 'staff', staffId: 'st1' };
export const FIXTURE_FACTS_KEY = 'ai-fixture-cohort-facts';
export const JAN_LINKS = { full: 'https://buy.stripe.com/test_jan27_full', twoPay: 'https://buy.stripe.com/test_jan27_two' };
export const JAN_KEYS = { full: 'jan27_founding_full', rollover: 'membership_monthly_team_leader', twoPay: 'jan27_founding_two_pay' };

/** The launch database with Connor's January in it, ready to open but for its price and its Payment Links. */
export function withJanuary(): { db: Db; id: string } {
  let n = 1;
  const ctx: Ctx = { now: Date.parse(NOW), id: (p: string) => `${p}_p5${n++}` };
  const W = ACCELERATOR_MODULE_IDS;
  const made = createCohortFromShape(
    launchDb(),
    OWNER,
    {
      name: 'January 2027 Cohort',
      start: '2027-01-03',
      sourceCohortId: DEFAULT_COHORT_ID,
      picks: [W[1]!, W[2]!, W[3]!, W[4]!, W[5]!, W[6]!],
      shape: {
        setupWeek: true,
        slots: [
          { day: 2, time: '12:00', kind: 'live_build', mins: 90 },
          { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
        ],
        hosts: 'Connor Leiva and Spring',
      },
    },
    ctx,
  );
  const id = made.cohort!.cohortId;
  let db = keepCohortOverlap(made.db, OWNER, { cohortId: id }, ctx).db;
  db = saveCohortWords(db, OWNER, { cohortId: id, name: 'January 2027 Cohort', promise: 'Six weeks of building.', how: ['A week opens on Sunday.'], holiday: '' }, ctx).db;
  db = {
    ...db,
    // Week 0's due date (Settings › Dates and Release) and a Zoom link on each of its sessions.
    cohorts: db.cohorts.map((c) => (c.id === id ? { ...c, run: c.run!.map((w) => (w.n === 0 ? { ...w, dueAt: Date.parse('2027-01-03T12:00:00-07:00') } : w)) } : c)),
    sessions: db.sessions.map((s) => (s.cohortId === id ? { ...s, zoom: `https://zoom.example/j/${s.id}` } : s)),
  };
  return { db, id };
}

/** What the fixture's Stripe and test sends answer for January: its two test emails sent, its keys and links made. */
export const januaryFacts = (id: string) => ({
  [id]: {
    testSends: { welcome: true, week0: true },
    stripe: {
      prices: 'ok',
      price: {
        [JAN_KEYS.full]: { unitAmount: 750000, currency: 'usd', interval: null, intervalCount: null },
        [JAN_KEYS.rollover]: { unitAmount: 16900, currency: 'usd', interval: 'month', intervalCount: 1 },
        [JAN_KEYS.twoPay]: { unitAmount: 375000, currency: 'usd', interval: 'month', intervalCount: 1 },
      },
      links: 'ok',
      link: { [JAN_LINKS.full]: { active: true, aiCohort: id }, [JAN_LINKS.twoPay]: { active: true, aiCohort: id } },
    },
  },
});

export async function openAt(
  browser: Browser,
  path: string,
  { db, facts, width = 1280, context = {} }: { db: Db; facts?: Record<string, unknown>; width?: number; context?: BrowserContextOptions },
): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Denver', viewport: { width, height: width < 768 ? 844 : 900 }, ...context });
  // The database, stored as the fixture's own once per tab, so the tab's writes stay through its navigations.
  await ctx.addInitScript(
    ({ key, db, factsKey, facts }) => {
      try {
        if (!sessionStorage.getItem('launch-db')) {
          localStorage.setItem(key, db);
          if (facts) localStorage.setItem(factsKey, facts);
          sessionStorage.setItem('launch-db', '1');
        }
      } catch {
        /* storage unavailable */
      }
    },
    { key: DB_KEY, db: JSON.stringify(db), factsKey: FIXTURE_FACTS_KEY, facts: facts ? JSON.stringify(facts) : null },
  );
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin&now=${encodeURIComponent(NOW)}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}
