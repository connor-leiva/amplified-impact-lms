// D-196: a team's intake stays with that team, and a staff read is audited.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedProduction } from '@ai/core/seed/curriculum';
import { WEEK0_INTAKE } from '@ai/core/seed/intake-v1';
import { WEEK0_MODULE_ID } from '@ai/core/seed/start-here-v1';
import { build } from '../src/app';
import type { App } from '../src/app';
import { INTAKE_CONFLICT, INTAKE_OUT_OF_DATE } from '@ai/core/intake';
import { STACK_CONFLICT } from '@ai/core/stack';
import { WEEK0_STACK } from '@ai/core/seed/stack-v1';
import { auditLog, teamIntake, teamStackCard, teams, users } from '../src/db/schema';
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
    stackCard: WEEK0_STACK,
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
    { id: 'ops-a', email: 'ops@example.test', name: 'Ops A', kind: 'learner', tier: 'team', role: 'Operations Lead', teamId: 'team-a', status: 'active', joined: Date.parse(NOW), seq: 93 },
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
    const put = await app.inject({ method: 'PUT', url: '/api/intake', headers: { cookie: a, 'content-type': 'application/json' }, payload: { changes: { ai: 'Claude', name: 'Dana' }, base: {} } });
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
    const draft = await put({ changes: { name: 'Bea' }, base: {} });
    expect(draft.statusCode).toBe(200);
    const short = await put({ changes: {}, base: {}, submit: true });
    expect(short.statusCode).toBe(422);
    expect(short.json()).toMatchObject({ missing: ['ai'] });
    const kept = await app.inject({ method: 'GET', url: '/api/intake', headers: { cookie: b } });
    expect(kept.json()).toMatchObject({ answers: { name: 'Bea' }, submittedAt: null });
    const done = await put({ changes: { ai: 'Claude' }, base: { ai: null }, submit: true });
    expect(done.statusCode).toBe(200);
    expect(done.json().submittedAt).not.toBeNull();
  });
});

describe('two people on one intake (H-10, D-248)', () => {
  const putAs = (cookie: string, payload: Record<string, unknown>) =>
    app.inject({ method: 'PUT', url: '/api/intake', headers: { cookie, 'content-type': 'application/json' }, payload });
  const stored = async () => (await handle.select().from(teamIntake).where(eq(teamIntake.teamId, 'team-a')))[0]!;

  it('merges the questions each changed, so the owner’s and the operator’s answers both stay', async () => {
    const owner = await app.signInAs('own-a');
    const ops = await app.signInAs('ops-a');
    // Both opened the intake as it stands; each changes a different question.
    const loaded = (await app.inject({ method: 'GET', url: '/api/intake', headers: { cookie: ops } })).json().answers as Record<string, string>;
    expect((await putAs(owner, { changes: { team: 'Team A, Compass' }, base: { team: loaded.team ?? null } })).statusCode).toBe(200);
    const res = await putAs(ops, { changes: { 'operator-name': 'Ops A, ops@example.test' }, base: { 'operator-name': loaded['operator-name'] ?? null } });
    expect(res.statusCode).toBe(200);
    expect(res.json().answers).toMatchObject({ name: 'Dana', ai: 'Claude', team: 'Team A, Compass', 'operator-name': 'Ops A, ops@example.test' });
    expect((await stored()).answers).toMatchObject({ team: 'Team A, Compass', 'operator-name': 'Ops A, ops@example.test', name: 'Dana' });
  });

  it('refuses (409) a question a teammate changed since it was read, and writes nothing of that save', async () => {
    const owner = await app.signInAs('own-a');
    const ops = await app.signInAs('ops-a');
    const before = await stored();
    // The operator read "Team A, Compass", then the owner changed it.
    expect((await putAs(owner, { changes: { team: 'Team A Realty' }, base: { team: 'Team A, Compass' } })).statusCode).toBe(200);
    const after = await stored();
    const res = await putAs(ops, { changes: { team: 'Team A Group', size: '12' }, base: { team: 'Team A, Compass', size: null } });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: INTAKE_CONFLICT, conflicts: ['team'] });
    const now = await stored();
    expect(now.answers).toEqual(after.answers);
    expect(now.answers).not.toHaveProperty('size');
    expect(now.updatedAt).toBe(after.updatedAt);
    expect(before.answers).not.toEqual(after.answers);
    // Both typing the same answer is no clash.
    expect((await putAs(ops, { changes: { team: 'Team A Realty' }, base: { team: 'Team A, Compass' } })).statusCode).toBe(200);
  });

  it('refuses (409) a page from before H-10, which sends the whole form, and erases nothing', async () => {
    const ops = await app.signInAs('ops-a');
    const before = await stored();
    const res = await putAs(ops, { answers: { name: 'Only me' } });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: INTAKE_OUT_OF_DATE, conflicts: [] });
    expect((await stored()).answers).toEqual(before.answers);
  });

  it('still queues a submitted intake for GHL, and again on a later save (D-229)', async () => {
    const owner = await app.signInAs('own-a');
    const done = await putAs(owner, { changes: {}, base: {}, submit: true });
    expect(done.statusCode).toBe(200);
    expect(await stored()).toMatchObject({ ghlSyncStatus: 'pending', ghlAttempts: 0, submittedAt: Date.parse(NOW) });
    await handle.update(teamIntake).set({ ghlSyncStatus: 'synced' }).where(eq(teamIntake.teamId, 'team-a'));
    const later = await putAs(owner, { changes: { size: '9' }, base: { size: null } });
    expect(later.statusCode).toBe(200);
    expect(await stored()).toMatchObject({ ghlSyncStatus: 'pending', submittedAt: Date.parse(NOW) });
  });
});

