// Tiny cross-platform `KEY=value cmd` runner, so package.json scripts work on Windows too.
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const env = { ...process.env };
let i = 0;
for (; i < args.length; i++) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(args[i]);
  if (!m) break;
  env[m[1]] = m[2];
}
const [cmd, ...rest] = args.slice(i);
if (!cmd) {
  console.error('usage: node scripts/with-env.mjs KEY=value [KEY=value...] <command> [args...]');
  process.exit(1);
}
spawn(cmd, rest, { stdio: 'inherit', env, shell: true }).on('exit', (code) => process.exit(code ?? 1));
