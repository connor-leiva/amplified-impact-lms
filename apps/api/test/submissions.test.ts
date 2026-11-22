// D-230 (B-24 to B-28): Turn in's server. A team's owner or operator puts a file in the bucket and turns it in for a
// step that asks for it; the team sees what it sent, never a status (B-25); staff see every version and set a status,
// audited; a turned-in file only ever downloads, as bytes. Nothing is emailed.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedProduction } from '@ai/core/seed/curriculum';
import { build } from '../src/app';
import type { App } from '../src/app';
import { accounts, auditLog, checklistState, emailLog, modules, plans, submissions, teams, users } from '../src/db/schema';
import { resetS3 } from '../src/storage';
import { startFakeBucket } from './fake-bucket';
import type { FakeBucket } from './fake-bucket';
import { resetDatabase, testDatabase } from './helpers';
import type { Database } from '../src/db/client';

/** Thu, Dec 3, 2026, 10:00 AM CT: the course is open, and Week 1 with it. */
const NOW = '2026-12-03T10:00:00-06:00';
const T = Date.parse(NOW);
const WEEK1 = 'accelerator-week-1';
const S3_KEYS = ['S3_REGION', 'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET'] as const;

let handle: Database;
let app: App;
let bucket: FakeBucket;
let saved: Record<string, string | undefined> = {};
const cookie = new Map<string, string>();

const json = (who: string) => ({ cookie: cookie.get(who)!, 'content-type': 'application/json' });
const uploadUrl = (who: string, name: string, size: number) => app.inject({ method: 'POST', url: '/api/submissions/upload-url', headers: json(who), payload: { name, size } });
const turnIn = (who: string, payload: Record<string, unknown>) => app.inject({ method: 'POST', url: '/api/submissions', headers: json(who), payload });
const mine = (who: string, moduleId = WEEK1) => app.inject({ method: 'GET', url: `/api/submissions?moduleId=${moduleId}`, headers: { cookie: cookie.get(who)! } });
const staffList = (who: string) => app.inject({ method: 'GET', url: `/api/admin/submissions?moduleId=${WEEK1}`, headers: { cookie: cookie.get(who)! } });
const setStatus = (who: string, id: number, status: string) => app.inject({ method: 'POST', url: `/api/admin/submissions/${id}/status`, headers: json(who), payload: { status } });

/** The browser's part: the presigned PUT, with the type the route signed. */
async function put(who: string, name: string, body: string): Promise<string> {
  const r = await uploadUrl(who, name, Buffer.byteLength(body));
  expect(r.statusCode).toBe(200);
  const { key, url, contentType } = r.json() as { key: string; url: string; contentType: string };
  const res = await fetch(url, { method: 'PUT', body, headers: { 'content-type': contentType } });
  expect(res.ok).toBe(true);
  return key;
}

beforeAll(async () => {
  process.env.FIXED_NOW = NOW;
  handle = await testDatabase();
  bucket = await startFakeBucket();
});

beforeEach(async () => {
  saved = {};
  for (const k of S3_KEYS) {
    saved[k] = process.env[k];
    process.env[k] = bucket.env[k];
  }
  resetS3();
  bucket.objects.clear();
  const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  // Week 1 asks for a report on step 4 and a checkpoint on step 6, as the builder's Upload action does.
  const week1 = db.modules.find((m) => m.id === WEEK1)!;
  // Each path has its own item (the builder refuses a repeated id on a step), as Weeks 1 and 2 do.
  const ask = (i: number, id: string, kind: 'live_read' | 'checkpoint') => {
    const step = week1.checklist[i]!;
    const item = (x: string) => ({ type: 'check' as const, id: x, title: 'Turn it in', action: { type: 'upload' as const, kind } });
    step.paths = {
      ...step.paths,
      claude: { blocks: [...(step.paths?.claude?.blocks ?? []), item(id)] },
      chatgpt: { blocks: [...(step.paths?.chatgpt?.blocks ?? []), item(`${id}-gpt`)] },
    };
  };
  ask(3, 'turn-in-report', 'live_read');
  ask(5, 'turn-in-checkpoint', 'checkpoint');
  await resetDatabase(db);
  await handle.update(modules).set({ status: 'scheduled', opens: T + 30 * 86_400_000 }).where(eq(modules.id, 'accelerator-week-8'));
  await handle.insert(teams).values([
    { id: 'team-a', name: 'Northline Realty', ownerId: 'own-a', seats: 5, seq: 90 },
    { id: 'team-b', name: 'Sample Team', ownerId: 'own-b', seats: 5, seq: 91 },
  ]);
  const learner = (id: string, name: string, teamId: string, role: string, seq: number) => ({
    id, email: `${id}@example.test`, name, kind: 'learner' as const, tier: 'team' as const, role, teamId, cohortId: 'dec26', status: 'active' as const, joined: T, seq,
  });
  await handle.insert(users).values([
    learner('own-a', 'Alex Morgan', 'team-a', 'Team Owner', 90),
    learner('op-a', 'Olive Operator', 'team-a', 'Operations Lead', 91),
    learner('ag-a', 'Avery Agent', 'team-a', 'Agent', 92),
    learner('own-b', 'Dana Whitlock', 'team-b', 'Team Owner', 93),
  ]);
  await handle.insert(accounts).values([
    { id: 'acct-a', teamId: 'team-a', ownerUserId: 'own-a', ownerEmail: 'own-a@example.test', name: 'Northline Realty', createdAt: T },
    { id: 'acct-b', teamId: 'team-b', ownerUserId: 'own-b', ownerEmail: 'own-b@example.test', name: 'Sample Team', createdAt: T },
  ]);
  await handle.insert(plans).values([
    { id: 'plan-a', accountId: 'acct-a', kind: 'cohort', option: 'full', seats: 5, cohortId: 'dec26', status: 'active', startsAt: T - 86_400_000 * 20, orderId: 'ord-a', createdAt: T },
    { id: 'plan-b', accountId: 'acct-b', kind: 'cohort', option: 'full', seats: 5, cohortId: 'dec26', status: 'active', startsAt: T - 86_400_000 * 20, orderId: 'ord-b', createdAt: T },
  ]);
  app = await build({ logger: false });
  for (const who of ['own-a', 'op-a', 'ag-a', 'own-b', 'st_owner']) cookie.set(who, await app.signInAs(who));
});

