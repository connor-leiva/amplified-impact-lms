import { test, expect, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { KIT_RESOURCE, fixtureUrl, guides, OPEN_GUIDE, openWorld, visit, worldContext } from './world';

/**
 * The learner parity suite: rows the inventory marks KEPT (Connor's parity brief § 3, "route" and
 * "action"), for the shell, Home, a week, the step player, the Schedule, Team Hub, the Vault and Account.
 *
 * Each test proves the row as the inventory states it for the new portal, in the fixture build, as a
 * course learner (`?as=agent`, Jamie; `?as=owner`, Alex, Team tier) in the parity world (`world.ts`).
 * Old addresses are asserted by what the page shows (a heading, a list), not by the URL, so a test holds
 * on #171 (the old screens) and after the reworked #172 (the redirects to /learn) alike.
 */

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
const sidebar = (page: Page) => page.locator('aside[aria-label="Primary"]');
const HOME = /^(Dashboard|Good (morning|afternoon|evening), Jamie)$/;

test.describe('learner parity: routes (KEPT)', () => {
  test('/sessions shows the cohort’s sessions @parity:R-2', async ({ browser }) => {
    const page = await openWorld(browser, '/sessions');
    await expect(h1(page)).toHaveText(/^(Sessions|Schedule)$/);
    await expect(page.getByText('Lead Source Review Live Build').first()).toBeVisible();
    await expect(page.getByText('Monthly Numbers Live Build').first()).toBeVisible();
    await page.context().close();
  });

  test('/team shows the Team Hub to a Team-tier owner @parity:R-4', async ({ browser }) => {
    const page = await openWorld(browser, '/team', { as: 'owner' });
    await expect(h1(page)).toHaveText('Team Hub');
    await expect(page.getByRole('table', { name: 'Team Activity' })).toBeVisible();
    await page.context().close();
  });

  test('/vault shows the Resource Vault @parity:R-5', async ({ browser }) => {
    const page = await openWorld(browser, '/vault');
    await expect(h1(page)).toHaveText('Resource & Compliance Vault');
    await expect(page.getByRole('textbox', { name: 'Search templates, scripts, workflows' })).toBeVisible();
    await page.context().close();
  });

  test('/skill-library/:slug opens the skill’s guided setup @parity:R-9', async ({ browser }) => {
    test.skip(!guides, 'needs the fixture build’s apps/web/dist-private/skill-guides.json');
    const page = await openWorld(browser, `/skill-library/${OPEN_GUIDE}`);
    const first = guides!.guides[OPEN_GUIDE]!.lanes[0]!.steps[0]!.title;
    await expect(page.getByText(first, { exact: true }).first()).toBeVisible();
    await page.context().close();
  });

  test('the sign-in, invite, forgot-password and set-password screens are unchanged @parity:R-10', async ({
    browser,
  }) => {
    const ctx = await worldContext(browser);
    const page = await ctx.newPage();
    for (const [path, control] of [
      ['/sign-in', /Email/],
      ['/login', /Email/],
      ['/forgot-password', /Email/],
      ['/set-password?token=tok_set', /Password/],
    ] as const) {
      await page.goto(`${APP_BASE}${path}`);
      await expect(h1(page), path).toBeVisible();
      await expect(page.getByRole('textbox', { name: control }).first(), path).toBeVisible();
    }
    await page.goto(`${APP_BASE}/invite/tok_invite`);
    await expect(h1(page)).toBeVisible();
    await ctx.close();
  });

  test('/account is the password page, and the new Account page links to it @parity:R-11 @parity:AC-1', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/account');
    await expect(h1(page)).toHaveText('Your Password');
    await expect(page.getByRole('textbox', { name: 'New Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Password' })).toBeVisible();
    await visit(page, '/learn/account');
    await expect(page.getByRole('link', { name: 'Change password' })).toHaveAttribute('href', '/account');
    await page.context().close();
  });

  test('an unknown learner address and a learner at /admin land on the learner’s Home @parity:R-12', async ({
    browser,
  }) => {
    const ctx = await worldContext(browser);
    const page = await ctx.newPage();
    for (const path of ['/no-such-page', '/admin', '/learn/no-such-page']) {
      await page.goto(fixtureUrl(path));
      await page.waitForSelector('body[data-app-ready="true"]');
      await expect(h1(page), path).toHaveText(HOME);
      expect(new URL(page.url()).pathname, path).toMatch(/^\/(learn)?$/);
    }
    await ctx.close();
  });

  test('staff at a learner address land in the Console @parity:R-13', async ({ browser }) => {
    const ctx = await worldContext(browser);
    const page = await ctx.newPage();
    for (const path of ['/', '/sessions', '/vault']) {
      await page.goto(fixtureUrl(path, 'admin'));
      await page.waitForSelector('body[data-app-ready="true"]');
      expect(new URL(page.url()).pathname, path).toMatch(/^\/admin/);
    }
    await ctx.close();
  });

  test('routing keeps the query and the fragment @parity:R-14', async ({ browser }) => {
    const ctx = await worldContext(browser);
    const page = await ctx.newPage();
    for (const path of ['/sessions', '/vault', '/learn/week/1']) {
      const url = new URL(fixtureUrl(path));
      url.searchParams.set('keep', 'yes');
      url.hash = 'here';
      await page.goto(url.toString());
      await page.waitForSelector('body[data-app-ready="true"]');
      const now = new URL(page.url());
      expect(now.searchParams.get('keep'), path).toBe('yes');
      expect(now.searchParams.get('as'), path).toBe('agent');
      expect(now.hash, path).toBe('#here');
    }
    await ctx.close();
  });
});

