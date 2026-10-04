import { test, expect, type Page } from '@playwright/test';
import { REF_BASE } from '../../lib/prepare';
import { EMAIL_TOKENS, OMITTED_ALPHA_TOKENS } from '../../../apps/api/src/email/tokens';

/**
 * Phase 08 § 8.1 — the oracle for the email colour table.
 *
 * `scripts/email-tokens.mjs` implements OKLab -> linear sRGB -> gamma-encoded sRGB by hand, because
 * email clients understand neither custom properties nor `oklch()` and the templates need literal
 * hex. Specified maths is still hand-written maths: a transposed matrix row, a transfer function
 * applied in the wrong direction or a `calc()` quietly ignored would all produce plausible-looking
 * colours, and `apps/api/src/email/tokens.test.ts` would happily agree with them, because it
 * compares the generator against itself.
 *
 * So this test asks the browser instead. It loads the REFERENCE prototype — the pixel oracle for
 * every other gate, and the source tokens.css was generated from — and for each of the 63 exported
 * tokens it takes Chromium's own resolved sRGB bytes and compares them to the committed hex.
 *
 * If the browser and the script disagree, the SCRIPT is wrong.
 *
 * Two deliberate choices in how the bytes are obtained:
 *   - The token is read through a real property (`color: var(--token)`), not as a custom-property
 *     string. Custom properties are substituted but not evaluated, so `getComputedStyle` hands back
 *     `oklch(0.955 calc(0.08 * 0.3) 192)` verbatim; `color` is resolved at computed-value time, so
 *     var(), calc() and color-mix() are all already done by the engine.
 *   - The resolved colour is then painted into a canvas and the pixel read back, because that is
 *     the only way to get the exact 8-bit sRGB triple. `getComputedStyle` keeps a wide-gamut colour
 *     in its own space — it returns `oklch(…)` unchanged — so it cannot answer the question at all.
 */

// The reference renders tokens on every page; Status Token.dc.html is the smallest one that does.
// (Same page and server conventions as tokens.spec.ts, which compares the app's tokens to these.)
const REF_URL = `${REF_BASE}/${encodeURIComponent('Status Token.dc.html')}`;

/**
 * Why a tolerance at all, when the comparison is of integers?
 *
 * Chromium does the matrix multiplies and the transfer function in float32 (Blink stores colour
 * components as floats); the generator does them in float64. A channel that lands within half a bit
 * of a byte boundary can therefore round either way, and that would be flakiness rather than a
 * defect. So a channel may differ by 1.
 *
 * But a blanket ±1 is NOT enough on its own, and this was measured rather than assumed: changing
 * one digit of one OKLab matrix constant (4.0767416621 -> 4.0867416621 — a plausible typo) moves 30
 * of the 63 tokens by exactly one byte of red, and a suite that tolerated ±1 everywhere passed it
 * happily. Every email would have shipped a subtly wrong palette with the oracle green.
 *
 * What separates the two cases is not the size of the error, it is how many tokens show it. A
 * float32 rounding boundary is a singleton; a wrong matrix row, an inverted transfer function or an
 * ignored `calc()` moves a whole family at once. So: no channel may be off by more than 1, AND at
 * most one token may be off at all. All 63 agree exactly today, so the allowance is unused — it is
 * there so that one future boundary case is a note in this file rather than a red suite.
 */
const TOLERANCE = 1;
const MAX_INEXACT_TOKENS = 1;

type Measured = {
  name: string;
  declared: string;
  resolved: string;
  parsed: boolean;
  rgba: [number, number, number, number];
};

/** Open the reference in light mode, with the default accent, which is the skin emails are sent in. */
async function openReference(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem('ai-lms-prefs', JSON.stringify({ theme: 'light', tz: null, phase: 'live' })),
  );
  await page.goto(REF_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => !document.body.innerText.includes('Loading…'));
  // Nothing here depends on a font, but the prototype swaps `data-theme` during boot.
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
}

async function measure(page: Page, names: string[]): Promise<Measured[]> {
  return page.evaluate((list: string[]) => {
    const root = getComputedStyle(document.documentElement);
    const probe = document.createElement('span');
    document.body.append(probe);
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    // A colour the canvas will never be asked for. Canvas2D silently ignores an unparseable
    // fillStyle and keeps the previous one, so without this an unsupported colour syntax would be
    // read as whatever the last token happened to be — a passing test measuring nothing.
    const SENTINEL = 'rgb(1, 2, 3)';

    return list.map((name) => {
      const declared = root.getPropertyValue(`--${name}`).trim();
      probe.style.color = '';
      probe.style.color = `var(--${name})`;
      const resolved = getComputedStyle(probe).color;

      ctx.fillStyle = SENTINEL;
      const before = ctx.fillStyle;
      ctx.fillStyle = resolved;
      const parsed = ctx.fillStyle !== before;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;
      return { name, declared, resolved, parsed, rgba: [r, g, b, a] as [number, number, number, number] };
    });
  }, names);
}

