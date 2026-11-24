// D-247: the API's modules load under Node's own ESM loader, in `server.ts`'s order. vitest's loader
// resolves an import cycle that Node's does not: a static import of `jobs/scheduler.ts` from
// `email/announce-now.ts` (reached from `routes/mutate.ts`) passed every suite and stopped the server
// booting ("Cannot access 'TICK_MS' before initialization" in `jobs/schedules.ts`). This loads the graph
// the way `tsx src/server.ts` does, in a child process, without listening.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const API = fileURLToPath(new URL('..', import.meta.url));
const TSX = fileURLToPath(new URL('../node_modules/.bin/tsx', import.meta.url));

describe('the module graph @boot', () => {
  it('app, the scheduler and the routes load in server.ts’s order', { timeout: 60_000 }, () => {
    // `--eval` is CommonJS to tsx, so a promise chain rather than top-level await; `import()` is still Node's ESM loader.
    const script = "import('./src/app.ts').then(() => import('./src/jobs/scheduler.ts')).then(() => { console.log('loaded'); process.exit(0); });";
    const out = spawnSync(TSX, ['--eval', script], { cwd: API, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' } });
    expect(out.stderr).not.toContain('before initialization');
    expect(out.stdout.trim()).toBe('loaded');
  });
});
