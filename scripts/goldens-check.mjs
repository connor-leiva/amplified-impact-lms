// Gate 0: capturing twice must produce byte-identical goldens.
// Run after `pnpm compliance:capture` in a clean tree; it is what the CI `goldens` job proves
// with `git diff --exit-code -- compliance/goldens`.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'compliance/goldens';
const hash = () =>
  Object.fromEntries(
    readdirSync(DIR)
      .filter((f) => /\.(png|json)$/.test(f))
      .map((f) => [f, createHash('sha256').update(readFileSync(`${DIR}/${f}`)).digest('hex')]),
  );

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
