// § 9.5's launch seed, as reached from the command line.
//
// The writing half is covered by test/io.test.ts and the content half by
// packages/core/test/seed-production.test.ts. What is left, and what this file is about, is the one
// decision the CLI makes: `--launch` must not be able to proceed without a real owner.
//
// That matters because the two seeds are not interchangeable and the mistake is silent. The demo
// seed loads fourteen invented learners with plausible addresses, and `remindMembers` will mail
// whatever is in the users table — so `db:seed:prod` running the demo seed would hand a real cohort
// a roster of strangers and put those addresses one admin click from receiving email. That is
// exactly the bug this file was written after finding: the script existed, passed `--launch`, and
// `main()` ignored argv entirely.
import { describe, it, expect, vi } from 'vitest';
import { parseSeedArgs, runSeed } from '../src/db/seed';
import type { SeedDeps } from '../src/db/seed';
import type { Database } from '../src/db/client';

/** Substituted collaborators. No connection is opened and no row is written. */
function fakeDeps(): SeedDeps & { calls: { live: number; launch: unknown[]; curriculum: unknown[]; closed: number; out: string[] } } {
  const calls = { live: 0, launch: [] as unknown[], curriculum: [] as unknown[], closed: 0, out: [] as string[] };
  return {
    calls,
    db: () => ({}) as Database,
    live: async () => {
      calls.live += 1;
      return 1;
    },
    launch: async (_db, opts) => {
      calls.launch.push(opts);
      return 2;
    },
    curriculum: async (_db, opts) => {
      calls.curriculum.push(opts);
      return 3;
    },
    close: async () => {
      calls.closed += 1;
    },
    name: () => 'ai_lms_test',
    write: (line) => calls.out.push(line),
  };
}

