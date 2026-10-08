// Phase 08 § 8.1: resolve tokens.css LIGHT MODE to inline sRGB hex for the email templates.
//
// WHY THIS EXISTS. Email clients support neither CSS custom properties nor `oklch()`. Gmail strips
// `<style>` entirely in some views, Outlook renders through Word, and every one of them needs a
// literal `#rrggbb` in a `style=""` attribute. `apps/web/src/styles/tokens.css` is written entirely
// in `oklch()`, so the templates cannot reference tokens at all — they need the same colours,
// pre-resolved. Doing that by hand would mean 63 hex values that drift the moment a token changes
// and that nothing would ever notice: an email is the one surface with no parity screenshot.
//
// So the colours are generated from the real token file, committed, and pinned two ways:
//   - apps/api/src/email/tokens.test.ts re-runs this generator and fails unless the committed
//     module is byte-identical, so a tokens.css change cannot leave the emails on stale colours.
//   - compliance/tests/e2e/email-tokens.spec.ts is the oracle: it loads the reference prototype in
//     Chromium and compares every exported hex against the browser's own resolved sRGB bytes. The
//     maths below is only trustworthy because a real browser agrees with it.
//
// `apps/web/src/styles/tokens.css` is GENERATED and verbatim from the reference (CLAUDE.md ›
// Non-negotiables). This script only ever reads it.
//
// Usage:
//   node scripts/email-tokens.mjs            write apps/api/src/email/tokens.ts and print a summary
//   node scripts/email-tokens.mjs --stdout   print the module to stdout and nothing else
//   node scripts/email-tokens.mjs --check    exit 1 if the committed module is out of date
//
// No dependencies beyond node:fs, by design: this runs in CI before anything is installed.
import { readFileSync, writeFileSync } from 'node:fs';

const TOKENS_CSS = new URL('../apps/web/src/styles/tokens.css', import.meta.url);
const GENERATED = new URL('../apps/api/src/email/tokens.ts', import.meta.url);

// The reference declares exactly 75 `:root` custom properties — the handed-off 77 (measured three
// ways, DECISIONS.md D-003) less --accent-h and --accent-c, which the rebrand retired (D-031). D-003
// also pins the number in the Gate 1 token-parity test. It is
// asserted here so a truncated or half-written tokens.css fails loudly instead of quietly shipping
// emails built from the first dozen colours it managed to parse. If a token is ever legitimately
// added to the reference, this number and D-003's move together, in the same PR.
const EXPECTED_ROOT_DECLARATIONS = 75;

// Section 8.1: "Hanken Grotesk with a system-sans fallback". tokens.css falls back through
// `ui-sans-serif, system-ui`, which no mail client resolves (Outlook renders through Word, and
// Gmail's web client ignores both), so the fallback is spelled out as real system faces instead.
// The first family is NOT hard-coded — it comes from --font-sans, so a typeface change in the
// reference reaches the emails rather than silently diverging from the app.
const SYSTEM_SANS_FALLBACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// ---------------------------------------------------------------------------------------------
// tokens.css parsing
// ---------------------------------------------------------------------------------------------

/**
 * The custom properties of the top-level `:root{…}` block, in source order.
 *
 * Only that one block. `:root[data-theme="dark"]` and the two `@media` blocks are deliberately
 * ignored: emails are sent in one fixed skin — the brand's light mode (D-031) — because there is no
 * viewer preference to read at send time. The regex matches a
 * bare `:root{`, so the `[data-…]` variants cannot match it at all; the `@media` blocks do contain
 * a bare `:root{` but appear after it, and only redefine the `--page-pad-*` lengths.
 */
export function parseRootBlock(css) {
  const at = css.search(/:root\s*\{/);
  if (at < 0) throw new Error('email-tokens: no :root block in tokens.css');
  let i = css.indexOf('{', at);
  let depth = 1;
  const start = ++i;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    i++;
  }
  if (depth !== 0) throw new Error('email-tokens: unterminated :root block in tokens.css');

  const vars = new Map();
  for (const decl of splitTop(css.slice(start, i - 1), ';')) {
    const colon = decl.indexOf(':');
    if (colon < 0) continue;
    const name = decl.slice(0, colon).trim();
    if (name.startsWith('--')) vars.set(name, decl.slice(colon + 1).trim());
  }
  return vars;
}

