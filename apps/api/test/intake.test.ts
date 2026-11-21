// D-196: a team's intake stays with that team, and a staff read is audited.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedProduction } from '@ai/core/seed/curriculum';
import { WEEK0_INTAKE } from '@ai/core/seed/intake-v1';
import { WEEK0_MODULE_ID } from '@ai/core/seed/start-here-v1';
import { build } from '../src/app';
import type { App } from '../src/app';
import { auditLog, teams, users } from '../src/db/schema';
import { loadDb, resetDatabase, testDatabase } from './helpers';
import type { Database } from '../src/db/client';

const NOW = '2026-11-19T16:04:00Z';

let handle: Database;
let app: App;

beforeAll(async () => {
  process.env.FIXED_NOW = NOW;
  handle = await testDatabase();
  const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  const week = db.modules.find((m) => m.id === WEEK0_MODULE_ID)!;
  // D-229 (B-16): name and ai required, as the data step marks the six.
  const required = new Set(['name', 'ai']);
  week.course = {
    ...week.course!,
    intake: { ...WEEK0_INTAKE, sections: WEEK0_INTAKE.sections.map((x) => ({ ...x, questions: x.questions.map((q) => (required.has(q.id) ? { ...q, required: true } : q)) })) },
  };
  await resetDatabase(db);
  await handle.insert(teams).values([
    { id: 'team-a', name: 'Team A', ownerId: 'own-a', seats: 5, seq: 90 },
    { id: 'team-b', name: 'Team B', ownerId: 'own-b', seats: 5, seq: 91 },
  ]);
  await handle.insert(users).values([
    { id: 'own-a', email: 'a@example.test', name: 'Owner A', kind: 'learner', tier: 'team', role: 'Team Owner', teamId: 'team-a', status: 'active', joined: Date.parse(NOW), seq: 90 },
    { id: 'op-a', email: 'op@example.test', name: 'Op A', kind: 'learner', tier: 'team', role: 'Agent', teamId: 'team-a', status: 'active', joined: Date.parse(NOW), seq: 91 },
    { id: 'own-b', email: 'b@example.test', name: 'Owner B', kind: 'learner', tier: 'team', role: 'Team Owner', teamId: 'team-b', status: 'active', joined: Date.parse(NOW), seq: 92 },
  ]);
  app = await build({ logger: false });
});

afterAll(async () => {
  delete process.env.FIXED_NOW;
  await app?.close();
});

describe('team intake (D-196)', () => {
  it('keeps one team’s answers from another team, refuses an agent, and audits a staff read', async () => {
    const a = await app.signInAs('own-a');
    const agent = await app.signInAs('op-a');
    const b = await app.signInAs('own-b');
    const staff = await app.signInAs('st_owner');
    const put = await app.inject({ method: 'PUT', url: '/api/intake', headers: { cookie: a, 'content-type': 'application/json' }, payload: { answers: { ai: 'Claude', name: 'Dana' } } });
    expect(put.statusCode).toBe(200);
    expect(put.json()).toMatchObject({ answers: { ai: 'Claude', name: 'Dana' } });
    const other = await app.inject({ method: 'GET', url: '/api/intake', headers: { cookie: b } });
    expect(other.statusCode).toBe(200);
    expect(other.json().answers).toEqual({});
    const refused = await app.inject({ method: 'GET', url: '/api/intake', headers: { cookie: agent } });
    expect(refused.statusCode).toBe(403);
    const read = await app.inject({ method: 'GET', url: '/api/console/workspaces/team-a/intake', headers: { cookie: staff } });
    expect(read.statusCode).toBe(200);
    expect(read.json().answers).toMatchObject({ ai: 'Claude' });
    const rows = await handle.select().from(auditLog).where(eq(auditLog.action, 'intake.read'));
    expect(rows.length).toBeGreaterThan(0);
    expect((await loadDb()).users.find((u) => u.id === 'own-b')?.checks ?? []).toEqual([]);
  });

  it('refuses a submit with a required answer missing (422 and the missing ids), and keeps saving a draft (D-229)', async () => {
    const b = await app.signInAs('own-b');
    const put = (payload: Record<string, unknown>) => app.inject({ method: 'PUT', url: '/api/intake', headers: { cookie: b, 'content-type': 'application/json' }, payload });
    const draft = await put({ answers: { name: 'Bea' } });
    expect(draft.statusCode).toBe(200);
    const short = await put({ answers: { name: 'Bea' }, submit: true });
    expect(short.statusCode).toBe(422);
    expect(short.json()).toMatchObject({ missing: ['ai'] });
    const kept = await app.inject({ method: 'GET', url: '/api/intake', headers: { cookie: b } });
    expect(kept.json()).toMatchObject({ answers: { name: 'Bea' }, submittedAt: null });
    const done = await put({ answers: { name: 'Bea', ai: 'Claude' }, submit: true });
    expect(done.statusCode).toBe(200);
    expect(done.json().submittedAt).not.toBeNull();
  });
});
