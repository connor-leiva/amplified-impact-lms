import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CELLS_DIR, ENFORCED, MASKS_FILE, OUT_DIR, ROUTES, SCREENS, WIDTHS, cellId, loadMasks, type CellResult } from './admin-r2';
import { APPROVED_EXCEPTIONS, EXCEPTION_DECISION, EXCEPTION_REASON, approvedException, ceilingText } from './admin-r2-exceptions';

const readJson = <T>(p: string): T | null => (existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : null);

function head(): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Global teardown for `parity:admin-r2`: gather each cell's result into
 * `compliance/parity/out/report.md`, the screen × width table every R2 PR posts (BUILD-SPEC § 6.4).
 * A cell with no route is "not built". A cell that has a route but no result (its test crashed) is
 * "no result", which reads as a failure, never as a pass. An approved exception (D-160,
 * `admin-r2-exceptions.ts`) is enforced at its recorded ceiling and reads "PASS (approved exception,
 * D-160)" when it is at or under it.
 */
export default function report() {
  mkdirSync(OUT_DIR, { recursive: true });
  const renderer = readJson<{ browser: string }>(join(OUT_DIR, 'renderer.json'));
  const refs = readJson<{ total: number; bad: string[] }>(join(OUT_DIR, 'refs.json'));
  const masks = loadMasks();
  const counts = { pass: 0, fail: 0, 'not built': 0, 'no result': 0 };
  const cellText = (id: string, r: CellResult | null, built: boolean, enforced: boolean) => {
    const exception = approvedException(id);
    const tag = exception ? ` (enforced; approved-exception ceiling ${ceilingText(exception)})` : enforced ? ' (enforced)' : '';
    if (!built) {
      counts['not built']++;
      return 'not built';
    }
    if (!r) {
      counts['no result']++;
      return `**no result**${tag}`;
    }
    counts[r.status]++;
    const verdict = r.status === 'pass' ? (exception ? 'PASS (approved exception, D-160)' : 'PASS') : '**FAIL**';
    if (!r.dimsOk) return `${verdict}: dims FAIL (app ${r.appDims}, ref ${r.refDims})${tag}`;
    return `${verdict}: ${r.diffPct!.toFixed(4)}% · ${r.diffPx} px · dims OK${tag}`;
  };
  const rows = SCREENS.map((s) => {
    const cells = WIDTHS.map((w) => {
      const id = cellId(s, w);
      return cellText(id, readJson<CellResult>(join(CELLS_DIR, `${id}.json`)), !!ROUTES[s], ENFORCED.includes(id) || !!approvedException(id));
    });
    return `| ${s} | ${cells.join(' | ')} |`;
  });
  const md = [
    '# parity:admin-r2',
    '',
    `- Head: \`${head()}\``,
    `- Renderer: ${renderer?.browser ?? 'unknown'} (Playwright \`channel: 'chromium'\`, DPR 1), fallback fonts from \`design-reference/admin-redesign-r2/harness/fonts.conf\` (→ FreeSans, ⌘ IPAGothic)`,
    `- Rule: pixelmatch threshold 0.1, \`includeAA: false\`; pass = identical width × height AND ≤ 0.1% differing pixels. An approved exception passes with identical width × height AND at most its recorded ceiling.`,
    `- Refs: ${refs ? (refs.bad.length ? `**${refs.bad.length} of ${refs.total} do not match MANIFEST.tsv**: ${refs.bad.join('; ')}` : `${refs.total}/${refs.total} match MANIFEST.tsv width × height`) : 'not checked'}`,
    `- Masks (${MASKS_FILE.replace(/.*\/compliance\//, 'compliance/')}): ${masks.length ? masks.map((m) => `${m.screen} ${m.widths.join('/')} ${m.selector ?? JSON.stringify(m.rect)}: ${m.reason}`).join('; ') : 'none'}`,
    `- Approved exceptions (${EXCEPTION_DECISION}; \`compliance/lib/admin-r2-exceptions.ts\`): ${APPROVED_EXCEPTIONS.length ? `${APPROVED_EXCEPTIONS.map((e) => `${e.cell} ≤ ${ceilingText(e)}, ${e.width}×${e.height} (#${e.pr})`).join('; ')}. Reason: ${EXCEPTION_REASON}.` : 'none'}`,
    `- Enforced cells: ${ENFORCED.length + APPROVED_EXCEPTIONS.length ? [...ENFORCED, ...APPROVED_EXCEPTIONS.map((e) => `${e.cell} (approved exception)`)].join(', ') : 'none (report-only)'}`,
    `- Cells: ${counts.pass} pass, ${counts.fail} fail, ${counts['not built']} not built${counts['no result'] ? `, ${counts['no result']} no result` : ''}`,
    '',
    `| screen | ${WIDTHS.join(' | ')} |`,
    `|---|${WIDTHS.map(() => '---').join('|')}|`,
    ...rows,
    '',
    'Evidence for each built cell: `app/<cell>.png` (the capture), `diff/<cell>.png` (pixelmatch output, when the dimensions match) and `side/<cell>.png` (app left, ref right).',
    '',
  ].join('\n');
  writeFileSync(join(OUT_DIR, 'report.md'), md);
  console.log(`\nparity:admin-r2 report: ${join(OUT_DIR, 'report.md')}\n  ${counts.pass} pass, ${counts.fail} fail, ${counts['not built']} not built`);
}
