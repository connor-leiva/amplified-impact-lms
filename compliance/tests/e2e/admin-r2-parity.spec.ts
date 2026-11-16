import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import {
  ENFORCED,
  OUT_DIR,
  REF_DIR,
  ROUTES,
  SCREENS,
  WIDTHS,
  capture,
  cellId,
  compare,
  loadMasks,
  maskRects,
  openCell,
  readManifest,
  writeCell,
} from '../../lib/admin-r2';

// Admin redesign R2 pixel parity (D-160, BUILD-SPEC § 6). Run with `pnpm parity:admin-r2`; it has
// its own config (`compliance/admin-r2.config.ts`), and the main config ignores this file, so the
// `parity`, `parity-http` and `e2e` projects are unchanged. See `lib/admin-r2.ts` for the rule.

const masks = loadMasks();

test.describe('admin-r2 setup', () => {
  test('enforced cells all have a built route', () => {
    const unbuilt = ENFORCED.filter((c) => !SCREENS.some((s) => WIDTHS.some((w) => cellId(s, w) === c && ROUTES[s])));
    expect(unbuilt, 'an enforced cell must be a built screen × width').toEqual([]);
  });

  // The refs are the oracle. Every PNG MANIFEST.tsv lists must exist with exactly its width × height:
  // that is what proves the regenerated set has the signed-off layout (BUILD-SPEC § 1).
  test('refs match MANIFEST.tsv', () => {
    const rows = readManifest();
    expect(rows).toHaveLength(SCREENS.length * WIDTHS.length);
    const bad: string[] = [];
    const local: string[] = ['file\twidth\theight\tsha256'];
    for (const r of rows) {
      const p = join(REF_DIR, r.file);
      if (!existsSync(p)) {
        bad.push(`${r.file}: missing`);
        continue;
      }
      const buf = readFileSync(p);
      const png = PNG.sync.read(buf);
      if (png.width !== r.width || png.height !== r.height) bad.push(`${r.file}: ${png.width}×${png.height}, manifest ${r.width}×${r.height}`);
      local.push(`${r.file}\t${png.width}\t${png.height}\t${createHash('sha256').update(buf).digest('hex')}`);
    }
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, 'refs.json'), JSON.stringify({ total: rows.length, bad }, null, 2) + '\n');
    writeFileSync(join(OUT_DIR, 'MANIFEST.local.tsv'), local.join('\n') + '\n');
    expect(bad, 'every ref must have the manifest width × height').toEqual([]);
  });

  // The R2 renderer draws the two glyphs the self-hosted Geist lacks from fixed fonts (D-160, option
  // A, `harness/fonts.conf`): → from FreeSans, ⌘ from IPAGothic. Probe it the way a screen sees it,
  // through the mockup's own stack with Geist absent, against each font named outright. A browser
  // launched without the file draws → from WenQuanYi Zen Hei, whose arrow is wider, and fails here.
  test('renderer', async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await page.setContent(
        '<span id="a1">→</span><span id="a2" style="font-family:FreeSans">→</span>' +
          '<span id="c1">⌘</span><span id="c2" style="font-family:IPAGothic">⌘</span>' +
          '<style>span{font:400 100px Geist,system-ui,sans-serif;white-space:pre}</style>',
      );
      const w = await page.evaluate(() =>
        Object.fromEntries(['a1', 'a2', 'c1', 'c2'].map((id) => [id, document.getElementById(id)!.getBoundingClientRect().width])),
      );
      mkdirSync(OUT_DIR, { recursive: true });
      writeFileSync(join(OUT_DIR, 'renderer.json'), JSON.stringify({ browser: browser.version(), glyphWidths: w }) + '\n');
      expect(w.a1, '→ must come from FreeSans (harness/fonts.conf)').toBe(w.a2);
      expect(w.c1, '⌘ must come from IPAGothic').toBe(w.c2);
    } finally {
      await page.close();
    }
  });
});

for (const screen of SCREENS) {
  test.describe(screen, () => {
    for (const width of WIDTHS) {
      const cell = cellId(screen, width);
      const route = ROUTES[screen];
      const enforced = ENFORCED.includes(cell);
      test(`${cell}`, async ({ browser }) => {
        if (!route) {
          writeCell({ cell, screen, width, status: 'not built', enforced });
          test.skip(true, 'not built');
          return;
        }
        const { ctx, page } = await openCell(browser, route, width);
        try {
          const mine = masks.filter((m) => m.screen === screen && m.widths.includes(width));
          const rects = await maskRects(page, mine);
          const shot = await capture(page, route, width);
          const r = compare(cell, shot, rects);
          writeCell({
            cell,
            screen,
            width,
            status: r.pass ? 'pass' : 'fail',
            enforced,
            dimsOk: r.dimsOk,
            appDims: r.appDims,
            refDims: r.refDims,
            diffPx: r.diffPx,
            diffPct: r.diffPct,
            masks: mine.length,
            browser: browser.version(),
          });
          const summary = r.dimsOk ? `${r.diffPct!.toFixed(4)}% (${r.diffPx} px)` : `dims ${r.appDims} vs ref ${r.refDims}`;
          test.info().annotations.push({ type: r.pass ? 'parity pass' : 'parity FAIL', description: summary });
          // Report-only unless enforced: a failing cell that is not enforced is written to the report
          // as FAIL and does not fail the run. An enforced one does.
          if (enforced) {
            expect(r.dimsOk, `${cell}: app ${r.appDims}, ref ${r.refDims}`).toBe(true);
            expect(r.pass, `${cell}: ${summary} differ, over 0.1%`).toBe(true);
          }
        } finally {
          await ctx.close();
        }
      });
    }
  });
}