describe('§9.5 the seed CLI @g9', () => {
  it('loads the demo seed when nothing asks for the launch seed @g9', () => {
    expect(parseSeedArgs([])).toEqual({ mode: 'live' });
    // Not a prefix match: `--launched` is not `--launch`, and neither is a flag that merely
    // contains it.
    expect(parseSeedArgs(['--launched'])).toEqual({ mode: 'live' });
    expect(parseSeedArgs(['--verbose'])).toEqual({ mode: 'live' });
  });

  it('refuses --launch without an owner, naming what is missing @g9', () => {
    // The whole point. A default here, or a fallback to the environment, is how production ends up
    // owned by an address nobody controls.
    expect(() => parseSeedArgs(['--launch'])).toThrow(/--owner-name and --owner-email/);
    expect(() => parseSeedArgs(['--launch', '--owner-name', 'A B'])).toThrow(/--owner-email/);
    expect(() => parseSeedArgs(['--launch', '--owner-email', 'a@b.co'])).toThrow(/--owner-name/);
  });

  it('refuses a flag whose value is the next flag @g9', () => {
    // `--owner-name --owner-email x@y.z` would otherwise seed an Owner literally called
    // "--owner-email" and then complain that the address was missing.
    expect(() => parseSeedArgs(['--launch', '--owner-name', '--owner-email', 'a@b.co'])).toThrow(
      /--owner-name needs a value/,
    );
    expect(() => parseSeedArgs(['--launch', '--owner-name', 'A B', '--owner-email'])).toThrow(
      /--owner-email needs a value/,
    );
  });

  it('never reads the owner from the environment @g9', () => {
    // Stated as a test because it is a property of the parser's SIGNATURE: it takes argv and
    // nothing else, so there is no environment variable to inherit, misspell or forget to unset
    // between a staging run and a production one.
    const before = { ...process.env };
    process.env.OWNER_NAME = 'Someone Else';
    process.env.OWNER_EMAIL = 'someone@else.test';
    process.env.SEED_OWNER = 'someone@else.test';
    try {
      expect(() => parseSeedArgs(['--launch'])).toThrow(/requires/);
    } finally {
      process.env = before;
    }
  });

  it('passes the owner through, and the optional flags only when given @g9', () => {
    expect(parseSeedArgs(['--launch', '--owner-name', 'Connor Leiva', '--owner-email', 'connor@amplifiedimpact.io'])).toEqual({
      mode: 'launch',
      opts: { owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } },
    });

    // Absent rather than undefined: `seedProduction` distinguishes "not given" (default to the
    // Owner) from a value, and an explicit `instructor: undefined` would read as the latter to a
    // future `in` check.
    const full = parseSeedArgs([
      '--launch',
      '--owner-name',
      'Connor Leiva',
      '--owner-email',
      'connor@amplifiedimpact.io',
      '--instructor',
      'Dana Whitfield',
      '--cohort',
      'feb27',
    ]);
    expect(full).toEqual({
      mode: 'launch',
      opts: {
        owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' },
        instructor: 'Dana Whitfield',
        cohortId: 'feb27',
      },
    });
    const bare = parseSeedArgs(['--launch', '--owner-name', 'A B', '--owner-email', 'a@b.co']);
    expect('instructor' in (bare as { opts: object }).opts).toBe(false);
    expect('cohortId' in (bare as { opts: object }).opts).toBe(false);
  });

  // --- the wiring, which is where the bug actually was -------------------------------------------

  it('--launch reaches the LAUNCH seeder and never the demo one @g9', async () => {
    // THE test this file exists for. The shipped defect was `main` ignoring `process.argv`
    // entirely, so `db:seed:prod` passed `--launch` and loaded the demo seed. Asserting on the
    // parser could not see that, and did not — the suite stayed green with the defect in place.
    const deps = fakeDeps();
    await runSeed(['--launch', '--owner-name', 'Connor Leiva', '--owner-email', 'connor@amplifiedimpact.io'], deps);

    expect(deps.calls.launch).toEqual([{ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }]);
    expect(deps.calls.live).toBe(0);
    // And it says which database it is about to write to, before writing. That line is the only
    // thing standing between a mistyped DATABASE_URL and an unrecoverable write.
    expect(deps.calls.out[0]).toContain('LAUNCH seed into ai_lms_test');
    expect(deps.calls.out[0]).toContain('connor@amplifiedimpact.io');
  });

  it('no flags reaches the demo seeder and never the launch one @g9', async () => {
    const deps = fakeDeps();
    await runSeed([], deps);
    expect(deps.calls.live).toBe(1);
    expect(deps.calls.launch).toEqual([]);
  });

  it('refuses before connecting, and still releases the pool when it does connect @g9', async () => {
    // A usage error must cost nothing: parsed before `db()` is called, so a missing owner cannot
    // leave a half-written database or a dangling connection.
    const deps = fakeDeps();
    const opened = vi.fn(deps.db);
    await expect(runSeed(['--launch'], { ...deps, db: opened })).rejects.toThrow(/requires/);
    expect(opened).not.toHaveBeenCalled();
    expect(deps.calls.closed).toBe(0);

    // On the paths that do connect, the pool is released even when the seeder throws, or vitest
    // hangs on exit.
    const boom = fakeDeps();
    await expect(runSeed([], { ...boom, live: () => Promise.reject(new Error('insert failed')) })).rejects.toThrow(
      'insert failed',
    );
    expect(boom.calls.closed).toBe(1);
  });

  it('the package scripts select the right seed, and the launch one is useless on its own @g9', async () => {
    // The last link: `db:seed:prod` must carry `--launch`, or none of the above is reachable from
    // the command § 9.5 tells an operator to run.
    const pkg = (await import('../package.json', { with: { type: 'json' } })).default as {
      scripts: Record<string, string>;
    };
    const argvOf = (script: string) => script.split(/\s+/).slice(2); // drop `tsx src/db/seed.ts`

    expect(pkg.scripts['db:seed:prod']).toContain('--launch');
    expect(pkg.scripts['db:seed']).not.toContain('--launch');
    expect(parseSeedArgs(argvOf(pkg.scripts['db:seed']!))).toEqual({ mode: 'live' });

    // And `db:seed:prod` ON ITS OWN must FAIL. That is the safety property, not a gap: the script
    // cannot carry the owner, so the operator has to supply it —
    //   pnpm --filter @ai/api db:seed:prod -- --owner-name "Full Name" --owner-email a@b.co
    // A script that worked bare would be a script that invented an owner.
    expect(() => parseSeedArgs(argvOf(pkg.scripts['db:seed:prod']!))).toThrow(/requires --owner-name and --owner-email/);

    // With the operator's flags appended, as pnpm passes them, it selects the launch seed.
    expect(
      parseSeedArgs([...argvOf(pkg.scripts['db:seed:prod']!), '--owner-name', 'A B', '--owner-email', 'a@b.co']).mode,
    ).toBe('launch');
  });

  it('leaves validating the owner to seedProduction, which every caller goes through @g9', () => {
    // The parser deliberately does NOT check the address: the rule has to hold for a route or a
    // script that calls seedProduction directly too, so it lives in the function rather than here.
    expect(parseSeedArgs(['--launch', '--owner-name', ' ', '--owner-email', 'not-an-email'])).toEqual({
      mode: 'launch',
      opts: { owner: { name: ' ', email: 'not-an-email' } },
    });
  });

  // --- the curriculum on a live database (D-110) -------------------------------------------------

  it('--curriculum applies the course to a live database and reaches neither seeder @g9', async () => {
    expect(parseSeedArgs(['--curriculum'])).toEqual({ mode: 'curriculum', opts: {} });
    expect(parseSeedArgs(['--curriculum', '--instructor', 'Connor Leiva'])).toEqual({ mode: 'curriculum', opts: { instructor: 'Connor Leiva' } });
    // One or the other: the launch seed is for an empty database, the curriculum for a live one.
    expect(() => parseSeedArgs(['--curriculum', '--launch', '--owner-name', 'A B', '--owner-email', 'a@b.co'])).toThrow(/cannot be combined/);

    const deps = fakeDeps();
    await runSeed(['--curriculum'], deps);
    expect(deps.calls.curriculum).toEqual([{}]);
    expect([deps.calls.live, deps.calls.launch]).toEqual([0, []]);
    expect(deps.calls.out[0]).toContain('Accelerator curriculum to ai_lms_test');
    expect(deps.calls.out[1]).toContain('Users, teams, progress and staff were not touched');
    expect(deps.calls.closed).toBe(1);
  });

  it('db:curriculum is the curriculum mode, and needs no owner @g9', async () => {
    const pkg = (await import('../package.json', { with: { type: 'json' } })).default as { scripts: Record<string, string> };
    const argvOf = (script: string) => script.split(/\s+/).slice(2);
    expect(parseSeedArgs(argvOf(pkg.scripts['db:curriculum']!))).toEqual({ mode: 'curriculum', opts: {} });
    // The deploy's form: applied only to a database with none of it.
    expect(parseSeedArgs(argvOf(pkg.scripts['db:curriculum:ensure']!))).toEqual({ mode: 'curriculum', opts: { ifMissing: true } });
  });

  it('--if-missing says so, and says how to re-apply over staff edits when it wrote nothing @g9', async () => {
    const deps = fakeDeps();
    deps.curriculum = async (_db, opts) => {
      deps.calls.curriculum.push(opts);
      return 0;
    };
    await runSeed(['--curriculum', '--if-missing'], deps);
    expect(deps.calls.curriculum).toEqual([{ ifMissing: true }]);
    expect(deps.calls.out[0]).toContain('to ai_lms_test if it has none');
    expect(deps.calls.out[1]).toContain('0 rows changed');
    expect(deps.calls.out[2]).toContain('run db:curriculum');
  });

  it('the deploy runs, after the migrations, the curriculum if missing, and nothing that seeds learners or needs the bucket @g9', async () => {
    // The string Railway runs is set by hand in its dashboard (it does not read this file on deploy);
    // this pins the file to what is live, so the two can be compared at a glance.
    const { readFileSync } = await import('node:fs');
    const railway = readFileSync(new URL('../../../.railway/railway.ts', import.meta.url), 'utf8');
    const pre = /preDeploy:\s*'([^']+)'/.exec(railway)?.[1] ?? '';
    expect(pre.split(' && ')).toEqual(['pnpm --filter @ai/api db:migrate', 'pnpm --filter @ai/api db:curriculum:ensure']);
    expect(pre).not.toMatch(/--upload|S3_/);
    expect(pre).not.toMatch(/db:seed|--launch|db:curriculum(?!:ensure)/);
  });
});