/** Split on `sep` at paren depth 0, so a `,` inside `color-mix(…)` does not split the declaration. */
function splitTop(src, sep) {
  const out = [];
  let depth = 0;
  let last = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === sep && depth === 0) {
      out.push(src.slice(last, i));
      last = i + 1;
    }
  }
  out.push(src.slice(last));
  return out.map((s) => s.trim()).filter(Boolean);
}

/** True when `src` is exactly one `fn(…)` call — not a call with anything either side of it. */
function isCall(src, fn) {
  if (!src.toLowerCase().startsWith(fn + '(') || !src.endsWith(')')) return false;
  let depth = 0;
  for (let i = fn.length; i < src.length; i++) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')' && --depth === 0) return i === src.length - 1;
  }
  return false;
}

const callArgs = (src, fn) => src.slice(fn.length + 1, -1).trim();

// ---------------------------------------------------------------------------------------------
// Numbers: var() indirection and calc()
// ---------------------------------------------------------------------------------------------

/**
 * A plain number, a `var()` chain to one, or a `calc()` over either.
 *
 * Anything else throws rather than guessing — including percentages, which `oklch()` accepts but
 * which mean different things per channel (100% is 1 for lightness but 0.4 for chroma). tokens.css
 * uses none, and a silently misread channel would put a wrong colour in every email we send.
 */
function resolveNumber(expr, ctx) {
  const src = expr.trim();
  if (isCall(src, 'var')) {
    const next = lookup(src, ctx);
    return resolveNumber(next.value, next.ctx);
  }
  if (isCall(src, 'calc')) return evalArithmetic(substituteVars(callArgs(src, 'calc'), ctx), src);
  if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(src)) return Number(src);
  throw new Error(`email-tokens: cannot resolve ${JSON.stringify(src)} as a number`);
}

/** An angle: bare number or `<n>deg`. The other CSS angle units do not appear in tokens.css. */
function resolveAngle(expr, ctx) {
  const src = expr.trim();
  return resolveNumber(/deg$/i.test(src) ? src.slice(0, -3) : src, ctx);
}

/** Alpha after the `/` in `oklch(L C H / A)`: a number, or a percentage of 1. */
function resolveAlpha(expr, ctx) {
  const src = expr.trim();
  if (src.endsWith('%')) return resolveNumber(src.slice(0, -1), ctx) / 100;
  return resolveNumber(src, ctx);
}

const substituteVars = (src, ctx) =>
  src.replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, name) => String(resolveNumber(`var(${name})`, ctx)));

/**
 * `+ - * /` and parentheses over plain numbers, by recursive descent.
 *
 * Hand-written rather than `eval`/`new Function`: this script runs in CI over a file that is itself
 * generated, and nothing that reads a file should hand its contents to a JavaScript evaluator.
 */
function evalArithmetic(src, where) {
  const tokens = src.match(/\d+\.?\d*|\.\d+|[-+*/()]/g) ?? [];
  let at = 0;
  const peek = () => tokens[at];
  const eat = (t) => (tokens[at] === t ? (at++, true) : false);

  const primary = () => {
    if (eat('(')) {
      const v = expression();
      if (!eat(')')) throw new Error(`email-tokens: unbalanced parentheses in ${where}`);
      return v;
    }
    if (eat('-')) return -primary();
    if (eat('+')) return primary();
    const t = tokens[at++];
    if (t === undefined || !/^[\d.]/.test(t)) throw new Error(`email-tokens: cannot evaluate ${where}`);
    return Number(t);
  };
  const product = () => {
    let v = primary();
    for (;;) {
      if (eat('*')) v *= primary();
      else if (eat('/')) v /= primary();
      else return v;
    }
  };
  const expression = () => {
    let v = product();
    for (;;) {
      if (eat('+')) v += product();
      else if (eat('-')) v -= product();
      else return v;
    }
  };

  const value = expression();
  if (peek() !== undefined || !Number.isFinite(value)) throw new Error(`email-tokens: cannot evaluate ${where}`);
  return value;
}

