// Phase 08 § 8.1 — the email colour table.
//
// `tokens.ts` is generated, so the thing most worth guarding is not any one hex value: it is that
// the COMMITTED file still agrees with the generator. An email is the only surface in this product
// with no parity screenshot and no golden, so a tokens.css change that left the templates on last
// month's palette would ship silently and look fine in every test we have. The first test below
// re-runs `scripts/email-tokens.mjs` and fails unless its output is the committed file, byte for
// byte — that is the whole contract.
//
// The rest pins the maths and the export shape. Four of the spot-checked values are not computed
// expectations at all: they were measured in a real browser and recorded in DECISIONS.md D-010
// (the colour-contrast open question), so they are an independent oracle that happens to already
// live in this repository. compliance/tests/e2e/email-tokens.spec.ts re-measures all 63 in
// Chromium; this file is what runs when there is no browser.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EMAIL_TOKENS, EMAIL_FONT_STACK, OMITTED_ALPHA_TOKENS, GAMUT_CLAMPED_TOKENS } from './tokens';

const SCRIPT = fileURLToPath(new URL('../../../../scripts/email-tokens.mjs', import.meta.url));
const GENERATED = fileURLToPath(new URL('./tokens.ts', import.meta.url));
const TOKENS_CSS = fileURLToPath(new URL('../../../web/src/styles/tokens.css', import.meta.url));

// 77 `:root` custom properties (DECISIONS.md D-003), less the 12 that are not colours, less the 2
// that carry alpha and therefore have no hex. Stated as the arithmetic rather than as a bare 63 so
// a future change says which of the three it is.
const NON_COLOUR_TOKENS = [
  'font-sans',
  'font-mono',
  'accent-h',
  'accent-c',
  'progress-h',
  'progress-c',
  'shadow-xs',
  'shadow-card',
  'shadow-pop',
  'shadow-drawer',
  'page-pad-x',
  'page-pad-top',
];
const EXPECTED_COUNT = 77 - NON_COLOUR_TOKENS.length - OMITTED_ALPHA_TOKENS.length;

