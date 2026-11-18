import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Run a few lines of ES module source inside `apps/api`, where the API's own modules and their
 * dependencies resolve (`compliance/` cannot import them; `lib/global-setup.ts` explains), and read back
 * the JSON it writes. `input` arrives as `process.env.PARITY_INPUT` (JSON). No backticks in `source`: it
 * travels through argv as one string.
 */
const API_DIR = fileURLToPath(new URL('../../../apps/api', import.meta.url));

export function inApi<T>(source: string, input: unknown): T {
  const run = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', source], {
    cwd: API_DIR,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PARITY_INPUT: JSON.stringify(input) },
  });
  if (run.status !== 0) throw new Error(`apps/api script failed (${run.status}):\n${run.stderr}`);
  return JSON.parse(run.stdout) as T;
}
