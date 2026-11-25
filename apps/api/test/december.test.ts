// DECEMBER DOES NOT MOVE (R-5, handoff/admin-mockup/ADMIN-RESTRUCTURE-SPEC.md § 1).
//
// The December 2026 Cohort is live while the admin restructure is built. This file is the proof that it stays as it
// is: a characterization test over the seeded December database that captures, at a spread of instants and for each
// kind of viewer, what December's learners and buyers get, and compares it with what `main` gave before R-5's first
// change (`fixtures/december/golden.json`, captured at `babceae`):
//
//   - December's stored rows: the cohort, its eighteen sessions and its nine weeks (no phase rewrites one unless the
//     spec names the rewrite, § 1 point 3);
//   - what a completed December checkout provisions (`billing/provision.ts`), in full and in two payments;
//   - `GET /api/course`, and the scoped snapshot a learner receives (`GET /api/snapshot`, `scopeSnapshot`);
//   - which of December's sessions each viewer can join, and what the join route answers for each;
//   - who each scheduled email and reminder goes to, and when: the five reminders (`jobs/due.ts`, swept hour by hour),
//     and the held invites, the cohort welcome and Week 0 Is Open (`jobs/welcome.ts`, `jobs/week0-open.ts`, in the
//     billing loop's order, swept every three hours with both Console switches on);
//   - the offer's seat numbers and cart states (`routes/offer.ts`) and the calendar feeds (`routes/offer-calendar.ts`);
//   - the seat cap: real checkouts up to December's 14th, 15th and 16th seat, what provisioning logs at each, and what
//     `billing/payment-links.ts` does to December's two Payment Links (a fake Stripe; nothing leaves this process).
//
// THE RULE. Every phase of R-5 ends with this file and its golden UNCHANGED and passing. A phase that needs either
// edited is a phase that moved December: stop and say so (§ 1, point 2). The golden is never regenerated to make a
// failure pass; `DECEMBER_CAPTURE=1` writes it, and ran on `main` before R-5 changed anything. The one file a phase may
// add to is `december-others.ts`, which puts other cohorts (January) in the same database, so this test also proves
// December is unchanged WITH them there (the spec's Phase 3, "Done when").
//
// WHAT IS NORMALIZED, AND WHY. Ids provisioning draws at random become labels (`<owner>`, `<plan:owner:cohort>`), and
// one-time tokens become `<token>`, so the golden says who, not which random string. A large body is kept as the
// SHA-256 of its canonical JSON (keys sorted: a reordered object is not a change, a changed value is), beside a short
// summary that says what moved when it fails. A key that is new since the golden and null is not a change (D-173: a
// new column is nullable with no default and reads back absent). Staff's snapshot is not compared: it is the whole
// database, and the restructure adds to it on purpose; December's rows in it are the `stored` section instead.
//
// TWO FIXTURE CHOICES ARE THIS FILE'S, NOT PRODUCTION'S. The pre-launch preview opens Mon, Nov 23 at 9:00 AM MT
// (production's is whatever Course settings holds), and every December session has a made-up Zoom address, so the
// join route has something to hand out.
//
// The clock is § 7.7's FIXED_NOW. Every instant is written in Mountain Time (MST, UTC-7, November to February; the
// last instant, in May, carries its own offset).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq, inArray } from 'drizzle-orm';
import { COHORT_WELCOME_FLAG, WEEK0_OPEN_FLAG } from '@ai/core';
import type { Db } from '@ai/core';
import { CART_IDS, DEFAULT_FOUNDING_CLOSES_AT, DEFAULT_INVITES_FROM } from '@ai/core/offer';
import { seedProduction } from '@ai/core/seed/curriculum';
import { build } from '../src/app';
import type { App } from '../src/app';
import { provisionGroupMember, recordVerified } from '../src/billing/access-groups';
import { ACCELERATOR_LINKS_LIVE } from '../src/billing/config';
import type { OfferConfig } from '../src/billing/config';
import { reconcileAcceleratorSeats, resetSeatCapLogForTests } from '../src/billing/payment-links';
import { provisionOrder, provisionSkillBuyer, sendHeldInvites } from '../src/billing/provision';
import type { BillingStripe, PaymentLinkChange, PaymentLinkInfo } from '../src/billing/stripe';
import type { Database } from '../src/db/client';
import { applyDataMigrations } from '../src/db/data-migrations';
import { persistDiff } from '../src/db/io';
import { seedTestMember } from '../src/db/seed-test-member';
import {
  accessGroupMembers,
  accessGroups,
  accounts,
  cohortEnrollments,
  cohorts,
  consoleFlags,
  orders,
  plans,
  sessions,
  skillPurchases,
  teams,
  users,
} from '../src/db/schema';
import { outbox, resetOutbox } from '../src/email/transport';
import { dueWork } from '../src/jobs/due';
import { sendWeek0Open } from '../src/jobs/week0-open';
import { sendDueWelcomes } from '../src/jobs/welcome';
import { acceleratorRoster } from '../src/lib/course-access';
import { calendarFiles } from '../src/routes/offer-calendar';
import { cartStates } from '../src/routes/offer';
import { addOtherCohorts } from './december-others';
import { loadDb, resetDatabase, testDatabase } from './helpers';

