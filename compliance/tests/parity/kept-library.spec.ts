import { test, expect, type Page } from '@playwright/test';
import { OPEN_GUIDE, guides, learnerCopy, openWorld, skillsAnswer, visit } from './world';

/**
 * The learner parity suite: the Skill Library and guided setup rows the inventory marks KEPT (§ 7),
 * on the new library (`/learn/skills`) a course learner reaches, in the fixture build. `GET /api/skills`
 * and `GET /api/skill-guides/:slug` are answered from the catalog and the build's guides (`world.ts`).
 * Utah Life's own library (U-*, L-5, L-6) is in `access-groups.spec.ts`.
 */

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });

test.describe('learner parity: the Skill Library (KEPT)', () => {
  test.skip(!guides, 'needs the fixture build’s apps/web/dist-private/skill-guides.json');

  test('skills grouped by set, Start here, chips that filter, search @parity:L-1', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/skills');
    await expect(h1(page)).toHaveText('Skill library');
    await expect(
      page.getByRole('region', { name: 'Start here' }).getByRole('link', { name: 'AI Brain Setup, open' }),
    ).toBeVisible();
    const groups = page.locator('section[aria-labelledby^="lv-g-"]');
    expect(await groups.count()).toBeGreaterThan(1);
    await page
      .getByRole('toolbar', { name: 'Filter by topic' })
      .getByRole('button', { name: /^Agent Skills/ })
      .click();
    await expect(groups).toHaveCount(1);
    await expect(groups.first().getByRole('heading', { level: 2 })).toHaveText('Agent Skills');
    await page.getByRole('toolbar', { name: 'Filter by topic' }).getByRole('button', { name: /^All/ }).click();
    await page.getByRole('searchbox', { name: 'Search skills' }).fill('Pipeline Review');
    await expect(page.getByRole('link', { name: /^FUB Pipeline Review,/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Agent 1:1 Prep,/ })).toHaveCount(0);
    await page.context().close();
  });

  test('an open skill’s downloads are on its page, from the skills route @parity:L-2 @parity:A-13', async ({
    browser,
  }) => {
    const page = await openWorld(browser, `/learn/skills/${OPEN_GUIDE}`);
    await page
      .getByRole('navigation', { name: 'AI Brain Setup steps' })
      .getByRole('button', { name: /Download the Skill/ })
      .click();
    const links = page.locator(`a[href^="/api/skills/${OPEN_GUIDE}/download/"]`);
    await expect(links.first()).toBeVisible();
    await page.context().close();
  });

  test('locked skills: an access group reads its own line with no upsell; anyone else is offered the plans @parity:L-3', async ({
    browser,
  }) => {
    const utah = await openWorld(browser, '/learn/skills', { audience: 'utah' });
    // A member without the course lands on the standalone library, whose owner section starts closed (D-201).
    const toggle = utah.getByRole('button', { name: /Owner and Operations Skills/ });
    if ((await toggle.count()) > 0 && (await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
    await expect(utah.getByText(learnerCopy('locked.utah_life'), { exact: true }).first()).toBeVisible();
    await expect(utah.getByRole('link', { name: 'See Plans' })).toHaveCount(0);
    await utah.context().close();
    const free = await openWorld(browser, '/learn/skills/agent-1on1-prep', { audience: 'free' });
    await expect(free.getByRole('link', { name: /See (P|p)lans/ }).first()).toBeVisible();
    await free.context().close();
  });

  test('an upcoming skill says when it opens @parity:L-4', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/skills');
    await expect(page.getByRole('link', { name: 'Agent 1:1 Prep, opens Wed, Dec 2' })).toBeVisible();
    await page.context().close();
  });

  test('a paused two-pay plan: the library says why its skills are locked @parity:L-8', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/skills');
    await page.route('**/api/skills', (r) => r.fulfill({ json: { ...skillsAnswer('buyer'), paused: true } }));
    await visit(page, '/learn/skills');
    await expect(page.getByText(/second payment/i).first()).toBeVisible();
    await page.context().close();
  });

  test('signed out: the library says it opens when you sign in, with Sign In @parity:L-9', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/skills');
    await page.route('**/api/skills', (r) => r.fulfill({ status: 401, json: { error: 'Sign in' } }));
    await visit(page, '/learn/skills');
    await expect(page.getByRole('link', { name: /Sign in/i })).toHaveAttribute('href', /\/sign-in/);
    await page.context().close();
  });

  test('guided setup: the step rail, Next, the app tabs, copy chips @parity:L-10', async ({ browser }) => {
    const page = await openWorld(browser, `/learn/skills/${OPEN_GUIDE}`);
    const lanes = guides!.guides[OPEN_GUIDE]!.lanes;
    await expect(h1(page)).toHaveText(lanes[0]!.steps[0]!.title);
    await page.getByRole('button', { name: 'Next step' }).click();
    await expect(h1(page)).toHaveText(lanes[0]!.steps[1]!.title);
    await page.getByRole('navigation', { name: 'AI Brain Setup steps' }).getByRole('button').nth(2).click();
    await expect(h1(page)).toHaveText(lanes[0]!.steps[2]!.title);
    if (lanes.length > 1) {
      await page.getByRole('radio', { name: lanes[1]!.label }).click();
      await expect(page.getByRole('radio', { name: lanes[1]!.label })).toBeChecked();
    }
    await expect(page.getByRole('button', { name: 'Copy' }).first()).toBeVisible();
    await page.context().close();
  });

  test('the guide remembers the step on this device @parity:L-11', async ({ browser }) => {
    const page = await openWorld(browser, `/learn/skills/${OPEN_GUIDE}`);
    const lanes = guides!.guides[OPEN_GUIDE]!.lanes;
    await page.getByRole('button', { name: 'Next step' }).click();
    await expect(h1(page)).toHaveText(lanes[0]!.steps[1]!.title);
    await visit(page, '/learn');
    await visit(page, `/learn/skills/${OPEN_GUIDE}`);
    await expect(h1(page)).toHaveText(lanes[0]!.steps[1]!.title);
    await page.context().close();
  });
});
