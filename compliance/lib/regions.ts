export const REGION = {
  page: null, // full viewport
  sidebar: 'aside[aria-label="Primary"]',
  header: 'header:has(nav[aria-label="Breadcrumb"])',
  main: 'main',
  dialog: '[role="dialog"]',
  drawer: '[data-drawer="open"], aside:not([aria-label="Primary"])[style*="translateX(0"]',
} as const;

// The brand slots render placeholders in both builds. Mask them so a dropped logo never fails a test.
export const MASKS = {
  reference: ['aside [title^="Logo slot"]', 'aside [title^="Wordmark slot"]'],
  app: ['[data-brand-slot]'],
} as const;

// Prototype-only chrome that never exists in the app's fixture build.
export const REFERENCE_HIDE_CSS = `
  header [role="group"][aria-label="Demo controls"],
  header button[aria-expanded] { display: none !important; }
`;
