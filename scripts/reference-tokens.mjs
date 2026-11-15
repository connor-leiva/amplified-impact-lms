// tokens.css and global.css are GENERATED from design-reference/. This is the generator.
//
// Until this existed they were hand-copied once from handoff-starter/ (phase 01 § 1.2), and the
// only thing standing between a reference edit and a stale app was Gate 1's token-parity test,
// which reads ONE reference file. That is not enough, for a reason that is easy to miss:
//
//   Every one of the 25 .dc.html files carries its own copy of the token <style>, and the dc
//   runtime mounts EACH dc-imported sibling's copy into the host page's <head> (support.js
//   1474-1487 — styles are keyed per component and never de-duplicated). The LMS page imports 18
//   siblings and States imports 6, and those two pages are what the goldens are captured from. So
//   a copy left stale in ONE sibling does not leave one page in the old palette: it overrides the
//   whole captured page, in whatever order the fetches happen to land.
//
// So `--check` asserts three things, and runs in `pnpm lint`:
//   1. all 25 reference copies of the block are byte-identical,
//   2. tokens.css and global.css are exactly what this script would write from them, and
//   3. every brand logo the app imports is byte-identical to the reference's copy (D-031) — the
//      same drawing has to be on both sides for the unmasked brand row to mean anything.
//   4. (D-156) the Geist files and lms.css, the LMS's own type and tap-target rules, are byte-identical
//      on both sides. lms.css is not part of the shared block because www's pages inline global.css.
//
// The transform is the one the files were originally produced with, reconstructed and proven
// byte-exact against them before anything else changed: tokens are the leading `:root…` /
// `--…` / `@media` lines with one declaration per line; globals are the remainder with a rule per
// line. Usage: node scripts/reference-tokens.mjs [--check]

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REF = join(ROOT, 'design-reference');
const TOKENS = join(ROOT, 'apps/web/src/styles/tokens.css');
const GLOBAL = join(ROOT, 'apps/web/src/styles/global.css');
const REF_BRAND = join(REF, 'brand');
const APP_BRAND = join(ROOT, 'apps/web/src/assets/brand');
const REF_FONTS = join(REF, 'fonts');
const APP_FONTS = join(ROOT, 'apps/web/src/home/fonts');
const REF_LMS = join(REF, 'lms.css');
const APP_LMS = join(ROOT, 'apps/web/src/styles/lms.css');
const HEADER = '/* GENERATED verbatim from design-reference/*.dc.html <helmet><style> by scripts/reference-tokens.mjs. Do not hand-edit values. */';

/** The token <style> of one reference file: the first <style> inside <helmet>. */
function styleBlock(file) {
  const html = readFileSync(join(REF, file), 'utf8').replace(/\r\n/g, '\n');
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(html);
  if (!helmet) throw new Error(`${file}: no <helmet>`);
  const style = /<style>\n?([\s\S]*?)<\/style>/.exec(helmet[1]);
  if (!style) throw new Error(`${file}: no <style> in <helmet>`);
  return style[1];
}

export function referenceBlocks() {
  const files = readdirSync(REF).filter((f) => f.endsWith('.dc.html')).sort();
  return files.map((file) => ({ file, block: styleBlock(file) }));
}

const md5 = (s) => createHash('md5').update(s).digest('hex').slice(0, 12);

/** Split the block into the token half and the global-rules half, and format each. */
export function generate(block) {
  const lines = block.split('\n').filter((l) => l.length > 0);
  const split = lines.findIndex((l) => !/^(:root|--|@media)/.test(l));
  if (split <= 0) throw new Error('could not find where the tokens end and the global rules begin');
  const tokens = lines
    .slice(0, split)
    .map((l) => l.replace(/;--/g, ';\n  --').replace(/\{--/g, '{\n  --'))
    .join('\n');
  const global = lines
    .slice(split)
    .map((l) => l.replace(/\}a:hover/g, '}\na:hover').replace(/\}::-webkit-scrollbar/g, '}\n::-webkit-scrollbar').replace(/\}to\{/g, '}\nto{'))
    .join('\n');
  return { tokens: `${HEADER}\n${tokens}\n`, global: `${HEADER}\n${global}\n` };
}

function main() {
  const check = process.argv.includes('--check');
  const blocks = referenceBlocks();

  const byHash = new Map();
  for (const { file, block } of blocks) {
    const h = md5(block);
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h).push(file);
  }
  if (byHash.size !== 1) {
    console.error(`reference-tokens: the ${blocks.length} design-reference token blocks are NOT identical.`);
    console.error('A stale copy in a dc-imported sibling overrides the whole captured page (see this file\'s header).');
    for (const [h, files] of byHash) console.error(`  ${h}  ×${files.length}  ${files.join(', ')}`);
    process.exit(1);
  }

  const { tokens, global } = generate(blocks[0].block);
  if (check) {
    const stale = [];
    if (readFileSync(TOKENS, 'utf8').replace(/\r\n/g, '\n') !== tokens) stale.push('apps/web/src/styles/tokens.css');
    if (readFileSync(GLOBAL, 'utf8').replace(/\r\n/g, '\n') !== global) stale.push('apps/web/src/styles/global.css');
    if (stale.length) {
      console.error(`reference-tokens: ${stale.join(' and ')} do not match design-reference/. Run: node scripts/reference-tokens.mjs`);
      process.exit(1);
    }
    const assets = readdirSync(APP_BRAND).filter((f) => f.endsWith('.svg'));
    const drift = assets.filter((f) => {
      try {
        return !readFileSync(join(APP_BRAND, f)).equals(readFileSync(join(REF_BRAND, f)));
      } catch {
        return true; // the app has a logo the reference does not
      }
    });
    if (drift.length) {
      console.error(`reference-tokens: apps/web/src/assets/brand/{${drift.join(',')}} differ from design-reference/brand/ (or are missing there).`);
      process.exit(1);
    }
    // D-156: the reference and the app set the LMS in the same Geist files.
    const fonts = readdirSync(REF_FONTS).filter((f) => f.endsWith('.woff2'));
    const fontDrift = fonts.filter((f) => {
      try {
        return !readFileSync(join(REF_FONTS, f)).equals(readFileSync(join(APP_FONTS, f)));
      } catch {
        return true;
      }
    });
    if (!fonts.length || fontDrift.length) {
      console.error(`reference-tokens: design-reference/fonts/{${fontDrift.join(',')}} differ from apps/web/src/home/fonts/ (or are missing).`);
      process.exit(1);
    }
    // D-156: the LMS's own global rules (type, tap targets) are one file on both sides, kept out of
    // the shared block because www inlines global.css.
    if (!readFileSync(REF_LMS).equals(readFileSync(APP_LMS))) {
      console.error('reference-tokens: apps/web/src/styles/lms.css differs from design-reference/lms.css.');
      process.exit(1);
    }
    console.log(
      `reference-tokens: ok (${blocks.length} reference copies identical, ${md5(blocks[0].block)}; tokens.css, global.css, lms.css, ${readdirSync(APP_BRAND).length} brand assets and ${fonts.length} fonts current)`,
    );
    return;
  }
  writeFileSync(TOKENS, tokens);
  writeFileSync(GLOBAL, global);
  console.log(`reference-tokens: wrote tokens.css and global.css from ${blocks.length} identical copies (${md5(blocks[0].block)})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