test.describe('learner parity: the shell (KEPT)', () => {
  test('the sidebar: Home, Schedule, Skill library, Resource vault, the AI employees group, Get help @parity:SH-1', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn');
    const nav = sidebar(page);
    for (const name of ['Home', 'Schedule', 'Skill library', 'Resource vault'])
      await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Get help' })).toHaveAttribute('href', /^mailto:/);
    const group = nav.getByRole('button', { name: /^AI employees/ });
    await expect(group).toHaveAttribute('aria-expanded', 'true');
    const week1 = nav.getByRole('link', { name: /^Where the Money Goes/ });
    await expect(week1).toHaveAttribute('href', '/learn/week/1');
    await expect(nav.getByRole('link', { name: /^Leads That Pay Opens Dec 9$/ })).toBeVisible();
    await group.click();
    await expect(group).toHaveAttribute('aria-expanded', 'false');
    await expect(week1).toHaveCount(0);
    await page.context().close();
  });

  test('the account menu: Account and Sign out, plus Team Hub for the Team tier @parity:SH-3', async ({ browser }) => {
    const page = await openWorld(browser, '/learn');
    await page.getByRole('button', { name: 'Your account' }).click();
    await expect(page.getByRole('menuitem', { name: 'Account' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Team Hub' })).toHaveCount(0);
    await page.getByRole('menuitem', { name: 'Account' }).click();
    await expect(h1(page)).toHaveText('Account');
    await page.context().close();
    const owner = await openWorld(browser, '/learn', { as: 'owner' });
    await owner.getByRole('button', { name: 'Your account' }).click();
    await expect(owner.getByRole('menuitem', { name: 'Team Hub' })).toBeVisible();
    await owner.context().close();
  });

  test('staff previewing as a learner see the preview banner with Exit Preview @parity:SH-10', async ({ browser }) => {
    const page = await openWorld(browser, '/learn?preview=agent', { as: 'admin' });
    await expect(
      page.getByRole('button', { name: /Exit Preview/i }).or(page.getByRole('link', { name: /Exit Preview/i })),
    ).toBeVisible();
    await page.context().close();
  });

  test('the masquerade layer wraps the new shell: its banner, and a write is blocked @parity:SH-11', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn/week/1?masquerade=demo');
    await expect(page.getByRole('region', { name: 'Masquerade session' })).toBeVisible();
    await expect(sidebar(page)).toBeVisible();
    // D-210: the step is the v6 page, drawn without the sidebar; the masquerade banner still wraps it.
    await visit(page, '/learn/week/1/step/1?masquerade=demo');
    await expect(page.getByRole('region', { name: 'Masquerade session' })).toBeVisible();
    await page.getByRole('button', { name: 'Mark step done' }).click();
    await expect(page.getByRole('dialog', { name: 'Blocked while masquerading' })).toBeVisible();
    await page.context().close();
  });

  test('toasts and confetti: finishing a week’s last step celebrates @parity:SH-13', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/week/1/step/1');
    for (let n = 1; n <= 6; n++) {
      await visit(page, `/learn/week/1/step/${n}`);
      await page.getByRole('button', { name: 'Mark step done' }).click();
      await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
    }
    // The sixth step's mutation answers a toast and confetti (`toggleStep`'s effects), drawn by the shell's providers.
    await expect(page.locator('[role="status"], [role="alert"]').filter({ hasText: /\S/ }).first()).toBeVisible();
    await expect(page.locator('div[aria-hidden="true"][style*="position: fixed"]')).not.toHaveCount(0);
    await page.context().close();
  });

  test('a screen whose files a deploy removed reloads the page once, then opens @parity:SH-14', async ({ browser }) => {
    const page = await openWorld(browser, '/learn');
    let documents = 1;
    page.on('request', (req) => {
      if (req.isNavigationRequest() && req.frame() === page.mainFrame()) documents++;
    });
    documents = 0;
    await page.route(/\/assets\/Schedule-[\w-]+\.(?:js|css)$/, (route) =>
      documents === 0 ? route.fulfill({ status: 404, body: 'Not found' }) : route.continue(),
    );
    await sidebar(page).getByRole('link', { name: 'Schedule', exact: true }).click();
    await expect.poll(() => documents).toBe(1);
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(h1(page)).toHaveText('Schedule');
    await expect(page.getByText('Unexpected Application Error')).toHaveCount(0);
    await page.context().close();
  });

  test('Escape closes the account menu and the phone drawer @parity:SH-15', async ({ browser }) => {
    const page = await openWorld(browser, '/learn');
    await page.getByRole('button', { name: 'Your account' }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await page.context().close();
    const phone = await openWorld(browser, '/learn', { width: 390, height: 844 });
    await phone.getByRole('button', { name: 'Open menu' }).click();
    await expect(phone.locator('[role="dialog"][data-drawer="open"]')).toBeVisible();
    await phone.keyboard.press('Escape');
    await expect(phone.locator('[data-drawer="open"]')).toHaveCount(0);
    await phone.context().close();
  });
});

test.describe('learner parity: Home (KEPT)', () => {
  test('progress: the hero’s Continue step with its bar, a card per week with its state, the nav’s status @parity:D-5 @parity:D-8 @parity:K-11', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn');
    const hero = page.getByRole('region', { name: 'Fill In Your Intake and Name Your Operator' });
    await expect(hero.getByRole('link', { name: 'Continue step 1' })).toHaveAttribute('href', '/learn/week/0/step/1');
    await expect(hero.getByRole('img', { name: /0 of 8 steps done/ })).toBeVisible();
    const cards = page.getByRole('region', { name: 'Your AI employees' });
    // One card per course week (Week 0 to 8): open ones say their state, locked ones their opening date.
    await expect(
      cards.getByRole('link', {
        name: /^(Foundations|Where the Money Goes|Leads That Pay|Numbers on the 5th|Protect the Pipeline|Coach from Evidence|Delegate an Outcome|Make the Workflow Repeatable|Sustain and Expand),/,
      }),
    ).toHaveCount(9);
    await expect(cards.getByRole('link', { name: 'Where the Money Goes, Not started' })).toHaveAttribute(
      'href',
      '/learn/week/1',
    );
    await expect(
      cards.getByRole('link', { name: 'Leads That Pay, Opens Dec 9' }).getByRole('img', { name: 'Locked' }),
    ).toBeVisible();
    await expect(cards.getByRole('link', { name: 'Schedule' })).toHaveAttribute('href', '/learn/schedule');
    await page.context().close();
  });

  test('the cohort card: office hours to the Schedule, support by email; Get help in the nav @parity:D-9', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn');
    const cohort = page.getByRole('region', { name: 'Your cohort' });
    const hours = cohort.getByRole('link', { name: /Office Hours/ });
    await expect(hours).toBeVisible();
    await hours.click();
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(h1(page)).toHaveText(/^(Sessions|Schedule)$/);
    await visit(page, '/learn');
    await expect(
      page.getByRole('region', { name: 'Your cohort' }).getByRole('link', { name: 'support@amplifiedimpact.io' }),
    ).toHaveAttribute('href', 'mailto:support@amplifiedimpact.io');
    await expect(sidebar(page).getByRole('link', { name: 'Get help' })).toHaveAttribute(
      'href',
      'mailto:support@amplifiedimpact.io',
    );
    await page.context().close();
  });

  test('Coming up: the next three sessions, Add all to calendar, and the way to the Schedule @parity:D-11 @parity:S-6', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn');
    const up = page.getByRole('region', { name: 'Coming up' });
    await expect(up.getByRole('link')).toHaveCount(3);
    await expect(up.getByRole('link').nth(1)).toContainText('Office Hours');
    const download = page.waitForEvent('download');
    await up.getByRole('button', { name: 'Add all to calendar' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.ics$/);
    await up.getByRole('link').first().click();
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(h1(page)).toHaveText(/^(Sessions|Schedule)$/);
    await page.context().close();
  });

  test('the hero counts down to the next live build, with its date @parity:D-7', async ({ browser }) => {
    const page = await openWorld(browser, '/learn');
    await expect(page.getByRole('timer', { name: '5 days, 1 hrs, 59 min' })).toBeVisible();
    await expect(page.getByRole('main').getByText('Wed, Dec 9 · 12:00 PM MT (1:00 PM CT)').first()).toBeVisible();
    await page.context().close();
  });

  test('a paused two-pay course: Home says so and opens Manage Billing @parity:D-12 @parity:G-6', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn', { audience: 'paused' });
    await expect(page.getByText('Your AI Accelerator is paused until your payment goes through.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Manage Billing' })).toHaveAttribute('href', '/api/billing/portal');
    await page.context().close();
  });

  test('a course that failed to load says so @parity:D-13', async ({ browser }) => {
    const page = await openWorld(browser, '/learn', { audience: 'failed' });
    await expect(page.getByText('Your course didn’t load. Refresh the page to try again.')).toBeVisible();
    await page.context().close();
  });
});

