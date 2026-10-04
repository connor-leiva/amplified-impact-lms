import { test, expect } from '@playwright/test';
import { SCENARIOS } from '../lib/scenarios';
import { open } from '../lib/prepare';
import { REGION } from '../lib/regions';

// Gate 0: proves the harness can drive every reference scenario deterministically,
// that the reference renders without errors, that its fonts are loaded, and that
// every region a scenario captures actually exists in the prototype.
for (const s of SCENARIOS)
  test(`reference renders ${s.id} @g0`, async ({ browser }) => {
    const { ctx, page } = await open(browser, s, 'reference');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    expect(await page.evaluate(() => document.fonts.check('14px "Hanken Grotesk"'))).toBe(true);
    for (const r of s.regions ?? ['page', 'main'])
      if (REGION[r]) await expect(page.locator(REGION[r]!).first()).toBeVisible();
    expect(errors).toEqual([]);
    await ctx.close();
  });
