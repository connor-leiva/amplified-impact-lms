// R-5 audit fixes (D-267): every screen this change touches, fixture build (README.md). Each at 1440 and 390, and a page
// with a table at 1280 and 1024 too; device scale 2, America/Denver; a page is its whole length, a dialog the viewport at
// the page top with it open.
//
//   pnpm --filter @ai/web preview:fixture   # on :4173
//   npx playwright test -c handoff/admin-mockup/compare/r5-audit-fixes/shoot.config.ts
import { test, type Browser, type BrowserContextOptions, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { APP_BASE } from '../../../../compliance/lib/prepare';
import { PARITY_NOW, PARITY_QUERY } from '../../../../compliance/lib/admin-r2';
import { launchDb } from '../../../../compliance/lib/launch-db';
import { FIXTURE_FACTS_KEY, withJanuary } from '../../../../compliance/lib/selling-world';
import { DB_KEY } from '../../../../packages/core/src/constants';
import type { Db } from '../../../../packages/core/src/types';

const OUT = fileURLToPath(new URL('.', import.meta.url));
const PHONE_AND_DESK = [1440, 390];
const TABLE = [1440, 1280, 1024, 390];
/** Fri, Nov 27, 2026, 12:00 PM MT: Week 0 open, Week 1 not yet. */
const NOV27 = '2026-11-27T19:00:00.000Z';
/** Thu, Dec 10, 2026, 9:30 AM MT: Week 2 running. */
const DEC10 = '2026-12-10T16:30:00.000Z';

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}
async function shootPage(page: Page, name: string, width: number): Promise<void> {
  await settle(page);
  // The admin frame scrolls inside itself, so the page's whole length is its tallest scroller's: the viewport grows to it.
  const view = page.viewportSize()!;
  const tall = await page.evaluate(() =>
    Math.max(
      document.documentElement.scrollHeight,
      ...[...document.querySelectorAll<HTMLElement>('*')]
        .filter((e) => e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY))
        .map((e) => e.scrollHeight + e.getBoundingClientRect().top),
    ),
  );
  await page.setViewportSize({ width: view.width, height: Math.max(view.height, Math.ceil(tall)) });
  await settle(page);
  await page.screenshot({ path: `${OUT}${name}-${width}.png`, fullPage: true });
  await page.setViewportSize(view);
}
async function shootDialog(page: Page, name: string, width: number): Promise<void> {
  await settle(page);
  await page.screenshot({ path: `${OUT}${name}-${width}.png` });
}

/** The fixture build on a database of our own (the launch database, or another), as the admin, at an instant. */
async function openDb(
  browser: Browser,
  path: string,
  o: { db: Db; now: string; width: number; facts?: Record<string, unknown>; as?: string },
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context: BrowserContextOptions = { timezoneId: 'America/Denver', viewport: { width: o.width, height: o.width < 768 ? 844 : 900 }, deviceScaleFactor: 2 };
  const ctx = await browser.newContext(context);
  await ctx.addInitScript(
    ({ key, db, factsKey, facts }) => {
      try {
        if (!sessionStorage.getItem('shoot-db')) {
          localStorage.setItem(key, db);
          if (facts) localStorage.setItem(factsKey, facts);
          sessionStorage.setItem('shoot-db', '1');
        }
      } catch {
        /* storage unavailable */
      }
    },
    { key: DB_KEY, db: JSON.stringify(o.db), factsKey: FIXTURE_FACTS_KEY, facts: o.facts ? JSON.stringify(o.facts) : null },
  );
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(o.now));
  await page.goto(`${APP_BASE}${path}?as=${o.as ?? 'admin'}&now=${encodeURIComponent(o.now)}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}
/** The R2 parity world (the mockup's data), as the admin, at its instant. */
async function openParity(browser: Browser, path: string, width: number): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Denver', viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(PARITY_NOW));
  await page.goto(`${APP_BASE}${path}?${PARITY_QUERY}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}
