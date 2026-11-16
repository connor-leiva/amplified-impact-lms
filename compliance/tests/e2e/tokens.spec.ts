import { test, expect, type Page } from '@playwright/test';
import { REF_BASE, APP_BASE } from '../../lib/prepare';

// Every custom property must resolve to the same computed value in the reference and in the app,
// in each theme that ships. The accent and typeface combinations went with the Brand tweaks (D-031):
// with no rule left to match `data-accent` or `data-font` on either side, keeping them would have
// passed vacuously while still claiming coverage.
const COMBOS: Record<string, string>[] = [{ theme: 'light' }, { theme: 'dark' }];

// The reference renders tokens on every page; Status Token.dc.html is the smallest one that does.
const REF_URL = `${REF_BASE}/${encodeURIComponent('Status Token.dc.html')}`;

// The reference defines exactly 75 :root custom properties: the handed-off 77, less --accent-h and
// --accent-c, which the brand made vestigial (D-003, D-031). The count is asserted so an
// accidentally-truncated tokens.css fails loudly instead of comparing two near-empty objects.
// D-156 added four in styles/lms.css (not tokens.css, which www inlines): --font-ui, --font-ui-mono,
// --tap and --tap-primary. D-160 (R2-1a) added the 13 size tokens scripts/lms-type-scope.mjs generates
// there (--fs-11 … --fs-15, --bx-16 … --bx-22, --lh-16, --lh-18): 92.
const TOKEN_COUNT = 92;

// lms.css gives --tap, --tap-primary and the size tokens their phone values under 768px (D-160), so the
// tokens are compared at a desktop width and at a phone width.
const WIDTHS = [1440, 390] as const;

async function readTokens(page: Page, url: string, prefs: Record<string, string>) {
  await page.addInitScript((p) => localStorage.setItem('ai-lms-prefs', JSON.stringify(p)), prefs);
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const names = new Set<string>();
    for (const sheet of [...document.styleSheets]) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const r of [...rules])
        if (r instanceof CSSStyleRule && r.selectorText.startsWith(':root'))
          for (const p of [...r.style]) if (p.startsWith('--')) names.add(p);
    }
    const cs = getComputedStyle(document.documentElement);
    return Object.fromEntries([...names].sort().map((n) => [n, cs.getPropertyValue(n).trim()]));
  });
}

for (const prefs of COMBOS)
  for (const width of WIDTHS)
    test(`tokens match reference ${JSON.stringify(prefs)}${width === 1440 ? '' : ` at ${width}`} @g1`, async ({
      browser,
    }) => {
      // Same viewport on both sides, so the responsive --page-pad-* media queries resolve identically.
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const a = await ctx.newPage();
      const b = await ctx.newPage();
      const ref = await readTokens(a, REF_URL, prefs);
      const app = await readTokens(b, `${APP_BASE}/__tokens`, prefs);
      expect(Object.keys(ref).length).toBe(TOKEN_COUNT);
      expect(app).toEqual(ref);
      await ctx.close();
    });

// D-156's 16px body is the phone floor: D-160 (R2-1a) scoped it to `max-width: 767px`, so above that the
// body is global.css's 14px / 1.45 again, as before D-156, in Geist.
for (const [width, size, line] of [
  [1440, '14px', '20.3px'],
  [390, '16px', '23.2px'],
] as const)
  test(`body typography matches the reference${width === 1440 ? '' : ` at ${width}`} @g1`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const read = async (url: string) => {
      const page = await ctx.newPage();
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      return page.evaluate(() => {
        const cs = getComputedStyle(document.body);
        return { family: cs.fontFamily, size: cs.fontSize, line: cs.lineHeight };
      });
    };
    const ref = await read(REF_URL);
    const app = await read(`${APP_BASE}/__tokens`);
    expect(app).toEqual(ref);
    // D-156: Geist, the www kit's face, at every width; 16px, the LMS floor, on a phone. getComputedStyle
    // keeps the quoting, so the resolved stack reads: Geist, ui-sans-serif, …
    expect(app.family.replace(/["']/g, '')).toMatch(/^Geist,/);
    expect(app.size).toBe(size);
    expect(app.line).toBe(line);
    await ctx.close();
  });
