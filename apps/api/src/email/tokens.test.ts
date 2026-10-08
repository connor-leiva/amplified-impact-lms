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

// 75 `:root` custom properties (DECISIONS.md D-003, D-031), less the 10 that are not colours, less
// the 2 that carry alpha and therefore have no hex. Stated as the arithmetic rather than as a bare
// 63 so a future change says which of the three it is.
const NON_COLOUR_TOKENS = [
  'font-sans',
  'font-mono',
  'progress-h',
  'progress-c',
  'shadow-xs',
  'shadow-card',
  'shadow-pop',
  'shadow-drawer',
  'page-pad-x',
  'page-pad-top',
];
const EXPECTED_COUNT = 75 - NON_COLOUR_TOKENS.length - OMITTED_ALPHA_TOKENS.length;

describe('email tokens', () => {
  it('is exactly what scripts/email-tokens.mjs produces today @g8', () => {
    // `--stdout` prints the module and nothing else, so this really is the generator's output and
    // not a comparison of the file with itself. Line endings are normalised because .gitattributes
    // checks the tree out as LF but an editor can still save CRLF locally; the content is the claim.
    const fresh = execFileSync(process.execPath, [SCRIPT, '--stdout'], { encoding: 'utf8' });
    const committed = readFileSync(GENERATED, 'utf8');
    expect(committed.replace(/\r\n/g, '\n')).toBe(fresh.replace(/\r\n/g, '\n'));
  });

  it('matches the token colours Chromium actually paints on the reference @g8', () => {
    // MEASURED, not derived: each token resolved through a probe element on the rebranded
    // reference (Status Token.dc.html, light), painted to a 1×1 canvas and read back as sRGB bytes
    // (2026-10-07, D-031). That is what the browser shows, independently of this generator's own
    // OKLab matrices and transfer function — which is the point: if those were wrong, these move.
    // (Until the rebrand these were D-010's axe-core measurements of the handed-off palette.)
    expect(EMAIL_TOKENS['text-disabled']).toBe('#8a968f'); // --ink-400, a green grey
    expect(EMAIL_TOKENS['ink-500']).toBe('#5b6762'); // --text-tertiary, hue 169
    expect(EMAIL_TOKENS['bg-canvas']).toBe('#f4f2ec'); // --ink-100, a warm ground at hue 91
    expect(EMAIL_TOKENS['action-on-primary']).toBe('#f4f2ec'); // Cream, via --ink-100
  });

  it('resolves the brand palette to the exact hex the brand guide publishes @g8', () => {
    // The second independent oracle: the brand guide's published colour table (D-031). These are
    // the values an email must show, written down by the designer, not computed here.
    expect(EMAIL_TOKENS['text-primary']).toBe('#15211d'); // Ink: "all text and letters on light grounds"
    expect(EMAIL_TOKENS['bg-canvas']).toBe('#f4f2ec'); // Cream: "default light ground"
    expect(EMAIL_TOKENS['action-primary']).toBe('#1f4d40'); // Forest: "buttons"
    expect(EMAIL_TOKENS['text-link']).toBe('#1f4d40'); // Forest; Energy fails AA as text (3.87:1)
    expect(EMAIL_TOKENS['action-on-primary']).toBe('#f4f2ec'); // Cream letters on Forest, 8.55:1
  });

  it('follows var() chains rather than copying them @g8', () => {
    // --bg-canvas -> --ink-100 -> oklch(0.961 0.008 91): two hops, and the deepest chain in the file.
    expect(EMAIL_TOKENS['bg-canvas']).toBe(EMAIL_TOKENS['ink-100']);
    expect(EMAIL_TOKENS['text-primary']).toBe(EMAIL_TOKENS['ink-900']);
    expect(EMAIL_TOKENS['text-inverse']).toBe(EMAIL_TOKENS['ink-100']);
    expect(EMAIL_TOKENS['status-neutral-bg']).toBe(EMAIL_TOKENS['ink-100']);
    // ...and resolves them to a real colour, not to the string 'var(--ink-100)'.
    expect(EMAIL_TOKENS['bg-canvas']).toBe('#f4f2ec');
  });

  it('evaluates calc() inside oklch() @g8', () => {
    // --status-progress-bg: oklch(0.958 calc(var(--progress-c) * 0.2) var(--progress-h))
    //   = oklch(0.958 0.028 258). A resolver that ignored the calc and used --progress-c whole
    // (0.14) would paint a saturated blue where a pale tint belongs. The accent tokens used to carry
    // this shape too; the brand made them literals (D-031), so the progress pair is now its subject.
    // Measured in Chromium (see above), not taken from the generator.
    expect(EMAIL_TOKENS['status-progress-bg']).toBe('#e6f2ff');
  });

  it('mixes color-mix(in oklch, …) in OKLCH, not in sRGB @g8', () => {
    // --line-subtle: color-mix(in oklch, var(--ink-200) 60%, var(--ink-100)). The result must sit
    // between its two endpoints on every channel — a sign that the weights are the right way round
    // (60% of the DARKER token, so the mix is nearer --ink-200 than --ink-100).
    const mix = EMAIL_TOKENS['line-subtle'];
    expect(mix).toBe('#edeae2'); // measured: Chromium mixes in OKLCH natively and paints this
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
    // These two tinted backgrounds want a channel just over 1. Chromium clamps per channel
    // (measured: it applies no CSS Color 4 § 13 gamut mapping) and so does the generator, but a
    // clamp is a lie about the authored colour, so each one is listed. The handed-off teal accent
    // added four more (it wanted a slightly negative red); every brand colour is inside sRGB, which
    // is why the brand's Forest round-trips to its published hex exactly (D-031).
    expect([...GAMUT_CLAMPED_TOKENS]).toEqual(['status-progress-bg', 'status-attention-bg']);
    // A clamped channel lands exactly on the rail, which is what makes it visible here.
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
    expect(EMAIL_TOKENS['text-primary']).toBe('#15211d');
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
