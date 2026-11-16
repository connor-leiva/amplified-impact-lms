// Scope D-156's phone type floor to phones (DECISIONS.md D-160, R2-1a: the root cause).
//
// #117 (D-156) ran scripts/lms-type-floor.mjs over the reference and the app with no media query, so
// every width got the phone floor: a `font-size` under 16px became 16px, and in the same declaration
// block a fixed `height` / `min-width` under 24px became 24px and a px `line-height` under 20px became
// 20px. This script finds exactly the declarations that codemod raised and turns each into a token
// that carries BOTH values, so desktop gets its pre-D-156 value back and phones keep the floor:
//
//   font-size 13px → 16px      becomes   var(--fs-13)    13px above 767px, 16px at 767px and under
//   height 20px → 24px         becomes   var(--bx-20)    20px                24px
//   line-height 18px → 20px    becomes   var(--lh-18)    18px                20px
//
// (a React `fontSize: 13` → `fontSize: 16` becomes `fontSize: 'var(--fs-13)'`). One token per distinct
// original value; the name is the value, so the scheme is readable without a table. The tokens are
// defined in lms.css (both copies, byte-identical): their desktop values in `:root`, their phone values
// in its `@media (max-width:767px)` block. This script writes both lines from the declarations it
// converts, so a token exists exactly when something uses it.
//
// How it finds the declarations, mechanically:
//   1. BASE is c1e3921, main just before #117 merged (#117's merge f878a02 has it as first parent). For
//      each target file that existed there, take BASE's text and run lms-type-floor's own rules on it
//      again, marking every value they raise. With the marks rendered as the floor values, the result
//      is asserted to equal lms-type-floor.mjs's output byte for byte: this is the same codemod.
//   2. Align that lifted text with the file as it is now (a line diff, then a token diff inside each
//      changed hunk), so later edits (#118–#124, #130) neither hide nor shift a mark.
//   3. Each mark the alignment carries to a raw floor value now is rewritten to its token. A mark
//      already on its token is left alone (idempotent). A mark that lands nowhere (the declaration
//      was since deleted or hand-edited) is listed, and never guessed at.
//
// Targets are lms-type-floor's: design-reference/*.dc.html (outside the shared token block) and
// apps/web/src/{components,routes,shell}/**/*.module.css and *.tsx. Never www. Two folders are left as
// they are (KIT_LOOK): /course and /skill-library were rebuilt after #117 in the www kit's own look
// (D-156 PR B2, #119), whose stated rule is no text under 16px and 44px / 48px controls at EVERY width,
// as on www. Their 16px is that design now, not the codemod's leftover, and they have no reference or
// golden. Dropping a folder from KIT_LOOK and re-running scopes it like the rest.
//
// Usage: node scripts/lms-type-scope.mjs [--check] [--report]
//   (none)    rewrite the raised declarations to tokens, and lms.css's two token lines.
//   --check   exit 1 if any raised declaration is still a raw floor value, or lms.css is not current.
//   --report  also list each file's counts and every mark that landed nowhere.
// It needs BASE in the local history (a full clone, not a shallow one).

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { liftCss, liftReference, liftTsx, targets } from './lms-type-floor.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = 'c1e3921';
const LMS_CSS = [join(ROOT, 'design-reference/lms.css'), join(ROOT, 'apps/web/src/styles/lms.css')];
/** Rebuilt in the www kit's look by PR B2 (#119): 16px and 44 / 48px at every width by design. */
export const KIT_LOOK = ['apps/web/src/routes/course/', 'apps/web/src/routes/library/'];
/**
 * Rebuilt on the Admin redesign R2 (D-160 R2-2, R2-3a): written anew on the R2 tokens (`--r2-*`, 16px and up
 * on a phone by construction, `r2-tokens.test.ts`), so no declaration in them is the codemod's. The old
 * file's marks would only land on unrelated new lines (a 16px row-number width).
 */
