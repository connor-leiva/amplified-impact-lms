import { readFile } from 'node:fs/promises';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-241: Admin › Workspaces › a team › Intake has Download PDF beside View intake. It asks the team's intake PDF
 * (`GET /api/console/workspaces/:teamId/intake/pdf`, audited as `intake.pdf`) and the browser saves it under the
 * route's name. In the fixture build the Console fixture answers a one-page stand-in under that name (the real file
 * is printed on the server). The audit row is the unit tests' (`apps/web/src/data/console.test.ts`, the API's
 * `apps/api/test/intake.test.ts`).
 */

const NOW = '2026-12-10T09:30:00-07:00';

async function openAt(browser: Browser, path: string, width: number): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Phoenix', viewport: { width, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.addInitScript(() =>
    localStorage.setItem('ai-lms-prefs', JSON.stringify({ phase: 'live', theme: 'light', tz: null, sidebar: 'full' })),
  );
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const intakeCard = (page: Page) => page.locator('main section').filter({ has: page.getByRole('heading', { level: 2, name: 'Intake' }) });

test.describe('a Workspace’s intake PDF (D-241) @g9 @console', () => {
  for (const width of [1280, 390])
    test(`Download PDF sits beside View intake and saves the team’s PDF, at ${width}`, async ({ browser }) => {
      const { page, close } = await openAt(browser, '/admin/workspaces/ws_northshore', width);
      const card = intakeCard(page);
      const view = card.getByRole('button', { name: 'View intake' });
      const pdf = card.getByRole('button', { name: 'Download PDF' });
      await expect(view).toBeVisible();
      await expect(pdf).toBeVisible();
      // Beside it: the same row of the card's header, after View intake.
      const [a, b] = [await view.boundingBox(), await pdf.boundingBox()];
      expect(b!.x).toBeGreaterThan(a!.x);
      expect(Math.abs(b!.y - a!.y)).toBeLessThan(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expectAccessible(page);

      const [download] = await Promise.all([page.waitForEvent('download'), pdf.click()]);
      expect(download.suggestedFilename()).toBe('Week 0 Intake - Northshore Group.pdf');
      const file = await download.path();
      expect((await readFile(file!)).subarray(0, 5).toString('latin1')).toBe('%PDF-');
      await expect(pdf).toBeEnabled();
      await close();
    });
});
