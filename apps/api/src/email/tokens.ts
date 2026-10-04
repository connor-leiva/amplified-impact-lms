// GENERATED FILE — DO NOT HAND-EDIT.
//
// Written by scripts/email-tokens.mjs from apps/web/src/styles/tokens.css (the top-level `:root`
// block: light mode, default accent). Regenerate with `node scripts/email-tokens.mjs`.
//
// Phase 08 § 8.1 builds the email templates "with the same tokens as inline hex values, resolved
// from tokens.css light mode", because email clients support neither CSS custom properties nor
// `oklch()`. Every value here is the sRGB byte triple Chromium itself resolves the token to —
// compliance/tests/e2e/email-tokens.spec.ts measures that in a real browser, and
// apps/api/src/email/tokens.test.ts fails if this file drifts from the generator by one byte.
//
// Keys are the custom-property names without their leading `--`, so `EMAIL_TOKENS['text-primary']`
// is `var(--text-primary)` as the web app sees it in light mode.
//
// 63 colour tokens, resolved rather than copied: `var()` chains, `calc()` inside
// `oklch()` and `color-mix(in oklch, …)` are all evaluated from the real token file.

export const EMAIL_TOKENS = Object.freeze({
  'ink-50': '#fbfaf8',
  'ink-100': '#f4f2ef',
  'ink-200': '#e8e6e2',
  'ink-300': '#d4d2ce',
  'ink-400': '#a6a4a0',
  'ink-500': '#6e6b67',
  'ink-600': '#4f4d48',
  'ink-700': '#302e29',
  'ink-800': '#1d1c18',
  'ink-900': '#110f0c',
  paper: '#ffffff',
  'bg-canvas': '#fbfaf8',
  'bg-sidebar': '#f4f2ef',
  'bg-surface': '#ffffff',
  'bg-sunken': '#fbfaf8',
  'bg-raised': '#ffffff',
  'bg-hover': '#f4f2ef',
  'bg-selected': '#f4f2ef',
  'bg-inverse': '#110f0c',
  'bg-poster': '#110f0c',
  'line-subtle': '#ecebe8',
  'line-default': '#e8e6e2',
  'line-strong': '#d4d2ce',
  'text-primary': '#110f0c',
  'text-secondary': '#4f4d48',
  'text-tertiary': '#6e6b67',
  'text-disabled': '#a6a4a0',
  'text-inverse': '#ffffff',
  'action-primary': '#006663',
  'action-primary-hover': '#005553',
  'action-on-primary': '#ffffff',
  'action-primary-tint': '#dff6f4',
  'action-primary-line': '#a7d5d2',
  'text-link': '#00605e',
  'text-link-hover': '#004a48',
  'action-secondary': '#ffffff',
  'action-secondary-hover': '#f4f2ef',
  'action-secondary-line': '#d4d2ce',
  'seg-track': '#f4f2ef',
  'seg-active': '#ffffff',
  track: '#e8e6e2',
  'status-success': '#419547',
  'status-success-text': '#2c6a31',
  'status-success-bg': '#e5f7e5',
  'status-success-line': '#b5deb5',
  'status-success-on': '#110f0c',
  'status-progress': '#3c73c5',
  'status-progress-text': '#245bab',
  'status-progress-bg': '#e6f2ff',
  'status-progress-line': '#b5d0f7',
  'status-neutral': '#a6a4a0',
  'status-neutral-text': '#4f4d48',
  'status-neutral-bg': '#f4f2ef',
  'status-neutral-line': '#e8e6e2',
  'status-attention': '#d24f39',
  'status-attention-text': '#a83825',
  'status-attention-bg': '#ffeee9',
  'status-attention-line': '#f9c7bc',
  'access-locked': '#e8a63d',
  'access-locked-text': '#8a5619',
  'access-locked-bg': '#fef3dc',
  'access-locked-line': '#f0cf98',
  'access-locked-on': '#110f0c',
} as const);

export type EmailTokenName = keyof typeof EMAIL_TOKENS;

/**
 * Section 8.1: Hanken Grotesk with a system-sans fallback. The first family comes from
 * `--font-sans`; the rest replaces tokens.css's `ui-sans-serif, system-ui`, which mail clients do
 * not resolve, with the real system faces.
 */
export const EMAIL_FONT_STACK =
  "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Colour tokens deliberately NOT exported, because they carry alpha and there is no hex for that:
 * `#rrggbbaa` is not understood by Outlook or Gmail's web client. Both describe something an email
 * does not have — a modal scrim and a keyboard focus ring — so neither is composited over a guessed
 * backdrop. A template that needs translucency must composite against a known backdrop itself.
 */
export const OMITTED_ALPHA_TOKENS = Object.freeze(['bg-overlay', 'focus-ring'] as const);

/**
 * Tokens whose OKLCH value is outside sRGB and was clamped per channel to fit. Listed rather than
 * silently mangled. The clamp is not an approximation of what browsers do — it is what Chromium
 * does (it applies no CSS Color 4 § 13 gamut mapping), verified by the e2e oracle on every run.
 */
export const GAMUT_CLAMPED_TOKENS = Object.freeze([
  'action-primary',
  'action-primary-hover',
  'text-link',
  'text-link-hover',
  'status-progress-bg',
  'status-attention-bg',
] as const);
