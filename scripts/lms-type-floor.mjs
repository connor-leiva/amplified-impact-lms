// The LMS type floor and typeface (DECISIONS.md D-156), applied identically to the reference and the
// app so that parity keeps meaning what it says.
//
// Goldens are captured from design-reference/ and the app's CSS modules copy its inline values px for
// px, so a change to how the LMS sets type has to land on both sides in the same commit, by the same
// rule. This is that rule, written once:
//
//   1. Typeface. `var(--font-sans)` becomes `var(--font-ui)` and `var(--font-mono)` becomes
//      `var(--font-ui-mono)`: Geist and Geist Mono, the www kit's faces. Only USES change; the
//      `--font-sans` / `--font-mono` tokens themselves stay (Hanken Grotesk, DM Mono), because www's
//      skill, offer, AI 101 and legal pages read them from the same generated tokens.css.
//   2. The 16px floor. Any `font-size` under 16px (and the size in a `font:` shorthand, in CSS or in a
//      React style string, and a `fontSize` number in a React inline style) becomes 16px.
//   3. What a bigger glyph needs to sit in. In the same declaration block as a raised size, a fixed
//      `height` or `min-width` under 24px becomes 24px (count pills, badges) and a `line-height` set in
//      px under 20px becomes 20px.
//
// Targets: every design-reference/*.dc.html (inline `style`, `style-hover`, `style-focus`, … and any
// <style> of its own), and the LMS app's sources — apps/web/src/{components,routes,shell}/**/*.module.css
// and *.tsx. Never www (kit, site, home, guides, library, offer, ai101, legal): those are separate pages
// with their own type. Nor the shared token block (the first <style> in each reference <helmet>):
// scripts/reference-tokens.mjs generates tokens.css and global.css from it, and www's pages inline
// global.css, so the LMS's body type and tap targets live in lms.css instead.
//
// Usage: node scripts/lms-type-floor.mjs [--check]
//   --check  exits 1 if any target still sets type under 16px or uses --font-sans / --font-mono.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REF = join(ROOT, 'design-reference');
const APP_DIRS = ['components', 'routes', 'shell'].map((d) => join(ROOT, 'apps/web/src', d));
const FLOOR = 16;
const MIN_BOX = 24;
const MIN_LINE = 20;

function walk(dir, keep) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p, keep);
    return keep(name) ? [p] : [];
  });
}

export function targets() {
  const ref = readdirSync(REF).filter((f) => f.endsWith('.dc.html')).map((f) => join(REF, f));
  const app = APP_DIRS.flatMap((d) => walk(d, (n) => /\.module\.css$/.test(n) || (/\.tsx$/.test(n) && !/\.test\.tsx$/.test(n))));
  return { ref, app };
}

const num = (s) => Number.parseFloat(s);