/**
 * Follow one `var(--name)` and return its raw value together with the context for resolving it.
 *
 * The context carries the chain walked so far, so a token that referred to itself — directly or
 * through `--bg-canvas -> --ink-50 -> …` — fails with the path instead of recursing until the stack
 * blows. The chain is copied rather than pushed in place: two sibling `var()`s in one value (as in
 * `oklch(0.46 var(--accent-c) var(--accent-h))`) are not a cycle, and a shared mutable stack would
 * eventually call a legitimate repeat of the same token one.
 */
function lookup(src, ctx) {
  const inside = callArgs(src, 'var');
  if (inside.includes(','))
    throw new Error(`email-tokens: var() fallbacks are not supported (${src}); tokens.css uses none`);
  if (!ctx.vars.has(inside)) throw new Error(`email-tokens: ${inside} is not declared in :root`);
  if (ctx.stack.includes(inside))
    throw new Error(`email-tokens: circular token ${[...ctx.stack, inside].join(' -> ')}`);
  return { value: ctx.vars.get(inside), ctx: { vars: ctx.vars, stack: [...ctx.stack, inside] } };
}

// ---------------------------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------------------------

/**
 * A colour as OKLCH plus alpha. Everything stays in OKLCH until the very last step, because every
 * colour in tokens.css is authored there and `color-mix()` interpolates there too — converting to
 * sRGB any earlier would round twice and could clip a mix's endpoint before it is mixed.
 *
 * `hueMissing` is CSS Color 4's "powerless component" (§ 4.4): a colour with chroma 0 has no
 * meaningful hue, and in interpolation a missing component takes the other colour's value. This is
 * not a nicety — `--focus-ring` mixes with `transparent`, whose hue would otherwise read as 0 and
 * swing a teal focus ring to magenta.
 *
 * @typedef {{ L: number, C: number, H: number, alpha: number, hueMissing: boolean }} Oklch
 */

/**
 * `value` as a colour, or null when it is not one.
 *
 * Null is the answer for the font stacks, the raw `--accent-h`/`--accent-c` numbers, the
 * `--page-pad-*` lengths and the four `--shadow-*` values. A shadow *contains* a colour but is not
 * one: `0 1px 2px oklch(…)` is a list, so it fails the "exactly one colour" test below and is
 * excluded from the export rather than silently becoming a swatch.
 *
 * @returns {Oklch | null}
 */
export function resolveColor(value, ctx) {
  const src = value.trim();
  if (isCall(src, 'var')) {
    const next = lookup(src, ctx);
    return resolveColor(next.value, next.ctx);
  }
  if (isCall(src, 'oklch')) return parseOklch(callArgs(src, 'oklch'), ctx);
  if (isCall(src, 'color-mix')) return parseColorMix(callArgs(src, 'color-mix'), ctx);
  // The CSS-wide keyword for "no colour at all". Its chroma is 0, so its hue is powerless.
  if (src.toLowerCase() === 'transparent') return { L: 0, C: 0, H: 0, alpha: 0, hueMissing: true };
  return null;
}

/** `oklch(L C H)` or `oklch(L C H / A)`. */
function parseOklch(args, ctx) {
  const [coords, alpha, ...rest] = splitTop(args, '/');
  if (!coords || rest.length) throw new Error(`email-tokens: cannot parse oklch(${args})`);
  const parts = splitTop(coords.replace(/\s+/g, ' '), ' ');
  if (parts.length !== 3) throw new Error(`email-tokens: oklch(${args}) needs exactly L C H`);
  const [l, c, h] = parts;
  const C = resolveNumber(c, ctx);
  return {
    L: resolveNumber(l, ctx),
    C,
    H: resolveAngle(h, ctx),
    alpha: alpha === undefined ? 1 : resolveAlpha(alpha, ctx),
    hueMissing: C === 0,
  };
}

/**
 * `color-mix(in oklch, <colour> <pct>%, <colour> <pct>%)`, per CSS Color 5 § 3.
 *
 * Only `in oklch` — the two uses in tokens.css are both oklch, and another interpolation space
 * would need its own premultiplication and hue rules, so an unexpected one throws.
 */
