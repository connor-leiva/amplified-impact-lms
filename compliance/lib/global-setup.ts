import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REF_BASE, APP_BASE, HTTP_BASE, HTTP_PARITY, PERSONA_USER_ID } from './prepare';

/**
 * Prove the suite is pointed at the right two servers before a single test runs.
 *
 * Playwright's `reuseExistingServer` only checks that *something* answers on the port. If another
 * project happens to be serving that port — a stray `vite preview` from an unrelated repo, say —
 * the whole suite will run against that application and report a wall of baffling diffs instead of
 * saying "wrong server". This guard turns that into one clear failure.
 *
 * It also catches a stale or half-written `dist-fixture`, which fails the same way.
 */
async function text(url: string, what: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { accept: 'text/html,application/javascript,*/*' } });
  } catch (e) {
    throw new Error(`Compliance setup: cannot reach the ${what} at ${url}.\n  ${(e as Error).message}`);
  }
  if (!res.ok) throw new Error(`Compliance setup: the ${what} at ${url} returned HTTP ${res.status}.`);
  return res.text();
}

// ================================================================================================
// HTTP MODE: the database Gate 7's parity run reads
// ================================================================================================
//
// Gate 7: "run the API with `NODE_ENV=test FIXED_NOW=…` against a database seeded from
// `seed('live')`, and sign in each persona through `/api/test/session`."
//
// WHY THIS IS A CHILD PROCESS AND NOT AN IMPORT
//
// `compliance/` is not a package. Its only dependencies are the ones in the ROOT package.json —
// `@playwright/test`, `@axe-core/playwright`, eslint, prettier, typescript — so `postgres`,
// `drizzle-orm` and `@ai/core` are genuinely unresolvable from here (measured:
// `import('postgres')` from the repository root throws ERR_MODULE_NOT_FOUND, because pnpm does not
// hoist a workspace package's dependencies to the root). Adding them is out of the question: a
// test harness that needs a database driver in the root manifest has put the driver on every
// developer's install and in the web build's resolution path, for one run of one gate.
//
// So the seed runs where those modules ARE resolvable — `apps/api`, as its own process:
//
//   node --import tsx --input-type=module -e <source>     cwd: apps/api
//
// `process.execPath` and `shell: false`, not `pnpm --filter … exec`: `pnpm` is `pnpm.CMD` on this
// machine, spawning a `.cmd` needs a shell, and a shell means the multi-line `-e` source gets
// re-quoted by cmd.exe. Spawning Node directly passes the source as one argv entry with no
// quoting at all. `--import tsx` resolves against the cwd, where `apps/api/node_modules/tsx` is a
// devDependency, and so do the relative `./src/db/*.ts` imports and the bare `@ai/core` one.
//
// WHY IT TRUNCATES, WHEN `db:seed` DELIBERATELY REFUSES TO
//
// `src/db/seed.ts` is a hand-run CLI pointed at whatever `DATABASE_URL` says, so "refuse on a
// non-empty database" is the right answer there — its header argues it at length. This is not that
// tool: it runs only under `HTTP_PARITY`, it must produce a byte-identical snapshot on the second
// run as on the first (a parity suite compares against committed goldens; "whatever was left in
// the database last time" is not a fixture), and it re-asserts D-019's `railway` guard first. Same
// reasoning as `apps/api/test/helpers.ts`, which truncates seventeen tables in a `beforeEach`.
const API_DIR = fileURLToPath(new URL('../../apps/api', import.meta.url));

/**
 * Truncate every table and load `seedForDatabase('live')`, as one module, run inside `apps/api`.
 *
 * The table list comes from `schema.ts` through drizzle's own `is(value, PgTable)` rather than
 * being written out, for the reason `test/helpers.ts` gives: a hand-written list is a second place
 * to remember a new table and the one that gets forgotten, and a missed table does not fail — it
 * leaves rows standing, which surfaces as a parity diff nobody can trace.
 *
 * No backticks and no template literals in this source: it travels through `spawnSync`'s argv as
 * a plain string, and the house rule about heredocs mangling TypeScript backticks applies to
 * anything that is quoted on its way to a shell even when, as here, no shell is involved.
 */
const SEED_SOURCE = [
  "const client = await import('./src/db/client.ts');",
  "const io = await import('./src/db/io.ts');",
  "const schema = await import('./src/db/schema.ts');",
  "const { seedForDatabase } = await import('@ai/core');",
  "const { is, getTableName, sql } = await import('drizzle-orm');",
  "const { PgTable } = await import('drizzle-orm/pg-core');",
  'const url = client.readDatabaseUrl();',
  'const name = client.databaseNameOf(url);',
  // D-019, re-asserted at the point of damage. `helpers.ts` makes the same check at import time
  // for the same reason: this function's whole job is to empty tables, so "which database" is not
  // a detail, and `railway` is the one the deployed Web service reads.
  "if (name === 'railway') throw new Error('Refusing to seed ' + name + ': that is the database the deployed site reads (DECISIONS.md D-019). Point apps/api/.env at ai_lms_dev.');",
  'const db = client.getDb();',
  "const tables = Object.values(schema).filter((v) => is(v, PgTable)).map((t) => '\"' + getTableName(t) + '\"');",
  "await db.execute(sql.raw('truncate table ' + tables.join(', ') + ' restart identity cascade'));",
  "const rows = await db.transaction(async (tx) => io.insertSnapshot(tx, seedForDatabase('live')));",
  "process.stdout.write('seeded ' + rows + ' rows into ' + name + ' across ' + tables.length + ' tables\\n');",
  'await client.close();',
].join('\n');

