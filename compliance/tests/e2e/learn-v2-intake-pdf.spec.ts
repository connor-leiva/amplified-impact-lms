import { readFile } from 'node:fs/promises';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
// The course as the API sends it, built from the deployed seed with the Week 0 intake. `compliance/` can't resolve
// `@ai/core`, so these are relative; the seed's own imports are relative too.
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { WEEK0_INTAKE } from '../../../packages/core/seed/intake-v1';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';
import { WEEK0_MODULE_ID } from '../../../packages/core/seed/start-here-v1';

/**
 * D-246: on the intake page v3 doesn't draw for (`/learn/week/0/intake`), once the team has submitted, Download Your
 * Answers (PDF) saves the team's answers as a PDF. The page asks `GET /api/intake/pdf`, which takes the team from the
 * session: the request names no team. In the fixture build (learner v2 on) the reads are answered as the API would:
 * the course from the deployed seed with the intake, the team's intake, and its PDF.
 *
 *   draft       no button: nothing is submitted yet.
 *   submitted   the button, accessible, no sideways scroll at 1280 and 390; a click saves the route's file.
 */

const NOW = '2026-11-20T14:00:00-07:00';
const at = Date.parse(NOW);
const db = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const week0 = db.modules.find((m) => m.id === WEEK0_MODULE_ID)!;
week0.course = { ...week0.course!, intake: WEEK0_INTAKE };
const course = {
  open: true,
  preview: false,
  prelaunch: true,
  course: courseFor(db, at, { open: true, preview: true }),
  sessions: courseSessions(db),
  copy: Object.fromEntries((db.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value])),
};
const ANSWERS = { name: 'Alex Morgan, alex@northlinerealty.example', team: 'Northline Realty' };
const FILE = 'Week 0 Intake - Northline Realty.pdf';

async function open(browser: Browser, width: number, submitted: boolean): Promise<{ page: Page; pdfAsks: string[] }> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, timezoneId: 'America/Denver', acceptDownloads: true });
  const page = await ctx.newPage();
  const pdfAsks: string[] = [];
  await page.route('**/api/course', (r) => r.fulfill({ json: course }));
  await page.route('**/api/intake', (r) =>
    r.fulfill({ json: { answers: ANSWERS, updatedAt: at - 3_600_000, submittedAt: submitted ? at - 3_600_000 : null, preview: false } }),
  );
  await page.route('**/api/intake/pdf**', (r) => {
    pdfAsks.push(r.request().url());
    return r.fulfill({ status: 200, contentType: 'application/pdf', headers: { 'content-disposition': `attachment; filename="${FILE}"` }, body: '%PDF-1.4\n%%EOF\n' });
  });
  await page.goto(`${APP_BASE}/learn/week/0/intake?as=owner&now=${encodeURIComponent(NOW)}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  await expect(page.getByRole('heading', { level: 1, name: 'Week 0 Intake' })).toBeVisible();
  return { page, pdfAsks };
}

const BUTTON = 'Download Your Answers (PDF)';

test.describe('learner portal v2, the intake page’s PDF (D-246) @g9', () => {
  test('a draft offers no download', async ({ browser }) => {
    const { page } = await open(browser, 1280, false);
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
    await expect(page.getByRole('button', { name: BUTTON })).toHaveCount(0);
    await page.context().close();
  });

  for (const width of [1280, 390])
    test(`once submitted, Download Your Answers (PDF) saves the team’s PDF, at ${width}`, async ({ browser }) => {
      const { page, pdfAsks } = await open(browser, width, true);
      const button = page.getByRole('button', { name: BUTTON });
      await expect(button).toBeVisible();
      await expect(page.getByText(/^Submitted /)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expectAccessible(page);
      const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
      expect(download.suggestedFilename()).toBe(FILE);
      expect((await readFile((await download.path())!)).subarray(0, 5).toString('latin1')).toBe('%PDF-');
      // One request, to the session's own route: no team in the address.
      expect(pdfAsks.map((u) => new URL(u).pathname + new URL(u).search)).toEqual(['/api/intake/pdf']);
      await expect(button).toBeEnabled();
      await page.context().close();
    });
});
