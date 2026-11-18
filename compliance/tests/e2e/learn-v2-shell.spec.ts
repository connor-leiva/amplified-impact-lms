import { test, expect, type Page } from '@playwright/test';
import { expectAccessible } from '../../lib/a11y';
import { guides, OPEN_GUIDE, openWorld, visit, worldContext } from '../parity/world';

/**
 * D-185: the learner shell's Theme and its desktop Collapse sidebar, restored from the current portal, in
 * the fixture build as course learners in the learner parity world (`?as=agent`, Jamie; `?as=owner`,
 * Alex), both on one browser, so "remembered per person" is two people on one device.
 *
 *   theme     the account menu's Light / Dark switches the whole frame, stays across a reload for that
 *             person and not for the other; a Dark saved in today's portal draws the new portal dark.
 *   dark a11y every /learn screen in dark passes the same axe checks as light, at 1440 and 390, and no
 *             colour in the frame is a light value left over (every one is a design token's dark value).
 *   sidebar   on a desktop, Collapse sidebar makes the sidebar the rail and Expand sidebar brings it back,
 *             remembered per person; at 1024 the rail is automatic, with no toggle; the toggle has a
 *             visible focus.
 */

const frame = (page: Page) => page.locator('[data-learner-v2]');
const aside = (page: Page) => page.locator('aside[aria-label="Primary"]');
const width = (page: Page) => aside(page).evaluate((el) => Math.round(el.getBoundingClientRect().width));

async function chooseTheme(page: Page, name: 'Light' | 'Dark') {
  await page.getByRole('button', { name: 'Your account' }).click();
  await expect(page.getByRole('group', { name: 'Theme' })).toBeVisible();
  await page.getByRole('menuitemradio', { name }).click();
}

/** Every element in the frame drawn in an sRGB colour: on the dark theme there must be none, because every
 * token's dark value is an oklch colour, so one left over is a light R2 value the dark theme missed. */
