import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';
// The course as the API sends it and the snapshot the fixture build reads, built from the deployed seed and
// the demo's. `compliance/` can't resolve `@ai/core`, so these are relative; the seed's own imports are too.
import { DB_KEY } from '../../../packages/core/src/constants';
import { courseFor, courseSessions } from '../../../packages/core/src/course';
import { seed } from '../../../packages/core/src/seed';
import type { AIEmployee, Db } from '../../../packages/core/src/types';
import { planContentV2 } from '../../../packages/core/seed/content-v2';
import { planCopyV1 } from '../../../packages/core/seed/copy-v1';
import { seedProduction } from '../../../packages/core/seed/curriculum';
import { planReleaseV1 } from '../../../packages/core/seed/release-plan-v1';

/**
 * D-184: the open week's content, build kit, downloads and trail, the sidebar's Team Hub and cohort line,
 * and "Undo" on a done step, in the fixture build (where the learner portal's flag is on). `GET /api/course`
 * is answered from the deployed seed at Week 2's live build (Weeks 0 to 2 open); the fixture's snapshot is
 * the demo's, with the deployed course's week modules added (a system prompt, a module file and the
 * instructor notes on Week 1) and the Team Owner's first step of Week 0 done.
 */

const LIVE = '2026-12-09T12:05:00-07:00';
const deployed = planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const copy = Object.fromEntries((deployed.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value]));
const course = { open: true, preview: false, prelaunch: false, course: courseFor(deployed, Date.parse(LIVE), { open: true, preview: false }), sessions: courseSessions(deployed), copy };

const PROMPT = '# Role\nYou are {{TEAM_NAME}}’s finance analyst.\nRead the books every Monday.';
const FILE = 'spend-map.skill.yaml';

/** The demo's snapshot with the course's week modules in it, as the fixture build reads it from localStorage. */
function snapshot(): Db {
  const db = seed('live');
  const weeks = deployed.modules
    .filter((m) => m.id.startsWith('accelerator-week-'))
    .map((m): AIEmployee => (m.id === 'accelerator-week-1' ? { ...m, prompt: PROMPT, files: [{ name: FILE, type: 'YAML', size: '2 KB', desc: 'The spend map skill', steps: ['Pull the books'] }] } : m));
  db.modules.push(...weeks);
  // The deployed cohort, with what every week shares (the builder's preview reads it), in the demo's place.
  db.cohorts = [...deployed.cohorts, ...db.cohorts.filter((c) => !deployed.cohorts.some((x) => x.id === c.id))];
  // The course's weeks are Team tier modules, so the step a learner can mark here is a Team Owner's.
  const alex = db.users.find((u) => u.id === 'u_alex')!;
  alex.progress['accelerator-week-0'] = { steps: ['c1'], builtAt: null, deployedAt: null, runtime: null };
  return db;
}
const DB = JSON.stringify(snapshot());
const week1 = deployed.modules.find((m) => m.id === 'accelerator-week-1')!;

async function open(browser: Browser, path: string, width: number, as: 'agent' | 'owner' | 'admin' = 'agent', extra = ''): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, timezoneId: 'America/Denver' });
  const page = await ctx.newPage();
  await page.addInitScript(([key, db]) => localStorage.setItem(key, db), [DB_KEY, DB] as const);
  await page.route('**/api/course', (r) => r.fulfill({ json: course }));
  await page.goto(`${APP_BASE}${path}?as=${as}&now=${encodeURIComponent(LIVE)}${extra}`);
  await page.waitForSelector('body[data-app-ready="true"]');
  await page.locator('h1').first().waitFor();
  return page;
}

