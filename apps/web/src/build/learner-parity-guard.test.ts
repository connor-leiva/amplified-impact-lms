import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_REPO,
  LearnerParityError,
  PARITY_CHECK,
  POLL_MS,
  WAIT_MISSING_MS,
  WAIT_RUNNING_MS,
  commitOf,
  guardApplies,
  learnerParityGuard,
  repoOf,
  requireLearnerParity,
  verdictOf,
} from './learner-parity-guard';
import type { CheckRun, GuardDeps } from './learner-parity-guard';

// D-182: a production build with VITE_LEARNER_V2=true needs `pnpm parity:learner` to have passed on its
// exact commit, read from CI's `parity-learner` check run. GitHub is stood in for; time is a counter.

const SHA = 'a'.repeat(40);
const run = (over: Partial<CheckRun> = {}): CheckRun => ({
  name: PARITY_CHECK,
  head_sha: SHA,
  status: 'completed',
  conclusion: 'success',
  app: { slug: 'github-actions' },
  html_url: 'https://github.com/x/y/runs/1',
  ...over,
});

/** GitHub answering each call with the next of `answers` (the last repeats), and a clock that sleeps instantly. */
function github(...answers: (CheckRun[] | number | Error)[]) {
  let t = 0;
  const calls: string[] = [];
  const deps: GuardDeps = {
    fetch: vi.fn(async (url: string | URL | Request) => {
      calls.push(String(url));
      const a = answers[Math.min(calls.length - 1, answers.length - 1)]!;
      if (a instanceof Error) throw a;
      if (typeof a === 'number') return new Response('{}', { status: a });
      return new Response(JSON.stringify({ check_runs: a }), { status: 200 });
    }) as unknown as typeof fetch,
    sleep: async (ms) => {
      t += ms;
    },
    now: () => t,
    log: () => {},
  };
  return { deps, calls, elapsed: () => t };
}

const env = { VITE_LEARNER_V2: 'true', RAILWAY_GIT_COMMIT_SHA: SHA, RAILWAY_GIT_REPO_OWNER: 'connor-leiva', RAILWAY_GIT_REPO_NAME: 'amplified-impact-lms' };
const noGit = () => null;

describe('which builds are guarded', () => {
  it('a production build with the flag on, and no other', () => {
    expect(guardApplies('production', { VITE_LEARNER_V2: 'true', VITE_DATA_SOURCE: 'http' })).toBe(true);
    // The Railway demo environment builds the fixture data source in production mode: guarded too.
    expect(guardApplies('production', { VITE_LEARNER_V2: 'true', VITE_DATA_SOURCE: 'fixture' })).toBe(true);
    expect(guardApplies('production', { VITE_DATA_SOURCE: 'http' })).toBe(false);
    expect(guardApplies('production', { VITE_LEARNER_V2: 'false' })).toBe(false);
    expect(guardApplies('production', { VITE_LEARNER_V2: 'TRUE' })).toBe(false);
    // The compliance suite's flag-on fixture build (`build:fixture:v2`) is what parity:learner itself runs.
    expect(guardApplies('fixture', { VITE_LEARNER_V2: 'true', VITE_DATA_SOURCE: 'fixture' })).toBe(false);
    expect(guardApplies('fixture', { VITE_LEARNER_V2: 'true', VITE_DATA_SOURCE: 'http' })).toBe(true);
  });

  it('reads the commit from Railway, then GitHub Actions, then git; anything else is no commit', () => {
    expect(commitOf({ RAILWAY_GIT_COMMIT_SHA: SHA.toUpperCase(), GITHUB_SHA: 'b'.repeat(40) }, noGit)).toBe(SHA);
    expect(commitOf({ GITHUB_SHA: 'b'.repeat(40) }, noGit)).toBe('b'.repeat(40));
    expect(commitOf({}, () => `${'c'.repeat(40)}\n`)).toBe('c'.repeat(40));
    expect(commitOf({}, noGit)).toBeNull();
    expect(commitOf({ RAILWAY_GIT_COMMIT_SHA: 'main' }, noGit)).toBeNull();
  });

  it('reads the repository from Railway, then GitHub Actions, else the one Railway builds from', () => {
    expect(repoOf(env)).toBe('connor-leiva/amplified-impact-lms');
    expect(repoOf({ GITHUB_REPOSITORY: 'a/b' })).toBe('a/b');
    expect(repoOf({})).toBe(DEFAULT_REPO);
  });
});

describe('the verdict of a commit’s check runs', () => {
  it('passes on a successful run by GitHub Actions for this commit, a re-run included', () => {
    expect(verdictOf([run()], SHA)).toEqual({ kind: 'passed', url: 'https://github.com/x/y/runs/1' });
    expect(verdictOf([run({ conclusion: 'failure' }), run()], SHA).kind).toBe('passed');
  });

  it('ignores another job, another commit and another app posting the same name', () => {
    expect(verdictOf([run({ name: 'compliance' })], SHA)).toEqual({ kind: 'missing' });
    expect(verdictOf([run({ head_sha: 'b'.repeat(40) })], SHA)).toEqual({ kind: 'missing' });
    expect(verdictOf([run({ app: { slug: 'someone-else' } })], SHA)).toEqual({ kind: 'missing' });
  });

  it('fails on a completed run that did not succeed, and waits on one still running', () => {
    expect(verdictOf([run({ conclusion: 'failure' })], SHA)).toMatchObject({ kind: 'failed', conclusion: 'failure' });
    expect(verdictOf([run({ conclusion: 'cancelled' })], SHA)).toMatchObject({ kind: 'failed', conclusion: 'cancelled' });
    expect(verdictOf([run({ status: 'in_progress', conclusion: null })], SHA)).toEqual({ kind: 'running' });
  });
});