afterEach(async () => {
  await app?.close();
  for (const k of S3_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  resetS3();
});

afterAll(async () => {
  delete process.env.FIXED_NOW;
  await bucket?.close();
});

describe('Turn in (D-230)', () => {
  it('puts a file, turns it in, shows the team what it sent (never a status) and serves the file as a download', async () => {
    const key = await put('own-a', 'Map Your Spend report.html', '<h1>Report</h1><script>alert(1)</script>');
    expect(key).toMatch(/^submissions\/team-a\/[0-9a-f-]{36}\.html$/);
    expect(bucket.objects.get(key)!.contentType).toBe('text/html');
    const made = await turnIn('own-a', { moduleId: WEEK1, kind: 'live_read', files: [{ key, name: 'Map Your Spend report.html' }], note: ' Please look at advertising. ', minutes: '' });
    expect(made.statusCode).toBe(201);
    // The step's items that ask for it are done for the whole team, on both paths, as a submitted intake's is.
    for (const itemId of ['turn-in-report', 'turn-in-report-gpt']) {
      const ticks = await handle.select().from(checklistState).where(eq(checklistState.itemId, itemId));
      expect(ticks.map((t) => [t.userId, t.checked, t.auto]).sort()).toEqual([['ag-a', true, true], ['op-a', true, true], ['own-a', true, true]]);
    }

    const res = await mine('op-a');
    expect(res.statusCode).toBe(200);
    const subs = res.json().subs as Record<string, { id: number; files: { name: string; size: number; href: string }[]; note: string; by: string; at: number }>;
    expect(Object.keys(subs)).toEqual(['live_read']);
    expect(subs.live_read).toMatchObject({ note: 'Please look at advertising.', by: 'Alex Morgan', at: T });
    expect(subs.live_read!.files).toEqual([{ name: 'Map Your Spend report.html', size: Buffer.byteLength('<h1>Report</h1><script>alert(1)</script>'), href: `/api/submissions/${subs.live_read!.id}/files/0` }]);
    // B-25: nothing the team reads says what staff did with it.
    expect(res.body).not.toMatch(/status|received|picked|reviewed/i);

    const file = await app.inject({ method: 'GET', url: subs.live_read!.files[0]!.href, headers: { cookie: cookie.get('op-a')! } });
    expect(file.statusCode).toBe(200);
    expect(file.body).toBe('<h1>Report</h1><script>alert(1)</script>');
    expect(file.headers['content-type']).toBe('application/octet-stream');
    expect(file.headers['content-disposition']).toMatch(/^attachment; /);
    expect(file.headers['x-content-type-options']).toBe('nosniff');
    expect(file.headers['content-security-policy']).toMatch(/^sandbox/);
    // Another team's owner gets nothing; staff who may view learners get it.
    expect((await app.inject({ method: 'GET', url: subs.live_read!.files[0]!.href, headers: { cookie: cookie.get('own-b')! } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: subs.live_read!.files[0]!.href, headers: { cookie: cookie.get('st_owner')! } })).statusCode).toBe(200);
    expect(await handle.select().from(emailLog)).toEqual([]);
  });

  it('keeps every version for staff, with a status the team never sees, set and audited', async () => {
    const one = await put('own-a', 'seat card.pdf', '%PDF-1');
    await turnIn('own-a', { moduleId: WEEK1, kind: 'checkpoint', files: [{ key: one, name: 'seat card.pdf' }], minutes: ' 45 ' });
    const two = await put('op-a', 'first run.png', 'png');
    const second = await turnIn('op-a', { moduleId: WEEK1, kind: 'checkpoint', files: [{ key: two, name: 'first run.png' }], minutes: 'about 20 a day' });
    expect(second.statusCode).toBe(201);
    const latest = (await mine('own-a')).json().subs.checkpoint;
    expect(latest).toMatchObject({ minutes: 'about 20 a day', by: 'Olive Operator' });

    const list = await staffList('st_owner');
    expect(list.statusCode).toBe(200);
    const rows = list.json().subs as { id: number; team: string; status: string; minutes: string }[];
    expect(rows.map((r) => [r.team, r.minutes, r.status])).toEqual([['Northline Realty', 'about 20 a day', 'received'], ['Northline Realty', '45', 'received']]);
    expect((await setStatus('st_owner', rows[0]!.id, 'picked')).statusCode).toBe(200);
    expect((await setStatus('st_owner', rows[0]!.id, 'approved')).statusCode).toBe(400);
    expect((await staffList('st_owner')).json().subs[0]).toMatchObject({ status: 'picked', statusBy: 'Connor Leiva' });
    const audits = await handle.select().from(auditLog).where(eq(auditLog.action, 'submission.status'));
    expect(audits.map((a) => [a.targetType, a.before, a.after])).toEqual([['submission', { status: 'received' }, { status: 'picked' }]]);
    expect((await mine('own-a')).body).not.toMatch(/picked|status/i);
    // Learners have no staff list and no status.
    expect((await staffList('own-a')).statusCode).toBe(403);
    expect((await setStatus('own-a', rows[0]!.id, 'reviewed')).statusCode).toBe(403);
  });

  it('lets only the owner and the operator turn in (B-26)', async () => {
    expect((await uploadUrl('ag-a', 'report.pdf', 10)).statusCode).toBe(403);
    expect((await turnIn('ag-a', { moduleId: WEEK1, kind: 'live_read', files: [] })).statusCode).toBe(403);
    const r = await mine('ag-a');
    expect(r.statusCode).toBe(403);
    expect(r.json().error).toBe('Your team’s owner or operator turns this in.');
    // A staff preview has no team, and nothing turned in.
    expect((await mine('st_owner')).json()).toEqual({ subs: {}, preview: true });
  });

  it('refuses a file it can’t take, someone else’s file, a missing one, and a step that doesn’t ask', async () => {
    expect((await uploadUrl('own-a', 'archive.zip', 10)).statusCode).toBe(422);
    expect((await uploadUrl('own-a', 'big.pdf', 25e6 + 1)).statusCode).toBe(422);
    expect((await uploadUrl('own-a', 'empty.pdf', 0)).statusCode).toBe(422);
    const theirs = await put('own-b', 'theirs.pdf', '%PDF');
    const stolen = await turnIn('own-a', { moduleId: WEEK1, kind: 'live_read', files: [{ key: theirs, name: 'theirs.pdf' }] });
    expect(stolen.statusCode).toBe(422);
    const ghost = (await uploadUrl('own-a', 'ghost.pdf', 10)).json().key as string;
    const missing = await turnIn('own-a', { moduleId: WEEK1, kind: 'live_read', files: [{ key: ghost, name: 'ghost.pdf' }] });
    expect(missing.statusCode).toBe(422);
    expect(missing.json().error).toBe('One of the files didn’t finish uploading. Add it again.');
    const key = await put('own-a', 'report.pdf', '%PDF');
    expect((await turnIn('own-a', { moduleId: WEEK1, kind: 'live_read', files: [{ key, name: 'renamed.csv' }] })).statusCode).toBe(422);
    expect((await turnIn('own-a', { moduleId: WEEK1, kind: 'live_read', files: [] })).json().error).toBe('Add at least one file.');
    expect((await turnIn('own-a', { moduleId: WEEK1, kind: 'live_read', files: Array.from({ length: 6 }, () => ({ key, name: 'report.pdf' })) })).json().error).toBe('Up to 5 files at a time.');
    // Week 0 asks for nothing; Week 8 hasn't opened; a kind that isn't one.
    for (const [moduleId, kind] of [['accelerator-week-0', 'live_read'], ['accelerator-week-8', 'live_read'], [WEEK1, 'report']]) {
      const r = await turnIn('own-a', { moduleId, kind, files: [{ key, name: 'report.pdf' }] });
      expect(r.statusCode).toBe(422);
      expect(r.json().error).toBe('This step doesn’t ask for a file.');
    }
    expect(await handle.select().from(submissions)).toEqual([]);
    expect((await app.inject({ method: 'POST', url: '/api/submissions', headers: { cookie: cookie.get('own-a')! }, payload: 'x' })).statusCode).toBe(415);
  });
});
