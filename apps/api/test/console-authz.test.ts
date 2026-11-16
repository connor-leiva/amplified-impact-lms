// The Admin Console's authorization matrix (D-157, spec § 11.1): every PR 1 Console route against
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
import { auditLog, users } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:42:00Z');

type RouteName = 'me' | 'audit' | 'export' | 'roles' | 'preview' | 'change';

const ROUTES: Record<RouteName, { path: string; method: 'GET' | 'POST'; route: string; payload?: Record<string, unknown> }> = {
  me: { path: CONSOLE_PATHS.me, method: 'GET', route: `GET ${CONSOLE_PATHS.me}` },
  audit: { path: CONSOLE_PATHS.audit, method: 'GET', route: `GET ${CONSOLE_PATHS.audit}` },
  export: { path: CONSOLE_PATHS.auditExport, method: 'POST', route: `POST ${CONSOLE_PATHS.auditExport}` },
  roles: { path: CONSOLE_PATHS.roles, method: 'GET', route: `GET ${CONSOLE_PATHS.roles}` },
  // D-160 R2-3b: the matrix change, the Owner's alone (`roles.write`). The Owner's change here carries
  // no real token, so it is refused for that (`console-roles.test.ts` makes real changes).
  preview: { path: CONSOLE_PATHS.rolesPreview, method: 'POST', route: `POST ${CONSOLE_PATHS.rolesPreview}`, payload: { role: 'Admin', capability: 'masq', allowed: false } },
  change: { path: CONSOLE_PATHS.roles, method: 'POST', route: `POST ${CONSOLE_PATHS.roles}`, payload: { confirmToken: 'not-a-token' } },
};

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
// (Owner, Admin); `roles` is ops.read (Owner, Admin); `preview` and `change` are roles.write (the Owner).
const EXPECT: Record<string, Record<RouteName, number>> = {
  anon: { me: 401, audit: 401, export: 401, roles: 401, preview: 401, change: 401 },
  learner: { me: 403, audit: 403, export: 403, roles: 403, preview: 403, change: 403 },
  'team owner': { me: 403, audit: 403, export: 403, roles: 403, preview: 403, change: 403 },
  Instructor: { me: 200, audit: 403, export: 403, roles: 403, preview: 403, change: 403 },
  'Content Editor': { me: 200, audit: 403, export: 403, roles: 403, preview: 403, change: 403 },
  Support: { me: 200, audit: 200, export: 403, roles: 403, preview: 403, change: 403 },
  Admin: { me: 200, audit: 200, export: 200, roles: 200, preview: 403, change: 403 },
  Owner: { me: 200, audit: 200, export: 200, roles: 200, preview: 200, change: 403 },
};

/** A 403 that is not the capability's: the Owner's change with no real token. */
const CODE: Partial<Record<string, Partial<Record<RouteName, string>>>> = { Owner: { change: 'confirm_invalid' } };

/** What `/me` lists for each staff role (spec § 5's rows). */
const SUPPORT_CAPS = ['console.view', 'workspaces.read', 'users.read', 'notes.write', 'user.password_reset', 'usage.read', 'api.read', 'jobs.read', 'incidents.read', 'email.read', 'incidents.ack', 'incidents.create', 'billing.read', 'audit.read'];

let app: App;

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedForDatabase('live'));
  const db = await testDatabase();
  // The seed has no Admin; the matrix needs one.
  await db.insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const call = async (name: RouteName, userId: string | null) => {
  const r = ROUTES[name];
  const headers: Record<string, string> = {};
  if (userId) headers.cookie = await app.signInAs(userId);
  if (r.method === 'POST') {
    headers['content-type'] = 'application/json';
    return app.inject({ method: 'POST', url: r.path, headers, payload: r.payload ?? {} });
  }
  return app.inject({ method: 'GET', url: r.path, headers });
};

const auditRows = async () => (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id));

describe('the Console routes, by caller (D-157) @console', () => {
  it('covers every PR 1 Console route', () => {
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
        } else if (want === 403 && CODE[persona.name]?.[name]) {
          // Past the capability: refused for what it carries, and nothing written.
          expect(JSON.parse(res.body).code).toBe(CODE[persona.name]![name]);
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
        } else {
          // Reads write nothing; an export writes its own row.
          expect(after.length).toBe(before + (name === 'export' ? 1 : 0));
          if (name === 'me') {
            const me = JSON.parse(res.body) as { role: string; caps: string[] };
            expect(me.role).toBe(persona.name);
            if (persona.name === 'Instructor' || persona.name === 'Content Editor') expect(me.caps).toEqual([]);
            if (persona.name === 'Support') expect(me.caps).toEqual(SUPPORT_CAPS);
            if (persona.name === 'Admin') expect(me.caps).toContain('export');
            if (persona.name === 'Admin') expect(me.caps).not.toContain('notes.delete');
            if (persona.name === 'Owner') expect(me.caps).toContain('flags.write_sensitive');
            if (persona.name === 'Owner') expect(me.caps).toContain('roles.write');
            if (persona.name === 'Admin') expect(me.caps).not.toContain('roles.write');
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