test.describe('learner parity: a week and the step player (KEPT)', () => {
  test('the week kit lists the week’s published files @parity:E-12', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/week/1');
    await expect(page.getByRole('region', { name: 'Week 1 kit' }).getByText(KIT_RESOURCE.title)).toBeVisible();
    await page.context().close();
  });

  test('the steps: done, current, to do; Mark step done toggles @parity:E-16', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/week/1/step/1');
    // The button says what a click does (E-16: "Undo" once the step is done), so its label carries the
    // state; a button whose name changes takes no `aria-pressed` as well.
    const mark = page.getByRole('button', { name: /^(Mark step done|Undo)$/ });
    await expect(mark).toHaveAccessibleName('Mark step done');
    await mark.click();
    await expect(mark).toHaveAccessibleName('Undo');
    await expect(
      page
        .getByRole('navigation', { name: 'Where the Money Goes steps' })
        .getByRole('link', { name: /^Step 1, Run Map Your Spend, done/ }),
    ).toBeVisible();
    await mark.click();
    await expect(mark).toHaveAccessibleName('Mark step done');
    await page.context().close();
  });

  test('a locked week: its title, question, outcome, opening date and sessions, with Add all @parity:E-19 @parity:K-16', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn/week/3');
    await expect(h1(page)).toHaveText('Numbers on the 5th');
    await expect(
      page.getByText(
        'Get last month’s numbers against your standard every month, without anyone building a spreadsheet.',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'What did we make last month, and what do I do about it?' }),
    ).toBeVisible();
    await expect(page.getByText(/Opens Wed, Dec 16/)).toBeVisible();
    const live = page.getByRole('region', { name: 'Build it live' });
    await expect(live).toContainText('Monthly Numbers Live Build');
    await expect(live.getByRole('button', { name: 'Add all to calendar' })).toBeVisible();
    await page.context().close();
  });

  test('the step player’s Next and Previous, and the week page’s Continue @parity:E-20', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/week/1/step/1');
    await page.getByRole('link', { name: 'Next step' }).click();
    await expect(page).toHaveURL(/\/learn\/week\/1\/step\/2/);
    await expect(h1(page)).toHaveText('Answer the Flags');
    // D-210: the v6 page has no Previous button: every step is a link on its step rail, so the step before is one there.
    await page.getByRole('navigation', { name: 'Where the Money Goes steps' }).getByRole('link', { name: /^Step 1,/ }).click();
    await expect(page).toHaveURL(/\/learn\/week\/1\/step\/1/);
    await visit(page, '/learn/week/1');
    await expect(page.getByRole('link', { name: 'Continue step 1' })).toHaveAttribute('href', '/learn/week/1/step/1');
    await page.context().close();
  });

  test('the week’s steps open in the step player, and its skills link to the library @parity:K-5', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn/week/0');
    const kit = page.getByRole('region', { name: 'Week 0 kit' });
    await expect(kit.getByRole('link', { name: /AI Brain Setup/ })).toHaveAttribute(
      'href',
      '/learn/skills/ai-brain-setup',
    );
    await page
      .getByRole('region', { name: 'Eight steps' })
      .getByRole('link', { name: /^Step 4, Get Your AI Ready/ })
      .click();
    await expect(h1(page)).toHaveText('Get Your AI Ready');
    await page.context().close();
  });

  test('Week 0 (the old Before Week 1) is its eight steps @parity:K-9', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/week/0', { now: 'prelaunch' });
    const steps = page.getByRole('region', { name: 'Eight steps' }).getByRole('link');
    await expect(steps).toHaveCount(8);
    for (const title of [
      'Fill In Your Intake and Name Your Operator',
      'Watch the Orientation',
      'Connect Your Data',
      'Lock the Guardrails',
    ])
      await expect(steps.filter({ hasText: title })).toHaveCount(1);
    await page.context().close();
  });
});

