import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { SCENARIOS } from '../lib/scenarios';
import { open } from '../lib/prepare';
import { REGION, MASKS } from '../lib/regions';
import { fingerprint } from '../lib/fingerprint';
import { expectAccessible } from '../lib/a11y';

const GATE = Number(process.env.GATE ?? 99);

for (const s of SCENARIOS.filter((x) => x.gate <= GATE)) {
  test(`${s.id} @g${s.gate}`, async ({ browser }) => {
    const { ctx, page } = await open(browser, s, 'app');
    for (const r of s.regions ?? ['page', 'main']) {
      const sel = REGION[r];
      const mask = MASKS.app.map((m) => page.locator(m));
      const png = sel
        ? await page.locator(sel).first().screenshot({ animations: 'disabled', mask, maskColor: '#FF00FF' })
        : await page.screenshot({ animations: 'disabled', mask, maskColor: '#FF00FF' });
      expect.soft(png, `${s.id} ${r} pixels`).toMatchSnapshot(`${s.id}.${r}.png`);
      const ref = JSON.parse(await fs.readFile(new URL(`../goldens/${s.id}.${r}.json`, import.meta.url), 'utf8'));
      expect.soft(await fingerprint(page, sel), `${s.id} ${r} copy + typography`).toEqual(ref);
    }
    await expectAccessible(page);
    await ctx.close();
  });
}
