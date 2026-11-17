// Deploys & Commits, PR 9 (D-168, spec § 7.11): the live commit, and a history when Connor has added
// a read-only token.
//
//   - The live commit is `RAILWAY_GIT_COMMIT_SHA`, as `/api/health` already shows it.
//   - The history needs `CONSOLE_RAILWAY_TOKEN` (Railway's deployments, with their status) or
//     `CONSOLE_GITHUB_TOKEN` (the commits on `main`). Both are optional and presence-checked; their
//     values are used only in the request's Authorization header, here, and never logged, stored,
//     audited or answered. Railway first, then GitHub; with neither the page says "Not configured".
//   - The answer is cached for 5 minutes (a failure for 1), so the page never hammers either API.
//   - Never Railway's list-variables: the one query is `deployments`, for this service.
//   - A provider's own words never come back: a failure is "unavailable", nothing more. Tests hand in
//     a fake `fetch`; nothing here runs against a live API in a test.

import { DEPLOYS_CACHE_MS, DEPLOYS_LIMIT, DEPLOY_FACTS } from '@ai/core';
import type { DeployHistory, DeployRow, DeploySource, DeployStatus, DeploysView } from '@ai/core';
import { resolveMode } from '../email/transport';

type Env = NodeJS.ProcessEnv;
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const set = (v: string | undefined): boolean => (v ?? '').trim() !== '';

/** Which optional deploy tokens are present. Booleans only: the values stay in `env`. */
export function readConsoleTokens(env: Env = process.env): { github: boolean; railway: boolean } {
  return { github: set(env.CONSOLE_GITHUB_TOKEN), railway: set(env.CONSOLE_RAILWAY_TOKEN) };
}

export const GITHUB_API = 'https://api.github.com';
export const RAILWAY_GRAPHQL = 'https://backboard.railway.com/graphql/v2';
const TIMEOUT_MS = 5000;
const FAILURE_CACHE_MS = 60_000;
const MESSAGE_MAX = 200;

const firstLine = (s: unknown): string => (typeof s === 'string' ? (s.split('\n')[0] ?? '').trim().slice(0, MESSAGE_MAX) : '');
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim().slice(0, 100) : null);
const when = (v: unknown): number | null => {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
};