describe('requireLearnerParity', () => {
  it('asks GitHub for this commit’s parity-learner run, with no token, and goes on when it passed', async () => {
    const g = github([run()]);
    await expect(requireLearnerParity(env, g.deps, noGit)).resolves.toEqual({ sha: SHA, url: 'https://github.com/x/y/runs/1' });
    expect(g.calls).toEqual([`https://api.github.com/repos/connor-leiva/amplified-impact-lms/commits/${SHA}/check-runs?check_name=parity-learner&per_page=100`]);
    const init = (g.deps.fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]![1];
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it('fails at once on a failed run, naming it', async () => {
    const g = github([run({ conclusion: 'failure' })]);
    await expect(requireLearnerParity(env, g.deps, noGit)).rejects.toThrow(/did not pass on a{40} \(failure\): https:\/\/github.com\/x\/y\/runs\/1/);
    expect(g.calls).toHaveLength(1);
  });

  it('waits for a run in progress, a minute at a time, and goes on once it passes', async () => {
    const g = github([run({ status: 'queued', conclusion: null })], [run({ status: 'in_progress', conclusion: null })], [run()]);
    await expect(requireLearnerParity(env, g.deps, noGit)).resolves.toMatchObject({ sha: SHA });
    expect(g.calls).toHaveLength(3);
    expect(g.elapsed()).toBe(2 * POLL_MS);
  });

  it('fails closed when the run never finishes, the commit never gets one, or GitHub cannot be read', async () => {
    const running = github([run({ status: 'in_progress', conclusion: null })]);
    await expect(requireLearnerParity(env, running.deps, noGit)).rejects.toThrow(/still running/);
    expect(running.elapsed()).toBeLessThanOrEqual(WAIT_RUNNING_MS);
    expect(running.calls.length).toBeLessThanOrEqual(60);

    const missing = github([]);
    await expect(requireLearnerParity(env, missing.deps, noGit)).rejects.toThrow(/no `parity-learner` run on this commit yet/);
    expect(missing.elapsed()).toBeLessThanOrEqual(WAIT_MISSING_MS);

    const limited = github(403);
    await expect(requireLearnerParity(env, limited.deps, noGit)).rejects.toThrow(/HTTP 403/);

    const offline = github(new Error('getaddrinfo ENOTFOUND api.github.com'));
    await expect(requireLearnerParity(env, offline.deps, noGit)).rejects.toThrow(/ENOTFOUND/);
  });

  it('refuses a commit GitHub does not have, and a build that cannot name its commit', async () => {
    await expect(requireLearnerParity(env, github(404).deps, noGit)).rejects.toBeInstanceOf(LearnerParityError);
    const unpushed = github(422);
    await expect(requireLearnerParity(env, unpushed.deps, noGit)).rejects.toThrow(/has no commit/);
    expect(unpushed.calls).toHaveLength(1);
    await expect(requireLearnerParity({ VITE_LEARNER_V2: 'true' }, github([run()]).deps, noGit)).rejects.toThrow(/which commit/);
  });
});

describe('the Vite plugin', () => {
  type Hooks = { configResolved: (c: { mode: string; env: Record<string, string> }) => void; buildStart: (this: { error: (m: string) => never }) => Promise<void> };
  const ctx = { error: (m: string): never => { throw new Error(m); } };
  const vars = ['RAILWAY_GIT_COMMIT_SHA', 'RAILWAY_GIT_REPO_OWNER', 'RAILWAY_GIT_REPO_NAME'] as const;

  async function build(mode: string, viteEnv: Record<string, string>, deps: GuardDeps) {
    const plugin = learnerParityGuard(deps) as unknown as Hooks;
    for (const k of vars) vi.stubEnv(k, env[k]);
    try {
      plugin.configResolved({ mode, env: viteEnv });
      await plugin.buildStart.call(ctx);
    } finally {
      vi.unstubAllEnvs();
    }
  }

  it('builds today’s portal without asking anything, and the flag-on fixture build too', async () => {
    const g = github([]);
    await build('production', { VITE_DATA_SOURCE: 'http', VITE_LEARNER_V2: 'false' }, g.deps);
    await build('fixture', { VITE_DATA_SOURCE: 'fixture', VITE_LEARNER_V2: 'true' }, g.deps);
    expect(g.calls).toHaveLength(0);
  });

  it('stops a flag-on production build whose commit has not passed, and says what to do', async () => {
    const g = github([run({ conclusion: 'failure' })]);
    await expect(build('production', { VITE_DATA_SOURCE: 'http', VITE_LEARNER_V2: 'true' }, g.deps)).rejects.toThrow(
      /VITE_LEARNER_V2=true needs `pnpm parity:learner` to have passed on this exact commit[\s\S]*unset VITE_LEARNER_V2/,
    );
  });

  it('lets a flag-on production build through once its commit passed', async () => {
    const g = github([run()]);
    await expect(build('production', { VITE_DATA_SOURCE: 'http', VITE_LEARNER_V2: 'true' }, g.deps)).resolves.toBeUndefined();
    expect(g.calls).toHaveLength(1);
  });
});
