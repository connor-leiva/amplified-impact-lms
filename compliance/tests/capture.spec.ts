import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import { SCENARIOS } from '../lib/scenarios';
import { open } from '../lib/prepare';
import { REGION, MASKS } from '../lib/regions';
import { fingerprint } from '../lib/fingerprint';
import { ensurePngDir, jsonPath, pngPath } from '../lib/goldens';

// Goldens come ONLY from here, against the unmodified design-reference/.
// Never edit compliance/goldens/ by hand and never regenerate it to make a failing test pass.
//
// Screenshots go to compliance/goldens/<platform>/ and fingerprints to compliance/goldens/ —
// see lib/goldens.ts for why, with the measurements. A capture on one platform therefore leaves
// every other platform's screenshots untouched, which is what keeps the authoritative Linux set
// from being quietly replaced by a developer's run.
test.beforeAll(ensurePngDir);

for (const s of SCENARIOS) {
  test(`capture ${s.id}`, async ({ browser }) => {
    const { ctx, page } = await open(browser, s, 'reference');
    for (const r of s.regions ?? ['page', 'main']) {
      const sel = REGION[r];
      const mask = MASKS.reference.map((m) => page.locator(m));
      const png = sel
        ? await page.locator(sel).first().screenshot({ animations: 'disabled', mask, maskColor: '#FF00FF' })
        : await page.screenshot({ animations: 'disabled', mask, maskColor: '#FF00FF' });
      // Hyphen, never a dot: Playwright's toMatchSnapshot sanitizes `.` inside the snapshot name,
      // so a dotted golden would be written here and looked for under a different name in
      // parity.spec.ts. See lib/goldens.ts — both sides must agree, and goldens.test.ts pins it.
      await fs.writeFile(pngPath(`${s.id}-${r}`), png);
      await fs.writeFile(jsonPath(`${s.id}-${r}`), JSON.stringify(await fingerprint(page, sel), null, 1));
    }
    await ctx.close();
  });
}
