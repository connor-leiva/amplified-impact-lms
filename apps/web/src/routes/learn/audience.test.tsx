import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router';
import type * as ReactRouter from 'react-router';
import type { RouteObject } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { phaseNow, seed } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../../data/repository';
import type * as BootModule from '../../data/boot';

// D-182: the app's real route table, with the learner portal's flag off and on, walked as each audience
// at each address the first portal and the learner portal answer. The first portal's shell
// (`shell/AppShell.tsx`, with its own guards) and the gates are real; the screens are stood in for by
// their names, and the data hooks and the repository by the state below.
//
// Audiences: a learner with the course (the fixture's Agent tier persona, six AI Employees in their
// snapshot), a learner without it (the scoped snapshot of a plan that opens no AI Employee: Utah Life,
// the Agent Plan, the Team Plan, Insiders), staff, and a signed-out visitor (http mode, `/api/me` 401).

type Who = 'course' | 'no-course' | 'no-course-team' | 'staff' | 'signed-out';

const state: { db: Db; viewer: Viewer; source: 'fixture' | 'http'; signedIn: boolean } = {
  db: seed('live'),
  viewer: { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' },
  source: 'fixture',
  signedIn: true,
};

const flag = vi.hoisted(() => ({ on: false }));
vi.mock('./flag', () => ({ learnerV2Enabled: () => flag.on }));

vi.mock('../../data/hooks', () => ({
  DB_KEY: ['db'],
  VIEWER_KEY: ['viewer'],
  useDb: () => state.db,
  useViewer: () => state.viewer,
  useNow: () => phaseNow('live'),
  useMutate: () => async () => ({}),
}));

vi.mock('../../data/boot', async (importOriginal) => ({
  ...(await importOriginal<typeof BootModule>()),
  repo: {
    get source() {
      return state.source;
    },
    viewer: async () => state.viewer,
    snapshot: async () => state.db,
  },
}));

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof ReactRouter>()),
  createBrowserRouter: (routes: RouteObject[]) => ({ routes }),
}));

// The screens, by name. A shell renders its outlet; a page, its name.
const page = (name: string) => ({ Component: () => <p data-page={name}>{name}</p> });
const shell = (name: string) => ({
  Component: () => (
    <div data-shell={name}>
      <Outlet />
    </div>
  ),
});
vi.mock('../portal/Dashboard', () => page('old dashboard'));
vi.mock('../portal/Sessions', () => page('old sessions'));
vi.mock('../portal/EmployeeDetail', () => page('old ai employee'));
vi.mock('../portal/TeamHub', () => page('old team hub'));
vi.mock('../portal/Vault', () => page('vault'));
vi.mock('../portal/TeamTier', () => page('old team tier'));
vi.mock('../library/SkillLibrary', () => page('old skill library'));
vi.mock('../library/SkillGuide', () => page('old skill guide'));
vi.mock('../course/Course', () => page('old course'));
vi.mock('../auth/Account', () => page('password page'));
vi.mock('../../shell/learner/LearnerShell', () => shell('learner'));
vi.mock('../../shell/admin/AdminShell', () => ({
  AdminShell: () => (
    <div data-shell="admin">
      <Outlet />
    </div>
  ),
}));
vi.mock('../admin/Overview', () => page('console'));
vi.mock('./Home', () => page('learn home'));
vi.mock('./Week', () => page('learn week'));
vi.mock('./Step', () => page('learn step'));
vi.mock('./Schedule', () => page('learn schedule'));
vi.mock('./Library', () => page('learn library'));
vi.mock('./Skill', () => page('learn skill'));
vi.mock('./Account', () => page('learn account'));
vi.mock('./Team', () => page('learn team hub'));

const { firstPortalPathFor, isCourseLearner, probeAudience } = await import('./audience');

/** The route table `router.tsx` builds for the flag's state, inside its two pathless roots. */
async function tableFor(on: boolean): Promise<RouteObject[]> {
  flag.on = on;
  vi.resetModules();
  const { router } = (await import('../../router')) as unknown as { router: { routes: RouteObject[] } };
  return router.routes[0]!.children![0]!.children![0]!.children!;
}

function as(who: Who) {
  state.source = 'fixture';
  state.signedIn = true;
  state.db = seed('live');
  state.viewer = { actor: { kind: 'learner', userId: 'u_jamie' }, role: 'agent' };
  if (who === 'no-course') state.db = { ...seed('live'), modules: [] };
  if (who === 'no-course-team') {
    // The Team Plan: a Team tier owner on their team, whose plan opens no AI Employee.
    state.db = { ...seed('live'), modules: [] };
    state.viewer = { actor: { kind: 'learner', userId: 'u_alex' }, role: 'owner' };
  }
  if (who === 'staff') state.viewer = { actor: { kind: 'staff', staffId: 'st1' }, role: 'admin' };
  if (who === 'signed-out') {
    state.source = 'http';
    state.signedIn = false;
  }
}