function parseColorMix(args, ctx) {
  const parts = splitTop(args, ',');
  if (parts.length !== 3) throw new Error(`email-tokens: cannot parse color-mix(${args})`);
  const space = parts[0].replace(/\s+/g, ' ').trim().toLowerCase();
  if (space !== 'in oklch') throw new Error(`email-tokens: only "in oklch" is supported, got "${space}"`);

  const sides = parts.slice(1).map((part) => {
    // The percentage may precede or follow the colour; tokens.css puts it after.
    const bits = splitTop(part.replace(/\s+/g, ' '), ' ');
    const pctAt = bits.findIndex((b) => b.endsWith('%'));
    const pct = pctAt < 0 ? null : resolveNumber(bits[pctAt].slice(0, -1), ctx);
    const colorSrc = bits.filter((_, i) => i !== pctAt).join(' ');
    const color = resolveColor(colorSrc, ctx);
    if (!color) throw new Error(`email-tokens: color-mix side ${JSON.stringify(part)} is not a colour`);
    return { color, pct };
  });

  // Weight normalisation. One omitted percentage is 100 minus the other; both omitted is 50/50.
  // A total below 100% does not scale the colours up — it makes the result partly transparent.
  let [p1, p2] = sides.map((s) => s.pct);
  if (p1 === null && p2 === null) p1 = p2 = 50;
  else if (p1 === null) p1 = Math.max(0, 100 - p2);
  else if (p2 === null) p2 = Math.max(0, 100 - p1);
  const total = p1 + p2;
  if (total <= 0) throw new Error(`email-tokens: color-mix(${args}) has zero total weight`);
  const w2 = p2 / total;
  const w1 = p1 / total;
  const alphaScale = total < 100 ? total / 100 : 1;

  const [a, b] = sides.map((s) => s.color);
  const alpha = w1 * a.alpha + w2 * b.alpha;
  // Premultiplied interpolation (CSS Color 4 § 12.3): the non-hue coordinates are weighted by
  // alpha so a fully transparent endpoint contributes no colour. Hue is an angle and is never
  // premultiplied; it takes the shorter arc, or the other colour's value when one side has none.
  const mix = (x, y) => (alpha === 0 ? 0 : (w1 * x * a.alpha + w2 * y * b.alpha) / alpha);
  const H = a.hueMissing ? b.H : b.hueMissing ? a.H : shorterArc(a.H, b.H, w2);
  return {
    L: mix(a.L, b.L),
    C: mix(a.C, b.C),
    H,
    alpha: alpha * alphaScale,
    hueMissing: a.hueMissing && b.hueMissing,
  };
}

