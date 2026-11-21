// D-229 (B-20): the intake's sync to GHL. The client is mocked at `fetch`; nothing here reaches HighLevel.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedProduction } from '@ai/core/seed/curriculum';
import { WEEK0_INTAKE } from '@ai/core/seed/intake-v1';
import { WEEK0_MODULE_ID } from '@ai/core/seed/start-here-v1';
import type { GhlConfig } from '../src/integrations/ghl';
import {
  FIELD_MAX,
  INTAKE_TAG,
  fieldEnvOf,
  intakeDryRun,
  intakePayload,
  intakeTick,
  operatorOf,
  redact,
  syncIntakeRow,
} from '../src/jobs/ghl-intake';
import { teamIntake, teams, users } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { resetDatabase, testDatabase } from './helpers';

const FORM = WEEK0_INTAKE;
const ENV = {
  GHL_FIELD_INTAKE_NAME: 'f-name',
  GHL_FIELD_INTAKE_AI: 'f-ai',
  GHL_FIELD_INTAKE_PROBLEMS: 'f-problems',
  GHL_FIELD_INTAKE_SUBMITTED_ON: 'f-on',
} as NodeJS.ProcessEnv;
const SUBMITTED = Date.parse('2026-11-20T21:18:00Z');
const config: GhlConfig = { token: 't', locationId: 'loc' };
const quiet = { info: () => undefined, warn: () => undefined };

/** A fetch that answers HighLevel's shapes and records each call. */
function mockFetch() {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    calls.push({ method: init.method ?? 'GET', path, body: init.body ? JSON.parse(String(init.body)) : null });
    const json =
      path === '/contacts/upsert'
        ? { contact: { id: `c-${calls.length}`, tags: [] }, new: false }
        : path.endsWith('/tags')
          ? { tags: [INTAKE_TAG] }
          : {};
    return new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe('the payload (Appendix A’s rules)', () => {
  it('one field per configured question, the rest skipped by name, a long answer cut with …, an empty one clears', () => {
    const p = intakePayload(FORM, { name: 'Alex', ai: 'Claude', problems: 'x'.repeat(FIELD_MAX + 10) }, SUBMITTED, ENV);
    expect(p.customFields.find((f) => f.id === 'f-name')).toEqual({ id: 'f-name', field_value: 'Alex' });
    expect(p.customFields.find((f) => f.id === 'f-problems')!.field_value).toHaveLength(FIELD_MAX);
    expect(p.customFields.find((f) => f.id === 'f-problems')!.field_value.endsWith('…')).toBe(true);
    expect(p.cut).toEqual(['problems']);
    expect(p.skipped).toContain('team');
    expect(p.customFields.find((f) => f.id === 'f-on')).toEqual({ id: 'f-on', field_value: '2026-11-20' });
    expect(intakePayload(FORM, {}, SUBMITTED, ENV).customFields.find((f) => f.id === 'f-ai')).toEqual({
      id: 'f-ai',
      field_value: '',
    });
    expect(fieldEnvOf('lead-desk')).toBe('GHL_FIELD_INTAKE_LEAD_DESK');
  });
  it('the log shows lengths, never a value', () => {
    const r = redact(intakePayload(FORM, { name: 'Alex Morgan' }, SUBMITTED, ENV));
    expect(JSON.stringify(r)).not.toContain('Alex');
    expect(r.customFields.find((f) => f.id === 'f-name')).toEqual({ id: 'f-name', length: 11 });
  });
  it('the dry run is on unless the variable says false', () => {
    expect(intakeDryRun({})).toBe(true);
    expect(intakeDryRun({ GHL_INTAKE_DRY_RUN: 'true' })).toBe(true);
    expect(intakeDryRun({ GHL_INTAKE_DRY_RUN: 'false' })).toBe(false);
  });
});

describe('the operator (their own contact)', () => {
  it('their account first; else an email in the answer; never a guess; none when the owner runs it', () => {
    expect(operatorOf({}, { name: 'Op', email: 'op@x.test' })).toEqual({
      contact: { name: 'Op', email: 'op@x.test' },
      reason: null,
    });
    expect(operatorOf({ 'operator-name': 'Our operations lead, ops@northline.example' }, null).contact).toEqual({
      name: 'Our operations lead',
      email: 'ops@northline.example',
    });
    expect(operatorOf({ 'operator-name': 'Sam from the front desk' }, null)).toMatchObject({ contact: null });
    expect(operatorOf({ operator: 'I am', 'operator-name': 'me@x.test' }, null)).toMatchObject({
      contact: null,
      reason: 'the owner is the operator',
    });
  });
});

describe('one row', () => {
  const owner = { email: 'owner@x.test', name: 'Owner', ghlContactId: null, isTest: false };
  it('the dry run sends nothing and logs no value', async () => {
    const { f, calls } = mockFetch();
    const logged: string[] = [];
    const out = await syncIntakeRow(
      { teamId: 't', answers: { name: 'Alex Morgan' }, submittedAt: SUBMITTED },
      {
        form: FORM,
        owner,
        operator: null,
        options: { config, fetch: f },
        send: false,
        associationId: null,
        log: { info: (o) => logged.push(JSON.stringify(o)), warn: () => undefined },
        env: ENV,
      },
    );
    expect(out).toEqual({ status: 'dry-run' });
    expect(calls).toEqual([]);
    expect(logged.join()).not.toContain('Alex');
  });
  it('sends the contact, its fields, the tag, then the operator and their relation, in that order', async () => {
    const { f, calls } = mockFetch();
    const out = await syncIntakeRow(
      { teamId: 't', answers: { name: 'Alex', operator: 'A teammate' }, submittedAt: SUBMITTED },
      {
        form: FORM,
        owner,
        operator: { name: 'Op', email: 'op@x.test' },
        options: { config, fetch: f },
        send: true,
        associationId: 'assoc',
        log: quiet,
        env: ENV,
      },
    );
    expect(out).toEqual({ status: 'synced' });
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /contacts/upsert',
      'POST /contacts/c-1/tags',
      'PUT /contacts/c-1',
      'POST /contacts/upsert',
      'POST /contacts/c-4/tags',
      'POST /contacts/upsert',
      'POST /contacts/c-6/tags',
      'POST /associations/relations',
    ]);
    expect(calls[4]!.body).toEqual({ tags: [INTAKE_TAG] });
    expect(calls[6]!.body).toEqual({ tags: [] });
    expect(calls[7]!.body).toEqual({
      locationId: 'loc',
      associationId: 'assoc',
      firstRecordId: 'c-1',
      secondRecordId: 'c-6',
    });
    // The operator's name and email go to their own contact only.
    expect(JSON.stringify(calls.slice(0, 5))).not.toContain('op@x.test');
  });
  it('never the seeded test account', async () => {
    const { f, calls } = mockFetch();
    const out = await syncIntakeRow(
      { teamId: 't', answers: {}, submittedAt: SUBMITTED },
      {
        form: FORM,
        owner: { ...owner, isTest: true },
        operator: null,
        options: { config, fetch: f },
        send: true,
        associationId: null,
        log: quiet,
        env: ENV,
      },
    );
    expect(out.status).toBe('skipped');
    expect(calls).toEqual([]);
  });
});

