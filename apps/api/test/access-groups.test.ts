// Access groups (D-148), end to end against Postgres: the Utah Life team's verified @liveutah.com
// addresses hold the Amplified Agent Plan's skills at no charge. Nothing here talks to Stripe (a spy
// that records any call is wired in and checked), and nothing here sends an email nobody asked for.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { SESSION_COOKIE, settleEmails } from '../src/auth';
import { emailDomainOf, GROUP_FOREVER, groupGrant, inGroup, provisionGroupMember, recordVerified } from '../src/billing/access-groups';
import type { AccessGroup } from '../src/billing/access-groups';
import { readOfferConfig } from '../src/billing/config';
import type { BillingStripe } from '../src/billing/stripe';
import type { Database } from '../src/db/client';
import { accessGroupMembers, accessGroups, accounts, authTokens, emailVerifications, orders, plans, skills, users } from '../src/db/schema';
import { outboxFor, resetOutbox } from '../src/email/transport';
import type { OutboxEntry } from '../src/email/transport';
import { resetS3 } from '../src/storage';
import { MIGRATIONS_FOLDER, resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-11-12T09:00:00-06:00'); // the Utah Life training day
const DAY = 86_400_000;
const APP_URL = 'https://learn.example.com';
const S3_ENV = {
  S3_REGION: 'auto',
  S3_ENDPOINT: 'https://bucket-production-a1b2.up.railway.app',
  S3_ACCESS_KEY_ID: 'AKIAEXAMPLEONLY00000',
  S3_SECRET_ACCESS_KEY: 'test-only-hmac-key-material-0000000000',
  S3_BUCKET: 'ai-lms.production',
} as const;
type S3Key = keyof typeof S3_ENV;

const UTAH_LIFE = { id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null, createdAt: NOW - DAY };

let app: App;
let db: Database;
const saved: Record<string, string | undefined> = {};

/** Every Stripe method the app reaches for: there must be none. `then` is left alone so it is not a promise. */
let stripeCalls: string[] = [];
const stripeSpy = new Proxy(
  {},
  {
    get: (_t, prop) => {
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      stripeCalls.push(String(prop));
      return () => {
        throw new Error(`Stripe was called: ${String(prop)}`);
      };
    },
  },
) as unknown as BillingStripe;

const at = (ms: number) => {
  process.env.FIXED_NOW = new Date(ms).toISOString();
};

beforeAll(async () => {
  for (const k of ['APP_URL', ...Object.keys(S3_ENV)]) saved[k] = process.env[k];
  process.env.APP_URL = APP_URL;
  for (const k of Object.keys(S3_ENV) as S3Key[]) process.env[k] = S3_ENV[k];
  db = await testDatabase();
});
afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  delete process.env.FIXED_NOW;
  resetS3();
});