export const R2_REBUILT = [
  'apps/web/src/routes/admin/Curriculum.',
  'apps/web/src/routes/admin/ModuleBuilder.',
  'apps/web/src/routes/admin/VaultManager.',
  'apps/web/src/routes/admin/Cohorts.',
  'apps/web/src/routes/admin/Announcements.',
  'apps/web/src/routes/admin/Overview.',
  'apps/web/src/routes/admin/Learners.',
  'apps/web/src/routes/admin/Tiers.',
  'apps/web/src/routes/admin/Staff.',
];
const FLOOR = 16;
const MIN_BOX = 24;
const MIN_LINE = 20;
/** The phone value of each token family: what lms-type-floor raised to. */
export const PHONE = { fs: `${FLOOR}px`, bx: `${MIN_BOX}px`, lh: `${MIN_LINE}px` };

const num = (s) => Number.parseFloat(s);
/** `--fs-13`; a fractional value keeps its digits with `_` for the point (`--fs-12_5`). */
const name = (family, n) => `--${family}-${String(num(n)).replace('.', '_')}`;
const v = (family, n) => `var(${name(family, n)})`;

// A mark (private-use code points, which no target contains): \uE000 <the floor value lms-type-floor
// wrote> \uE001 <the token> \uE002.
const mark = (floor, token) => `\uE000${floor}\uE001${token}\uE002`;
const MARK = /\uE000([^\uE001]*)\uE001([^\uE002]*)\uE002/g;
const HAS_MARK = /\uE000/;
const render = (text, side) => text.replace(MARK, (_m, floor, token) => (side === 'floor' ? floor : token));

// ---------- lms-type-floor's rules 2 and 3, marking instead of raising (kept regex for regex) ----------

