// The Admin Console's authorization matrix (D-157, D-158, spec § 11.1): every Console route against
// every kind of caller — no session, a learner, a team owner, and each staff role — through the real
// router, `requireSession`, `requireJsonSameOrigin`, `requireConsole` and a real Postgres.
//
// The expectation is typed out below rather than computed from `consoleCan`, for the reason
// `authz.test.ts` gives: an oracle derived from the function under test moves with it. Spec § 5's
// table is the source, and `CONSOLE_PATHS` is pinned against this file's routes so a new Console route
// cannot ship without a row here.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, sql } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { CONSOLE_PATHS } from '../src/console/routes';
import { auditLog, staffNotes, users } from '../src/db/schema';
import { settleEmails } from '../src/auth';
import { invalidateConsoleFlags } from '../src/console/flags';
import { resetProbes } from '../src/console/ops-integrations';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');

type RouteName =
  | 'me'
  | 'audit'
  | 'export'
  | 'roles'
  | 'workspaces'
  | 'workspace'
  | 'users'
  | 'user'
  | 'passwordReset'
  | 'usersExport'
  | 'notesList'
  | 'notesCreate'
  | 'noteDelete'
  | 'search'
  | 'masqueradeStart'
  | 'masqueradeCurrent'
  | 'masqueradeExtend'
  | 'masqueradeExit'
  | 'masqueradeSessions'
  | 'opsEnv'
  | 'flagFlip'
  | 'integrations'
  | 'integrationCheck'
  | 'deploys'
  | 'dbHealth';

