// Gate 0: capturing twice must produce byte-identical goldens.
// Run after `pnpm compliance:capture` in a clean tree; it is what the CI `goldens` job proves
// with `git diff --exit-code -- compliance/goldens`, where GOLDEN_PLATFORM=linux.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Fingerprints are shared; screenshots are per platform (compliance/lib/goldens.ts explains why,
// with the measurements). Both are hashed, so this proves determinism of everything a capture on
// THIS platform writes — and nothing it does not, which is the point: another platform's
// screenshots are not reproducible here and are not this check's business.
const ROOT = 'compliance/goldens';
const PLATFORM = process.env.GOLDEN_PLATFORM ?? process.platform;
const PNG_DIR = `${ROOT}/${PLATFORM}`;

const hashDir = (dir, pattern, prefix) =>
  readdirSync(dir)
    .filter((f) => pattern.test(f))
    .map((f) => [prefix + f, createHash('sha256').update(readFileSync(`${dir}/${f}`)).digest('hex')]);

const hash = () =>
  Object.fromEntries([
    ...hashDir(ROOT, /\.json$/, ''),
    ...hashDir(PNG_DIR, /\.png$/, `${PLATFORM}/`),
  ]);

console.log('▶ capture #1');
execSync('pnpm compliance:capture', { stdio: 'inherit' });
const a = hash();
console.log('▶ capture #2');
execSync('pnpm compliance:capture', { stdio: 'inherit' });
const b = hash();

const drift = Object.keys(b).filter((f) => a[f] !== b[f]);
const missing = Object.keys(a).filter((f) => !(f in b));
if (drift.length || missing.length) {
  console.error(`\n✖ goldens are not deterministic: ${drift.length} changed, ${missing.length} missing`);
  for (const f of [...drift, ...missing]) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`\n✅ goldens are deterministic (${Object.keys(b).length} files, byte-identical across two captures)`);