test.describe('learner parity: found beyond the inventory', () => {
  test('a course week’s page names the browser tab after the week @parity:X-2', async ({ browser }) => {
    // Today's `/course/week-1` sets "Week 1 · Where the Money Goes · Amplified AI Accelerator" (Course.tsx:477).
    const page = await openWorld(browser, '/course/week-1');
    await expect(page).toHaveTitle(/Where the Money Goes · Amplified AI Accelerator$/);
    await page.context().close();
  });
});

test.describe('learner parity: the Schedule (KEPT)', () => {
  test('every session by week, and a month calendar @parity:S-1', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/schedule');
    const weeks = page.getByRole('region', { name: 'Nine weeks' });
    await expect(weeks.getByRole('link', { name: /^Week \d+, / })).toHaveCount(9);
    await page.getByRole('navigation', { name: 'View' }).getByRole('link', { name: 'Calendar' }).click();
    await expect(page).toHaveURL(/view=calendar/);
    await expect(page.getByText('December 2026').first()).toBeVisible();
    await page.context().close();
  });

  test('Add to calendar per session, and Add all as the .ics route @parity:S-5 @parity:A-17', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/schedule');
    await expect(page.getByRole('link', { name: 'Add all to calendar' })).toHaveAttribute(
      'href',
      '/calendar/schedule.ics',
    );
    const next = page.getByRole('region', { name: 'Lead Source Review Live Build' });
    const download = page.waitForEvent('download');
    await next.getByRole('button', { name: 'Add to calendar' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.ics$/);
    await page.context().close();
  });

  test('the holiday break note, from the course @parity:S-8', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/schedule');
    await expect(page.getByRole('note').filter({ hasText: 'Holiday break' })).toContainText(
      'No sessions on Dec 23 or Dec 30.',
    );
    await page.context().close();
  });
});

