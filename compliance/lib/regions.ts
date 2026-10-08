export const REGION = {
  page: null, // full viewport
  sidebar: 'aside[aria-label="Primary"]',
  header: 'header:has(nav[aria-label="Breadcrumb"])',
  main: 'main',
  dialog: '[role="dialog"]',
  drawer: '[data-drawer="open"], aside:not([aria-label="Primary"])[style*="translateX(0"]',
} as const;

// No region is masked. Until the rebrand the brand row was: both builds drew empty placeholder slots
// and the real logo was meant to arrive later through VITE_BRAND_* env vars, so it was masked to
// keep a dropped-in logo from failing a test. Now the reference and the app draw the SAME committed
// SVG files at the same size (D-031), so the logo is compared like any other pixel. Removing a mask
// only tightens the harness; ADDING one still needs a narrowly scoped DECISIONS.md entry (CLAUDE.md).
//
// A pixel diff cannot reliably see the WRONG theme variant (Ink letters for Cream on a 161×34 logo
// is well under 1% of the sidebar region), so tests/e2e/brand.spec.ts asserts that explicitly.
export const MASKS: { reference: string[]; app: string[] } = { reference: [], app: [] };

// Prototype-only chrome that never exists in the app's fixture build.
export const REFERENCE_HIDE_CSS = `
  header [role="group"][aria-label="Demo controls"],
  header button[aria-expanded] { display: none !important; }
`;