beforeEach(async () => {
  at(NOW);
  resetOutbox();
  resetS3();
  await resetDatabase(seedForDatabase('live'));
  // The migration seeds this group; the suite's reset empties every table, so it is put back here.
  await db.insert(accessGroups).values(UTAH_LIFE);
  await db.insert(skills).values([
    // Today's training.
    { id: 'appointment-follow-up', title: 'Appointment Follow-Up', sets: 'agent', releasedAt: NOW - 10 * DAY, files: { claude: 'appointment-follow-up.zip' } },
    { id: 'repair-request-response', title: 'Repair Request Response', sets: 'agent', releasedAt: NOW - 10 * DAY, files: { claude: 'repair-request-response.zip' } },
    // For everyone, and for owners only (not the Agent Plan's).
    { id: 'perfect-week', title: 'Perfect Week', sets: 'both', releasedAt: NOW - 10 * DAY, files: { claude: 'perfect-week.zip' } },
    { id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', releasedAt: NOW - 10 * DAY, files: { claude: 'team-pnl-review.zip' } },
  ]);
  stripeCalls = [];
  app = await build({
    logger: false,
    offer: { pages: {}, config: { ...readOfferConfig({}), invitesFrom: NOW - DAY }, stripe: stripeSpy, verify: null },
  });
  stripeCalls = [];
});
afterEach(async () => {
  await app?.close();
  // Not a customer, not a seat: no Stripe call, ever, and no account, order or plan row.
  expect(stripeCalls).toEqual([]);
  expect(await db.select().from(accounts)).toEqual([]);
  expect(await db.select().from(orders)).toEqual([]);
  expect(await db.select().from(plans)).toEqual([]);
});

const post = (url: string, payload: Record<string, unknown>) => app.inject({ method: 'POST', url, payload, headers: { origin: 'http://localhost' } });
const cookieOf = (setCookie: string | string[] | undefined) =>
  (Array.isArray(setCookie) ? setCookie.join('\n') : (setCookie ?? '')).split('\n').find((l) => l.startsWith(`${SESSION_COOKIE}=`))?.split(';')[0] ?? '';

/** The token in the last email of this template to this address, from its link. */
async function linkToken(to: string, template: 'sign-in' | 'set-password'): Promise<string> {
  await settleEmails();
  const mails = outboxFor({ to, template }) as OutboxEntry[];
  expect(mails.length, `${template} to ${to}`).toBeGreaterThan(0);
  const m = /\/(?:sign-in|set-password)\?token=([A-Za-z0-9_-]+)/.exec(mails.at(-1)!.html ?? '');
  expect(m, 'a link with a token').toBeTruthy();
  return m![1]!;
}

/** Sign in the way a Utah Life agent does on the training day: ask for a link, follow it. */
async function signInByLink(typed: string): Promise<string> {
  expect((await post('/api/auth/request', { email: typed })).statusCode).toBe(200);
  const res = await post('/api/auth/verify', { token: await linkToken(typed.trim().toLowerCase(), 'sign-in') });
  expect(res.statusCode, res.body).toBe(200);
  return cookieOf(res.headers['set-cookie']);
}

/** An account for an address, as a group member's is made, with or without a proven address. */
async function account(email: string, { verified }: { verified: boolean }): Promise<string> {
  const id = await provisionGroupMember(db, email, NOW);
  expect(id).not.toBeNull();
  if (verified) await recordVerified(db, email, NOW);
  return app.signInAs(id!);
}

async function library(cookie: string) {
  const res = await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } });
  expect(res.statusCode).toBe(200);
  const body = res.json() as { skills: { id: string; state: string }[]; accessGroups: { id: string; name: string }[]; plans: unknown[] };
  return { states: Object.fromEntries(body.skills.map((s) => [s.id, s.state])), groups: body.accessGroups, plans: body.plans };
}
const download = async (cookie: string, id: string) => (await app.inject({ method: 'GET', url: `/api/skills/${id}/download/claude`, headers: { cookie } })).statusCode;

const AGENT_PLAN = { 'appointment-follow-up': 'open', 'repair-request-response': 'open', 'perfect-week': 'open', 'team-pnl-review': 'locked' };
const NOTHING = { 'appointment-follow-up': 'locked', 'repair-request-response': 'locked', 'perfect-week': 'locked', 'team-pnl-review': 'locked' };