function seedHttpDatabase(): void {
  const run = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', SEED_SOURCE], {
    cwd: API_DIR,
    encoding: 'utf8',
    // `DATABASE_URL` is read from `apps/api/.env` by `client.ts`'s `loadEnvFileOnce()`, which
    // resolves `.env` against the cwd — hence `cwd: API_DIR` above rather than passing a URL in.
    env: process.env,
  });
  if (run.status !== 0) {
    throw new Error(
      'Compliance setup: could not seed the http-mode database.\n' +
        `  node exited ${run.status === null ? `on signal ${String(run.signal)}` : String(run.status)}.\n` +
        `  stdout: ${(run.stdout ?? '').trim()}\n` +
        `  stderr: ${(run.stderr ?? '').trim()}`,
    );
  }
  process.stdout.write(`  http mode: ${(run.stdout ?? '').trim()}\n`);
}

/**
 * Prove the http-mode server is the one this repository just built, then seed it.
 *
 * Four checks, in the order a failure is cheapest to read:
 *   1. `/api/health` answers `{ ok: true }`  — the API is up at all.
 *   2. `/` is this SPA                       — `apps/web/dist` was built and is being served.
 *   3. the database is the live seed          — reset here, so the run cannot inherit a mutated one.
 *   4. `POST /api/test/session` answers 200   — NODE_ENV really is 'test' AND the seed landed, which
 *                                               is the single call every scenario depends on.
 */
async function setUpHttpMode(): Promise<void> {
  const health = await text(`${HTTP_BASE}/api/health`, 'http-mode API');
  if (!/"ok"\s*:\s*true/.test(health))
    throw new Error(
      `Compliance setup: ${HTTP_BASE}/api/health did not answer { ok: true }.\n  It said: ${health.slice(0, 200)}`,
    );

  const html = await text(`${HTTP_BASE}/`, 'http-mode app');
  if (!(html.includes('<title>Amplified Impact</title>') && html.includes('ai-lms-prefs')))
    throw new Error(
      `Compliance setup: ${HTTP_BASE} answers /api/health but is not serving this SPA.\n` +
        '  `apps/api/src/server.ts` only registers @fastify/static when `apps/web/dist` exists, so the\n' +
        '  likely cause is a missing or half-written build. Run `pnpm --filter @ai/web build`, or pick a\n' +
        '  free port: HTTP_PORT=4473 HTTP_PARITY=1 pnpm compliance --grep "@g5"\n' +
        `  Served HTML began: ${html.slice(0, 160).replace(/\s+/g, ' ')}`,
    );

  seedHttpDatabase();

  const userId = PERSONA_USER_ID.agent;
  const session = await fetch(`${HTTP_BASE}/api/test/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!session.ok)
    throw new Error(
      `Compliance setup: POST ${HTTP_BASE}/api/test/session { userId: '${userId}' } answered ` +
        `${session.status}: ${(await session.text()).slice(0, 200)}\n` +
        '  A 404 with no body means the API is not running with NODE_ENV=test — `routes/test.ts` compares\n' +
        "  NODE_ENV to the exact string 'test' and registers nothing otherwise, so every scenario would\n" +
        '  then fail to sign in.',
    );
}

export default async function globalSetup() {
  // The reference prototype: lms-data.js is the oracle every scenario depends on.
  const data = await text(`${REF_BASE}/lms-data.js`, 'reference server');
  if (!/export const DB_V/.test(data))
    throw new Error(
      `Compliance setup: ${REF_BASE} is serving something, but it is not design-reference/.\n` +
        `  Expected lms-data.js to export DB_V. Run \`pnpm reference\` and make sure nothing else holds port 4400.`,
    );

  // The app under test. Skipped when only the reference is needed (capture, harness) and for a
  // remote target (phase 09 runs against a deployed URL), which has its own smoke tests.
  if (process.env.REFERENCE_ONLY || process.env.APP_URL) return;
  const html = await text(`${APP_BASE}/`, 'app under test');
  const ours = html.includes('<title>Amplified Impact</title>') && html.includes('ai-lms-prefs');
  if (!ours)
    throw new Error(
      `Compliance setup: ${APP_BASE} is serving a DIFFERENT application.\n` +
        `  Expected the Amplified Impact fixture build (its <title> and the pre-paint prefs script).\n` +
        `  Another project is probably holding that port. Either stop it, or pick a free one:\n` +
        `      APP_PORT=4273 pnpm compliance\n` +
        `  Served HTML began: ${html.slice(0, 160).replace(/\s+/g, ' ')}`,
    );

  // Gate 7's second mode, and only when this run asked for it. `HTTP_PARITY` is false for
  // `pnpm compliance`, for `pnpm gate 6` and for any run with APP_URL set, so everything that
  // works today keeps working with no database and no API.
  if (HTTP_PARITY) await setUpHttpMode();
}
