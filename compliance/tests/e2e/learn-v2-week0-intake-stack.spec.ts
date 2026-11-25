import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, type Browser, type Page, type TestInfo } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
// `compliance/` can't resolve `@ai/core`, so these are relative, as the other learner specs have them.
import { DB_KEY } from '../../../packages/core/src/constants';
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import type { PathBlock } from '../../../packages/core/src/course-types';
import { seed } from '../../../packages/core/src/seed';
import { prefillStack } from '../../../packages/core/src/stack';
import type { StackRow } from '../../../packages/core/src/stack';
import type { Db } from '../../../packages/core/src/types';
import { planAiImplementerV1 } from '../../../packages/core/seed/ai-implementer-v1';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { WEEK0_INTAKE } from '../../../packages/core/seed/intake-v1';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';
import { WEEK0_STACK } from '../../../packages/core/seed/stack-v1';
import { WEEK0_MODULE_ID } from '../../../packages/core/seed/start-here-v1';

/**
 * D-253 on the flag-on fixture build, at 1280 and 390, signed in as the owner persona (Alex, Team Owner):
 *
 *   - The intake page (`/learn/week/0/intake`) in the learner frame, its intro in the paragraphs, list and bold staff
 *     typed. v3's form drawer (for a test learner, as `v3On` has it) shows the same intro the same way.
 *   - Week 0 step 1 with its item set to Form > Stack card: "Open Your Stack Card", which opens the Stack Card page.
 *   - The Stack Card page in the learner frame, before and after Send Back: "Sent Back", and when, in MT / CT.
 *
 * FIXTURE CONTENT, NOT THE LIVE WEEK. The intro below is written for this spec from the seed's intro, D-243's line
 * and the seeded glossary; the live intro is whatever staff typed in the Week Builder. Step 1's item is set here, as
 * Connor sets it in the builder after the deploy. The reads are answered as the API would.
 *
 * `WEEK0_REVIEW_DIR` (optional) also saves the screenshots there at device scale 2, for the PR.
 */

const NOW = '2026-11-25T10:30:00-07:00';
const at = Date.parse(NOW);

const INTRO = [
  'The goal of this intake is that we know your team before we build anything with you.',
  'Short answers are fine. If you’re not sure of something, say so and skip it.',
  '',
  'Three words you’ll see a lot:',
  '- **AI Implementer.** A person on your team, not software.',
  '- **AI hire.** A skill that runs on a schedule and leaves a draft on one person’s desk.',
  '- **Draft.** Something a hire writes for a person to check.',
].join('\n');

const STEP1: PathBlock[] = [
  { type: 'check', id: 's1-intake', title: 'Fill in your intake', action: { type: 'form', formId: 'intake', label: '' } },
  { type: 'check', id: 's1-stack', title: 'Send back your stack card', action: { type: 'form', formId: 'stack-card', label: '' } },
];

// D-243's data step too, so the week reads "AI Implementer" as the live one does.
const deployed = planAiImplementerV1(planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db).db;
const week0 = deployed.modules.find((m) => m.id === WEEK0_MODULE_ID)!;
week0.course = { ...week0.course!, intake: { ...WEEK0_INTAKE, intro: INTRO }, stackCard: WEEK0_STACK };
week0.checklist[0]!.paths = { claude: { blocks: STEP1 }, chatgpt: { blocks: STEP1 } };
const copy = Object.fromEntries((deployed.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value]));
const course = { open: true, preview: false, prelaunch: true, course: courseFor(deployed, at, { open: true, preview: true }), sessions: courseSessions(deployed), copy };

const ANSWERS = { name: 'Alex Morgan, alex@northlinerealty.example', team: 'Northline Realty', books: 'QuickBooks Online', sisu: 'Sisu', crm: 'Follow Up Boss', google: 'Yes' };
const ROWS: StackRow[] = prefillStack(WEEK0_STACK, ANSWERS);

/** Which learner frame: today's, or LMS v3's, which draws for a test learner (`v3On`) whatever the build flag says. */
type Frame = 'today' | 'v3';
function snapshot(frame: Frame): Db {
  const db = seed('live');
  db.modules = [...db.modules.filter((m) => !m.id.startsWith('accelerator-week-')), ...deployed.modules.filter((m) => m.id.startsWith('accelerator-week-'))];
  db.cohorts = [...deployed.cohorts, ...db.cohorts.filter((c) => !deployed.cohorts.some((x) => x.id === c.id))];
  if (frame === 'v3') db.users.find((u) => u.id === 'u_alex')!.test = true;
  return db;
}
const DB: Record<Frame, string> = { today: JSON.stringify(snapshot('today')), v3: JSON.stringify(snapshot('v3')) };

async function open(browser: Browser, path: string, width: number, frame: Frame = 'today'): Promise<{ page: Page; puts: unknown[] }> {
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 2, timezoneId: 'America/Denver', colorScheme: 'light' });
  const page = await ctx.newPage();
  const puts: unknown[] = [];
  await page.addInitScript(([key, db]) => localStorage.setItem(key, db), [DB_KEY, DB[frame]] as const);
  await page.route('**/api/course', (r) => r.fulfill({ json: course }));
  await page.route('**/api/intake', (r) => r.fulfill({ json: { answers: ANSWERS, updatedAt: at - 3_600_000, submittedAt: null, preview: false } }));
  await page.route('**/api/stack', (r) => {
    if (r.request().method() !== 'PUT') return r.fulfill({ json: { rows: ROWS, sentAt: null, preview: false } });
    puts.push(r.request().postDataJSON());
    return r.fulfill({ json: { rows: ROWS, sentAt: at } });
  });
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${APP_BASE}${path}${sep}as=owner&now=${encodeURIComponent(NOW)}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  return { page, puts };
}