describe('a Utah Life agent with no account, on the training day', () => {
  it('signs up from the sign-in link, and opens every Agent Plan skill, today’s two included', async () => {
    const cookie = await signInByLink('  Jane.Doe@LiveUtah.com ');
    const [user] = await db.select().from(users).where(eq(users.email, 'jane.doe@liveutah.com'));
    // Made the way an Agent Plan buyer's is: the owner of a team of one, Agent tier, active once the link is followed.
    expect(user).toMatchObject({ kind: 'learner', tier: 'agent', role: 'Team Owner', status: 'active' });
    const lib = await library(cookie);
    expect(lib.states).toEqual(AGENT_PLAN);
    expect(lib.groups).toEqual([{ id: 'utah-life', name: 'Utah Life' }]);
    // A group's grant is not a plan to bill.
    expect(lib.plans).toEqual([]);
    expect(await download(cookie, 'appointment-follow-up')).toBe(302);
    expect(await download(cookie, 'repair-request-response')).toBe(302);
    expect(await download(cookie, 'team-pnl-review')).toBe(403);
    // The one email is the link they asked for.
    await settleEmails();
    expect(outboxFor({ to: 'jane.doe@liveutah.com' }).map((e) => e.template)).toEqual(['sign-in']);
  });

  it('signs up from Forgot Password the same way, choosing a password', async () => {
    expect((await post('/api/auth/password/forgot', { email: 'sam@liveutah.com' })).statusCode).toBe(200);
    const token = await linkToken('sam@liveutah.com', 'set-password');
    const res = await post('/api/auth/password/set', { token, password: 'a long enough password' });
    expect(res.statusCode, res.body).toBe(200);
    expect((await library(cookieOf(res.headers['set-cookie']))).states).toEqual(AGENT_PLAN);
  });

  it('gets every agent skill released later, with nothing else to change', async () => {
    const cookie = await signInByLink('jane@liveutah.com');
    await db.insert(skills).values([
      { id: 'listing-description-writer', title: 'Listing Description Writer', sets: 'agent', releasedAt: NOW, files: { claude: 'listing-description-writer.zip' } },
      { id: 'speed-to-lead-reply', title: 'Speed to Lead Reply', sets: 'agent', releasedAt: NOW + 20 * DAY, files: { claude: 'speed-to-lead-reply.zip' } },
    ]);
    let states = (await library(cookie)).states;
    expect(states['listing-description-writer']).toBe('open');
    expect(states['speed-to-lead-reply']).toBe('upcoming');
    // Inside the link session's 30 days.
    at(NOW + 21 * DAY);
    states = (await library(cookie)).states;
    expect(states['speed-to-lead-reply']).toBe('open');
    expect(await download(cookie, 'speed-to-lead-reply')).toBe(302);
  });

  it('asks for a link for an address in no group and gets nothing: no email, no token, no account', async () => {
    expect((await post('/api/auth/request', { email: 'jane@notliveutah.com' })).statusCode).toBe(200);
    expect((await post('/api/auth/password/forgot', { email: 'jane@liveutah.com.evil.com' })).statusCode).toBe(200);
    await settleEmails();
    expect(outboxFor({})).toEqual([]);
    expect(await db.select().from(authTokens)).toEqual([]);
    expect(await db.select().from(users).where(eq(users.email, 'jane@notliveutah.com'))).toEqual([]);
  });
});