/** Visible controls under 44px at a phone width (the phone pass's rule, D-181). */
function smallTargets(page: Page) {
  return page.evaluate(() => {
    const hidden = (el: Element) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return true;
        if (e.getAttribute('aria-hidden') === 'true' || (e as HTMLElement).inert) return true;
        if (cs.position === 'absolute' && cs.overflow === 'hidden' && parseFloat(cs.width) <= 1 && parseFloat(cs.height) <= 1) return true;
      }
      const r = el.getBoundingClientRect();
      return !(r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth);
    };
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('a[href], button, [role=button], [role=radio]'))) {
      if (hidden(el) || (el as HTMLButtonElement).disabled) continue;
      const r = el.getBoundingClientRect();
      if (Math.min(r.width, r.height) < 43.5) out.push(`${el.tagName} "${(el.getAttribute('aria-label') || (el as HTMLElement).innerText).trim().slice(0, 40)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return out;
  });
}

test.describe('learner portal v2, the week’s content and kit (D-184) @g9', () => {
  test('@parity:K-1 @parity:K-2 @parity:K-3 @parity:K-4 @parity:K-6 @parity:K-7 @parity:K-12 the week page shows a seeded week’s content', async ({ browser }) => {
    const page = await open(browser, '/learn/week/1', 1440);
    const w = week1.course!;
    await expect(page.getByRole('region', { name: 'Why It Matters' })).toContainText(w.why[0]!);
    await expect(page.getByRole('region', { name: 'Who Does What' })).toContainText(w.owner);
    const live = page.getByRole('region', { name: 'Live Build' });
    await expect(live.getByRole('heading', { name: 'Agenda' })).toBeVisible();
    await expect(live).toContainText(w.liveBuild!.lesson);
    await expect(page.getByRole('region', { name: 'Office Hours' })).toContainText(w.officeHours!.note);
    await expect(page.getByRole('region', { name: 'Homework' })).toContainText(w.homework.byWeekEnd[0]!);
    await expect(page.getByRole('region', { name: 'Rubric' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Media' })).toContainText(w.materials[0]!);
    await expect(page.getByRole('navigation', { name: 'Weeks' }).getByRole('link', { name: /Week 2/ })).toHaveAttribute('href', '/learn/week/2');
    await page.context().close();
  });

  test('@parity:K-5 @parity:K-15 @parity:E-18 @parity:X-2 the week’s question, header line, tagged skills, seat and playbook cards, and the tab’s title', async ({ browser }) => {
    const page = await open(browser, '/learn/week/1', 1440);
    const w = week1.course!;
    await expect(page.locator('main')).toContainText(w.question);
    await expect(page.locator('main')).toContainText(/From Session \d+ · /);
    await expect(page.locator('main')).toContainText(/\d+ Min Build/);
    const kit = page.getByRole('region', { name: 'Week 1 kit' });
    await expect(kit).toContainText('Flagship');
    await expect(kit.getByRole('link', { name: 'Download in Your Skill Library' })).toHaveAttribute('href', '/learn/skills');
    await expect(page.getByRole('region', { name: 'Seat Card' })).toContainText(w.seatCard!.seat);
    await expect(page.getByRole('region', { name: 'Playbook Card' })).toContainText(w.playbookCard!.play);
    await expect(page).toHaveTitle(`Week 1 · ${w.title} · Amplified AI Accelerator`);
    await page.getByRole('link', { name: /^Step 2,/ }).first().click();
    await expect(page).toHaveTitle(new RegExp(`^Step 2 · .+ · Week 1 · ${w.title} · Amplified AI Accelerator$`));
    await page.context().close();
  });

  test('@parity:SH-7 the week and the step show a visible trail', async ({ browser }) => {
    // D-210: the week keeps its trail; the step is the v6 page, drawn without the portal's chrome, and its trail is
    // the back link to its week above the step rail.
    const page = await open(browser, '/learn/week/1', 1440);
    const trail = page.locator('main').getByRole('list', { name: 'Breadcrumb' });
    await expect(trail).toBeVisible();
    await expect(trail.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/learn');
    await page.goto(`${APP_BASE}/learn/week/1/step/2?as=agent&now=${encodeURIComponent(LIVE)}`);
    await page.waitForSelector('body[data-app-ready="true"]');
    const back = page.locator('[data-step-page] a.back');
    await expect(back).toBeVisible();
    await expect(back).toHaveText(week1.course!.title);
    await back.click();
    await expect(page).toHaveURL(/\/learn\/week\/1\?|\/learn\/week\/1$/);
    await page.context().close();
  });

  test('@parity:E-10 @parity:C-10 the kit’s system prompt copies to the clipboard, and opens to view', async ({ browser }) => {
    const page = await open(browser, '/learn/week/1', 1440);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(APP_BASE).origin });
    const kit = page.getByRole('region', { name: 'Build Kit' });
    await expect(kit).toContainText('TEAM_NAME');
    await kit.getByRole('button', { name: 'Copy: System Prompt' }).click();
    await expect(kit.getByRole('button', { name: 'Copy: System Prompt' })).toContainText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(PROMPT);
    await kit.getByRole('button', { name: 'View: System Prompt' }).click();
    const dialog = page.getByRole('dialog', { name: 'System Prompt' });
    await expect(dialog).toContainText('Read the books every Monday.');
    await expectAccessible(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Instructor Notes' })).toContainText(week1.instructor);
    await page.context().close();
  });

  test('@parity:E-11 @parity:A-9 a module file’s Download asks the gated files route', async ({ browser }) => {
    const page = await open(browser, '/learn/week/1', 1440);
    await page.route('**/api/files/module/**', (r) => r.fulfill({ status: 200, body: 'name: spend-map\n', headers: { 'content-type': 'text/yaml', 'content-disposition': `attachment; filename="${FILE}"` } }));
    const asked = page.waitForRequest((r) => r.url().includes('/api/files/module/'));
    await page.getByRole('link', { name: `Download ${FILE}` }).click();
    expect(new URL((await asked).url()).pathname).toBe(`/api/files/module/accelerator-week-1/${FILE}`);
    await page.context().close();
  });

  test('@parity:E-21 in a staff member’s preview tab a module file says Preview only', async ({ browser }) => {
    const page = await open(browser, '/learn/week/1', 1440, 'admin', '&preview=owner');
    let asked = false;
    await page.route('**/api/files/module/**', (r) => {
      asked = true;
      return r.abort();
    });
    await page.getByRole('button', { name: `Download ${FILE}` }).click();
    await expect(page.getByText('Preview only').first()).toBeVisible();
    expect(asked).toBe(false);
    await page.context().close();
  });

  test('@parity:K-13 the CSV downloads appear on their week, and nowhere else', async ({ browser }) => {
    const page = await open(browser, '/learn/week/1', 1440);
    const dl = page.getByRole('region', { name: 'Downloads' });
    const saved = page.waitForEvent('download');
    await dl.getByRole('button', { name: /Download the Use Log/ }).click();
    expect((await saved).suggestedFilename()).toBe('use-log.csv');
    await page.goto(`${APP_BASE}/learn/week/0?as=agent&now=${encodeURIComponent(LIVE)}`);
    await page.locator('h1').first().waitFor();
    await expect(page.getByRole('region', { name: 'Downloads' })).toHaveCount(0);
    await page.context().close();
  });

  test('@parity:T-1 @parity:G-1 Team Hub is in the sidebar for a Team tier learner, and not for an Agent tier one', async ({ browser }) => {
    const owner = await open(browser, '/learn', 1440, 'owner');
    // D-182: the Team Hub inside the learner portal, where `/team` sends a learner with the course.
    const link = owner.locator('aside[aria-label="Primary"]').getByRole('link', { name: 'Team Hub' });
    await expect(link).toHaveAttribute('href', '/learn/team');
    await link.click();
    await expect(owner).toHaveURL(/\/learn\/team(\?|$)/);
    await expect(owner.getByRole('heading', { level: 1, name: 'Team Hub' })).toBeVisible();
    await owner.context().close();
    const agent = await open(browser, '/learn', 1440, 'agent');
    await expect(agent.locator('aside[aria-label="Primary"]').getByRole('link', { name: 'Team Hub' })).toHaveCount(0);
    await agent.context().close();
  });

  test('@parity:SH-9 the cohort line is in the sidebar', async ({ browser }) => {
    const page = await open(browser, '/learn', 1440);
    await expect(page.locator('aside[aria-label="Primary"]')).toContainText(/Cohort · (Week \d+ of \d+|Starts|Completed)/);
    await page.context().close();
  });

  test('@parity:E-16 a done step’s button reads Undo, and the same toggle takes it back', async ({ browser }) => {
    const page = await open(browser, '/learn/week/0/step/1', 1440, 'owner');
    const undo = page.getByRole('button', { name: 'Undo' });
    await expect(undo).toBeVisible();
    await undo.click();
    await expect(page.getByRole('button', { name: 'Mark step done' })).toBeVisible();
    await page.context().close();
  });

  test('@parity:C-9 the builder’s live preview draws the learner portal’s week page and step player, and never leaves the builder', async ({ browser }) => {
    // D-253 (R-5 Phase 1): a week's builder is at `/admin/program/weeks/:id`.
    const page = await open(browser, '/admin/program/weeks/accelerator-week-1', 1440, 'admin');
    await page.getByRole('button', { name: /Preview/ }).first().click();
    const frame = page.getByTestId('course-preview');
    await expect(frame.locator('[data-learner-v2]')).toHaveCount(1);
    await expect(frame.getByRole('heading', { level: 1, name: week1.course!.title })).toBeVisible();
    await expect(frame.getByRole('region', { name: 'Why It Matters' })).toContainText(week1.course!.why[0]!);
    await expect(frame.getByRole('region', { name: 'Build Kit' })).toContainText('TEAM_NAME');
    await frame.getByRole('link', { name: /^Step 2,/ }).click();
    await expect(frame.getByRole('heading', { level: 1, name: week1.checklist[1]!.ch || week1.checklist[1]!.text })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/program\/weeks\/accelerator-week-1/);
    await page.context().close();
  });

  for (const width of [1440, 390])
    for (const path of ['/learn/week/1', '/learn/week/1/step/2'])
      test(`${path} with its content and kit at ${width}: accessible, one h1, no sideways scroll${width === 390 ? ', 44px targets' : ''}`, async ({ browser }) => {
        const page = await open(browser, path, width);
        await expect(page.locator('h1')).toHaveCount(1);
        await expectAccessible(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
        if (width === 390) expect(await smallTargets(page)).toEqual([]);
        await page.context().close();
      });
});