/** A screenshot; `whole` grows the window to the page's height first, so a sticky bar stays where it belongs. */
async function shot(page: Page, info: TestInfo, name: string, whole = false): Promise<void> {
  const size = page.viewportSize()!;
  if (whole) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.setViewportSize({ width: size.width, height: await page.evaluate(() => document.documentElement.scrollHeight) });
  }
  const body = await page.screenshot({ animations: 'disabled' });
  await info.attach(name, { body, contentType: 'image/png' });
  const dir = process.env.WEEK0_REVIEW_DIR;
  if (dir) {
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, name), animations: 'disabled' });
  }
  if (whole) await page.setViewportSize(size);
}

const noSideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe('Week 0: the intake’s intro in its lines, the learner frame, the Stack Card (D-253) @g9', () => {
  for (const width of [1280, 390]) {
    test(`the intake page keeps the intro’s paragraphs, list and bold, in the learner frame, at ${width}`, async ({ browser }, info) => {
      const { page } = await open(browser, '/learn/week/0/intake', width);
      const h1 = page.getByRole('heading', { level: 1, name: 'Week 0 Intake' });
      await expect(h1).toBeVisible();
      const intro = page.getByText('The goal of this intake is that we know your team', { exact: false }).locator('..');
      await expect(intro.locator('> *')).toHaveCount(3);
      await expect(intro.locator('> p')).toHaveCount(2);
      await expect(intro.locator('li')).toHaveCount(3);
      await expect(intro.locator('li strong')).toHaveText(['AI Implementer.', 'AI hire.', 'Draft.']);
      await expect(page.getByText('**')).toHaveCount(0);
      // The frame: the title starts where the week page's does, and the form keeps a 760px column.
      const box = (await h1.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(width < 768 ? 16 : 32);
      const column = await h1.evaluate((el) => el.parentElement!.getBoundingClientRect().width);
      expect(column).toBeLessThanOrEqual(760);
      expect(await noSideways(page)).toBe(true);
      await expectAccessible(page);
      await shot(page, info, `intake-page-${width}.png`);
      await page.context().close();
    });

    test(`v3’s form drawer shows the same intro the same way, at ${width}`, async ({ browser }, info) => {
      const { page } = await open(browser, '/learn/week/0?form=intake', width, 'v3');
      // The host is a box of no size; the drawer and its words are what show.
      const drawer = page.locator('[data-ai="form"][data-drawer="open"]');
      const intro = drawer.locator('.fm-intro');
      await expect(intro).toBeVisible();
      await expect(intro.locator('> p')).toHaveCount(2);
      await expect(intro.locator('li strong')).toHaveText(['AI Implementer.', 'AI hire.', 'Draft.']);
      await page.waitForTimeout(600);
      expect(await noSideways(page)).toBe(true);
      await shot(page, info, `intake-drawer-v3-${width}.png`);
      await page.context().close();
    });

    test(`step 1’s Form > Stack card item says Open Your Stack Card and opens the Stack Card page, at ${width}`, async ({ browser }, info) => {
      const { page } = await open(browser, '/learn/week/0/step/1', width);
      const link = page.getByRole('link', { name: 'Open Your Stack Card' }).first();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', '/learn/week/0/stack');
      expect(await noSideways(page)).toBe(true);
      await shot(page, info, `step1-stack-button-${width}.png`, true);
      await link.click();
      await expect(page.getByRole('heading', { level: 1, name: 'Stack Card' })).toBeVisible();
      await page.context().close();
    });

    test(`the Stack Card page, before and after Send Back, at ${width}`, async ({ browser }, info) => {
      const { page, puts } = await open(browser, '/learn/week/0/stack', width);
      const h1 = page.getByRole('heading', { level: 1, name: 'Stack Card' });
      await expect(h1).toBeVisible();
      await expect(page.getByRole('heading', { level: 2, name: 'Books' })).toBeVisible();
      await expect(page.getByText(/^Sent back /)).toHaveCount(0);
      expect((await h1.boundingBox())!.x).toBeGreaterThanOrEqual(width < 768 ? 16 : 32);
      expect(await noSideways(page)).toBe(true);
      await expectAccessible(page);
      await shot(page, info, `stack-before-${width}.png`, true);
      await page.getByRole('button', { name: 'Send Back' }).click();
      await expect(page.getByRole('button', { name: 'Sent Back' })).toBeVisible();
      await expect(page.getByText('Sent back Wed, Nov 25, 10:30 AM MT / 11:30 AM CT')).toBeVisible();
      expect(puts).toHaveLength(1);
      expect(await noSideways(page)).toBe(true);
      await expectAccessible(page);
      await shot(page, info, `stack-after-${width}.png`, true);
      await page.context().close();
    });
  }
});