// ---------------------------------------------------------------------------------------------------------------------
// The golden
// ---------------------------------------------------------------------------------------------------------------------

const GOLDEN = fileURLToPath(new URL('./fixtures/december/golden.json', import.meta.url));
const CAPTURE = process.env.DECEMBER_CAPTURE === '1';
if (CAPTURE && process.env.CI)
  throw new Error(
    'DECEMBER_CAPTURE=1 never runs in CI: the golden is captured once, on main, before R-5 changes anything.',
  );
const golden: Record<string, unknown> =
  !CAPTURE && existsSync(GOLDEN) ? (JSON.parse(readFileSync(GOLDEN, 'utf8')) as Record<string, unknown>) : {};
const captured: Record<string, unknown> = {};

/** A value with every object's keys sorted, so two outputs that differ only in key order are the same output. */
function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) out[k] = canon((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}

/** `actual` without the keys the golden doesn't have whose value is null: a new nullable column is not a change. */
function withoutNewNulls(actual: unknown, expected: unknown): unknown {
  if (Array.isArray(actual) && Array.isArray(expected)) return actual.map((v, i) => withoutNewNulls(v, expected[i]));
  if (actual && typeof actual === 'object' && expected && typeof expected === 'object' && !Array.isArray(actual)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(actual as Record<string, unknown>)) {
      if (!(k in (expected as Record<string, unknown>)) && v === null) continue;
      out[k] = withoutNewNulls(v, (expected as Record<string, unknown>)[k]);
    }
    return out;
  }
  return actual;
}

/** Compare one section with the golden, or record it when capturing. */
function same(section: string, actual: unknown): void {
  const value = canon(JSON.parse(JSON.stringify(actual)));
  if (CAPTURE) {
    captured[section] = value;
    return;
  }
  expect(
    golden[section],
    `the golden has no "${section}": it is captured once, on main, with DECEMBER_CAPTURE=1`,
  ).toBeDefined();
  expect(
    withoutNewNulls(value, golden[section]),
    `December moved: ${section}. Stop and say so (ADMIN-RESTRUCTURE-SPEC § 1).`,
  ).toEqual(golden[section]);
}

afterAll(() => {
  delete process.env.FIXED_NOW;
  delete process.env.APP_URL;
  if (!CAPTURE) return;
  mkdirSync(dirname(GOLDEN), { recursive: true });
  writeFileSync(GOLDEN, `${JSON.stringify(canon(captured), null, 1)}\n`);
});

// ---------------------------------------------------------------------------------------------------------------------
// Who, and when
// ---------------------------------------------------------------------------------------------------------------------

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const at = (t: number): void => {
  process.env.FIXED_NOW = new Date(t).toISOString();
};
const iso = (t: number): string => new Date(t).toISOString();