test.describe('learner parity: Team Hub, the Vault and Account (KEPT)', () => {
  test('Team Hub: invite with its inline errors, and a member’s drawer @parity:T-2', async ({ browser }) => {
    const page = await openWorld(browser, '/team', { as: 'owner' });
    await page.getByRole('button', { name: 'Invite Member' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole('button', { name: /Send|Invite/ })
      .last()
      .click();
    await expect(dialog.getByText(/email/i).first()).toBeVisible();
    await page.keyboard.press('Escape');
    await page
      .getByRole('table', { name: 'Team Activity' })
      .getByRole('row', { name: /Priya Shah/ })
      .click();
    await expect(page.locator('[data-drawer="open"]')).toBeVisible();
    await page.context().close();
  });

  test('Team Hub’s Export CSV downloads the roster @parity:X-1', async ({ browser }) => {
    const page = await openWorld(browser, '/team', { as: 'owner' });
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.csv$/);
    await page.context().close();
  });

  test('the Vault: filters, a download, a Team-only lock with its Upgrade @parity:V-1', async ({ browser }) => {
    const page = await openWorld(browser, '/vault');
    await page.getByRole('button', { name: /^Lead Generation Scripts/ }).click();
    await expect(page.getByRole('button', { name: /^Lead Generation Scripts/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText('Speed-to-Lead Text Library')).toBeVisible();
    await expect(page.getByText('Inspection Deadline Tracker')).toHaveCount(0);
    await page.getByRole('button', { name: /^All/ }).first().click();
    await expect(page.getByRole('button', { name: 'Upgrade' }).first()).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).first().click();
    expect((await download).suggestedFilename()).toBeTruthy();
    await page.context().close();
  });

  test('the Vault is in the nav once the course is open, and locked only before launch @parity:V-2', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn');
    await expect(sidebar(page).getByRole('link', { name: 'Resource vault' })).toBeVisible();
    await page.context().close();
    const before = await openWorld(browser, '/learn', { now: 'prelaunch' });
    await expect(sidebar(before).getByRole('button', { name: /Resource vault/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await before.context().close();
  });

  test('the new Account page: plan, seats, billing, profile and what’s included @parity:AC-2 @parity:L-7', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn/account', { as: 'owner' });
    await expect(h1(page)).toHaveText('Account');
    const plan = page.getByRole('region', { name: 'Amplified AI Accelerator' });
    await expect(plan.getByRole('link', { name: 'Manage billing' })).toHaveAttribute('href', '/api/billing/portal');
    await expect(plan).toContainText('of 7 in use');
    const profile = page.getByRole('region', { name: 'Profile' });
    await expect(profile.getByRole('textbox', { name: 'Full name' })).toHaveValue('Alex Morgan');
    await expect(profile.getByRole('textbox', { name: 'Email' })).toHaveValue('alex@northlinerealty.com');
    await expect(profile.getByRole('textbox', { name: 'Full name' })).not.toBeEditable();
    await expect(page.getByRole('region', { name: 'What’s included' })).toBeVisible();
    await page.context().close();
  });

  test('Account offers no Resend invite @parity:AC-3', async ({ browser }) => {
    const page = await openWorld(browser, '/learn/account', { as: 'owner' });
    await expect(page.getByRole('button', { name: /Resend/ })).toHaveCount(0);
    await page.context().close();
  });
});
