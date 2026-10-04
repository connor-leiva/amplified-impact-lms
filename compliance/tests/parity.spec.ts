import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { SCENARIOS } from '../lib/scenarios';
import { open } from '../lib/prepare';
import { REGION, MASKS } from '../lib/regions';
import { fingerprint } from '../lib/fingerprint';
import { expectAccessible } from '../lib/a11y';

const GATE = Number(process.env.GATE ?? 99);

/**
 * Golden file stem. It must contain no `.`: Playwright sanitizes dots inside a snapshot name, so a
 * golden written as `states-light.page.png` is looked for as `states-light-page.png`. When the two
 * disagree Playwright does not fail — it WRITES the app's own render as the expected snapshot, and
 * every later run compares the app against itself. That makes the pixel gate silently vacuous, so
 * the naming is shared from here and the file's existence is asserted below.
 */
const goldenName = (id: string, region: string) => `${id}-${region}`;

async function exists(path: URL) {
  return fs
    .access(path)
    .then(() => true)
    .catch(() => false);
}

for (const s of SCENARIOS.filter((x) => x.gate <= GATE)) {
  test(`${s.id} @g${s.gate}`, async ({ browser }) => {
    const { ctx, page } = await open(browser, s, 'app');
    for (const r of s.regions ?? ['page', 'main']) {
      const sel = REGION[r];
      const stem = goldenName(s.id, r);

      // A missing golden must fail loudly. Letting Playwright create it from the app would golden
      // the very thing under test.
      const pngGolden = new URL(`../goldens/${stem}.png`, import.meta.url);
      const jsonGolden = new URL(`../goldens/${stem}.json`, import.meta.url);
      expect(
        await exists(pngGolden),
        `${stem}.png is missing from compliance/goldens. Run \`pnpm compliance:capture\` against the reference — never let this be written from the app.`,
      ).toBe(true);
      expect(await exists(jsonGolden), `${stem}.json is missing from compliance/goldens. Run \`pnpm compliance:capture\`.`).toBe(true);

      const mask = MASKS.app.map((m) => page.locator(m));
      const png = sel
        ? await page.locator(sel).first().screenshot({ animations: 'disabled', mask, maskColor: '#FF00FF' })
        : await page.screenshot({ animations: 'disabled', mask, maskColor: '#FF00FF' });
      expect.soft(png, `${s.id} ${r} pixels`).toMatchSnapshot(`${stem}.png`);

      const ref = JSON.parse(await fs.readFile(jsonGolden, 'utf8'));
      expect.soft(await fingerprint(page, sel), `${s.id} ${r} copy + typography`).toEqual(ref);
    }
    await expectAccessible(page);
    await ctx.close();
  });
}