const bytesOf = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

test('every email token matches Chromium own resolved sRGB bytes @g8', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  await openReference(page);

  const names = Object.keys(EMAIL_TOKENS);
  // Not a count contract — tokens.test.ts owns that. This only stops an empty or truncated export
  // from passing vacuously, which is the one way a loop-over-everything test can lie.
  expect(names.length).toBeGreaterThan(50);

  const measured = await measure(page, names);
  const problems: string[] = [];
  const inexact: string[] = [];
  for (const m of measured) {
    const want = bytesOf(EMAIL_TOKENS[m.name as keyof typeof EMAIL_TOKENS]);
    if (!m.declared) {
      problems.push(`--${m.name}: not declared in the reference :root`);
      continue;
    }
    if (!m.parsed) {
      problems.push(`--${m.name}: Chromium could not parse its resolved value "${m.resolved}"`);
      continue;
    }
    // An exported token must be fully opaque: the two that are not are omitted from the export, and
    // this is what would catch a third one slipping in as a lying six-digit hex.
    if (m.rgba[3] !== 255) {
      problems.push(`--${m.name}: resolved to alpha ${m.rgba[3]} ("${m.resolved}"), so it has no hex`);
      continue;
    }
    const delta = [0, 1, 2].map((i) => m.rgba[i]! - want[i]!);
    const off = [0, 1, 2].filter((i) => Math.abs(delta[i]!) > 0);
    const where =
      `--${m.name}: browser rgb(${m.rgba.slice(0, 3).join(', ')}) vs generated ` +
      `${EMAIL_TOKENS[m.name as keyof typeof EMAIL_TOKENS]} (rgb(${want.join(', ')})) — ` +
      `channel${off.length > 1 ? 's' : ''} ${off.map((i) => 'rgb'[i]).join('')} by ` +
      `${off.map((i) => delta[i]).join(', ')}; resolved "${m.resolved}"`;
    if (off.some((i) => Math.abs(delta[i]!) > TOLERANCE)) problems.push(where);
    else if (off.length) inexact.push(where);
  }
  // See MAX_INEXACT_TOKENS: several tokens off by a bit is a systematic error in the maths, not the
  // float32 rounding boundary the tolerance exists for.
  if (inexact.length > MAX_INEXACT_TOKENS)
    problems.push(
      `${inexact.length} tokens agree only within ±${TOLERANCE}, which is a systematic error, ` +
        `not rounding:\n    ${inexact.join('\n    ')}`,
    );
  // All of them at once: if the maths is wrong it is wrong for a whole family of colours, and the
  // list of which ones is the diagnosis.
  expect(problems).toEqual([]);
  await ctx.close();
});

test('the two omitted tokens really are translucent in the browser @g8', async ({ browser }) => {
  // The generator omits --bg-overlay and --focus-ring because they carry alpha and `#rrggbbaa` is
  // not understood by Outlook or Gmail's web client. That is a decision about the tokens, so it has
  // to be checked against the tokens: if either ever became opaque, omitting it would just be a
  // missing colour. --focus-ring is the interesting one — it is
  // `color-mix(in oklch, var(--action-primary) 32%, transparent)`, and mixing with `transparent`
  // yields the accent at 32% alpha only because transparent's chroma is 0, which makes its hue a
  // missing component that takes the accent's. Get that wrong and you get a magenta focus ring.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  await openReference(page);

  const measured = await measure(page, [...OMITTED_ALPHA_TOKENS]);
  expect(measured.map((m) => m.name)).toEqual(['bg-overlay', 'focus-ring']);
  for (const m of measured) {
    expect(m.declared, `--${m.name} must exist in the reference`).not.toBe('');
    expect(m.parsed, `--${m.name} resolved to "${m.resolved}"`).toBe(true);
    // Both are authored at 32%: 0.32 x 255 = 81.6 -> 82.
    expect(Math.abs(m.rgba[3] - 82), `--${m.name} alpha was ${m.rgba[3]} ("${m.resolved}")`).toBeLessThanOrEqual(
      TOLERANCE,
    );
  }
  await ctx.close();
});