/** Everyone bought before the invite hold lifted, as December's founding buyers did. */
const BOUGHT = MT('2026-11-14T14:00:00');
/** This file's preview (see the header). */
const PREVIEW = MT('2026-11-23T09:00:00');
/** Both email switches turned on, a few days before Week 1. */
const SWITCHES_ON = MT('2026-11-25T12:00:00');
/** A buyer who enrolls after launch (#265's case): Thu, Dec 10. */
const LATE = MT('2026-12-10T10:00:00');

/** The spread of instants: before the preview, in it, Nov 29, the first build, the holiday gap, after the last session. */
const INSTANTS: Record<string, number> = {
  'before-preview': MT('2026-11-20T09:00:00'),
  'in-preview': MT('2026-11-24T10:00:00'),
  'week1-opens': MT('2026-11-29T12:30:00'),
  'dec2-join-window': MT('2026-12-02T11:50:00'),
  'dec2-build': MT('2026-12-02T12:30:00'),
  'dec3-office-hours': MT('2026-12-03T12:10:00'),
  'dec16-build': MT('2026-12-16T12:05:00'),
  'holiday-gap': MT('2026-12-27T10:00:00'),
  'jan6-build': MT('2027-01-06T12:10:00'),
  'feb4-last-office-hours': MT('2027-02-04T12:20:00'),
  'after-last-session': MT('2027-02-10T12:00:00'),
  'after-live-until': Date.parse('2027-05-05T12:00:00-06:00'),
};

/** The kinds of viewer § 1 names. Each is made the way production makes it. */
const VIEWERS = [
  'owner',
  'twoPayOwner',
  'implementer',
  'insiders',
  'teamPlanOwner',
  'teamPlanAgent',
  'utahLife',
  'skillBuyer',
  'testEarly',
  'staff',
] as const;
type Viewer = (typeof VIEWERS)[number];

/** December's world: every person this file makes, by label. Extra seat buyers join it in the seat-cap section. */
const EMAIL: Record<string, string> = {
  owner: 'owner@example.test',
  twoPayOwner: 'twopay@example.test',
  implementer: 'implementer@example.test',
  insiders: 'insider@example.test',
  teamPlanOwner: 'teamplan@example.test',
  teamPlanAgent: 'agent@example.test',
  utahLife: 'jane.doe@liveutah.com',
  skillBuyer: 'skill@example.test',
  testEarly: 'early@example.test',
  late: 'late@example.test',
};
const ours = (email: string): boolean => Object.values(EMAIL).includes(email);

const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };

let handle: Database;
const userIds = new Map<string, string>();
const cookies = new Map<Viewer, string>();
/** Real id -> label. */
const labels = new Map<string, string>();

const bare = (label: string | undefined): string => (label ?? '?').replace(/[<>]/g, '');

/** Labels for every id provisioning drew at random. Run again after anything that writes new rows. */
async function relabel(): Promise<void> {
  const byEmail = new Map(Object.entries(EMAIL).map(([k, e]) => [e, k]));
  for (const u of await handle.select({ id: users.id, email: users.email }).from(users)) {
    const who = byEmail.get(u.email) ?? (u.id === 'st_owner' ? 'staff' : null);
    if (!who) continue;
    userIds.set(who, u.id);
    if (who !== 'staff') labels.set(u.id, `<${who}>`);
  }
  for (const t of await handle.select({ id: teams.id, ownerId: teams.ownerId }).from(teams))
    if (labels.has(t.ownerId ?? '')) labels.set(t.id, `<team:${bare(labels.get(t.ownerId ?? ''))}>`);
  for (const a of await handle.select({ id: accounts.id, ownerUserId: accounts.ownerUserId }).from(accounts))
    if (labels.has(a.ownerUserId ?? '')) labels.set(a.id, `<acct:${bare(labels.get(a.ownerUserId ?? ''))}>`);
  for (const p of await handle.select({ id: plans.id, accountId: plans.accountId, kind: plans.kind }).from(plans))
    if (labels.has(p.accountId))
      labels.set(p.id, `<plan:${bare(labels.get(p.accountId)).replace('acct:', '')}:${p.kind}>`);
  for (const o of await handle.select({ id: orders.id, email: orders.email }).from(orders))
    if (byEmail.has(o.email ?? '') && !o.id.startsWith('ord_dec_'))
      labels.set(o.id, `<order:${byEmail.get(o.email ?? '')}>`);
}