function markBlock(block) {
  let raised = false;
  let out = block.replace(/(font-size\s*:\s*)([0-9.]+)px/g, (m, pre, n) => {
    if (num(n) >= FLOOR) return m;
    raised = true;
    return `${pre}${mark(`${FLOOR}px`, v('fs', n))}`;
  });
  out = out.replace(/(\bfont\s*:\s*(?:[a-z-]+\s+)*?(?:[1-9]00\s+)?)([0-9.]+)px/g, (m, pre, n) => {
    if (num(n) >= FLOOR) return m;
    raised = true;
    return `${pre}${mark(`${FLOOR}px`, v('fs', n))}`;
  });
  if (!raised) return out;
  out = out.replace(/((?:^|[;{\s])(?:height|min-width)\s*:\s*)([0-9.]+)px/g, (m, pre, n) =>
    num(n) < MIN_BOX ? `${pre}${mark(`${MIN_BOX}px`, v('bx', n))}` : m,
  );
  out = out.replace(/((?:^|[;{\s])line-height\s*:\s*)([0-9.]+)px/g, (m, pre, n) =>
    num(n) < MIN_LINE ? `${pre}${mark(`${MIN_LINE}px`, v('lh', n))}` : m,
  );
  return out;
}

const faces = (s) =>
  s.replace(/var\(--font-sans\)/g, 'var(--font-ui)').replace(/var\(--font-mono\)/g, 'var(--font-ui-mono)');
const fontSizeNumber = (s) =>
  s.replace(/(\bfontSize\s*:\s*)([0-9.]+)\b(?!\s*[*/+-])/g, (m, pre, n) =>
    num(n) < FLOOR ? `${pre}${mark(String(FLOOR), `'${v('fs', n)}'`)}` : m,
  );

const SHARED = /<helmet>[\s\S]*?<style>[\s\S]*?<\/style>/;

function markReference(html) {
  const m = SHARED.exec(html);
  const body = (s) => {
    let out = s.replace(/(\sstyle(?:-[a-z-]+)?=")([^"]*)(")/g, (_m, a, b, z) => `${a}${markBlock(b)}${z}`);
    out = out.replace(
      /(<style>)([\s\S]*?)(<\/style>)/g,
      (_m, a, css, z) => `${a}${css.replace(/\{([^{}]*)\}/g, (_r, b) => `{${markBlock(b)}}`)}${z}`,
    );
    return faces(fontSizeNumber(out));
  };
  if (!m) return body(html);
  return html.slice(0, m.index) + m[0] + body(html.slice(m.index + m[0].length));
}

const markCss = (css) => faces(css.replace(/\{([^{}]*)\}/g, (_m, b) => `{${markBlock(b)}}`));

const TSX_FONT = /(\bfont\s*:\s*['"`](?:[a-z-]+\s+)*?(?:[1-9]00\s+)?)([0-9.]+)px(?:\/([0-9.]+)px)?/g;

function markTsx(src) {
  let out = fontSizeNumber(src);
  out = out.replace(TSX_FONT, (m, pre, n, lh) => {
    if (num(n) >= FLOOR) return m;
    const line = lh ? `/${num(lh) < MIN_LINE ? mark(`${MIN_LINE}px`, v('lh', lh)) : `${lh}px`}` : '';
    return `${pre}${mark(`${FLOOR}px`, v('fs', n))}${line}`;
  });
  out = out.replace(/(font-size\s*:\s*)([0-9.]+)px/g, (m, pre, n) =>
    num(n) < FLOOR ? `${pre}${mark(`${FLOOR}px`, v('fs', n))}` : m,
  );
  return faces(out);
}

const KINDS = [
  { test: (f) => f.endsWith('.dc.html'), mark: markReference, lift: liftReference },
  { test: (f) => f.endsWith('.css'), mark: markCss, lift: liftCss },
  { test: () => true, mark: markTsx, lift: liftTsx },
];

// ---------- alignment ----------

/** Myers' O(ND) diff. Returns, for each index of `a`, the index of `b` it is aligned with, or -1. */
export function align(n, m, eq) {
  const max = n + m;
  const off = max + 1;
  const vv = new Int32Array(2 * max + 3);
  const trace = [];
  let found = -1;
  for (let d = 0; d <= max && found < 0; d++) {
    trace.push(vv.slice(off - d - 1, off + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && vv[off + k - 1] < vv[off + k + 1]) ? vv[off + k + 1] : vv[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && eq(x, y)) {
        x++;
        y++;
      }
      vv[off + k] = x;
      if (x >= n && y >= m) {
        found = d;
        break;
      }
    }
  }
  const map = new Int32Array(n).fill(-1);
  let x = n;
  let y = m;
  for (let d = found; d > 0; d--) {
    const t = trace[d]; // vv as it stood before round d, indices off-d-1 … off+d+1
    const at = (k) => t[k + d + 1];
    const k = x - y;
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const prevX = at(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) map[--x] = --y;
    x = prevX;
    y = prevY;
  }
  while (x > 0 && y > 0) map[--x] = --y;
  return map;
}

const TOKEN =
  /\uE000[^\uE002]*\uE002|'var\(--(?:fs|bx|lh)-[\w]+\)'|var\(--(?:fs|bx|lh)-[\w]+\)|\d+(?:\.\d+)?(?:px)?|[A-Za-z_$][\w$-]*|\s+|[^]/g;
const tokens = (s) => s.match(TOKEN) ?? [];
const parseMark = (t) => /^\uE000([^\uE001]*)\uE001([^\uE002]*)\uE002$/.exec(t);

/**
 * Carry every mark in `marked` (BASE, lifted and marked) onto `now` (the file today).
 * Returns the rewritten text and each mark's fate: 'raw' (rewritten), 'done' (already a token) or
 * 'lost' (aligned with nothing: deleted or hand-edited since), with its line for the report.
 */
export function carry(marked, now) {
  const aLines = marked.split('\n');
  const aFloor = aLines.map((l) => render(l, 'floor'));
  const aToken = aLines.map((l) => render(l, 'token'));
  const bLines = now.split('\n');
  const lineMap = align(aLines.length, bLines.length, (i, j) => bLines[j] === aFloor[i] || bLines[j] === aToken[i]);
  const out = [...bLines];
  const fates = [];
  const record = (fate, text, line) => {
    for (const m of text.matchAll(MARK)) fates.push({ fate, floor: m[1], token: m[2], line });
  };
  // Matched lines: the whole line is either still raw or already tokenized.
  aLines.forEach((line, i) => {
    const j = lineMap[i];
    if (j < 0 || !HAS_MARK.test(line)) return;
    const raw = bLines[j] === aFloor[i] && aFloor[i] !== aToken[i];
    out[j] = aToken[i];
    record(raw ? 'raw' : 'done', line, j + 1);
  });
  // Hunks: a run of unmatched lines on each side between two matched ones, aligned token by token.
  let i = 0;
  let j = 0;
  while (i < aLines.length || j < bLines.length) {
    if (i < aLines.length && lineMap[i] >= 0 && lineMap[i] === j) {
      i++;
      j++;
      continue;
    }
    const i0 = i;
    while (i < aLines.length && lineMap[i] < 0) i++;
    const j1 = i < aLines.length ? lineMap[i] : bLines.length;
    const a = aLines.slice(i0, i).join('\n');
    const bText = bLines.slice(j, j1).join('\n');
    if (HAS_MARK.test(a)) {
      const at = tokens(a);
      const bt = tokens(bText);
      const tm = align(at.length, bt.length, (x, y) => {
        const mk = parseMark(at[x]);
        return mk ? bt[y] === mk[1] || bt[y] === mk[2] : at[x] === bt[y];
      });
      let lineNo = j + 1;
      const lineOf = [];
      bt.forEach((t) => {
        lineOf.push(lineNo);
        lineNo += (t.match(/\n/g) ?? []).length;
      });
      at.forEach((t, x) => {
        const mk = parseMark(t);
        if (!mk) return;
        const y = tm[x];
        if (y < 0) {
          const ctx = render(at.slice(Math.max(0, x - 12), x + 6).join(''), 'floor').replace(/\s+/g, ' ');
          fates.push({ fate: 'lost', floor: mk[1], token: mk[2], line: j + 1, ctx });
          return;
        }
        fates.push({
          fate: bt[y] === mk[1] && mk[1] !== mk[2] ? 'raw' : 'done',
          floor: mk[1],
          token: mk[2],
          line: lineOf[y],
        });
        bt[y] = mk[2];
      });
      if (j1 > j) {
        // A token swap never adds or removes a newline, so `out` stays index-aligned with `bLines`.
        const rebuilt = bt.join('').split('\n');
        if (rebuilt.length !== j1 - j) throw new Error('lms-type-scope: a hunk changed its line count');
        out.splice(j, j1 - j, ...rebuilt);
      }
    }
    j = j1;
  }
  return { text: out.join('\n'), fates };
}

function gitShow(rel) {
  try {
    return execFileSync('git', ['show', `${BASE}:${rel}`], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 1 << 26,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

/** Every target file's rewrite, from BASE. A file that did not exist at BASE was never lifted. */
export function scope() {
  try {
    execFileSync('git', ['cat-file', '-e', `${BASE}^{commit}`], { cwd: ROOT, stdio: 'ignore' });
  } catch {
    throw new Error(
      `lms-type-scope: ${BASE} is not in this clone's history; it needs a full clone (git fetch --unshallow).`,
    );
  }
  const { ref, app } = targets();
  const files = [];
  for (const file of [...ref, ...app]) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (KIT_LOOK.some((d) => rel.startsWith(d))) continue;
    if (R2_REBUILT.some((d) => rel.startsWith(d))) continue;
    const before = gitShow(rel);
    if (before === null) continue;
    const kind = KINDS.find((k) => k.test(file));
    const marked = kind.mark(before);
    if (render(marked, 'floor') !== kind.lift(before))
      throw new Error(`lms-type-scope: ${rel}: marking disagrees with lms-type-floor`);
    if (!HAS_MARK.test(marked)) continue;
    const now = readFileSync(file, 'utf8');
    const { text, fates } = carry(marked, now);
    files.push({ file, rel, now, text, fates });
  }
  return files;
}

/** lms.css's two generated token lines, from every token the converted declarations use. */
export function tokenLines(used) {
  const order = (a, b) => a.localeCompare(b, 'en', { numeric: true });
  const names = [...used].sort(order);
  const desktop = names.map((t) => `${t}:${t.replace(/^--\w+-/, '').replace('_', '.')}px`).join(';');
  const phone = names.map((t) => `${t}:${PHONE[t.slice(2, 4)]}`).join(';');
  return { desktop: `:root{${desktop}}`, phone: `:root{${phone}}` };
}

const BEGIN_D = '/* lms-type-scope: desktop values */';
const BEGIN_P = '/* lms-type-scope: phone values */';

/** lms.css with its two generated lines (the line after each marker comment) brought up to date. */
export function withTokens(css, lines) {
  const set = (text, marker, line) => {
    const at = text.indexOf(marker);
    if (at < 0) throw new Error(`lms-type-scope: lms.css has no "${marker}" line`);
    const start = text.indexOf('\n', at) + 1;
    const end = text.indexOf('\n', start);
    return text.slice(0, start) + line + text.slice(end);
  };
  return set(set(css, BEGIN_D, lines.desktop), BEGIN_P, lines.phone);
}

function main() {
  const check = process.argv.includes('--check');
  const report = process.argv.includes('--report');
  const files = scope();
  const used = new Set();
  let raw = 0;
  let done = 0;
  let lost = 0;
  let changed = 0;
  for (const f of files) {
    const c = { raw: 0, done: 0, lost: 0 };
    for (const x of f.fates) {
      c[x.fate] += 1;
      if (x.fate !== 'lost') used.add(x.token.replace(/^'?var\((--[\w-]+)\)'?$/, '$1'));
    }
    raw += c.raw;
    done += c.done;
    lost += c.lost;
    if (report) console.log(`${f.rel}: ${c.raw} raw, ${c.done} token, ${c.lost} not found`);
    if (report)
      for (const x of f.fates.filter((y) => y.fate === 'lost'))
        console.log(`  not found near line ${x.line}: ${x.floor} → ${x.token}   …${x.ctx}…`);
    if (check) {
      if (c.raw)
        for (const x of f.fates.filter((y) => y.fate === 'raw'))
          console.error(`${f.rel}:${x.line}: ${x.floor} should be ${x.token}`);
    } else if (f.text !== f.now) {
      writeFileSync(f.file, f.text);
      changed += 1;
    }
  }
  const lines = tokenLines(used);
  let staleCss = false;
  for (const css of LMS_CSS) {
    const text = readFileSync(css, 'utf8');
    const next = withTokens(text, lines);
    if (next === text) continue;
    if (check) {
      staleCss = true;
      console.error(`${relative(ROOT, css)}: the generated token lines are not current`);
    } else writeFileSync(css, next);
  }
  const summary = `${files.length} files, ${raw + done} raised declarations found (${lost} since deleted or hand-edited), ${used.size} tokens`;
  if (check) {
    if (raw || staleCss) {
      console.error(`lms-type-scope: ${raw} raised declaration(s) still raw; run node scripts/lms-type-scope.mjs`);
      process.exit(1);
    }
    console.log(`lms-type-scope: ok (${summary})`);
  } else console.log(`lms-type-scope: rewrote ${raw} declaration(s) in ${changed} file(s); ${summary}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
