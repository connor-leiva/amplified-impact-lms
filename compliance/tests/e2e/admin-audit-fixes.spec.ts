import { test, expect, type Browser, type Page } from '@playwright/test';
import { expectAccessible } from '../../lib/a11y';
import { APP_BASE, PARITY_NOW, PARITY_QUERY, PARITY_TZ } from '../../lib/admin-r2';

/**
 * R-5 audit (D-267, Connor, Nov 26), in the fixture build:
 *
 *   - People › Utah Life: the access group's own tab, named by the group, read-only: each agent's line over their address
 *     and when they were last active or "Invite pending"; a row opens the person. axe at 1280 and 390.
 *   - January's Cohort head and its Opens fact: Week 0's and Week 1's openings before Week 1 opens.
 *   - The Overview's header and its tiles for the selected cohort; Build completion opens the builds.
 *   - Cohort › Announcements and Community are each cohort's own: an announcement made on January's tab stays on
 *     January's list, and January's Community holds none of December's threads.
 *   - The admin prints no "MST", and every time is MT with CT after it, "Dec 9, 9:14 PM MT / 10:14 PM CT" (Connor's rule,
 *     PR #286's review): a session, an event's stamp, a table's stamp. A table's narrow column draws it on two lines.
 *
 * The roster itself (who counts in a cohort) is the API's (`apps/api/test/cohort-roster.test.ts`); the fixture has no
 * plans, so its screens read the learners' rows as before.
 */