/** A JSON value with every random id as its label and every one-time token as `<token>`. */
function norm<T>(v: T): T {
  let s = JSON.stringify(v);
  for (const [id, label] of [...labels].sort((a, b) => b[0].length - a[0].length)) s = s.split(id).join(label);
  s = s.replace(/(token=|checkout=|\/set-password\/|\/invite\/|\/sign-in\/)[A-Za-z0-9_\-.%~]+/g, '$1<token>');
  return JSON.parse(s) as T;
}

const sha = (v: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(canon(v)))
    .digest('hex');

// ---------------------------------------------------------------------------------------------------------------------
// The database: § 9.5's launch seed, every data step the deploy runs, then December's buyers as production makes them
// ---------------------------------------------------------------------------------------------------------------------

/** A paid order, provisioned by the webhook's own function. Returns what provisioning logged at error level. */
async function buy(label: string, plan: string, option: string, now: number): Promise<string[]> {
  const id = `ord_dec_${label}`;
  const email = EMAIL[label]!;
  await handle
    .insert(orders)
    .values({
      id,
      plan,
      option,
      origin: 'payment_link',
      status: 'paid',
      name: label,
      email,
      company: `${label} group`,
      crm: 'follow_up_boss',
      createdAt: now,
    });
  const errors: string[] = [];
  const log = { ...silent, error: (_o: unknown, msg?: string) => void errors.push(msg ?? '') };
  const out = await provisionOrder(id, {
    db: handle,
    log,
    now,
    invitesFrom: Date.parse(DEFAULT_INVITES_FROM),
    invitesEnabled: false,
  });
  if (!out.ok) throw new Error(`provisioning ${label} failed: ${out.reason}`);
  return errors;
}

/** A learner invited onto an owner's team: same team, same account, same plans. */
async function addToTeam(
  ownerLabel: string,
  label: string,
  role: 'Operations Lead' | 'Agent',
  tier: 'team' | 'agent',
): Promise<void> {
  const before: Db = await loadDb();
  const after = structuredClone(before);
  const owner = after.users.find((u) => u.email === EMAIL[ownerLabel])!;
  after.users.push({
    id: `u_dec_${label}`,
    name: label,
    email: EMAIL[label]!,
    tier,
    role,
    teamId: owner.teamId,
    cohortId: owner.cohortId,
    joined: BOUGHT,
    last: null,
    status: 'active',
    progress: {},
  });
  await persistDiff(handle, before, after);
}

const ZOOM = (id: string): string => `https://zoom.example/j/${id}`;

