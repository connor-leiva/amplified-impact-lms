import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-239 (ADMIN-SIDEBAR-SPEC.md § 4 and § 7): the admin sidebar's collapse and expand travel, in a real browser.
 * The travel can't be asserted frame by frame, so each case asserts where it LANDS: the layout at rest (no
 * `data-anim`), the column 64 or 244 px wide, the logo's window 26 or 161 px, and no animation still running. The
 * clicks that must land part-way are timed inside the page (`setTimeout`), not from here. Then the rail's fly-out is
 * drawn outside the sidebar, which must not clip at rest, and axe passes on the full sidebar, the rail and the drawer.
 */

const TOGGLE = 'aside[aria-label="Primary"] button[aria-label$=" sidebar"]';

async function openAt(browser: Browser, path: string, width = 1440): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 } });
  const page = await ctx.newPage();
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

/** Where the sidebar is: its layout, whether it is travelling, its width, the logo's window, what still runs. */
const state = (page: Page) =>
  page.evaluate(() => {
    const aside = document.querySelector<HTMLElement>('aside[aria-label="Primary"]')!;
    const logo = aside.querySelector<HTMLElement>('[data-brand-slot]')!;
    const running = document
      .getAnimations()
      .filter((a) => a.playState === 'running' && a.effect instanceof KeyframeEffect && a.effect.target && aside.contains(a.effect.target as Node)).length;
    return {
      mode: aside.dataset.mode,
      anim: aside.dataset.anim ?? null,
      width: Math.round(aside.getBoundingClientRect().width),
      logo: Math.round(logo.getBoundingClientRect().width),
      running,
    };
  });

const RAIL = { mode: 'rail', anim: null, width: 64, logo: 26, running: 0 };
const FULL = { mode: 'full', anim: null, width: 244, logo: 161, running: 0 };

/** Clicks the toggle now, then again after each delay (ms), all timed in the page. */
const clicks = (page: Page, ...after: number[]) =>
  page.evaluate(
    ([sel, delays]) =>
      new Promise<void>((done) => {
        const click = () => document.querySelector<HTMLButtonElement>(sel)!.click();
        click();
        let left = delays.length;
        if (!left) return done();
        for (const d of delays)
          setTimeout(() => {
            click();
            if (--left === 0) done();
          }, d);
      }),
    [TOGGLE, after] as const,
  );

const landsAt = async (page: Page, want: typeof RAIL) => {
  await expect.poll(() => state(page), { timeout: 3_000 }).toEqual(want);
};

test.describe('the admin sidebar’s travel lands cleanly (D-239) @g9 @console', () => {
  test('collapse, then expand: each lands at rest, the logo’s window with it, focus kept on the toggle', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin');
    await landsAt(page, FULL);
    await page.locator(TOGGLE).focus();
    await page.keyboard.press('Enter');
    // It travels: the column narrows at once, the layout follows.
    await expect.poll(async () => (await state(page)).anim).toBe('collapsing');
    await landsAt(page, RAIL);
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-label', 'Expand sidebar');
    await expect(page.locator(TOGGLE)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await state(page)).anim).toBe('expanding');
    await landsAt(page, FULL);
    await expect(page.locator(TOGGLE)).toHaveAttribute('aria-label', 'Collapse sidebar');
    await expect(page.locator(TOGGLE)).toBeFocused();
    await close();
  });

  test('a second click at 60 ms of a collapse turns it round, and it lands full', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin');
    await clicks(page, 60);
    await landsAt(page, FULL);
    await close();
  });

  test('a second click at 260 ms of a collapse (the rail’s layout by then) turns it round, and it lands full', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin');
    await clicks(page, 260);
    await landsAt(page, FULL);
    await close();
  });

  test('a second click at 150 ms of an expand turns it round, and it lands on the rail', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin');
    await clicks(page);
    await landsAt(page, RAIL);
    await clicks(page, 150);
    await landsAt(page, RAIL);
    await close();
  });

  test('three quick clicks land where the third asked: the rail', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin');
    await clicks(page, 40, 80);
    await landsAt(page, RAIL);
    await close();
  });

  test('with reduced motion it switches at once: at rest 60 ms after the click', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await clicks(page);
    await page.waitForTimeout(60);
    expect(await state(page)).toEqual(RAIL);
    await close();
  });

  test('a resize into the laptop band switches at once: at rest 80 ms later, with no travel', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin');
    await landsAt(page, FULL);
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.waitForTimeout(80);
    expect(await state(page)).toEqual(RAIL);
    await close();
  });

  test('in the rail a group’s fly-out is drawn outside the sidebar, which does not clip at rest', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin', 1024);
    await landsAt(page, RAIL);
    const aside = page.locator('aside[aria-label="Primary"]');
    await aside.getByRole('button', { name: 'Operations menu' }).click();
    const menu = page.getByRole('menu', { name: 'Operations' });
    await expect(menu).toBeVisible();
    // The mockup's `.pop.rt`: 12 px right of the row, so it starts on the rail's 1 px edge and runs far past it.
    const [a, m] = [await aside.boundingBox(), await menu.boundingBox()];
    expect(m!.x).toBeGreaterThanOrEqual(a!.x + a!.width - 1);
    expect(m!.x + m!.width).toBeGreaterThan(a!.x + a!.width + 100);
    // Not clipped: past the sidebar's edge, the topmost element at the menu's centre is the menu.
    expect(await menu.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    })).toBe(true);
    await close();
  });
});

test.describe('the admin sidebar passes axe in each form (D-239) @g9 @console', () => {
  for (const [form, width] of [['full', 1440], ['rail', 1024]] as const) {
    test(`the ${form} sidebar`, async ({ browser }) => {
      const { page, close } = await openAt(browser, '/admin/audit', width);
      await expect(page.locator('aside[aria-label="Primary"]')).toHaveAttribute('data-mode', form);
      await expectAccessible(page);
      await close();
    });
  }

  test('the drawer', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/audit', 390);
    await page.getByRole('button', { name: 'Open menu' }).click();
    const drawer = page.locator('[data-drawer="open"][role="dialog"]');
    await expect(drawer.locator('aside[aria-label="Primary"]')).toHaveAttribute('data-mode', 'drawer');
    await expect(drawer.getByRole('button', { name: /sidebar$/ })).toHaveCount(0);
    await expectAccessible(page);
    await close();
  });
});