async function parity(
  browser: Browser,
  path: string,
  width = 1280,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({
    timezoneId: PARITY_TZ,
    locale: 'en-US',
    viewport: { width, height: width < 768 ? 844 : 900 },
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(PARITY_NOW));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}${PARITY_QUERY}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const NOW = '2026-12-10T16:30:00.000Z';
async function fixture(
  browser: Browser,
  path: string,
  width = 1280,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({
    timezoneId: 'America/Denver',
    viewport: { width, height: width < 768 ? 844 : 900 },
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin&now=${encodeURIComponent(NOW)}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

test.describe('the R-5 audit fixes (D-267) @console', () => {
  test('People › Utah Life: the group’s tab, its agents, Invite pending, and a row opens the person', async ({
    browser,
  }) => {
    for (const width of [1280, 390]) {
      const { page, close } = await parity(browser, '/admin/people/groups/utah-life', width);
      const main = page.locator('main');
      await expect(main).toContainText(
        'Agents with a liveutah.com address get the Agent Plan’s skills at no charge. They are counted here: not in a cohort, not as teams, and not in revenue.',
      );
      if (width > 768) {
        const tab = main.getByRole('tab', { name: /^Utah Life/ });
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        await expect(tab).toContainText('8');
        await expect(main.getByRole('tab')).toHaveText(['Everyone', 'Teams', 'Utah Life8', 'Masquerade']);
      }
      await expect(main.getByText('k••••@liveutah.com')).toBeVisible();
      await expect(main.getByText('Invite pending')).toBeVisible();
      await expect(main.getByText('Dec 10, 8:02 AM MT / 9:02 AM CT')).toBeVisible();
      await expect(page.locator('header nav[aria-label="Breadcrumb"]')).toContainText('Utah Life');
      await expectAccessible(page);
      if (width > 768) {
        await main.getByText('a•••••@liveutah.com').click();
        await expect(page).toHaveURL(/\/admin\/people\/u_ul1(\?|$)/);
      }
      await close();
    }
  });

  test('Find narrows the agents; an unknown group is the Console’s 404', async ({ browser }) => {
    const { page, close } = await parity(browser, '/admin/people/groups/utah-life');
    await page.getByLabel('Find an agent by email').fill('t••');
    await expect(page.locator('main').getByText('t••••••@liveutah.com')).toBeVisible();
    await expect(page.locator('main').getByText('a•••••@liveutah.com')).toHaveCount(0);
    await page.goto(`${APP_BASE}/admin/people/groups/nope?${PARITY_QUERY}`);
    await page.locator('body[data-app-ready="true"]').waitFor();
    await expect(page.locator('main')).not.toContainText('Find an agent by email');
    await close();
  });

  test('January’s head and Opens fact name Week 0’s and Week 1’s openings before Week 1 opens', async ({ browser }) => {
    const { page, close } = await parity(browser, '/admin/cohort/jan27', 1440);
    await expect(page.locator('main')).toContainText(
      'Amplified AI Accelerator · 6 weeks of building · twice a week · Week 0 opens Sun, Dec 27 · Week 1 opens Sun, Jan 3',
    );
    await expect(page.locator('main').getByRole('link', { name: /^Opens/ })).toContainText(
      'Sun, Jan 3 · 12:00 PM MT / 1:00 PM CT',
    );
    await close();
  });

  test('the Overview reports on the selected cohort, and Build completion opens the builds', async ({ browser }) => {
    const { page, close } = await parity(browser, '/admin', 1440);
    await expect(page.locator('main')).toContainText(
      'December 2026 Cohort · Week 2 of 6 · Updated live from learner activity',
    );
    await expect(page.locator('main a').filter({ hasText: 'Active learners' })).toHaveAttribute(
      'href',
      '/admin/cohort/dec26/people',
    );
    await page.locator('main a').filter({ hasText: 'Build completion' }).click();
    await expect(page).toHaveURL(/\/admin\/program(\?|$)/);
    await close();
  });

  test('an announcement made on January’s tab is January’s; Community lists each cohort’s own threads', async ({
    browser,
  }) => {
    const { page, close } = await fixture(browser, '/admin/cohort/feb27/announcements', 1440);
    const before = await page.locator('main').getByRole('row').count();
    await page.getByRole('button', { name: 'New announcement' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('February office hours move');
    await dialog.getByLabel('Message').fill('Thursday at 1:00 PM MT.');
    await dialog.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.locator('main')).toContainText('February office hours move');
    expect(await page.locator('main').getByRole('row').count()).toBe(before + 1);
    await page.goto(`${APP_BASE}/admin/cohort/dec26/announcements?as=admin&now=${encodeURIComponent(NOW)}`);
    await page.locator('body[data-app-ready="true"]').waitFor();
    await expect(page.locator('main')).not.toContainText('February office hours move');
    await close();

    const dec = await fixture(browser, '/admin/cohort/dec26/community', 1440);
    await expect(dec.page.locator('main').getByRole('row').first()).toBeVisible();
    await dec.close();
    const feb = await fixture(browser, '/admin/cohort/feb27/community', 1440);
    await expect(feb.page.locator('main')).toContainText('No threads');
    await feb.close();
  });

  test('the admin prints no MST, and every time is MT with CT after it: a session, an event, a table', async ({
    browser,
  }) => {
    // Thirty-one screens, one after another.
    test.setTimeout(300_000);
    // Every R2 screen that prints a time, on the mockup's data. A time is "9:14 PM MT / 10:14 PM CT" (or "12 PM MT / 1 PM
    // CT" on a session chip), Central's day before its time where it differs; a time picker's options are a form's.
    const PAIR =
      /\d{1,2}(?::\d{2})? [AP]M MT \/ (?:[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, )?\d{1,2}(?::\d{2})? [AP]M CT/g;
    const TIME = /\d{1,2}(?::\d{2})? [AP]M\b/g;
    for (const path of [
      '/admin',
      '/admin/program',
      // D-265 (R-5 Phase 6): a week's Basics (Where It Runs) and Live Sessions, Course Settings, the Vault, Submissions.
      '/admin/program/weeks/accelerator-week-1?section=basics',
      '/admin/program/weeks/accelerator-week-1?section=live',
      '/admin/program/course',
      '/admin/program/course?section=before',
      '/admin/program/vault',
      '/admin/cohort/dec26/submissions',
      '/admin/cohort/dec26/schedule',
      '/admin/cohort/dec26/announcements',
      '/admin/cohort/dec26/people',
      '/admin/cohort/new',
      '/admin/people',
      '/admin/people/u_1042',
      '/admin/people/teams',
      '/admin/people/teams/ws_northshore',
      '/admin/people/groups/utah-life',
      '/admin/people/masquerade',
      '/admin/revenue/plans',
      '/admin/audit',
      '/admin/roles',
      '/admin/api/hooks',
      '/admin/revenue/payments',
      '/admin/jobs',
      '/admin/email',
      '/admin/health',
      '/admin/incidents',
      '/admin/incidents/INC-0007',
      '/admin/integrations',
      '/admin/deploys',
      '/admin/db',
    ]) {
      const { page, close } = await parity(browser, path, 1440);
      await page.locator('main').waitFor();
      await expect(page.locator('main'), path).not.toContainText('MST');
      const words = await page.locator('main').evaluate((m) => {
        const c = m.cloneNode(true) as HTMLElement;
        c.querySelectorAll('select, option, input, textarea').forEach((e) => e.remove());
        return c.textContent ?? '';
      });
      expect(words.replace(PAIR, '').match(TIME) ?? [], path).toEqual([]);
      await close();
    }
    const { page, close } = await parity(browser, '/admin/incidents/INC-0007', 1440);
    await expect(page.locator('main')).toContainText('Dec 9, 9:14 PM MT / 10:14 PM CT');
    await close();
  });
});