/** Rules 2 and 3 on one declaration block (a CSS rule body or an inline style attribute value). */
export function liftBlock(block) {
  let raised = false;
  let out = block.replace(/(font-size\s*:\s*)([0-9.]+)px/g, (m, pre, n) => {
    if (num(n) >= FLOOR) return m;
    raised = true;
    return `${pre}${FLOOR}px`;
  });
  out = out.replace(/(\bfont\s*:\s*(?:[a-z-]+\s+)*?(?:[1-9]00\s+)?)([0-9.]+)px/g, (m, pre, n) => {
    if (num(n) >= FLOOR) return m;
    raised = true;
    return `${pre}${FLOOR}px`;
  });
  if (!raised) return out;
  out = out.replace(/((?:^|[;{\s])(?:height|min-width)\s*:\s*)([0-9.]+)px/g, (m, pre, n) => (num(n) < MIN_BOX ? `${pre}${MIN_BOX}px` : m));
  out = out.replace(/((?:^|[;{\s])line-height\s*:\s*)([0-9.]+)px/g, (m, pre, n) => (num(n) < MIN_LINE ? `${pre}${MIN_LINE}px` : m));
  return out;
}

const faces = (s) => s.replace(/var\(--font-sans\)/g, 'var(--font-ui)').replace(/var\(--font-mono\)/g, 'var(--font-ui-mono)');

const SHARED = /<helmet>[\s\S]*?<style>[\s\S]*?<\/style>/;

/** Set the shared token block (and the helmet before it) aside, run `fn`, and put it back untouched. */
function outsideShared(html, fn) {
  const m = SHARED.exec(html);
  if (!m) return fn(html);
  return html.slice(0, m.index) + m[0] + fn(html.slice(m.index + m[0].length));
}

/** A reference file: every inline style-ish attribute, and every rule body inside a <style>. */
export function liftReference(html) {
  return outsideShared(html, liftReferenceBody);
}

function liftReferenceBody(html) {
  let out = html.replace(/(\sstyle(?:-[a-z-]+)?=")([^"]*)(")/g, (_m, a, body, z) => `${a}${liftBlock(body)}${z}`);
  out = out.replace(/(<style>)([\s\S]*?)(<\/style>)/g, (_m, a, css, z) => `${a}${css.replace(/\{([^{}]*)\}/g, (_r, body) => `{${liftBlock(body)}}`)}${z}`);
  // The dc script's own React-style objects (the toast stack): `fontSize: 13`.
  out = out.replace(/(\bfontSize\s*:\s*)([0-9.]+)\b(?!\s*[*/+-])/g, (m, pre, n) => (num(n) < FLOOR ? `${pre}${FLOOR}` : m));
  return faces(out);
}

/** An app CSS module: every rule body. */
export function liftCss(css) {
  return faces(css.replace(/\{([^{}]*)\}/g, (_m, body) => `{${liftBlock(body)}}`));
}

/** A React `font: '500 12px/16px …'` shorthand string: the size, and a px line-height under 20. */
const TSX_FONT = /(\bfont\s*:\s*['"`](?:[a-z-]+\s+)*?(?:[1-9]00\s+)?)([0-9.]+)px(?:\/([0-9.]+)px)?/g;

/** An app TSX file: `fontSize: 13` style numbers, `font:` shorthand strings, and CSS-ish strings carrying font-size. */
export function liftTsx(src) {
  let out = src.replace(/(\bfontSize\s*:\s*)([0-9.]+)\b(?!\s*[*/+-])/g, (m, pre, n) => (num(n) < FLOOR ? `${pre}${FLOOR}` : m));
  out = out.replace(TSX_FONT, (m, pre, n, lh) =>
    num(n) >= FLOOR ? m : `${pre}${FLOOR}px${lh ? `/${num(lh) < MIN_LINE ? MIN_LINE : lh}px` : ''}`,
  );
  return faces(out.replace(/(font-size\s*:\s*)([0-9.]+)px/g, (m, pre, n) => (num(n) < FLOOR ? `${pre}${FLOOR}px` : m)));
}

/** What a file still sets under the floor, or the old faces it still uses: for --check. */
export function offences(text) {
  const found = [];
  for (const m of text.matchAll(/font-size\s*:\s*([0-9.]+)px/g)) if (num(m[1]) < FLOOR) found.push(m[0]);
  for (const m of text.matchAll(/\bfontSize\s*:\s*([0-9.]+)\b/g)) if (num(m[1]) < FLOOR) found.push(m[0]);
  for (const m of text.matchAll(TSX_FONT)) if (num(m[2]) < FLOOR) found.push(m[0]);
  for (const m of text.matchAll(/var\(--font-(?:sans|mono)\)/g)) found.push(m[0]);
  return found;
}

function main() {
  const check = process.argv.includes('--check');
  const { ref, app } = targets();
  let bad = 0;
  let changed = 0;
  for (const file of [...ref, ...app]) {
    const text = readFileSync(file, 'utf8');
    if (check) {
      const o = offences(file.endsWith('.dc.html') ? text.replace(SHARED, '') : text);
      if (o.length) {
        bad += o.length;
        console.error(`${relative(ROOT, file)}: ${[...new Set(o)].join(', ')}`);
      }
      continue;
    }
    const next = file.endsWith('.dc.html') ? liftReference(text) : file.endsWith('.css') ? liftCss(text) : liftTsx(text);
    if (next !== text) {
      writeFileSync(file, next);
      changed += 1;
    }
  }
  if (check) {
    if (bad) {
      console.error(`lms-type-floor: ${bad} declaration(s) under ${FLOOR}px or on the old faces`);
      process.exit(1);
    }
    console.log(`lms-type-floor: ok (${ref.length} reference files, ${app.length} app files, nothing under ${FLOOR}px)`);
  } else console.log(`lms-type-floor: rewrote ${changed} file(s)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
