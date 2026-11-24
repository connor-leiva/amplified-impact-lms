// Gate runner. `pnpm gate <n>` runs everything required to ship phase n.
// A phase is done only when this is green locally AND in CI.
import { execSync } from 'node:child_process';

const n = Number(process.argv[2]);
if (Number.isNaN(n)) {
  console.error('usage: pnpm gate <phase>');
  process.exit(1);
}

const run = (cmd, env = {}) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
};

run('pnpm lint');
run('pnpm typecheck');
run('pnpm test');
// Gate 0 proves the reference prototype drives cleanly in every scenario.
if (n === 0) run('pnpm harness');
// Parity scenarios start at phase 03: /__states is the first UI there is to compare.
if (n >= 3) run(`pnpm compliance --grep "@g[0-${Math.min(n, 9)}]\\b"`, { GATE: String(n) });
// Phase 07 section 7.3: the portal scenarios re-run against the real API, against the SAME
// goldens, which is what proves the backend is invisible to the user. Its own step rather than a
// dependency of `parity`: Playwright SKIPS a project whose dependency failed, so coupling them let
// three http-mode diffs suppress all 55 fixture scenarios and report `55 did not run`.
if (n >= 7) run(`pnpm compliance:http --grep "@g[0-${Math.min(n, 9)}]\\b"`, { GATE: String(n) });
// The e2e project runs from phase 01, not 04. Gate 1's token-parity suite lives in
// compliance/tests/e2e and is tagged @g1, so a `gate 1` or `gate 2` that skipped e2e would not
// actually check its own gate.
if (n >= 1) run(`pnpm e2e --grep "@g[0-${Math.min(n, 9)}]\\b"`, { GATE: String(n) });
console.log(`\n✅ Gate ${n} passed`);
