// The build guard on the learner portal's flag (D-182, Connor's parity brief § 4): a production build with
// `VITE_LEARNER_V2=true` fails unless `pnpm parity:learner` passed on that exact commit.
//
// WHAT COUNTS AS "PASSED ON THAT COMMIT". CI's `parity-learner` job (`.github/workflows/ci.yml`) runs
// `pnpm parity:learner` on every push to `main` and every pull request, and GitHub records the job's result
// as a check run on the commit, signed by the GitHub Actions app. That check run is the attestation: it is
// produced by CI, bound to the commit's SHA, and readable by anyone because the repository is public, so
// the build needs no token, no secret and no Railway variable to read it. The guard relies on two things
// only, the job's name and its conclusion (the script's exit code), never on what the suite runs inside, so
// the real suite can replace today's placeholder without touching this file.
//
// THE STEPS, when the guard applies (a build that is not the compliance suite's fixture build, with the
// flag on):
//   1. The commit: `RAILWAY_GIT_COMMIT_SHA` (Railway sets it on every build from GitHub), else
//      `GITHUB_SHA`, else `git rev-parse HEAD`. None is a failure.
//   2. The repository: `RAILWAY_GIT_REPO_OWNER`/`RAILWAY_GIT_REPO_NAME`, else `GITHUB_REPOSITORY`, else the
//      repository Railway builds from (`.railway/railway.ts`).
//   3. `GET /repos/{repo}/commits/{sha}/check-runs?check_name=parity-learner`. A completed run by GitHub
//      Actions for this SHA with conclusion `success` lets the build go on. A completed run that did not
//      succeed fails it at once. A queued or running one (Railway built before CI finished, which happens
//      only with "Wait for CI" off) is asked again every minute for up to 20 minutes, inside the anonymous
//      rate limit of 60 an hour; so is an answer with no run yet, for up to 5 minutes, and a rate limit or a
//      network error. Then it fails: the guard fails closed.
//
// With the flag off, in the fixture build the compliance suite runs (`--mode fixture` with the fixture data
// source), or in the parity suite's request-capture build (`--mode parity`), nothing is asked.

import { execFileSync } from 'node:child_process';
import type { Plugin } from 'vite';

/** The CI job whose success on the commit is the attestation. Its name is the contract with ci.yml. */
export const PARITY_CHECK = 'parity-learner';

/** The repository Railway builds from (`.railway/railway.ts`'s `REPO`). */
export const DEFAULT_REPO = 'connor-leiva/amplified-impact-lms';

const MINUTE = 60_000;
/** How long a queued or running `parity-learner` is waited for. */
export const WAIT_RUNNING_MS = 20 * MINUTE;
/** How long a commit with no `parity-learner` run yet is waited for (CI has not picked it up). */
export const WAIT_MISSING_MS = 5 * MINUTE;
export const POLL_MS = MINUTE;

type Env = Record<string, string | undefined>;

/**
 * Whether this build is guarded: the flag is on, and it is not one of the test builds that are never
 * deployed: the compliance suite's fixture build (`--mode fixture` with the fixture data source) and the
 * parity suite's request-capture build (`--mode parity`, `compliance/parity/learner.config.ts`).
 */
export function guardApplies(mode: string, env: Env): boolean {
  if (env.VITE_LEARNER_V2 !== 'true') return false;
  if (mode === 'parity') return false;
  return !(mode === 'fixture' && env.VITE_DATA_SOURCE === 'fixture');
}

/** The commit being built, or null. */
export function commitOf(env: Env, git: () => string | null = gitHead): string | null {
  const sha = env.RAILWAY_GIT_COMMIT_SHA || env.GITHUB_SHA || git();
  return sha && /^[0-9a-f]{40}$/i.test(sha.trim()) ? sha.trim().toLowerCase() : null;
}

/** The `owner/name` the commit belongs to. */
export function repoOf(env: Env): string {
  if (env.RAILWAY_GIT_REPO_OWNER && env.RAILWAY_GIT_REPO_NAME) return `${env.RAILWAY_GIT_REPO_OWNER}/${env.RAILWAY_GIT_REPO_NAME}`;
  return env.GITHUB_REPOSITORY || DEFAULT_REPO;
}

function gitHead(): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/** The fields of a GitHub check run the guard reads. */
export interface CheckRun {
  name: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  app?: { slug?: string } | null;
  html_url?: string;
}

export type Verdict =
  | { kind: 'passed'; url: string | null }
  | { kind: 'failed'; conclusion: string; url: string | null }
  | { kind: 'running' }
  | { kind: 'missing' };