/** `path` is the route as registered; `url` is what the probe asks for, with its params and query filled in. */
const ROUTES: Record<RouteName, { path: string; url: string; method: 'GET' | 'POST'; route: string; body?: Record<string, unknown> }> = {
  me: { path: CONSOLE_PATHS.me, url: CONSOLE_PATHS.me, method: 'GET', route: `GET ${CONSOLE_PATHS.me}` },
  audit: { path: CONSOLE_PATHS.audit, url: CONSOLE_PATHS.audit, method: 'GET', route: `GET ${CONSOLE_PATHS.audit}` },
  export: { path: CONSOLE_PATHS.auditExport, url: CONSOLE_PATHS.auditExport, method: 'POST', route: `POST ${CONSOLE_PATHS.auditExport}` },
  roles: { path: CONSOLE_PATHS.roles, url: CONSOLE_PATHS.roles, method: 'GET', route: `GET ${CONSOLE_PATHS.roles}` },
  // PR 2 (D-158).
  workspaces: { path: CONSOLE_PATHS.workspaces, url: CONSOLE_PATHS.workspaces, method: 'GET', route: `GET ${CONSOLE_PATHS.workspaces}` },
  workspace: { path: CONSOLE_PATHS.workspace, url: '/api/console/workspaces/northline', method: 'GET', route: `GET ${CONSOLE_PATHS.workspace}` },
  users: { path: CONSOLE_PATHS.users, url: CONSOLE_PATHS.users, method: 'GET', route: `GET ${CONSOLE_PATHS.users}` },
  user: { path: CONSOLE_PATHS.user, url: '/api/console/users/u_jamie', method: 'GET', route: `GET ${CONSOLE_PATHS.user}` },
  passwordReset: { path: CONSOLE_PATHS.passwordReset, url: '/api/console/users/u_jamie/password-reset', method: 'POST', route: `POST ${CONSOLE_PATHS.passwordReset}` },
  usersExport: { path: CONSOLE_PATHS.usersExport, url: CONSOLE_PATHS.usersExport, method: 'POST', route: `POST ${CONSOLE_PATHS.usersExport}` },
  notesList: { path: CONSOLE_PATHS.notes, url: `${CONSOLE_PATHS.notes}?targetType=workspace&targetId=northline`, method: 'GET', route: `GET ${CONSOLE_PATHS.notes}` },
  notesCreate: {
    path: CONSOLE_PATHS.notes,
    url: CONSOLE_PATHS.notes,
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.notes}`,
    body: { targetType: 'workspace', targetId: 'northline', body: 'Called the owner about seats.' },
  },
  noteDelete: { path: CONSOLE_PATHS.noteDelete, url: '/api/console/notes/1/delete', method: 'POST', route: `POST ${CONSOLE_PATHS.noteDelete}`, body: { reason: 'Written on the wrong workspace.' } },
  search: { path: CONSOLE_PATHS.search, url: `${CONSOLE_PATHS.search}?q=jamie`, method: 'GET', route: `GET ${CONSOLE_PATHS.search}` },
  // PR 3a (D-162). Each caller here is in no masquerade; `console-masquerade.test.ts` covers one in a session.
  masqueradeStart: {
    path: CONSOLE_PATHS.masqueradeStart,
    url: CONSOLE_PATHS.masqueradeStart,
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.masqueradeStart}`,
    body: { targetUserId: 'u_jamie', reason: 'Checking the Week 2 steps for a ticket.' },
  },
  masqueradeCurrent: { path: CONSOLE_PATHS.masqueradeCurrent, url: CONSOLE_PATHS.masqueradeCurrent, method: 'GET', route: `GET ${CONSOLE_PATHS.masqueradeCurrent}` },
  masqueradeExtend: {
    path: CONSOLE_PATHS.masqueradeExtend,
    url: CONSOLE_PATHS.masqueradeExtend,
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.masqueradeExtend}`,
    body: { reason: 'Still checking the Week 2 steps.' },
  },
  masqueradeExit: { path: CONSOLE_PATHS.masqueradeExit, url: CONSOLE_PATHS.masqueradeExit, method: 'POST', route: `POST ${CONSOLE_PATHS.masqueradeExit}` },
  masqueradeSessions: { path: CONSOLE_PATHS.masqueradeSessions, url: CONSOLE_PATHS.masqueradeSessions, method: 'GET', route: `GET ${CONSOLE_PATHS.masqueradeSessions}` },
  // PR 9 (D-168). The flip turns masquerade off; Check now asks Resend, which has no key here (no network).
  opsEnv: { path: CONSOLE_PATHS.opsEnv, url: CONSOLE_PATHS.opsEnv, method: 'GET', route: `GET ${CONSOLE_PATHS.opsEnv}` },
  flagFlip: {
    path: CONSOLE_PATHS.flagFlip,
    url: '/api/console/flags/masquerade_enabled',
    method: 'POST',
    route: `POST ${CONSOLE_PATHS.flagFlip}`,
    body: { on: false, typed: 'masquerade_enabled' },
  },
  integrations: { path: CONSOLE_PATHS.integrations, url: CONSOLE_PATHS.integrations, method: 'GET', route: `GET ${CONSOLE_PATHS.integrations}` },
  integrationCheck: { path: CONSOLE_PATHS.integrationCheck, url: '/api/console/integrations/resend/check', method: 'POST', route: `POST ${CONSOLE_PATHS.integrationCheck}` },
  deploys: { path: CONSOLE_PATHS.deploys, url: CONSOLE_PATHS.deploys, method: 'GET', route: `GET ${CONSOLE_PATHS.deploys}` },
  dbHealth: { path: CONSOLE_PATHS.dbHealth, url: CONSOLE_PATHS.dbHealth, method: 'GET', route: `GET ${CONSOLE_PATHS.dbHealth}` },
};

/** The routes whose success writes its own audit row. */
const WRITES = new Set<RouteName>(['export', 'passwordReset', 'usersExport', 'notesCreate', 'noteDelete', 'masqueradeStart', 'flagFlip', 'integrationCheck']);

/** Who calls, as a user id (null: no session), and whether a refusal is a staff one (audited). */
const PERSONAS: { name: string; userId: string | null; staff: boolean }[] = [
  { name: 'anon', userId: null, staff: false },
  { name: 'learner', userId: 'u_jamie', staff: false },
  { name: 'team owner', userId: 'u_alex', staff: false },
  { name: 'Instructor', userId: 'st2', staff: true },
  { name: 'Content Editor', userId: 'st3', staff: true },
  { name: 'Support', userId: 'st4', staff: true },
  { name: 'Admin', userId: 'st_admin', staff: true },
  { name: 'Owner', userId: 'st1', staff: true },
];

// Spec § 5, by hand. `me` answers any staff member (with an empty list for Instructor and Content
// Editor) and refuses a learner; `audit` is audit.read (Owner, Admin, Support); `export` is export
// (Owner, Admin); `roles` is ops.read (Owner, Admin).
// PR 2: workspaces and users are workspaces.read and users.read, notes are written with notes.write
// and read with the target's read capability, a password reset is user.password_reset (all three
// Console roles; a learner's here), search is console.view: Owner, Admin and Support. The users
// export is export (Owner, Admin). Deleting a note is notes.delete: the Owner alone.
// PR 3a (D-162): Start and the history are masquerade.start, and the history is read by the same
// roles (Owner, Admin). `current` answers any signed-in viewer (null outside a session). Extend asks
// the viewer's masquerade.extend first, then answers 409 `masquerade_ended`, as Exit does for
// everyone, because none of these callers is in a session.
const ALL = (v: number) => ({ workspaces: v, workspace: v, users: v, user: v, passwordReset: v, notesList: v, notesCreate: v, search: v });
const MQ = (start: number, extend: number, sessions: number) => ({ masqueradeStart: start, masqueradeCurrent: 200, masqueradeExtend: extend, masqueradeExit: 409, masqueradeSessions: sessions });
// PR 9 (D-168): every Operations route is ops.read (Owner, Admin; Support none, D3), Check now is
// integrations.probe (Owner, Admin), and the flip of the sensitive `masquerade_enabled` is
// flags.write_sensitive: the Owner alone (D8). An Admin's flip is refused, and audited, at that second step.
const OPS = (read: number, flip: number, check: number) => ({ opsEnv: read, flagFlip: flip, integrations: read, integrationCheck: check, deploys: read, dbHealth: read });
const EXPECT: Record<string, Record<RouteName, number>> = {
  anon: {
    me: 401, audit: 401, export: 401, roles: 401, ...ALL(401), usersExport: 401, notesCreate: 401, noteDelete: 401,
    masqueradeStart: 401, masqueradeCurrent: 401, masqueradeExtend: 401, masqueradeExit: 401, masqueradeSessions: 401,
    ...OPS(401, 401, 401),
  },
  learner: { me: 403, audit: 403, export: 403, roles: 403, ...ALL(403), usersExport: 403, noteDelete: 403, ...MQ(403, 403, 403), ...OPS(403, 403, 403) },
  'team owner': { me: 403, audit: 403, export: 403, roles: 403, ...ALL(403), usersExport: 403, noteDelete: 403, ...MQ(403, 403, 403), ...OPS(403, 403, 403) },
  Instructor: { me: 200, audit: 403, export: 403, roles: 403, ...ALL(403), usersExport: 403, noteDelete: 403, ...MQ(403, 403, 403), ...OPS(403, 403, 403) },
  'Content Editor': { me: 200, audit: 403, export: 403, roles: 403, ...ALL(403), usersExport: 403, noteDelete: 403, ...MQ(403, 403, 403), ...OPS(403, 403, 403) },
  Support: { me: 200, audit: 200, export: 403, roles: 403, ...ALL(200), notesCreate: 201, usersExport: 403, noteDelete: 403, ...MQ(403, 403, 403), ...OPS(403, 403, 403) },
  Admin: { me: 200, audit: 200, export: 200, roles: 200, ...ALL(200), notesCreate: 201, usersExport: 200, noteDelete: 403, ...MQ(201, 409, 200), ...OPS(200, 403, 200) },
  Owner: { me: 200, audit: 200, export: 200, roles: 200, ...ALL(200), notesCreate: 201, usersExport: 200, noteDelete: 200, ...MQ(201, 409, 200), ...OPS(200, 200, 200) },
};

/** What `/me` lists for each staff role (spec § 5's rows). */
const SUPPORT_CAPS = ['console.view', 'workspaces.read', 'users.read', 'notes.write', 'user.password_reset', 'usage.read', 'api.read', 'jobs.read', 'incidents.read', 'email.read', 'incidents.ack', 'incidents.create', 'billing.read', 'audit.read'];

let app: App;

let savedAppUrl: string | undefined;

beforeAll(async () => {
  // The password reset renders the existing email, whose links need this.
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://learn.example.com';
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
  const db = await testDatabase();
  // The seed has no Admin; the matrix needs one.
  await db.insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  // Note 1, for the delete route to find.
  await db.insert(staffNotes).values({ targetType: 'workspace', targetId: 'northline', authorUserId: 'st4', body: 'Owner asked about seats.', createdAt: NOW - 3600_000 });
  invalidateConsoleFlags();
  resetProbes();
  // PR 9 (D-168): the Operations routes read this environment, and nothing here reaches a network.
  const noNetwork = async (): Promise<Response> => {
    throw new Error('no network in this test');
  };
  app = await build({ logger: false, console: { ops: { env: {}, fetch: noNetwork } } });
});
afterEach(async () => {
  await settleEmails();
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
});

const call = async (name: RouteName, userId: string | null) => {
  const r = ROUTES[name];
  const headers: Record<string, string> = {};
  if (userId) headers.cookie = await app.signInAs(userId);
  if (r.method === 'POST') {
    headers['content-type'] = 'application/json';
    return app.inject({ method: 'POST', url: r.url, headers, payload: r.body ?? {} });
  }
  return app.inject({ method: 'GET', url: r.url, headers });
};

const auditRows = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));

describe('the Console routes, by caller (D-157) @console', () => {
  it('covers every Console route', () => {
    expect([...new Set(Object.values(ROUTES).map((r) => r.path))].sort()).toEqual(Object.values(CONSOLE_PATHS).sort());
    expect(Object.keys(EXPECT)).toEqual(PERSONAS.map((p) => p.name));
  });

  for (const persona of PERSONAS) {
    it(`${persona.name}: ${JSON.stringify(EXPECT[persona.name])}`, async () => {
      for (const name of Object.keys(ROUTES) as RouteName[]) {
        const before = (await auditRows()).length;
        const res = await call(name, persona.userId);
        const want = EXPECT[persona.name]![name];
        expect(res.statusCode, `${persona.name} ${name}: ${res.body.slice(0, 200)}`).toBe(want);
        // Every Console answer is the viewer's alone, refusals included.
        expect(res.headers['cache-control'], `${persona.name} ${name}`).toBe('private, no-store');
        const after = await auditRows();

        if (want === 401) {
          // § 7.3's 401, unchanged.
          expect(JSON.parse(res.body)).toEqual({ error: 'Not signed in' });
          expect(after.length).toBe(before);
        } else if (want === 403) {
          const body = JSON.parse(res.body) as { error: string; code: string };
          expect(body.code).toBe('console_forbidden');
          expect(body.error).toMatch(/\S/);
          if (persona.staff) {
            // A staff refusal is one audit row, with the staff member as actor.
            expect(after.length, `${persona.name} ${name} audited`).toBe(before + 1);
            const row = after[after.length - 1]!;
            expect(row).toMatchObject({
              action: 'console.access_denied',
              outcome: 'denied',
              actorSource: 'staff',
              actorUserId: persona.userId,
              actorRole: persona.name,
              targetType: 'route',
              targetId: ROUTES[name].route,
              at: NOW,
            });
          } else {
            // A learner is refused without a row.
            expect(after.length, `${persona.name} ${name} not audited`).toBe(before);
          }
        } else if (want === 409) {
          // D-162: Extend and Exit outside a session. Nothing happened, so nothing is written.
          const body = JSON.parse(res.body) as { code: string; redirect: string };
          expect(body.code).toBe('masquerade_ended');
          expect(body.redirect).toBe(persona.staff ? '/admin' : '/');
          expect(after.length, `${persona.name} ${name} not audited`).toBe(before);
        } else {
          // Reads write nothing; every write writes its own row.
          expect(after.length, `${persona.name} ${name} rows`).toBe(before + (WRITES.has(name) ? 1 : 0));
          if (name === 'me') {
            const me = JSON.parse(res.body) as { role: string; caps: string[] };
            expect(me.role).toBe(persona.name);
            if (persona.name === 'Instructor' || persona.name === 'Content Editor') expect(me.caps).toEqual([]);
            if (persona.name === 'Support') expect(me.caps).toEqual(SUPPORT_CAPS);
            if (persona.name === 'Admin') expect(me.caps).toContain('export');
            if (persona.name === 'Admin') expect(me.caps).not.toContain('notes.delete');
            if (persona.name === 'Owner') expect(me.caps).toContain('flags.write_sensitive');
          }
        }
      }
    });
  }

  it('answers 401 on a forged session cookie, with no audit row', async () => {
    const res = await app.inject({ method: 'GET', url: CONSOLE_PATHS.audit, headers: { cookie: 'ai_sid=s_nope.nope' } });
    expect(res.statusCode).toBe(401);
    expect((await auditRows()).length).toBe(0);
  });

  it('applies the CSRF rule before the capability on the export: a foreign Origin is 403, not audited', async () => {
    const cookie = await app.signInAs('st1');
    const res = await app.inject({
      method: 'POST',
      url: CONSOLE_PATHS.auditExport,
      headers: { cookie, 'content-type': 'application/json', origin: 'https://evil.example' },
      payload: {},
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).code).toBeUndefined();
    const text = await app.inject({ method: 'POST', url: CONSOLE_PATHS.auditExport, headers: { cookie, 'content-type': 'text/plain' }, payload: 'x' });
    expect(text.statusCode).toBe(415);
    expect((await auditRows()).length).toBe(0);
  });

  it('reads the role on every request: a demoted Admin is refused at once', async () => {
    const cookie = await app.signInAs('st_admin');
    expect((await app.inject({ method: 'GET', url: CONSOLE_PATHS.roles, headers: { cookie } })).statusCode).toBe(200);
    await (await testDatabase()).execute(sql`update users set staff_role = 'Support' where id = 'st_admin'`);
    const res = await app.inject({ method: 'GET', url: CONSOLE_PATHS.roles, headers: { cookie } });
    expect(res.statusCode).toBe(403);
    expect((await auditRows()).at(-1)).toMatchObject({ actorUserId: 'st_admin', actorRole: 'Support', outcome: 'denied' });
  });

  it('answers the Roles matrix built from CONSOLE_CAPS, with the Staff & Roles path', async () => {
    const res = await app.inject({ method: 'GET', url: CONSOLE_PATHS.roles, headers: { cookie: await app.signInAs('st1') } });
    const m = JSON.parse(res.body) as { roles: string[]; noAccess: string[]; staffPath: string; caps: { cap: string; allowed: Record<string, boolean> }[] };
    expect(m.roles).toEqual(['Owner', 'Admin', 'Support']);
    expect(m.noAccess).toEqual(['Instructor', 'Content Editor']);
    expect(m.staffPath).toBe('/admin/staff');
    expect(m.caps.find((c) => c.cap === 'export')!.allowed).toEqual({ Owner: true, Admin: true, Support: false });
    expect(m.caps.find((c) => c.cap === 'notes.delete')!.allowed).toEqual({ Owner: true, Admin: false, Support: false });
    expect(m.caps.find((c) => c.cap === 'audit.read')!.allowed).toEqual({ Owner: true, Admin: true, Support: true });
  });
});