describe('two people on one stack card (H-10, D-248)', () => {
  const putAs = (cookie: string, payload: Record<string, unknown>) =>
    app.inject({ method: 'PUT', url: '/api/stack', headers: { cookie, 'content-type': 'application/json' }, payload });
  type Row = { source: string; tool: string; plan: string; who: string };
  const rowOf = (rows: Row[], source: string): Row => rows.find((r) => r.source === source)!;

  it('merges each person’s rows, refuses a row changed since it was read, and refuses a whole-card page', async () => {
    const owner = await app.signInAs('own-a');
    const ops = await app.signInAs('ops-a');
    const loaded = (await app.inject({ method: 'GET', url: '/api/stack', headers: { cookie: ops } })).json().rows as { source: string; tool: string; plan: string; who: string }[];
    const books = rowOf(loaded, 'Books');
    const leads = rowOf(loaded, 'Leads and follow-up');
    expect((await putAs(owner, { changes: { Books: { ...books, who: 'Our bookkeeper' } }, base: { Books: books } })).statusCode).toBe(200);
    const res = await putAs(ops, { changes: { 'Leads and follow-up': { ...leads, tool: 'Follow Up Boss' } }, base: { 'Leads and follow-up': leads }, send: true });
    expect(res.statusCode).toBe(200);
    expect(rowOf(res.json().rows, 'Books').who).toBe('Our bookkeeper');
    expect(rowOf(res.json().rows, 'Leads and follow-up').tool).toBe('Follow Up Boss');
    expect(res.json().sentAt).toBe(Date.parse(NOW));
    // The operator still holds the Books row it loaded; the owner has changed it since.
    const clash = await putAs(ops, { changes: { Books: { ...books, tool: 'Xero' } }, base: { Books: books } });
    expect(clash.statusCode).toBe(409);
    expect(clash.json()).toEqual({ error: STACK_CONFLICT, conflicts: ['Books'] });
    const [card] = await handle.select().from(teamStackCard).where(eq(teamStackCard.teamId, 'team-a'));
    expect(rowOf(card!.rows, 'Books')).toMatchObject({ who: 'Our bookkeeper' });
    expect(rowOf(card!.rows, 'Books').tool).not.toBe('Xero');
    expect((await putAs(ops, { rows: [], send: true })).statusCode).toBe(409);
    expect((await putAs(ops, { changes: { Books: { ...rowOf(card!.rows, 'Books'), who: 'my password' } }, base: { Books: rowOf(card!.rows, 'Books') } })).statusCode).toBe(422);
  });
});

describe('intake PDF (D-229, B-18)', () => {
  // A real render: headless Chromium (`CHROME_PATH`, or the bundled `@sparticuz/chromium` as on the host).
  it('prints the learner’s own team’s intake as a download, and refuses an agent, a staff preview and no session', async () => {
    const a = await app.signInAs('own-a');
    const agent = await app.signInAs('op-a');
    const staff = await app.signInAs('st_owner');
    const res = await app.inject({ method: 'GET', url: '/api/intake/pdf', headers: { cookie: a } });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe('attachment; filename="Week 0 Intake - Team A.pdf"');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.rawPayload.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect((await app.inject({ method: 'GET', url: '/api/intake/pdf', headers: { cookie: agent } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/api/intake/pdf', headers: { cookie: staff } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/api/intake/pdf' })).statusCode).toBe(401);
  }, 60_000);

  // D-246: Download Your Answers (PDF). The route takes the team from the session, so nothing a learner sends names
  // another team: a query string is ignored, and the console's per-team route refuses a learner (below).
  it('scopes a learner to their own team’s PDF, whatever the request names (D-246)', async () => {
    const a = await app.signInAs('own-a');
    const b = await app.signInAs('own-b');
    const name = async (cookie: string, url: string) => {
      const res = await app.inject({ method: 'GET', url, headers: { cookie } });
      expect(res.statusCode).toBe(200);
      expect(res.rawPayload.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      return res.headers['content-disposition'];
    };
    expect(await name(a, '/api/intake/pdf?teamId=team-b')).toBe('attachment; filename="Week 0 Intake - Team A.pdf"');
    expect(await name(b, '/api/intake/pdf?team=team-a&teamId=team-a')).toBe('attachment; filename="Week 0 Intake - Team B.pdf"');
    expect((await app.inject({ method: 'GET', url: '/api/console/workspaces/team-b/intake/pdf', headers: { cookie: a } })).statusCode).toBe(403);
  }, 90_000);

  it('gives staff any team’s PDF, audited as intake.pdf, and a team that doesn’t exist is not found', async () => {
    const staff = await app.signInAs('st_owner');
    const before = (await handle.select().from(auditLog).where(eq(auditLog.action, 'intake.pdf'))).length;
    const res = await app.inject({ method: 'GET', url: '/api/console/workspaces/team-b/intake/pdf', headers: { cookie: staff } });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toBe('attachment; filename="Week 0 Intake - Team B.pdf"');
    expect(res.rawPayload.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const rows = await handle.select().from(auditLog).where(eq(auditLog.action, 'intake.pdf'));
    expect(rows.length).toBe(before + 1);
    expect(rows.some((r) => r.targetType === 'team' && r.targetId === 'team-b' && r.outcome === 'ok')).toBe(true);
    const missing = await app.inject({ method: 'GET', url: '/api/console/workspaces/team-z/intake/pdf', headers: { cookie: staff } });
    expect(missing.statusCode).toBe(404);
    const learner = await app.signInAs('own-a');
    expect((await app.inject({ method: 'GET', url: '/api/console/workspaces/team-a/intake/pdf', headers: { cookie: learner } })).statusCode).toBe(403);
  }, 60_000);
});