describe('email tokens', () => {
  it('is exactly what scripts/email-tokens.mjs produces today @g8', () => {
    // `--stdout` prints the module and nothing else, so this really is the generator's output and
    // not a comparison of the file with itself. Line endings are normalised because .gitattributes
    // checks the tree out as LF but an editor can still save CRLF locally; the content is the claim.
    const fresh = execFileSync(process.execPath, [SCRIPT, '--stdout'], { encoding: 'utf8' });
    const committed = readFileSync(GENERATED, 'utf8');
    expect(committed.replace(/\r\n/g, '\n')).toBe(fresh.replace(/\r\n/g, '\n'));
  });

  it('matches the four token colours a browser measured for D-010 @g8', () => {
    // DECISIONS.md D-010 recorded these from axe-core running in Chromium against the reference —
    // measured, not derived, and written down before this generator existed. If the OKLab matrices
    // or the sRGB transfer function below were wrong, these are the values that would move.
    expect(EMAIL_TOKENS['text-disabled']).toBe('#a6a4a0'); // --ink-400, light
    expect(EMAIL_TOKENS['bg-sidebar']).toBe('#f4f2ef'); // --ink-100, light
    expect(EMAIL_TOKENS['action-on-primary']).toBe('#ffffff'); // --paper
    expect(EMAIL_TOKENS['ink-500']).toBe('#6e6b67'); // the dark theme's --text-disabled
  });

  it('follows var() chains rather than copying them @g8', () => {
    // --bg-canvas -> --ink-50 -> oklch(0.985 0.003 85): two hops, and the deepest chain in the file.
    expect(EMAIL_TOKENS['bg-canvas']).toBe(EMAIL_TOKENS['ink-50']);
    expect(EMAIL_TOKENS['text-primary']).toBe(EMAIL_TOKENS['ink-900']);
    expect(EMAIL_TOKENS['text-inverse']).toBe(EMAIL_TOKENS['paper']);
    expect(EMAIL_TOKENS['status-neutral-bg']).toBe(EMAIL_TOKENS['ink-100']);
    // ...and resolves them to a real colour, not to the string 'var(--ink-50)'.
    expect(EMAIL_TOKENS['bg-canvas']).toBe('#fbfaf8');
  });

  it('evaluates calc() inside oklch() @g8', () => {
    // --action-primary-tint: oklch(0.955 calc(var(--accent-c) * 0.3) var(--accent-h))
    //   = oklch(0.955 0.024 192). A resolver that ignored the calc and used --accent-c whole (0.08)
    // would give #d9f7f4 — close enough to look right in review, which is why it is pinned.
    expect(EMAIL_TOKENS['action-primary-tint']).toBe('#dff6f4');
    expect(EMAIL_TOKENS['action-primary-line']).toBe('#a7d5d2');
    // --status-progress-bg uses the same shape on a different pair of channels.
    expect(EMAIL_TOKENS['status-progress-bg']).toBe('#e6f2ff');
  });

  it('mixes color-mix(in oklch, …) in OKLCH, not in sRGB @g8', () => {
    // --line-subtle: color-mix(in oklch, var(--ink-200) 60%, var(--ink-100)). The result must sit
    // between its two endpoints on every channel — a sign that the weights are the right way round
    // (60% of the DARKER token, so the mix is nearer --ink-200 than --ink-100).
    const mix = EMAIL_TOKENS['line-subtle'];
    expect(mix).toBe('#ecebe8');
    const byte = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
    for (let i = 0; i < 3; i++) {
      expect(byte(mix, i)).toBeGreaterThan(byte(EMAIL_TOKENS['ink-200'], i));
      expect(byte(mix, i)).toBeLessThan(byte(EMAIL_TOKENS['ink-100'], i));
    }
  });

  it('omits the two tokens that carry alpha, and says so @g8', () => {
    // --bg-overlay is oklch(… / 0.32); --focus-ring is color-mix(…, transparent), which resolves to
    // --action-primary at 32% alpha. Neither has a hex equivalent, so neither is exported. The names
    // are exported instead, so the omission is a recorded decision rather than a hole.
    expect([...OMITTED_ALPHA_TOKENS]).toEqual(['bg-overlay', 'focus-ring']);
    for (const name of OMITTED_ALPHA_TOKENS) expect(EMAIL_TOKENS).not.toHaveProperty(name);
  });

  it('names every token it had to clamp into sRGB @g8', () => {
    // These six ask for a channel outside sRGB — the teal accents want a slightly negative red, and
    // the two tinted backgrounds want a channel just over 1. Chromium clamps per channel (measured:
    // it applies no CSS Color 4 § 13 gamut mapping) and so does the generator, but a clamp is a lie
    // about the authored colour, so each one is listed.
    expect([...GAMUT_CLAMPED_TOKENS]).toEqual([
      'action-primary',
      'action-primary-hover',
      'text-link',
      'text-link-hover',
      'status-progress-bg',
      'status-attention-bg',
    ]);
    // A clamped channel lands exactly on the rail, which is what makes it visible here.
    expect(EMAIL_TOKENS['action-primary']).toBe('#006663');
    expect(EMAIL_TOKENS['status-attention-bg']).toBe('#ffeee9');
    for (const name of GAMUT_CLAMPED_TOKENS) expect(EMAIL_TOKENS).toHaveProperty(name);
  });

  it('exports one lowercase six-digit hex per colour token and nothing else @g8', () => {
    const entries = Object.entries(EMAIL_TOKENS);
    expect(entries.length).toBe(EXPECTED_COUNT);
    for (const [name, value] of entries) {
      // Six digits, never eight: an alpha hex is not understood by Outlook or Gmail's web client.
      expect(value, name).toMatch(/^#[0-9a-f]{6}$/);
      // Keys drop the leading `--`, so a template reads EMAIL_TOKENS['text-primary'].
      expect(name.startsWith('--'), name).toBe(false);
    }
    // A shadow contains a colour but is not one, and neither is a font stack, a bare hue or a
    // length. If any of these ever appeared here it would mean the "exactly one colour" test in the
    // resolver had started accepting lists.
    for (const name of NON_COLOUR_TOKENS) expect(EMAIL_TOKENS).not.toHaveProperty(name);
  });

  it('exports only tokens that tokens.css actually declares @g8', () => {
    // Independent of the generator: read the token file and look for each name. Catches an invented
    // or renamed key, which the byte-equality test alone would happily accept.
    const css = readFileSync(TOKENS_CSS, 'utf8');
    for (const name of Object.keys(EMAIL_TOKENS)) expect(css, name).toContain(`--${name}:`);
  });

  it('is frozen, so a template cannot reassign a brand colour @g8', () => {
    expect(Object.isFrozen(EMAIL_TOKENS)).toBe(true);
    expect(Object.isFrozen(OMITTED_ALPHA_TOKENS)).toBe(true);
    expect(Object.isFrozen(GAMUT_CLAMPED_TOKENS)).toBe(true);
    // Not a type-level guarantee: the API bundles to JS, where `as const` is gone.
    const mutable = EMAIL_TOKENS as unknown as Record<string, string>;
    expect(() => {
      mutable['text-primary'] = '#ff0000';
    }).toThrow(TypeError);
    expect(EMAIL_TOKENS['text-primary']).toBe('#110f0c');
  });

  it('leads the font stack with tokens.css own first family @g8', () => {
    // Section 8.1: Hanken Grotesk with a system-sans fallback. The first family is taken from
    // --font-sans rather than hard-coded, so if the reference ever changes the default typeface the
    // emails follow it instead of quietly disagreeing with every other surface.
    const declared = /--font-sans:([^;}]+)/.exec(readFileSync(TOKENS_CSS, 'utf8'))?.[1] ?? '';
    const firstFamily = declared.split(',')[0]!.trim();
    expect(firstFamily).toBe("'Hanken Grotesk'");
    expect(EMAIL_FONT_STACK.startsWith(`${firstFamily}, `)).toBe(true);
    // The tail is spelled-out system faces: tokens.css's `ui-sans-serif`/`system-ui` keywords mean
    // nothing to a mail client, and the stack must still end at a generic family.
    expect(EMAIL_FONT_STACK).not.toContain('ui-sans-serif');
    expect(EMAIL_FONT_STACK).not.toContain('system-ui');
    expect(EMAIL_FONT_STACK.endsWith('sans-serif')).toBe(true);
    // Double quotes would have to be escaped in a style="" attribute; the families use single ones.
    expect(EMAIL_FONT_STACK).not.toContain('"');
  });
});