describe('the tick (due rows, the dry run, backoff)', () => {
  let handle: Database;
  beforeAll(async () => {
    handle = await testDatabase();
    const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
    const week = db.modules.find((m) => m.id === WEEK0_MODULE_ID)!;
    week.course = { ...week.course!, intake: WEEK0_INTAKE };
    await resetDatabase(db);
    await handle.insert(teams).values([{ id: 'team-g', name: 'Team G', ownerId: 'own-g', seats: 5, seq: 90 }]);
    await handle
      .insert(users)
      .values([
        {
          id: 'own-g',
          email: 'g@example.test',
          name: 'Owner G',
          kind: 'learner',
          tier: 'team',
          role: 'Team Owner',
          teamId: 'team-g',
          status: 'active',
          joined: SUBMITTED,
          seq: 90,
        },
      ]);
  });
  afterAll(async () => undefined);

  const put = (over: Partial<typeof teamIntake.$inferInsert>) =>
    handle
      .insert(teamIntake)
      .values({
        teamId: 'team-g',
        answers: { name: 'G' },
        updatedAt: SUBMITTED,
        updatedBy: 'own-g',
        submittedAt: SUBMITTED,
        ghlSyncStatus: 'pending',
        ghlNextAt: SUBMITTED + 60_000,
        ghlAttempts: 0,
        ...over,
      })
      .onConflictDoUpdate({
        target: teamIntake.teamId,
        set: { ghlSyncStatus: 'pending', ghlNextAt: SUBMITTED + 60_000, ghlAttempts: 0, ghlError: null, ...over },
      });
  const row = async () => (await handle.select().from(teamIntake).where(eq(teamIntake.teamId, 'team-g')))[0]!;

  it('waits for the quiet minute', async () => {
    await put({});
    expect(await intakeTick(SUBMITTED + 30_000, { config, log: quiet, env: {} })).toBe(0);
  });
  it('the dry run marks the row and sends nothing', async () => {
    const { f, calls } = mockFetch();
    await put({});
    expect(await intakeTick(SUBMITTED + 61_000, { config, log: quiet, env: {}, fetch: f })).toBe(1);
    expect(calls).toEqual([]);
    expect(await row()).toMatchObject({ ghlSyncStatus: 'pending', ghlError: 'dry run: nothing sent', ghlNextAt: null });
  });
  it('sends when the dry run is off, and marks it synced', async () => {
    const { f } = mockFetch();
    await put({});
    await intakeTick(SUBMITTED + 61_000, {
      config,
      log: quiet,
      env: { ...ENV, GHL_INTAKE_DRY_RUN: 'false' },
      fetch: f,
    });
    expect(await row()).toMatchObject({ ghlSyncStatus: 'synced', ghlSyncedAt: SUBMITTED + 61_000, ghlError: null });
  });
  it('a refused call backs off and tries again later', async () => {
    const refuse = (async () => new Response('{}', { status: 500 })) as unknown as typeof fetch;
    await put({});
    await intakeTick(SUBMITTED + 61_000, {
      config,
      log: quiet,
      env: { ...ENV, GHL_INTAKE_DRY_RUN: 'false' },
      fetch: refuse,
    });
    expect(await row()).toMatchObject({
      ghlSyncStatus: 'pending',
      ghlAttempts: 1,
      ghlNextAt: SUBMITTED + 61_000 + 60_000,
    });
    expect((await row()).ghlError).toMatch(/owner upsert: server/);
  });
});