async function visit(routes: RouteObject[], path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

/** Where the visit settles: the address (with its query and fragment) and the page drawn there. */
async function settle(routes: RouteObject[], path: string, page: string) {
  const router = await visit(routes, path);
  // Lazy routes and the gates' reads settle over a few ticks; a loaded runner needs more than the default second.
  await waitFor(() => expect(document.querySelector(`[data-page="${page}"]`), `${path}: ${page}`).not.toBeNull(), { timeout: 10_000 });
  const { pathname, search, hash } = router.state.location;
  return `${pathname}${search}${hash}`;
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: state.signedIn ? 200 : 401 })),
  );
  delete document.body.dataset.appReady;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// [audience, address, where it settles, the page drawn there]
type Row = [Who, string, string, string];

const FLAG_ON: Row[] = [
  // A learner with the course: the learner portal, every first-portal address redirected, query and hash kept.
  ['course', '/', '/learn', 'learn home'],
  ['course', '/sessions?view=calendar#top', '/learn/schedule?view=calendar#top', 'learn schedule'],
  ['course', '/employees/marketing', '/learn', 'learn home'],
  ['course', '/employees/accelerator-week-3?preview=agent', '/learn/week/3?preview=agent', 'learn week'],
  ['course', '/course', '/learn', 'learn home'],
  ['course', '/course/week-3', '/learn/week/3', 'learn week'],
  ['course', '/skill-library', '/learn/skills', 'learn library'],
  ['course', '/skill-library/tc-file-audit#download', '/learn/skills/tc-file-audit#download', 'learn skill'],
  ['course', '/team', '/learn/team', 'learn team hub'],
  ['course', '/vault', '/learn/vault', 'vault'],
  ['course', '/team-tier', '/learn', 'learn home'],
  ['course', '/admin/tiers', '/learn', 'learn home'],
  ['course', '/nowhere', '/learn', 'learn home'],
  ['course', '/learn/account', '/learn/account', 'learn account'],
  ['course', '/account', '/account', 'password page'],
  // A learner without the course: exactly what `main` serves them today.
  ['no-course', '/', '/skill-library', 'old skill library'],
  ['no-course', '/sessions', '/skill-library', 'old skill library'],
  ['no-course', '/employees/marketing', '/skill-library', 'old skill library'],
  ['no-course', '/skill-library', '/skill-library', 'old skill library'],
  ['no-course', '/skill-library/tc-file-audit', '/skill-library/tc-file-audit', 'old skill guide'],
  ['no-course', '/vault', '/vault', 'vault'],
  ['no-course', '/course', '/course', 'old course'],
  ['no-course', '/account', '/account', 'password page'],
  ['no-course', '/learn', '/skill-library', 'old skill library'],
  ['no-course', '/learn/schedule', '/skill-library', 'old skill library'],
  ['no-course', '/learn/skills?x=1', '/skill-library?x=1', 'old skill library'],
  ['no-course', '/learn/skills/tc-file-audit#download', '/skill-library/tc-file-audit#download', 'old skill guide'],
  ['no-course', '/learn/vault', '/vault', 'vault'],
  ['no-course', '/learn/account', '/account', 'password page'],
  ['no-course-team', '/team', '/team', 'old team hub'],
  ['no-course-team', '/learn/team', '/team', 'old team hub'],
  // Staff: unchanged.
  ['staff', '/skill-library', '/skill-library', 'old skill library'],
  ['staff', '/course', '/course', 'old course'],
  ['staff', '/admin', '/admin', 'console'],
  ['staff', '/learn', '/learn', 'learn home'],
  // Signed out: the pages open to a visitor show their own signed-out state, as today.
  ['signed-out', '/skill-library', '/skill-library', 'old skill library'],
  ['signed-out', '/skill-library/tc-file-audit', '/skill-library/tc-file-audit', 'old skill guide'],
  ['signed-out', '/course/week-3', '/course/week-3', 'old course'],
];