/** The commits on `main`, newest first (GitHub's REST API, read-only). */
export async function githubHistory(token: string, live: string | null, fetchImpl: FetchLike): Promise<DeployRow[]> {
  const url = `${GITHUB_API}/repos/${DEPLOY_FACTS.owner}/${DEPLOY_FACTS.repository}/commits?sha=${DEPLOY_FACTS.branch}&per_page=${DEPLOYS_LIMIT}`;
  const res = await fetchImpl(url, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'amplified-impact-console' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error('github');
  const body = (await res.json()) as unknown;
  if (!Array.isArray(body)) throw new Error('github');
  const rows: DeployRow[] = [];
  for (const c of body.slice(0, DEPLOYS_LIMIT) as { sha?: unknown; commit?: { message?: unknown; author?: { name?: unknown; date?: unknown }; committer?: { date?: unknown } } }[]) {
    const sha = typeof c.sha === 'string' && /^[0-9a-f]{7,64}$/.test(c.sha) ? c.sha : null;
    const at = when(c.commit?.committer?.date) ?? when(c.commit?.author?.date);
    if (!sha || at === null) continue;
    rows.push({ sha, message: firstLine(c.commit?.message), status: live && sha === live ? 'live' : null, buildMs: null, author: str(c.commit?.author?.name), at });
  }
  return rows;
}

const RAILWAY_STATUS: Readonly<Record<string, DeployStatus>> = {
  SUCCESS: 'succeeded',
  FAILED: 'failed',
  CRASHED: 'failed',
  BUILDING: 'building',
  DEPLOYING: 'building',
  INITIALIZING: 'building',
  QUEUED: 'building',
  WAITING: 'building',
  REMOVED: 'removed',
  REMOVING: 'removed',
  SKIPPED: 'skipped',
};

const DEPLOYMENTS_QUERY =
  'query Deploys($input: DeploymentListInput!, $first: Int) { deployments(input: $input, first: $first) { edges { node { status createdAt meta } } } }';

/**
 * This service's deployments in this environment, newest first (Railway's public GraphQL API, the
 * `deployments` query only). The ids are the ones Railway gives the running service.
 */
export async function railwayHistory(token: string, env: Env, live: string | null, fetchImpl: FetchLike): Promise<DeployRow[]> {
  const input = { projectId: str(env.RAILWAY_PROJECT_ID), environmentId: str(env.RAILWAY_ENVIRONMENT_ID), serviceId: str(env.RAILWAY_SERVICE_ID) };
  if (!input.projectId || !input.environmentId || !input.serviceId) throw new Error('railway');
  const res = await fetchImpl(RAILWAY_GRAPHQL, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: DEPLOYMENTS_QUERY, variables: { input, first: DEPLOYS_LIMIT } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error('railway');
  const body = (await res.json()) as { data?: { deployments?: { edges?: { node?: { status?: unknown; createdAt?: unknown; meta?: unknown } }[] } }; errors?: unknown };
  const edges = body.data?.deployments?.edges;
  if (body.errors || !Array.isArray(edges)) throw new Error('railway');
  const rows: DeployRow[] = [];
  let liveSeen = false;
  for (const e of edges.slice(0, DEPLOYS_LIMIT)) {
    const n = e.node ?? {};
    const meta = (n.meta && typeof n.meta === 'object' ? n.meta : {}) as Record<string, unknown>;
    const sha = typeof meta.commitHash === 'string' && /^[0-9a-f]{7,64}$/.test(meta.commitHash) ? meta.commitHash : null;
    const at = when(n.createdAt);
    if (!sha || at === null) continue;
    let status: DeployStatus | null = typeof n.status === 'string' ? (RAILWAY_STATUS[n.status] ?? null) : null;
    // The live deploy is the newest that succeeded with the running commit.
    if (!liveSeen && status === 'succeeded' && (live === null || sha === live)) {
      status = 'live';
      liveSeen = true;
    }
    rows.push({ sha, message: firstLine(meta.commitMessage), status, buildMs: null, author: str(meta.commitAuthor), at });
  }
  return rows;
}

export interface DeploysDeps {
  env?: Env;
  fetch?: FetchLike;
  now: () => number;
}

let cache: { until: number; history: DeployHistory } | null = null;

/** Forget the cached history (a test's `beforeEach`). */
export function resetDeploysCache(): void {
  cache = null;
}

async function history(deps: DeploysDeps, live: string | null): Promise<DeployHistory> {
  const env = deps.env ?? process.env;
  const now = deps.now();
  if (cache && now < cache.until) return cache.history;
  const fetchImpl: FetchLike = deps.fetch ?? ((input, init) => fetch(input, init));
  const tries: { source: DeploySource; run: () => Promise<DeployRow[]> }[] = [];
  const railway = (env.CONSOLE_RAILWAY_TOKEN ?? '').trim();
  const github = (env.CONSOLE_GITHUB_TOKEN ?? '').trim();
  if (railway) tries.push({ source: 'railway', run: () => railwayHistory(railway, env, live, fetchImpl) });
  if (github) tries.push({ source: 'github', run: () => githubHistory(github, live, fetchImpl) });
  if (!tries.length) return { state: 'not_configured' };
  let out: DeployHistory = { state: 'unavailable', source: tries[0]!.source };
  for (const t of tries) {
    try {
      out = { state: 'ok', source: t.source, rows: await t.run(), asOf: now };
      break;
    } catch {
      // Never the provider's words, never the token: just try the next source.
    }
  }
  cache = { until: now + (out.state === 'ok' ? DEPLOYS_CACHE_MS : FAILURE_CACHE_MS), history: out };
  return out;
}

/** `GET /api/console/deploys`. */
export async function readDeploys(deps: DeploysDeps): Promise<DeploysView> {
  const env = deps.env ?? process.env;
  const sha = (env.RAILWAY_GIT_COMMIT_SHA ?? '').trim();
  const live = /^[0-9a-f]{7,64}$/.test(sha) ? sha : null;
  return {
    repository: DEPLOY_FACTS.repository,
    branch: DEPLOY_FACTS.branch,
    service: DEPLOY_FACTS.service,
    environment: resolveMode(env),
    liveCommit: live,
    history: await history(deps, live),
  };
}
