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
// --tap and --tap-primary.
const TOKEN_COUNT = 79;

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
  test(`tokens match reference ${JSON.stringify(prefs)} @g1`, async ({ browser }) => {
    // Same viewport on both sides, so the responsive --page-pad-* media queries resolve identically.
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const a = await ctx.newPage();
    const b = await ctx.newPage();
    const ref = await readTokens(a, REF_URL, prefs);
    const app = await readTokens(b, `${APP_BASE}/__tokens`, prefs);
    expect(Object.keys(ref).length).toBe(TOKEN_COUNT);
    expect(app).toEqual(ref);
    await ctx.close();
  });

test('body typography matches the reference @g1', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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
  // D-156: Geist at 16px, the www kit's face and the LMS floor. getComputedStyle keeps the quoting, so
  // the resolved stack reads: Geist, ui-sans-serif, …
  expect(app.family.replace(/["']/g, '')).toMatch(/^Geist,/);
  expect(app.size).toBe('16px');
  expect(app.line).toBe('23.2px');
  await ctx.close();
});