const FLAG_OFF: Row[] = [
  ['course', '/', '/', 'old dashboard'],
  ['course', '/sessions', '/sessions', 'old sessions'],
  ['course', '/employees/marketing', '/employees/marketing', 'old ai employee'],
  ['course', '/vault', '/vault', 'vault'],
  ['course', '/skill-library', '/skill-library', 'old skill library'],
  ['course', '/skill-library/tc-file-audit', '/skill-library/tc-file-audit', 'old skill guide'],
  ['course', '/course/week-3', '/course/week-3', 'old course'],
  ['course', '/learn', '/', 'old dashboard'],
  ['course', '/learn/skills/tc-file-audit', '/', 'old dashboard'],
  ['no-course', '/', '/skill-library', 'old skill library'],
  ['no-course', '/sessions', '/skill-library', 'old skill library'],
  ['no-course', '/vault', '/vault', 'vault'],
  ['no-course', '/learn', '/skill-library', 'old skill library'],
  ['no-course-team', '/team', '/team', 'old team hub'],
  ['staff', '/skill-library', '/skill-library', 'old skill library'],
  ['signed-out', '/skill-library', '/skill-library', 'old skill library'],
];

describe('with the flag on, the router routes by course access (D-182)', () => {
  it.each(FLAG_ON)('@parity:R-1 @parity:R-14 @parity:U-1 %s at %s settles on %s (%s)', async (who, from, to, name) => {
    const routes = await tableFor(true);
    as(who);
    expect(await settle(routes, from, name)).toBe(to);
  });

  it('@parity:R-1 @parity:SH-2 a learner without the course never sees the learner shell, and one with it never sees the first portal’s', async () => {
    const routes = await tableFor(true);
    as('no-course');
    await settle(routes, '/learn', 'old skill library');
    expect(document.querySelector('[data-shell="learner"]')).toBeNull();
    cleanup();
    as('course');
    await settle(routes, '/sessions', 'learn schedule');
    expect(document.querySelector('[data-shell="learner"]')).not.toBeNull();
    expect(document.querySelector('aside[aria-label="Primary"]')).toBeNull();
  });
});

describe('with the flag off, the router is #171’s (D-177)', () => {
  it.each(FLAG_OFF)('@parity:R-1 %s at %s settles on %s (%s)', async (who, from, to, name) => {
    const routes = await tableFor(false);
    as(who);
    expect(await settle(routes, from, name)).toBe(to);
  });
});

describe('the audience (D-182)', () => {
  const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

  it('@parity:U-1 is the course for a learner with an AI Employee in their snapshot, and nobody else', () => {
    expect(isCourseLearner({ actor: { kind: 'learner', userId: 'u_jamie' } }, seed('live'))).toBe(true);
    expect(isCourseLearner({ actor: { kind: 'learner', userId: 'u_jamie' } }, { ...seed('live'), modules: [] })).toBe(false);
    expect(isCourseLearner({ actor: { kind: 'staff', staffId: 'st1' } }, seed('live'))).toBe(false);
  });

  it('@parity:G-5 reads the session quietly in http mode: signed out is the first portal, with no snapshot read', async () => {
    as('course');
    const snapshot = vi.fn(async () => state.db);
    const { repo } = await import('../../data/boot');
    const original = repo.snapshot;
    repo.snapshot = snapshot;
    try {
      expect(await probeAudience(qc(), 'http', async () => false)).toBe('other');
      expect(snapshot).not.toHaveBeenCalled();
      expect(await probeAudience(qc(), 'http', async () => true)).toBe('course');
      expect(await probeAudience(qc(), 'fixture')).toBe('course');
      as('staff');
      expect(await probeAudience(qc(), 'fixture')).toBe('other');
      as('no-course');
      expect(await probeAudience(qc(), 'fixture')).toBe('other');
      expect(await probeAudience(qc(), 'http', async () => Promise.reject(new Error('offline')))).toBe('other');
    } finally {
      repo.snapshot = original;
    }
  });

  it('@parity:U-3 @parity:U-5 sends a learner without the course from each /learn address to the first portal’s page for it', () => {
    expect(firstPortalPathFor('/learn')).toBe('/skill-library');
    expect(firstPortalPathFor('/learn/')).toBe('/skill-library');
    expect(firstPortalPathFor('/learn/skills')).toBe('/skill-library');
    expect(firstPortalPathFor('/learn/skills/tc-file-audit')).toBe('/skill-library/tc-file-audit');
    expect(firstPortalPathFor('/learn/vault')).toBe('/vault');
    expect(firstPortalPathFor('/learn/team/')).toBe('/team');
    expect(firstPortalPathFor('/learn/account')).toBe('/account');
    for (const p of ['/learn/schedule', '/learn/week/2', '/learn/week/2/step/1', '/learn/anything']) expect(firstPortalPathFor(p), p).toBe('/skill-library');
  });
});
