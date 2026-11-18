import { test, expect, type Page } from '@playwright/test';
import { PHONE_BELOW, findings } from './mobile-checks';
import { openWorld, type Audience, type NowKey, type Persona } from './world';

/**
 * The learner parity suite: mobile (Connor's parity brief § 3). The `@lms-mobile` checks (no sideways
 * scroll; on a phone a 16px text floor and 44px targets) at 390, 768 and 1024 for every page the
 * inventory's route rows name, each opened by the address a learner uses and as the audience that has it;
 * the phone drawer as a modal dialog; the phone strip; and Join and the replay player usable at 390.
 *
 * Expected to fail on this branch until claude/learner-pr9b-parity merges: the player at 390 (MO-5).
 */

const WIDTHS = [390, 768, 1024] as const;

/** The inventory's route rows (§ 1, plus the screens they land on), as [address, persona, audience, moment]. */
const ROUTES: readonly [string, Persona, Audience, NowKey][] = [
  ['/', 'agent', 'course', 'week1'],
  ['/learn', 'agent', 'course', 'week1'],
  ['/sessions', 'agent', 'course', 'week1'],
  ['/learn/schedule', 'agent', 'course', 'week1'],
  ['/learn/schedule?view=calendar', 'agent', 'course', 'week1'],
  ['/employees/accelerator-week-1', 'agent', 'course', 'week1'],
  ['/learn/week/1', 'agent', 'course', 'week1'],
  ['/learn/week/1/step/1', 'agent', 'course', 'week1'],
  ['/learn/week/3', 'agent', 'course', 'week1'],
  ['/course', 'agent', 'course', 'week1'],
  ['/team', 'owner', 'course', 'week1'],
  ['/vault', 'agent', 'course', 'week1'],
  ['/skill-library', 'agent', 'course', 'week1'],
  ['/skill-library/ai-brain-setup', 'agent', 'course', 'week1'],
  ['/learn/skills', 'agent', 'course', 'week1'],
  ['/learn/skills/ai-brain-setup', 'agent', 'course', 'week1'],
  ['/learn/account', 'owner', 'course', 'week1'],
  ['/account', 'agent', 'course', 'week1'],
  ['/sign-in', 'agent', 'course', 'week1'],
  ['/set-password?token=tok_set', 'agent', 'course', 'week1'],
  ['/skill-library', 'agent', 'utah', 'week1'],
  ['/skill-library/ai-brain-setup', 'agent', 'utah', 'week1'],
  ['/vault', 'agent', 'utah', 'week1'],
];

test.describe('learner parity: mobile', () => {
  for (const [path, as, audience, now] of ROUTES)
    test(`${path} (${audience}, ${as}) at 390, 768 and 1024: no sideways scroll; on a phone, 16px text and 44px targets @parity:MO-2`, async ({
      browser,
    }) => {
      const report: string[] = [];
      for (const width of WIDTHS) {
        const page = await openWorld(browser, path, {
          as,
          audience,
          now,
          width,
          height: width < PHONE_BELOW ? 844 : 900,
        });
        await page.evaluate(() => document.fonts.ready);
        const f = await findings(page);
        await page.context().close();
        for (const check of width < PHONE_BELOW ? (['overflow', 'font', 'tap'] as const) : (['overflow'] as const))
          if (f[check].length) report.push(`${width} ${check}: ${f[check].slice(0, 6).join('; ')}`);
      }
      expect(report, report.join('\n')).toEqual([]);
    });

  test('the phone drawer is a modal: focus moves in and stays, the page behind is inert, Escape returns focus @parity:MO-1', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn', { width: 390, height: 844 });
    const menu = page.getByRole('button', { name: 'Open menu' });
    await menu.click();
    const drawer = page.locator('[role="dialog"][data-drawer="open"]');
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    await expect(drawer.locator('aside[aria-label="Primary"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused();
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      expect(
        await page.evaluate(() => !!document.activeElement?.closest('[data-drawer="open"]')),
        `Tab ${i + 1} left the drawer`,
      ).toBe(true);
    }
    expect(await page.evaluate(() => (document.querySelector('main')?.closest('[inert]') ?? null) !== null)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-drawer="open"]')).toHaveCount(0);
    await expect(menu).toBeFocused();
    await page.context().close();
  });

  test('the phone strip: the next live build, to the Schedule; while live, Live now and Join @parity:MO-4', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn', { width: 390, height: 844 });
    const strip = page.getByRole('link', { name: /^Next live build · Wed, Dec 9/ });
    await expect(strip).toBeVisible();
    await strip.click();
    await page.waitForSelector('body[data-app-ready="true"]');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^(Sessions|Schedule)$/);
    await page.context().close();
    const live = await openWorld(browser, '/learn', { width: 390, height: 844, now: 's2Live' });
    const status = live.getByRole('status').filter({ hasText: 'Live now' });
    await expect(status).toBeVisible();
    await expect(status.getByRole('button', { name: /^Join/ })).toBeVisible();
    await live.context().close();
  });

  const usable = async (page: Page, name: RegExp) => {
    const target = page.getByRole('button', { name }).filter({ visible: true }).first();
    await expect(target).toBeVisible();
    await expect(target).toBeEnabled();
    const box = await target.boundingBox();
    expect(
      box && box.width >= 43.5 && box.height >= 43.5,
      `${String(name)} is ${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'not laid out'}`,
    ).toBe(true);
  };

  test('Join is usable at 390 inside the window, on Home and the Schedule @parity:MO-5', async ({ browser }) => {
    for (const path of ['/learn', '/learn/schedule']) {
      const page = await openWorld(browser, path, { width: 390, height: 844, now: 's2Minus14' });
      await usable(page, /^Join/);
      await page.context().close();
    }
  });

  test('the replay player is usable at 390: play, seek back, captions, transcript @parity:MO-5', async ({
    browser,
  }) => {
    const page = await openWorld(browser, '/learn/week/1', { width: 390, height: 844 });
    await expect(page.locator('video').first()).toBeAttached();
    await usable(page, /^Play/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(
      0,
    );
    await page.context().close();
  });
});
