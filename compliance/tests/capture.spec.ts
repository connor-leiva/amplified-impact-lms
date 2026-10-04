import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import { SCENARIOS } from '../lib/scenarios';
import { open } from '../lib/prepare';
import { REGION, MASKS } from '../lib/regions';
import { fingerprint } from '../lib/fingerprint';

// Goldens come ONLY from here, against the unmodified design-reference/.
// Never edit compliance/goldens/ by hand and never regenerate it to make a failing test pass.
const OUT = new URL('../goldens/', import.meta.url);

for (const s of SCENARIOS) {
  test(`capture ${s.id}`, async ({ browser }) => {
    const { ctx, page } = await open(browser, s, 'reference');
    for (const r of s.regions ?? ['page', 'main']) {
      const sel = REGION[r];
      const mask = MASKS.reference.map((m) => page.locator(m));
      const png = sel
        ? await page.locator(sel).first().screenshot({ animations: 'disabled', mask, maskColor: '#FF00FF' })
        : await page.screenshot({ animations: 'disabled', mask, maskColor: '#FF00FF' });
      await fs.writeFile(new URL(`${s.id}.${r}.png`, OUT), png);
      await fs.writeFile(new URL(`${s.id}.${r}.json`, OUT), JSON.stringify(await fingerprint(page, sel), null, 1));
    }
    await ctx.close();
  });
}
