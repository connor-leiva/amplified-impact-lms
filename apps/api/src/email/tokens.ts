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
  'ink-50': '#fbfaf7',
  'ink-100': '#f4f2ec',
  'ink-200': '#e9e5db',
  'ink-300': '#d9d5ca',
  'ink-400': '#8a968f',
  'ink-500': '#5b6762',
  'ink-600': '#3e4a45',
  'ink-700': '#35423d',
  'ink-800': '#222f2a',
  'ink-900': '#15211d',
  paper: '#ffffff',
  'bg-canvas': '#f4f2ec',
  'bg-sidebar': '#ffffff',
  'bg-surface': '#ffffff',
  'bg-sunken': '#f4f2ec',
  'bg-raised': '#ffffff',
  'bg-hover': '#f4f2ec',
  'bg-selected': '#f4f2ec',
  'bg-inverse': '#15211d',
  'bg-poster': '#15211d',
  'line-subtle': '#edeae2',
  'line-default': '#e9e5db',
  'line-strong': '#d9d5ca',
  'text-primary': '#15211d',
  'text-secondary': '#3e4a45',
  'text-tertiary': '#5b6762',
  'text-disabled': '#8a968f',
  'text-inverse': '#f4f2ec',
  'action-primary': '#1f4d40',
  'action-primary-hover': '#123b30',
  'action-on-primary': '#f4f2ec',
  'action-primary-tint': '#e3efe8',
  'action-primary-line': '#b7d2c5',
  'text-link': '#1f4d40',
  'text-link-hover': '#15211d',
  'action-secondary': '#ffffff',
  'action-secondary-hover': '#f4f2ec',
  'action-secondary-line': '#d9d5ca',
  'seg-track': '#f4f2ec',
  'seg-active': '#ffffff',
  track: '#e9e5db',
  'status-success': '#419547',
  'status-success-text': '#2c6a31',
  'status-success-bg': '#e5f7e5',
  'status-success-line': '#b5deb5',
  'status-success-on': '#09120f',
  'status-progress': '#3c73c5',
  'status-progress-text': '#245bab',
  'status-progress-bg': '#e6f2ff',
  'status-progress-line': '#b5d0f7',
  'status-neutral': '#8a968f',
  'status-neutral-text': '#3e4a45',
  'status-neutral-bg': '#f4f2ec',
  'status-neutral-line': '#e9e5db',
  'status-attention': '#d24f39',
  'status-attention-text': '#a83825',
  'status-attention-bg': '#ffeee9',
  'status-attention-line': '#f9c7bc',
  'access-locked': '#e8a63d',
  'access-locked-text': '#8a5619',
  'access-locked-bg': '#fef3dc',
  'access-locked-line': '#f0cf98',
  'access-locked-on': '#15211d',
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
export const GAMUT_CLAMPED_TOKENS = Object.freeze(['status-progress-bg', 'status-attention-bg'] as const);