describe('who the group grants to', () => {
  it('grants only a verified address: typing an @liveutah.com address proves nothing', async () => {
    const cookie = await account('unproven@liveutah.com', { verified: false });
    expect(await library(cookie)).toMatchObject({ states: NOTHING, groups: [] });
    expect(await download(cookie, 'appointment-follow-up')).toBe(403);
    // Following one emailed link is the proof.
    await post('/api/auth/request', { email: 'unproven@liveutah.com' });
    await post('/api/auth/verify', { token: await linkToken('unproven@liveutah.com', 'sign-in') });
    expect((await library(cookie)).states).toEqual(AGENT_PLAN);
  });

  it.each(['x@liveutah.com.evil.com', 'x@notliveutah.com', 'x@mail.liveutah.com', 'x@liveutah.co', 'x@liveutah.com.'])(
    'opens nothing for %s, even verified',
    async (email) => {
      const cookie = await account(email, { verified: true });
      expect(await library(cookie)).toMatchObject({ states: NOTHING, groups: [] });
      expect(await download(cookie, 'appointment-follow-up')).toBe(403);
    },
  );

  it('matches the domain whatever the case', async () => {
    const cookie = await account('Pat.Ortiz@LIVEUTAH.COM', { verified: false });
    await recordVerified(db, '  PAT.ORTIZ@liveutah.com ', NOW);
    expect((await library(cookie)).states).toEqual(AGENT_PLAN);
  });

  it('a listed address outside the domain opens the same, and taking it off the list takes it away', async () => {
    const cookie = await account('coach@example.com', { verified: true });
    expect((await library(cookie)).states).toEqual(NOTHING);
    await db.insert(accessGroupMembers).values({ groupId: 'utah-life', email: 'coach@example.com', name: 'Coach', addedAt: NOW });
    expect((await library(cookie)).states).toEqual(AGENT_PLAN);
    await db.delete(accessGroupMembers).where(eq(accessGroupMembers.email, 'coach@example.com'));
    expect((await library(cookie)).states).toEqual(NOTHING);
    expect(await download(cookie, 'appointment-follow-up')).toBe(403);
  });

  it('taking the domain off the group, or ending the group, takes the access away at once', async () => {
    const cookie = await signInByLink('jane@liveutah.com');
    expect((await library(cookie)).states).toEqual(AGENT_PLAN);
    await db.update(accessGroups).set({ emailDomain: null }).where(eq(accessGroups.id, 'utah-life'));
    expect((await library(cookie)).states).toEqual(NOTHING);
    await db.update(accessGroups).set({ emailDomain: 'liveutah.com', expiresAt: NOW - 1 }).where(eq(accessGroups.id, 'utah-life'));
    expect((await library(cookie)).states).toEqual(NOTHING);
  });

  it('leaves everyone else as they were: a learner on no group opens only what they bought', async () => {
    const [jamie] = await db.select().from(users).where(eq(users.email, 'jamie@ortizhomes.com'));
    const lib = await library(await app.signInAs(jamie!.id));
    expect(lib.groups).toEqual([]);
    expect(lib.states).toEqual(NOTHING);
  });

  it('records a proven address when any emailed link is spent, and only then', async () => {
    expect(await db.select().from(emailVerifications)).toEqual([]);
    await signInByLink('jane@liveutah.com');
    expect((await db.select().from(emailVerifications)).map((r) => r.email)).toEqual(['jane@liveutah.com']);
  });
});

describe('the rule, pure', () => {
  const group = (over: Partial<AccessGroup> = {}): AccessGroup => ({ id: 'utah-life', name: 'Utah Life', plan: 'agent_plan', emailDomain: 'liveutah.com', expiresAt: null, ...over });

  it('takes the domain after the one @, lower-cased', () => {
    expect(emailDomainOf(' Jane@LiveUtah.com ')).toBe('liveutah.com');
    expect(emailDomainOf('a@b@liveutah.com')).toBeNull();
    expect(emailDomainOf('liveutah.com')).toBeNull();
    expect(emailDomainOf('@liveutah.com')).toBeNull();
    expect(emailDomainOf('jane@')).toBeNull();
  });

  it('matches the exact domain or the list, until the group ends', () => {
    expect(inGroup(group(), 'jane@liveutah.com', false, NOW)).toBe(true);
    for (const e of ['jane@x.liveutah.com', 'jane@liveutah.com.evil.com', 'jane@notliveutah.com', 'jane@liveutah.co']) expect(inGroup(group(), e, false, NOW), e).toBe(false);
    expect(inGroup(group({ emailDomain: null }), 'jane@liveutah.com', false, NOW)).toBe(false);
    expect(inGroup(group({ emailDomain: null }), 'coach@example.com', true, NOW)).toBe(true);
    expect(inGroup(group({ expiresAt: NOW }), 'jane@liveutah.com', false, NOW)).toBe(false);
  });

  it('grants the group’s plan as started, ongoing and paid through every release', () => {
    expect(groupGrant(group())).toEqual({ kind: 'agent_plan', status: 'active', paidThrough: GROUP_FOREVER, liveUntil: null });
  });
});

describe('the migration', () => {
  it('creates the Utah Life group for verified @liveutah.com addresses, with the Agent Plan and no end', () => {
    const sql = readFileSync(`${MIGRATIONS_FOLDER}/0012_access_groups.sql`, 'utf8');
    expect(sql).toContain(`VALUES ('utah-life', 'Utah Life', 'agent_plan', 'liveutah.com', NULL,`);
    // Proof already given before the table existed: spent sign-in links and invites only.
    expect(sql).toMatch(/WHERE "purpose" IN \('sign_in', 'invite'\) AND "used_at" IS NOT NULL/);
  });
});
