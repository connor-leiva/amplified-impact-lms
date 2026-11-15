import { test, expect, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';

// The brand logo, by theme (D-031).
//
// The brand row is no longer masked, so parity compares the logo's pixels with the reference's. That
// catches a missing, misplaced or mis-sized logo. It does NOT reliably catch the wrong VARIANT: the
// light lockup's Ink letters and the reversed lockup's Cream letters differ in a few hundred pixels
// of a 248×900 sidebar, well under the 1% tolerance. A dark sidebar showing Ink letters is close to
// invisible, so it is asserted here directly, on every surface that shows the logo.
//
// Each logo file carries its own colours, so the drawing that is VISIBLE is identified by them. Since
// D-156 the expanded sidebar shows the Amplified Impact wordmark (the www kit's Logo 1): near-black
// letters (#0A0D0C) with the Energy (#1F8A5C) ring and dot on light, Cream letters (#F5F5F2) with the
// Energy Bright (#6FD3A5) ring and dot on dark. The favicon tile in the collapsed rail is the same in
// both themes.

const LETTERS = { light: '#0A0D0C', dark: '#F5F5F2' } as const;

async function visibleBrandSvg(page: Page, scope: string): Promise<string> {
  const imgs = page.locator(`${scope} [data-brand-slot] img`);
  const visible: string[] = [];
  for (let i = 0; i < (await imgs.count()); i++) {
    const img = imgs.nth(i);
    if (await img.isVisible()) visible.push((await img.getAttribute('src')) ?? '');
  }
  expect(visible, `exactly one visible logo in ${scope}`).toHaveLength(1);
  const src = visible[0]!;
  // Imported assets of this size are inlined by Vite as a URL-encoded data: URI. Vite also swaps the
  // file's double quotes for single ones so the URI needs no escaping, so quotes are normalised here:
  // the claim is about the colours, not about how the inliner chose to quote them.
  expect(src.startsWith('data:image/svg+xml'), 'the logo is inlined, costing no request').toBe(true);
  return decodeURIComponent(src.slice(src.indexOf(',') + 1)).replace(/'/g, '"').toUpperCase();
}

async function open(page: Page, path: string, prefs: Record<string, string>) {
  await page.addInitScript((p) => localStorage.setItem('ai-lms-prefs', JSON.stringify(p)), prefs);
  await page.goto(`${APP_BASE}${path}`);
  await page.waitForLoadState('networkidle');
}

for (const theme of ['light', 'dark'] as const) {
  test(`the sidebar shows the ${theme} wordmark in the ${theme} theme @g9`, async ({ page }) => {
    await open(page, '/', { theme, sidebar: 'full' });
    const svg = await visibleBrandSvg(page, 'aside[aria-label="Primary"]');
    expect(svg).toContain(`FILL="${LETTERS[theme]}"`);
    expect(svg).not.toContain(`FILL="${LETTERS[theme === 'light' ? 'dark' : 'light']}"`);
    if (theme === 'dark') expect(svg).toContain('#6FD3A5'); // Energy Bright, the reversed hero dot
    else expect(svg).toContain('#1F8A5C'); // Energy, the hero dot on light grounds
  });
}

test('the collapsed rail shows the favicon drawing, in either theme @g9', async ({ page }) => {
  for (const theme of ['light', 'dark'] as const) {
    await open(page, '/', { theme, sidebar: 'rail' });
    const svg = await visibleBrandSvg(page, 'aside[aria-label="Primary"]');
    // Forest tile, Cream "ai", Energy Bright dot: the guide's 16-32 px drawing.
    expect(svg).toContain('#1F4D40');
    expect(svg).toContain('#F4F2EC');
    expect(svg).toContain('#6FD3A5');
  }
});