const leftovers = (page: Page) =>
  frame(page).evaluate((root) => {
    const out: string[] = [];
    for (const el of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      for (const prop of ['color', 'background-color', 'border-top-color'] as const) {
        const v = cs.getPropertyValue(prop);
        // `transparent` is rgba(0, 0, 0, 0); a border of zero width draws nothing.
        if (!/^rgba?\(/.test(v) || /^rgba\(0, 0, 0, 0\)$/.test(v)) continue;
        if (prop === 'border-top-color' && cs.borderTopWidth === '0px') continue;
        out.push(`${el.tagName.toLowerCase()}.${el.className} ${prop}: ${v}`);
      }
    }
    return [...new Set(out)].slice(0, 20);
  });

test.describe('learner portal v2, the shell’s Theme (D-185) @g9', () => {
  test('the account menu switches to Dark, the whole frame, and it stays for that person and not for another @parity:SH-5', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn');
    await expect(frame(page)).toHaveAttribute('data-lv-theme', 'light');
    await chooseTheme(page, 'Dark');
    await expect(frame(page)).toHaveAttribute('data-lv-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await leftovers(page)).toEqual([]);
    // The menu says which is in use in words (aria-checked) and with a check, never colour alone.
    await page.getByRole('button', { name: 'Your account' }).click();
    await expect(page.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Escape');

    await visit(page, '/learn/schedule');
    await expect(frame(page)).toHaveAttribute('data-lv-theme', 'dark');
    await page.reload();
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(frame(page)).toHaveAttribute('data-lv-theme', 'dark');

    // Alex, on the same browser, has chosen nothing: light.
    await visit(page, '/learn', 'owner');
    await expect(frame(page)).toHaveAttribute('data-lv-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    // And Jamie's Dark is still Jamie's; Light puts it back.
    await visit(page, '/learn');
    await expect(frame(page)).toHaveAttribute('data-lv-theme', 'dark');
    await chooseTheme(page, 'Light');
    await expect(frame(page)).toHaveAttribute('data-lv-theme', 'light');
    await page.reload();
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(frame(page)).toHaveAttribute('data-lv-theme', 'light');
    await page.context().close();
  });

  test('a Dark saved in today’s portal draws the new portal fully dark @parity:SH-5', async ({ browser }) => {
    const ctx = await worldContext(browser);
    await ctx.addInitScript(() => {
      const p = JSON.parse(localStorage.getItem('ai-lms-prefs') || '{}') as Record<string, unknown>;
      if (!p.darkOnce) localStorage.setItem('ai-lms-prefs', JSON.stringify({ ...p, theme: 'dark', darkOnce: true }));
    });
    const page = await ctx.newPage();
    await visit(page, '/learn');
    await expect(frame(page)).toHaveAttribute('data-lv-theme', 'dark');
    expect(await leftovers(page)).toEqual([]);
    await ctx.close();
  });
});

/** The /learn screens, as the brief lists them. Team Hub and the Vault live under /learn once #172 lands. */
const SCREENS: { name: string; path: string; as?: 'agent' | 'owner'; check: (page: Page) => Promise<void> }[] = [
  { name: 'Home', path: '/learn', check: (p) => expect(p.getByRole('heading', { level: 1 })).toHaveText(/Jamie/) },
  { name: 'a week', path: '/learn/week/2', check: (p) => expect(p.getByRole('heading', { level: 1 })).toBeVisible() },
  {
    name: 'a step',
    path: '/learn/week/1/step/1',
    check: (p) => expect(p.getByRole('heading', { level: 1 })).toBeVisible(),
  },
  {
    name: 'the Schedule',
    path: '/learn/schedule',
    check: (p) => expect(p.getByRole('heading', { level: 1 })).toHaveText('Schedule'),
  },
  {
    name: 'the Schedule’s calendar',
    path: '/learn/schedule?view=calendar',
    check: (p) => expect(p.getByRole('heading', { level: 1 })).toHaveText('Schedule'),
  },
  {
    name: 'the Skill library',
    path: '/learn/skills',
    check: (p) => expect(p.getByRole('heading', { level: 1 })).toBeVisible(),
  },
  {
    name: 'a skill',
    path: `/learn/skills/${OPEN_GUIDE}`,
    check: (p) => expect(p.getByRole('heading', { level: 1 })).toBeVisible(),
  },
  {
    name: 'Account',
    path: '/learn/account',
    check: (p) => expect(p.getByRole('heading', { level: 1 })).toHaveText('Account'),
  },
  {
    name: 'Team Hub',
    path: '/learn/team',
    as: 'owner',
    check: (p) => expect(p.getByRole('heading', { level: 1 })).toHaveText('Team Hub'),
  },
  { name: 'the Vault', path: '/learn/vault', check: (p) => expect(p.getByRole('heading', { level: 1 })).toBeVisible() },
  {
    name: 'the replay player',
    path: '/learn/week/1',
    check: (p) => expect(p.getByRole('heading', { level: 2, name: 'Session replay' })).toBeVisible(),
  },
];

test.describe('learner portal v2 in dark: every screen passes axe (D-185) @g9', () => {
  for (const w of [1440, 390])
    for (const s of SCREENS)
      test(`${s.name} at ${w}, dark: accessible, nothing left light @parity:SH-5`, async ({ browser }) => {
        test.skip(
          s.path.startsWith('/learn/skills/') && !guides,
          'needs the fixture build’s apps/web/dist-private/skill-guides.json',
        );
        const as = s.as ?? 'agent';
        const ctx = await worldContext(browser, { width: w, height: 900, as });
        // This person's own Dark, as the account menu stores it (lib/prefs.ts, D-185).
        const id = as === 'owner' ? 'u_alex' : 'u_jamie';
        await ctx.addInitScript((who) => {
          const p = JSON.parse(localStorage.getItem('ai-lms-prefs') || '{}') as { learner?: Record<string, unknown> };
          localStorage.setItem(
            'ai-lms-prefs',
            JSON.stringify({ ...p, learner: { ...p.learner, [who]: { theme: 'dark' } } }),
          );
        }, id);
        const page = await ctx.newPage();
        await visit(page, s.path, as);
        const at = new URL(page.url()).pathname;
        // Before #172 there is no /learn/team or /learn/vault: the shell sends the address to Home.
        test.skip(
          at !== new URL(s.path, 'http://x').pathname,
          `${s.path} is not a /learn screen on this branch (#172 adds it)`,
        );
        await s.check(page);
        await expect(frame(page)).toHaveAttribute('data-lv-theme', 'dark');
        expect(await leftovers(page)).toEqual([]);
        await expectAccessible(page);
        await ctx.close();
      });
});

test.describe('learner portal v2, the desktop sidebar (D-185) @g9', () => {
  test('Collapse sidebar makes it the rail, Expand sidebar brings it back, remembered per person @parity:SH-6 @parity:MO-3', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn');
    expect(await width(page)).toBe(244);
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect.poll(() => width(page)).toBe(64);
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
    // The rail still names every row (the hidden labels' titles), and the main column takes the room.
    await expect(aside(page).getByRole('link', { name: 'Home', exact: true })).toBeVisible();

    await page.reload();
    await page.waitForSelector('body[data-app-ready="true"]');
    expect(await width(page)).toBe(64);

    await visit(page, '/learn', 'owner');
    expect(await width(page)).toBe(244);
    await visit(page, '/learn');
    expect(await width(page)).toBe(64);
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await expect.poll(() => width(page)).toBe(244);
    await page.reload();
    await page.waitForSelector('body[data-app-ready="true"]');
    expect(await width(page)).toBe(244);
    await page.context().close();
  });

  test('the toggle has a label and a visible focus, in light and dark @parity:SH-6', async ({ browser }) => {
    const page = await openWorld(browser, '/learn');
    for (const theme of ['Light', 'Dark'] as const) {
      await chooseTheme(page, theme);
      await aside(page).getByRole('link', { name: 'Get help' }).focus();
      await page.keyboard.press('Tab');
      const toggle = page.getByRole('button', { name: 'Collapse sidebar' });
      await expect(toggle).toBeFocused();
      expect(await toggle.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
    }
    await expectAccessible(page);
    await page.context().close();
  });

  test('at 1024 the rail is automatic, with no toggle, even for a person who chose the full sidebar @parity:MO-3', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn', { width: 1024 });
    expect(await width(page)).toBe(64);
    await expect(page.getByRole('button', { name: /sidebar$/ })).toHaveCount(0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(() => width(page)).toBe(244);
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
    await page.context().close();
  });
});
