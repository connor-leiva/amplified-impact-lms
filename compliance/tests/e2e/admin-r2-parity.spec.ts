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
import {
  ALLOWED_EXCEPTION_CELLS,
  APPROVED_EXCEPTIONS,
  EXCEPTION_CEILING_LIMIT_PCT,
  approvedException,
  ceilingText,
  exceptionProblems,
  passesException,
} from '../../lib/admin-r2-exceptions';

// Admin redesign R2 pixel parity (D-160, BUILD-SPEC § 6). Run with `pnpm parity:admin-r2`; it has
// its own config (`compliance/admin-r2.config.ts`), and the main config ignores this file, so the
// `parity`, `parity-http` and `e2e` projects are unchanged. See `lib/admin-r2.ts` for the rule.

const masks = loadMasks();
/** A cell is enforced when it is in ENFORCED or is an approved exception (D-160, `admin-r2-exceptions.ts`). */
const isEnforced = (cell: string) => ENFORCED.includes(cell) || !!approvedException(cell);

test.describe('admin-r2 setup', () => {
  test('enforced cells all have a built route', () => {
    const enforced = [...ENFORCED, ...APPROVED_EXCEPTIONS.map((e) => e.cell)];
    const unbuilt = enforced.filter((c) => !SCREENS.some((s) => WIDTHS.some((w) => cellId(s, w) === c && ROUTES[s])));
    expect(unbuilt, 'an enforced cell must be a built screen × width').toEqual([]);
  });

  // D-160, Connor, Nov 16, 2026, 8:27 AM MST (decision A): the only parity exceptions allowed are the
  // three 390 cells whose sole diff is the 15px vs 16px phone key-facts text. The list is closed.
  test('approved exceptions are decision A’s closed list', () => {
    const cells = APPROVED_EXCEPTIONS.map((e) => e.cell);
    expect([...ALLOWED_EXCEPTION_CELLS].sort()).toEqual(['cohorts-sessions-390', 'user-390', 'workspace-detail-390']);
    expect(cells.every((c) => (ALLOWED_EXCEPTION_CELLS as readonly string[]).includes(c)), `only ${ALLOWED_EXCEPTION_CELLS.join(', ')}`).toBe(true);
    expect(new Set(cells).size, 'no cell listed twice').toBe(cells.length);
    expect(exceptionProblems()).toEqual([]);
    const manifest = new Map(readManifest().map((r) => [r.file, r]));
    for (const e of APPROVED_EXCEPTIONS) {
      expect(e.width, `${e.cell} is 390 wide`).toBe(390);
      expect(ENFORCED, `${e.cell} is enforced at its ceiling, not by the 0.1% rule`).not.toContain(e.cell);
      const ref = manifest.get(`${e.cell}.png`);
      expect(ref && `${ref.width}×${ref.height}`, `${e.cell}: the recorded dims are the ref's`).toBe(`${e.width}×${e.height}`);
      expect((100 * e.ceilingPx) / (e.width * e.height), `${e.cell}: ceiling under ${EXCEPTION_CEILING_LIMIT_PCT}%`).toBeLessThan(
        EXCEPTION_CEILING_LIMIT_PCT,
      );
    }
    // The closed list rejects anything else: another cell, another width, a ceiling at 0.5% or more.
    const base = APPROVED_EXCEPTIONS[0]!;
    expect(exceptionProblems([{ ...base, cell: 'roles-390' as never }])).not.toEqual([]);
    expect(exceptionProblems([{ ...base, cell: 'cohorts-sessions-1440' as never, width: 1440 as never }])).not.toEqual([]);
    expect(exceptionProblems([{ ...base, ceilingPx: Math.ceil(0.005 * base.width * base.height), ceilingPct: 0.5 }])).not.toEqual([]);
    expect(exceptionProblems([base, base])).not.toEqual([]);
    // A listed cell passes only with identical dims and at most its ceiling.
    const dims = `${base.width}×${base.height}`;
    expect(passesException(base, { dimsOk: true, appDims: dims, diffPx: base.ceilingPx })).toBe(true);
    expect(passesException(base, { dimsOk: true, appDims: dims, diffPx: base.ceilingPx + 1 })).toBe(false);
    expect(passesException(base, { dimsOk: false, appDims: `${base.width}×${base.height + 1}`, diffPx: undefined })).toBe(false);
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
      const exception = approvedException(cell);
      const enforced = isEnforced(cell);
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
          // An approved exception (D-160) passes at or under its recorded ceiling with identical dims;
          // every other cell by the 0.1% rule.
          const pass = exception ? passesException(exception, r) : r.pass;
          writeCell({
            cell,
            screen,
            width,
            status: pass ? 'pass' : 'fail',
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
          test.info().annotations.push({
            type: pass ? (exception ? 'parity pass (approved exception, D-160)' : 'parity pass') : 'parity FAIL',
            description: exception ? `${summary}; ceiling ${ceilingText(exception)}` : summary,
          });
          // Report-only unless enforced: a failing cell that is not enforced is written to the report
          // as FAIL and does not fail the run. An enforced one does.
          if (enforced) {
            expect(r.dimsOk, `${cell}: app ${r.appDims}, ref ${r.refDims}`).toBe(true);
            if (exception)
              expect(pass, `${cell}: ${summary} differ, over its approved ceiling of ${ceilingText(exception)} (D-160)`).toBe(true);
            else expect(r.pass, `${cell}: ${summary} differ, over 0.1%`).toBe(true);
          }
        } finally {
          await ctx.close();
        }
      });
    }
  });
}