beforeAll(async () => {
  at(BOUGHT);
  // The address every email link is made absolute against (production's learn host).
  process.env.APP_URL = 'https://learn.amplifiedimpact.io';
  handle = await testDatabase();
  await resetDatabase(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
  await applyDataMigrations(handle, BOUGHT);
  // The migration's own row (0012), which a reset truncates with every other table.
  await handle
    .insert(accessGroups)
    .values({
      id: 'utah-life',
      name: 'Utah Life',
      plan: 'agent_plan',
      emailDomain: 'liveutah.com',
      expiresAt: null,
      createdAt: BOUGHT,
    });
  await handle.update(cohorts).set({ previewOpensAt: PREVIEW }).where(eq(cohorts.id, 'dec26'));
  for (const s of await handle.select({ id: sessions.id }).from(sessions).where(eq(sessions.cohortId, 'dec26')))
    await handle
      .update(sessions)
      .set({ zoom: ZOOM(s.id) })
      .where(eq(sessions.id, s.id));

  await buy('owner', 'cohort', 'full', BOUGHT);
  await buy('twoPayOwner', 'cohort', 'two_pay', BOUGHT);
  await buy('insiders', 'membership', 'year_upfront', BOUGHT);
  await buy('teamPlanOwner', 'agents', 'upto15', BOUGHT);
  await addToTeam('owner', 'implementer', 'Operations Lead', 'team');
  await addToTeam('teamPlanOwner', 'teamPlanAgent', 'Agent', 'agent');

  if (!(await provisionGroupMember(handle, EMAIL.utahLife!, BOUGHT, 'Jane Doe')))
    throw new Error('the Utah Life agent was refused');
  await recordVerified(handle, EMAIL.utahLife!, BOUGHT);

  const skill = await provisionSkillBuyer(EMAIL.skillBuyer!, 'Skill Buyer', {
    db: handle,
    log: silent,
    now: BOUGHT,
    invitesFrom: Date.parse(DEFAULT_INVITES_FROM),
    invitesEnabled: false,
  });
  if (!skill.ok) throw new Error('the skill buyer was refused');
  await handle
    .insert(skillPurchases)
    .values({
      id: 'sp_dec_skill',
      userId: skill.userId,
      skillId: 'team-pnl-review',
      stripeSessionId: 'cs_dec_skill',
      amount: 3700,
      purchasedAt: BOUGHT,
    });

  // D-202: a test account with early access, made by the deploy's own step.
  const early = await seedTestMember(handle, {
    SEED_TEST_MEMBER_EMAIL: EMAIL.testEarly,
    SEED_TEST_MEMBER_PASSWORD: 'a-long-test-password-1',
    SEED_TEST_MEMBER_NAME: 'Early Tester',
    SEED_TEST_MEMBER_KIND: 'accelerator',
  });
  if (early.status !== 'created') throw new Error(`the test account was not made: ${JSON.stringify(early)}`);

  // Signed in and onboarded, so the join route's invite check is not what answers.
  await handle.update(users).set({ status: 'active' }).where(eq(users.kind, 'learner'));
  await addOtherCohorts(handle, BOUGHT);
  await relabel();
}, 120_000);

/**
 * An app at an instant, with every viewer signed in at that instant, as a learner who comes back does (a sign-in made
 * on Nov 14 has lapsed by May; that 401 would be the session's, not December's).
 */
async function appAt(t: number, options: Parameters<typeof build>[0] = { logger: false }): Promise<App> {
  at(t);
  const app = await build(options);
  for (const v of VIEWERS) cookies.set(v, await app.signInAs(userIds.get(v)!));
  return app;
}

const OFFER_CONFIG: OfferConfig = {
  stripeSecretKey: null,
  stripeWebhookSecret: null,
  open: true,
  foundingClosesAt: Date.parse(DEFAULT_FOUNDING_CLOSES_AT),
  invitesFrom: Date.parse(DEFAULT_INVITES_FROM),
  invitesEnabled: true,
  paymentLinks: Object.fromEntries(CART_IDS.map((id) => [id, `https://buy.stripe.com/test_${id}`])),
  intakeUrls: {},
  portalLoginUrl: null,
  portalLockedConfig: null,
  calendarUrls: { builds: null, officeHours: null },
  teamCallUrl: null,
  seatCapLinks: [ACCELERATOR_LINKS_LIVE.full, ACCELERATOR_LINKS_LIVE.twoPay],
  skillPriceId: null,
  skillGuestCheckout: false,
};

async function offerAt(t: number): Promise<unknown> {
  at(t);
  const app = await build({ logger: false, offer: { config: OFFER_CONFIG, stripe: null } });
  const res = await app.inject({ method: 'GET', url: '/api/offer' });
  await app.close();
  return { status: res.statusCode, body: res.json() };
}

// ---------------------------------------------------------------------------------------------------------------------
// The sections, in order: a later one may add rows an earlier one must not see
// ---------------------------------------------------------------------------------------------------------------------

describe('December does not move (R-5 § 1)', () => {
  it('December’s stored rows: the cohort, its sessions, its weeks', async () => {
    const db = await loadDb();
    const c = db.cohorts.find((x) => x.id === 'dec26')!;
    same('stored', {
      cohort: {
        id: c.id,
        name: c.name,
        start: c.start,
        end: c.end,
        weeks: c.weeks ?? null,
        status: c.status,
        capacity: c.capacity,
        cadence: c.cadence,
        previewOpensAt: c.previewOpensAt ?? null,
        timezone: c.timezone ?? null,
        defaultOpenTime: c.defaultOpenTime ?? null,
        welcomeSendsAt: c.welcomeSendsAt ?? null,
      },
      sessions: db.sessions
        .filter((s) => s.cohortId === 'dec26')
        .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id)),
      weeks: db.modules
        .filter((m) => m.kind === 'week')
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((m) => ({
          id: m.id,
          status: m.status,
          opens: m.opens,
          dueAt: m.dueAt ?? null,
          session: m.session,
          week: m.course?.week ?? null,
          course: sha(m.course ?? null),
        })),
    });
  });

  it('a completed December checkout provisions what it does today', async () => {
    const us = (await handle.select().from(users)).filter((u) => u.kind === 'learner' && ours(u.email));
    const ourUsers = new Set(us.map((u) => u.id));
    const ts = (await handle.select().from(teams)).filter((t) => ourUsers.has(t.ownerId ?? ''));
    const as = (await handle.select().from(accounts)).filter((a) => ours(a.ownerEmail));
    const ourAccounts = new Set(as.map((a) => a.id));
    const ps = (await handle.select().from(plans)).filter((p) => ourAccounts.has(p.accountId));
    const os = (await handle.select().from(orders)).filter((o) => ours(o.email ?? ''));
    const gm = (await handle.select().from(accessGroupMembers)).filter((m) => ours(m.email));
    const byId = <T extends { id: string }>(rows: T[]): T[] => rows.sort((a, b) => a.id.localeCompare(b.id));
    const out = norm({ users: us, teams: ts, accounts: as, plans: ps, orders: os, groupMembers: gm });
    same('provision', {
      users: byId(out.users),
      teams: byId(out.teams),
      accounts: byId(out.accounts),
      plans: byId(out.plans),
      orders: byId(out.orders),
      groupMembers: out.groupMembers,
    });
  });

  it('GET /api/course and the scoped snapshot, for every viewer at every instant', async () => {
    const course: Record<string, Record<string, unknown>> = {};
    const snapshot: Record<string, Record<string, unknown>> = {};
    for (const [name, t] of Object.entries(INSTANTS)) {
      const app = await appAt(t);
      course[name] = {};
      snapshot[name] = {};
      for (const v of VIEWERS) {
        const res = await app.inject({ method: 'GET', url: '/api/course', headers: { cookie: cookies.get(v)! } });
        const body = norm(res.json() as Record<string, unknown>);
        const c = body.course as
          { weeks?: { week: number; locked?: boolean; opensAt?: number | null; kit?: unknown[] }[] } | undefined;
        const outline = body.outline as { week: number; opensAt: number | null }[] | undefined;
        const ses = body.sessions as { id: string; week: number; start: number }[] | undefined;
        course[name][v] = {
          status: res.statusCode,
          open: body.open ?? null,
          error: body.error ?? null,
          weeks:
            c?.weeks?.map(
              (w) =>
                `${w.week}:${w.locked ? 'locked' : 'open'}:${w.opensAt ? iso(w.opensAt) : '-'}:kit${w.kit?.length ?? 0}`,
            ) ?? null,
          outline: outline?.map((w) => `${w.week}:${w.opensAt ? iso(w.opensAt) : '-'}`) ?? null,
          sessions: ses?.map((s) => `${s.id}:w${s.week}:${iso(s.start)}`) ?? null,
          sha: sha(body),
        };
        if (v === 'staff') continue;
        const sres = await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie: cookies.get(v)! } });
        const snap = norm(sres.json() as Partial<Db>);
        snapshot[name][v] = {
          status: sres.statusCode,
          cohorts: snap.cohorts?.map((x) => `${x.id}:${x.status}`) ?? null,
          modules: snap.modules?.map((m) => `${m.id}:${m.status}:${m.opens ? iso(m.opens) : '-'}`) ?? null,
          sessions: snap.sessions?.map((s) => s.id) ?? null,
          users: snap.users?.map((u) => u.id).sort() ?? null,
          sha: sha(snap),
        };
      }
      await app.close();
    }
    same('course', course);
    same('snapshot', snapshot);
  }, 180_000);

  it('the join route, for every viewer and each of December’s sessions at every instant', async () => {
    const ids = (await handle.select({ id: sessions.id }).from(sessions).where(eq(sessions.cohortId, 'dec26')))
      .map((s) => s.id)
      .sort();
    const join: Record<string, Record<string, Record<string, string>>> = {};
    for (const [name, t] of Object.entries(INSTANTS)) {
      const app = await appAt(t);
      join[name] = {};
      for (const v of VIEWERS) {
        join[name][v] = {};
        for (const id of ids) {
          const res = await app.inject({
            method: 'GET',
            url: `/api/sessions/${id}/join`,
            headers: { cookie: cookies.get(v)! },
          });
          const body = res.json() as { url?: string; error?: string };
          join[name][v][id] =
            `${res.statusCode} ${body.url !== undefined ? `url=${body.url}` : (body.error ?? '').split(id).join('<id>')}`;
        }
      }
      await app.close();
    }
    same('join', join);
  }, 300_000);

  it('the five reminders: who each goes to, and when (hour by hour, Nov 20 to Feb 20)', async () => {
    const db = await loadDb();
    const roster = await acceleratorRoster(handle);
    const sent = new Set<string>();
    const sends: string[] = [];
    for (let t = MT('2026-11-20T00:00:00'); t <= MT('2027-02-20T00:00:00'); t += 3600_000) {
      for (const s of dueWork(db, t, sent, roster).sends) {
        sent.add(s.key);
        // December's: to one of December's people, or about one of December's sessions.
        if (!ours(s.to) && !s.key.includes('dec26')) continue;
        sends.push(`${norm(`${iso(t)} ${s.job} ${s.template} ${s.key} -> ${s.to}`)} ${sha(norm(s.data))}`);
      }
    }
    same('reminders', sends);
  }, 120_000);

  it('the offer: seat numbers and cart states', async () => {
    const api: Record<string, unknown> = {};
    for (const [name, t] of Object.entries(INSTANTS)) api[name] = await offerAt(t);
    const states: Record<string, unknown> = {};
    for (const [name, t] of Object.entries({ before: INSTANTS['in-preview']!, after: INSTANTS['dec2-build']! }))
      for (const sold of [0, 14, 15, 16]) states[`${name}:${sold}`] = cartStates(OFFER_CONFIG, t, sold);
    same('offer', { api, states });
  }, 60_000);

  it('the calendar feeds', async () => {
    at(INSTANTS['in-preview']!);
    same('calendar', await calendarFiles());
  });

  it('the held invites, the cohort welcome and Week 0 Is Open: who, and when (every three hours, Nov 13 to Dec 20)', async () => {
    resetOutbox();
    const mail: string[] = [];
    let seen = 0;
    let late = false;
    for (let t = MT('2026-11-13T00:00:00'); t <= MT('2026-12-20T00:00:00'); t += 3 * 3600_000) {
      at(t);
      if (t >= SWITCHES_ON) {
        const flags = await handle.select({ key: consoleFlags.key }).from(consoleFlags);
        for (const key of [COHORT_WELCOME_FLAG, WEEK0_OPEN_FLAG])
          if (!flags.some((f) => f.key === key))
            await handle
              .insert(consoleFlags)
              .values({
                key,
                on: true,
                sensitive: false,
                updatedAt: SWITCHES_ON,
                updatedBy: 'st_owner',
                turnedOnAt: SWITCHES_ON,
              });
      }
      if (!late && t >= LATE) {
        late = true;
        await buy('late', 'cohort', 'full', LATE);
        await handle.update(users).set({ status: 'active' }).where(eq(users.email, EMAIL.late!));
        await relabel();
      }
      // The billing loop's order (jobs/billing.ts).
      await sendHeldInvites({ db: handle, log: silent, now: t, invitesFrom: Date.parse(DEFAULT_INVITES_FROM) });
      await sendDueWelcomes({ db: handle, log: silent, now: t });
      await sendWeek0Open({ db: handle, log: silent, now: t });
      const box = outbox();
      for (const e of box.slice(seen)) {
        // December's: to one of December's people, or naming December.
        if (!ours(e.to) && !/December|dec26/.test(`${e.subject} ${JSON.stringify(e.data)}`)) continue;
        mail.push(`${norm(`${iso(t)} ${e.template} -> ${e.to} "${e.subject}"`)} ${sha(norm(e.data))}`);
      }
      seen = box.length;
    }
    const ourIds = new Set([...userIds.values()]);
    const enrollments = norm((await handle.select().from(cohortEnrollments)).filter((e) => ourIds.has(e.userId)));
    same('emails', { mail, enrollments: enrollments.sort((a, b) => a.userId.localeCompare(b.userId)) });
  }, 300_000);

  it('the seat cap: December’s 14th, 15th and 16th seat, and its two Payment Links', async () => {
    resetSeatCapLogForTests();
    const links = new Map<string, PaymentLinkInfo>([
      [
        ACCELERATOR_LINKS_LIVE.full,
        { id: ACCELERATOR_LINKS_LIVE.full, active: true, metadata: { ai_plan: 'cohort', ai_option: 'full' } },
      ],
      [
        ACCELERATOR_LINKS_LIVE.twoPay,
        { id: ACCELERATOR_LINKS_LIVE.twoPay, active: true, metadata: { ai_plan: 'cohort', ai_option: 'two_pay' } },
      ],
    ]);
    const calls: { id: string; change: PaymentLinkChange; key: string }[] = [];
    const stripe = {
      retrievePaymentLink: async (id: string) => structuredClone(links.get(id)!),
      updatePaymentLink: async (id: string, change: PaymentLinkChange, key: string) => {
        calls.push({ id, change, key });
        const l = links.get(id)!;
        const next = { ...l, active: change.active, metadata: { ...l.metadata, ...(change.metadata ?? {}) } };
        links.set(id, next);
        return next;
      },
    } as unknown as BillingStripe;
    const reconcile = (t: number) =>
      reconcileAcceleratorSeats({ stripe, config: OFFER_CONFIG, now: t, log: silent, db: handle });
    const seats = async (t: number) => {
      const o = (await offerAt(t)) as { body: { seats: unknown; carts: { id: string; state: string }[] } };
      return {
        seats: o.body.seats,
        carts: o.body.carts.filter((c) => c.id.startsWith('cohort')).map((c) => `${c.id}:${c.state}`),
      };
    };
    const open = INSTANTS['in-preview']!;
    const closed = INSTANTS['dec2-build']!;
    const steps: unknown[] = [];
    // The owner, the two-pay owner and the late buyer hold three seats (the test account is not a seat, D-202).
    for (let n = 4; n <= 16; n++) {
      const label = `seat${String(n).padStart(2, '0')}`;
      EMAIL[label] = `${label}@example.test`;
      const logged = await buy(label, 'cohort', n % 2 ? 'two_pay' : 'full', BOUGHT + n * 60_000);
      await relabel();
      if (n >= 14) steps.push({ bought: label, logged, reconcile: await reconcile(open), offer: await seats(open) });
    }
    // Two refunds end two plans (D-154 frees a seat): back to 14. With founding closed the links stay off; open, they reopen.
    const freed = (
      await handle
        .select({ id: plans.id })
        .from(plans)
        .innerJoin(accounts, eq(plans.accountId, accounts.id))
        .where(inArray(accounts.ownerEmail, [EMAIL.seat15!, EMAIL.seat16!]))
    ).map((p) => p.id);
    await handle.update(plans).set({ status: 'ended' }).where(inArray(plans.id, freed));
    steps.push({ freed: 2, reconcile: await reconcile(closed), offer: await seats(closed) });
    steps.push({ reopened: true, reconcile: await reconcile(open), offer: await seats(open) });
    same('seat-cap', { steps, calls });
  }, 120_000);
});