/** What the commit's `parity-learner` runs say. A success anywhere among them is a pass (a re-run that passed). */
export function verdictOf(runs: readonly CheckRun[], sha: string): Verdict {
  const ours = runs.filter((r) => r.name === PARITY_CHECK && r.head_sha.toLowerCase() === sha && r.app?.slug === 'github-actions');
  const passed = ours.find((r) => r.status === 'completed' && r.conclusion === 'success');
  if (passed) return { kind: 'passed', url: passed.html_url ?? null };
  if (ours.some((r) => r.status !== 'completed')) return { kind: 'running' };
  const done = ours.find((r) => r.status === 'completed');
  if (done) return { kind: 'failed', conclusion: done.conclusion ?? 'unknown', url: done.html_url ?? null };
  return { kind: 'missing' };
}

export interface GuardDeps {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  log: (line: string) => void;
}

const defaultDeps: GuardDeps = {
  fetch: (...a) => fetch(...a),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
  log: (line) => console.log(line),
};

export class LearnerParityError extends Error {}

/** One answer from GitHub: the verdict, or the reason there is none (a rate limit, a network error). */
async function ask(repo: string, sha: string, deps: GuardDeps): Promise<Verdict | { kind: 'unreadable'; why: string }> {
  const url = `https://api.github.com/repos/${repo}/commits/${sha}/check-runs?check_name=${PARITY_CHECK}&per_page=100`;
  // No token, on purpose: the repository is public, and a token found in the environment could be one
  // for another account (or a placeholder) and turn a readable answer into a 401.
  const headers: Record<string, string> = { accept: 'application/vnd.github+json', 'user-agent': 'learner-parity-guard', 'x-github-api-version': '2022-11-28' };
  try {
    const res = await deps.fetch(url, { headers });
    // 404: no such repository (or a private one); 422: GitHub has no such commit (not pushed).
    if (res.status === 404 || res.status === 422) throw new LearnerParityError(`GitHub has no commit ${sha} in ${repo} (or cannot show it without a token).`);
    if (!res.ok) return { kind: 'unreadable', why: `GitHub answered HTTP ${res.status}` };
    const body = (await res.json()) as { check_runs?: CheckRun[] };
    return verdictOf(body.check_runs ?? [], sha);
  } catch (e) {
    if (e instanceof LearnerParityError) throw e;
    return { kind: 'unreadable', why: (e as Error).message };
  }
}

/**
 * Resolve when `parity-learner` passed on the commit; throw `LearnerParityError` (with what to do)
 * otherwise. Waits for a run in progress, and briefly for one not created yet, then fails closed.
 */
export async function requireLearnerParity(env: Env, deps: GuardDeps = defaultDeps, git: () => string | null = gitHead): Promise<{ sha: string; url: string | null }> {
  const sha = commitOf(env, git);
  if (!sha) throw new LearnerParityError('cannot tell which commit is being built (no RAILWAY_GIT_COMMIT_SHA, GITHUB_SHA or git checkout).');
  const repo = repoOf(env);
  const start = deps.now();
  let last = 'no answer yet';
  for (;;) {
    const v = await ask(repo, sha, deps);
    if (v.kind === 'passed') return { sha, url: v.url };
    if (v.kind === 'failed') throw new LearnerParityError(`\`${PARITY_CHECK}\` did not pass on ${sha} (${v.conclusion})${v.url ? `: ${v.url}` : ''}.`);
    const waited = deps.now() - start;
    const limit = v.kind === 'missing' ? WAIT_MISSING_MS : WAIT_RUNNING_MS;
    last = v.kind === 'unreadable' ? v.why : v.kind === 'running' ? `\`${PARITY_CHECK}\` is still running` : `no \`${PARITY_CHECK}\` run on this commit yet`;
    if (waited + POLL_MS > limit) break;
    deps.log(`learner parity guard: ${last} on ${sha}; asking again in a minute.`);
    await deps.sleep(POLL_MS);
  }
  throw new LearnerParityError(`no passing \`${PARITY_CHECK}\` on ${sha} in ${repo} (${last}).`);
}

/** The Vite plugin: checks before anything is bundled, so a refused build costs a few seconds. */
export function learnerParityGuard(deps: GuardDeps = defaultDeps): Plugin {
  let applies = false;
  let env: Env = {};
  return {
    name: 'learner-parity-guard',
    apply: 'build',
    configResolved(config) {
      env = { ...process.env, ...(config.env as Env) };
      applies = guardApplies(config.mode, env);
    },
    async buildStart() {
      if (!applies) return;
      try {
        const { sha, url } = await requireLearnerParity(env, deps);
        deps.log(`learner parity guard: \`${PARITY_CHECK}\` passed on ${sha}${url ? ` (${url})` : ''}; building with VITE_LEARNER_V2=true.`);
      } catch (e) {
        const why = e instanceof Error ? e.message : String(e);
        this.error(
          `VITE_LEARNER_V2=true needs \`pnpm parity:learner\` to have passed on this exact commit (D-182): ${why}\n` +
            `  Run CI's \`${PARITY_CHECK}\` job on the commit and deploy again once it is green, or unset VITE_LEARNER_V2 to build today's portal.`,
        );
      }
    },
  };
}