/** Interpolate two angles the short way round, `t` being the weight of `h2`. */
function shorterArc(h1, h2, t) {
  let d = (((h2 - h1) % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return (((h1 + t * d) % 360) + 360) % 360;
}

// ---------------------------------------------------------------------------------------------
// OKLCH -> sRGB, per CSS Color 4 § 9 and the Oklab paper's matrices
// ---------------------------------------------------------------------------------------------

/** OKLCH -> OKLab: the hue is an angle in degrees, so the a/b axes are its cosine and sine. */
export function oklchToOklab({ L, C, H }) {
  const h = (H * Math.PI) / 180;
  return { L, a: C * Math.cos(h), b: C * Math.sin(h) };
}

/**
 * OKLab -> linear sRGB. Two matrix multiplies with a cube in between: OKLab's non-linearity is a
 * cube root of the cone responses, so inverting it cubes them back before the LMS -> sRGB matrix.
 * The result is NOT clamped here — the caller needs to know when a colour left the cube.
 */
export function oklabToLinearSrgb({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

/** The sRGB transfer function, applied around zero so a negative channel keeps its sign. */
export function encodeSrgb(c) {
  const sign = c < 0 ? -1 : 1;
  const a = Math.abs(c);
  return sign * (a <= 0.0031308 ? 12.92 * a : 1.055 * a ** (1 / 2.4) - 0.055);
}

/**
 * An OKLCH colour as `#rrggbb`, plus whether sRGB could actually hold it.
 *
 * GAMUT. Two light-mode tokens are outside sRGB — two tinted backgrounds ask for a channel just
 * over 1. (The handed-off teal accent added four more; every brand colour is inside sRGB, D-031.)
 * They must not be silently mangled, so this reports `clamped` and the generated module names them.
 *
 * The clamp is per channel, after encoding, which is what Chromium itself does: measured against
 * Chromium 153 by painting each value into a canvas and reading the pixel back, the clamped tokens
 * agree to the byte with the clamp below (`#e6f2ff`, `#ffeee9`; re-measured after the rebrand).
 * It does NOT apply CSS Color 4 § 13's chroma-reduction gamut mapping, so neither does this. The
 * e2e oracle re-measures that agreement on every run, in the browser, rather than trusting it.
 */
export function oklchToHex(color) {
  const { r, g, b } = oklabToLinearSrgb(oklchToOklab(color));
  const channels = [r, g, b].map(encodeSrgb);
  const clamped = channels.some((c) => c < -1e-6 || c > 1 + 1e-6);
  const hex = channels
    // Round to the nearest byte, matching Skia's float -> 8-bit conversion.
    .map((c) =>
      Math.round(255 * Math.min(1, Math.max(0, c)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
  return { hex: `#${hex}`, clamped };
}

// ---------------------------------------------------------------------------------------------
// Resolution and rendering
// ---------------------------------------------------------------------------------------------

/**
 * Every colour token in `:root`, light mode, as `#rrggbb`.
 *
 * ALPHA. A token with alpha has no hex equivalent: `#rrggbbaa` is not understood by Outlook or by
 * Gmail's web client, and flattening it over a backdrop would bake in an assumption the template
 * cannot see. Both tokens that have one — `--bg-overlay` (a modal scrim) and `--focus-ring` (a
 * keyboard focus ring) — describe things an email does not have, so they are OMITTED rather than
 * composited, and named in `OMITTED_ALPHA_TOKENS` so the omission is a recorded decision instead of
 * a gap. If a template ever needs a translucent colour, it must composite it against a known
 * backdrop explicitly.
 */
export function resolveEmailTokens() {
  const vars = parseRootBlock(readFileSync(TOKENS_CSS, 'utf8'));
  if (vars.size !== EXPECTED_ROOT_DECLARATIONS)
    throw new Error(
      `email-tokens: tokens.css :root declares ${vars.size} custom properties, expected ` +
        `${EXPECTED_ROOT_DECLARATIONS} (DECISIONS.md D-003). If a token was legitimately added to ` +
        `the reference, update both in the same PR; otherwise tokens.css is truncated.`,
    );

  const colors = {};
  const omittedAlpha = [];
  const clamped = [];
  for (const [name, raw] of vars) {
    const color = resolveColor(raw, { vars, stack: [name] });
    if (!color) continue; // not a colour: font stacks, bare numbers, lengths, shadow lists
    const key = name.slice(2); // `--text-primary` is exported as `text-primary`
    if (color.alpha < 1) {
      omittedAlpha.push(key);
      continue;
    }
    const { hex, clamped: didClamp } = oklchToHex(color);
    if (didClamp) clamped.push(key);
    colors[key] = hex;
  }

  const fontSans = vars.get('--font-sans');
  if (!fontSans) throw new Error('email-tokens: tokens.css declares no --font-sans');
  const family = splitTop(fontSans, ',')[0];
  return { colors, omittedAlpha, clamped, fontStack: `${family}, ${SYSTEM_SANS_FALLBACK}` };
}

/**
 * The output is shaped the way Prettier would shape it (singleQuote, printWidth 120, trailing
 * commas, and object keys quoted only where required, as `quoteProps: as-needed` does) so that a
 * `prettier --write` over the repository is a no-op here. If it were not, running Prettier would
 * rewrite a generated file and break the byte-for-byte test that is the whole point of generating
 * it. An array goes on one line while it fits in 120 columns, one item per line after that.
 */
function renderArray(name, items, doc) {
  const oneLine = `export const ${name} = Object.freeze([${items.map((i) => `'${i}'`).join(', ')}] as const);`;
  return `\n${doc}\n${
    oneLine.length <= 120
      ? oneLine
      : `export const ${name} = Object.freeze([\n${items.map((i) => `  '${i}',`).join('\n')}\n] as const);`
  }\n`;
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * The stack is a double-quoted literal because the family names inside it are single-quoted, and it
 * breaks after the `=` once the declaration passes 120 columns — both are what Prettier does.
 */
function renderFontStack(fontStack) {
  const decl = `export const EMAIL_FONT_STACK = "${fontStack}";`;
  return decl.length <= 120 ? decl : `export const EMAIL_FONT_STACK =\n  "${fontStack}";`;
}

export function renderModule(resolved = resolveEmailTokens()) {
  const { colors, omittedAlpha, clamped, fontStack } = resolved;
  const entries = Object.entries(colors)
    .map(([k, v]) => `  ${IDENTIFIER.test(k) ? k : `'${k}'`}: '${v}',`)
    .join('\n');

  return `// GENERATED FILE — DO NOT HAND-EDIT.
//
// Written by scripts/email-tokens.mjs from apps/web/src/styles/tokens.css (the top-level \`:root\`
// block: light mode, default accent). Regenerate with \`node scripts/email-tokens.mjs\`.
//
// Phase 08 § 8.1 builds the email templates "with the same tokens as inline hex values, resolved
// from tokens.css light mode", because email clients support neither CSS custom properties nor
// \`oklch()\`. Every value here is the sRGB byte triple Chromium itself resolves the token to —
// compliance/tests/e2e/email-tokens.spec.ts measures that in a real browser, and
// apps/api/src/email/tokens.test.ts fails if this file drifts from the generator by one byte.
//
// Keys are the custom-property names without their leading \`--\`, so \`EMAIL_TOKENS['text-primary']\`
// is \`var(--text-primary)\` as the web app sees it in light mode.
//
// ${Object.keys(colors).length} colour tokens, resolved rather than copied: \`var()\` chains, \`calc()\` inside
// \`oklch()\` and \`color-mix(in oklch, …)\` are all evaluated from the real token file.

export const EMAIL_TOKENS = Object.freeze({
${entries}
} as const);

export type EmailTokenName = keyof typeof EMAIL_TOKENS;

/**
 * Section 8.1: Hanken Grotesk with a system-sans fallback. The first family comes from
 * \`--font-sans\`; the rest replaces tokens.css's \`ui-sans-serif, system-ui\`, which mail clients do
 * not resolve, with the real system faces.
 */
${renderFontStack(fontStack)}
${renderArray(
  'OMITTED_ALPHA_TOKENS',
  omittedAlpha,
  `
/**
 * Colour tokens deliberately NOT exported, because they carry alpha and there is no hex for that:
 * \`#rrggbbaa\` is not understood by Outlook or Gmail's web client. Both describe something an email
 * does not have — a modal scrim and a keyboard focus ring — so neither is composited over a guessed
 * backdrop. A template that needs translucency must composite against a known backdrop itself.
 */`.trim(),
)}${renderArray(
    'GAMUT_CLAMPED_TOKENS',
    clamped,
    `
/**
 * Tokens whose OKLCH value is outside sRGB and was clamped per channel to fit. Listed rather than
 * silently mangled. The clamp is not an approximation of what browsers do — it is what Chromium
 * does (it applies no CSS Color 4 § 13 gamut mapping), verified by the e2e oracle on every run.
 */`.trim(),
  )}`;
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

// Only when run directly. Writing a file is the default mode, so an `import` of this module for
// its resolver would otherwise regenerate tokens.ts as a side effect of being read.
if (import.meta.main) {
  const mode = process.argv[2];
  if (mode === '--stdout') {
    process.stdout.write(renderModule());
  } else if (mode === '--check') {
    const want = renderModule();
    const have = readFileSync(GENERATED, 'utf8');
    if (have.replace(/\r\n/g, '\n') !== want) {
      console.error('email-tokens: apps/api/src/email/tokens.ts is out of date. Run `node scripts/email-tokens.mjs`.');
      process.exit(1);
    }
    console.log('email-tokens: apps/api/src/email/tokens.ts is up to date');
  } else if (mode === undefined) {
    const resolved = resolveEmailTokens();
    writeFileSync(GENERATED, renderModule(resolved));
    console.log(
      `email-tokens: wrote ${Object.keys(resolved.colors).length} colours to apps/api/src/email/tokens.ts` +
        `\n  omitted (alpha): ${resolved.omittedAlpha.join(', ') || 'none'}` +
        `\n  clamped to sRGB: ${resolved.clamped.join(', ') || 'none'}`,
    );
  } else {
    console.error(`email-tokens: unknown argument ${JSON.stringify(mode)} (expected --stdout or --check)`);
    process.exit(2);
  }
}