/** The fixture's own demo world, as a persona, at an instant. */
async function openDemo(browser: Browser, path: string, width: number, as: string, now = DEC10): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Denver', viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(now));
  await page.goto(`${APP_BASE}${path}?as=${as}&now=${encodeURIComponent(now)}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

/** December's facts as the API would answer once teams are in it: second payments still to come (Needs You). */
const decemberFacts = { dec26: { teams: 7, learners: 15, intakeNotStarted: 2, signedIn: 6, intakeSubmitted: 3, paidInFull: 5, secondPayments: { count: 2, each: 375000, next: Date.parse('2026-12-30T12:00:00-07:00') } } };

test.describe.configure({ mode: 'serial' });

test('the Overview and the Cohort head, before Week 1 opens and once it has (launch database)', async ({ browser }) => {
  for (const width of PHONE_AND_DESK) {
    let o = await openDb(browser, '/admin', { db: launchDb(), now: NOV27, width });
    await shootPage(o.page, 'overview-before-week1', width);
    await o.close();
    o = await openDb(browser, '/admin/cohort/dec26', { db: launchDb(), now: NOV27, width, facts: decemberFacts });
    await shootPage(o.page, 'december-overview-before-week1', width);
    await o.close();
    o = await openDb(browser, '/admin/cohort/dec26', { db: launchDb(), now: DEC10, width, facts: decemberFacts });
    await shootPage(o.page, 'december-overview-week2', width);
    await o.close();
    o = await openDb(browser, '/admin', { db: launchDb(), now: DEC10, width });
    await shootPage(o.page, 'overview-week2', width);
    await o.close();
    const jan = withJanuary();
    o = await openDb(browser, `/admin/cohort/${jan.id}`, { db: jan.db, now: NOV27, width });
    await shootPage(o.page, 'january-overview', width);
    await o.close();
  }
});

test('Cohort › Schedule, People, Community and Announcements', async ({ browser }) => {
  for (const width of TABLE) {
    let o = await openParity(browser, '/admin/cohort/dec26/schedule', width);
    await shootPage(o.page, 'december-schedule', width);
    await o.close();
    o = await openParity(browser, '/admin/cohort/dec26/people', width);
    await shootPage(o.page, 'december-people', width);
    await o.close();
    o = await openDemo(browser, '/admin/cohort/dec26/community', width, 'admin');
    await shootPage(o.page, 'december-community', width);
    await o.close();
    o = await openDemo(browser, '/admin/cohort/feb27/community', width, 'admin');
    await shootPage(o.page, 'february-community', width);
    await o.close();
    o = await openDemo(browser, '/admin/cohort/feb27/announcements', width, 'admin');
    await o.page.getByRole('button', { name: 'New announcement' }).click();
    const dialog = o.page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('February office hours move');
    await dialog.getByLabel('Message').fill('Thursday at 1:00 PM MT.');
    if (width === 1440 || width === 390) await shootDialog(o.page, 'february-announcement-dialog', width);
    await dialog.getByRole('button', { name: 'Save draft' }).click();
    await o.page.getByRole('dialog').waitFor({ state: 'detached' });
    await o.page.waitForTimeout(2500);
    await shootPage(o.page, 'february-announcements', width);
    await o.close();
    o = await openDemo(browser, '/admin/cohort/dec26/announcements', width, 'admin');
    await shootPage(o.page, 'december-announcements', width);
    await o.close();
  }
});

test('People › Utah Life', async ({ browser }) => {
  for (const width of TABLE) {
    let o = await openParity(browser, '/admin/people/groups/utah-life', width);
    await shootPage(o.page, 'people-utah-life', width);
    await o.close();
    o = await openParity(browser, '/admin/people/teams', width);
    await shootPage(o.page, 'people-teams', width);
    await o.close();
  }
});

test('MT / CT where the admin printed MST', async ({ browser }) => {
  for (const width of TABLE) {
    for (const [path, name] of [
      ['/admin/program', 'program-curriculum'],
      ['/admin/audit', 'audit-log'],
      ['/admin/email', 'email-log'],
    ] as const) {
      const o = await openParity(browser, path, width);
      await shootPage(o.page, name, width);
      await o.close();
    }
  }
  for (const width of PHONE_AND_DESK) {
    let o = await openParity(browser, '/admin/health', width);
    await shootPage(o.page, 'system-health', width);
    await o.close();
    o = await openParity(browser, '/admin/incidents/INC-0007', width);
    await shootPage(o.page, 'incident', width);
    await o.close();
    o = await openParity(browser, '/admin/email', width);
    await o.page.locator('main').getByText('Tomorrow at 12:00 PM MT / 1:00 PM CT: Session 2 live build').first().click();
    await o.page.getByRole('dialog').waitFor();
    await shootDialog(o.page, 'email-detail', width);
    await o.close();
    o = await openParity(browser, '/admin/audit', width);
    await o.page.getByRole('button', { name: 'View the entry from Dec 9, 9:27 PM' }).click();
    await o.page.locator('[data-drawer="open"]').waitFor();
    await shootDialog(o.page, 'audit-detail', width);
    await o.close();
  }
});

test('Team Hub reads its cohort’s name', async ({ browser }) => {
  for (const width of PHONE_AND_DESK) {
    const o = await openDemo(browser, '/team', width, 'owner');
    await shootPage(o.page, 'team-hub', width);
    await o.close();
  }
});
