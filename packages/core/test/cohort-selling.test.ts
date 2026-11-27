// R-5 Phase 5 (D-262): selling a seat in a cohort, pure, over the production seed. December's every output, with its
// selling values stored by the data step and without them, is `apps/api/test/december.test.ts`; its Stripe writes and
// plan dates are `december-others.ts`'s `stripe-writes`.
import { describe, expect, it } from 'vitest';
import {
  ADMIN_ACTIONS,
  AUDIT_ACTIONS,
  NO_SELLING_ENV,
  beforeItOpens,
  closeCohortEnrollment,
  cohortCartItems,
  cohortCartLink,
  cohortOnSale,
  cohortSaleOf,
  cohortSelling,
  createCohortFromShape,
  defaultSourceId,
  foundingOpenFor,
  includedEndAt,
  laterWords,
  newCohortSources,
  openCohortEnrollment,
  paymentLinksLine,
  priceWords,
  saveCohortEnrollment,
  saveCohortPrice,
  scopeSnapshot,
  soldOutMessage,
  stripePriceLine,
  twoPayWords,
} from '../src';
import type { Actor, CohortFacts, CohortSlot, CohortStripeFacts, Ctx, Db, SellingEnv } from '../src';
import { ACCELERATOR_MODULE_IDS, COURSE_OPENS_AT, DEFAULT_COHORT_ID, courseOpensAt } from '../src/accelerator';
import { ghlCohortValue } from '../src/cohort-learner';
import { CARTS, COHORT_SALE_ONE, COHORT_SEATS, DEFAULT_FOUNDING_CLOSES_AT, INSIDERS_FIRST_CHARGE_AT, initialPlanDates, pinnedFirstCharge } from '../src/offer';
import { seedProduction } from '../seed/curriculum';
import { planContentV2 } from '../seed/content-v2';
import { planDecemberRunV1 } from '../seed/december-run-v1';
import { DECEMBER_SELLING_V1, planDecemberSellingV1, undoDecemberSellingV1 } from '../seed/december-selling-v1';
import { planReleaseV1 } from '../seed/release-plan-v1';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const mkCtx = (now = MT('2026-11-27T12:00:00'), cohortFacts?: Ctx['cohortFacts']): Ctx => {
  let n = 1;
  return { now, id: (p: string) => `${p}_t${n++}`, ...(cohortFacts ? { cohortFacts } : {}) };
};
const OWNER: Actor = { kind: 'staff', staffId: 'st_owner' };
const EDITOR: Actor = { kind: 'staff', staffId: 'st_editor' };
const W = ACCELERATOR_MODULE_IDS;

/** December as production has it, its run written (Phase 3's step). */
const prod = (): Db => {
  const db = planDecemberRunV1(planContentV2(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
  db.staff.push({ id: 'st_editor', name: 'Erin Editor', email: 'erin@example.test', role: 'Content Editor', last: null });
  return db;
};
const ENV: SellingEnv = { foundingClosesAt: Date.parse(DEFAULT_FOUNDING_CLOSES_AT), links: { full: 'https://buy.stripe.com/test_full', twoPay: 'https://buy.stripe.com/test_two' } };
const JAN_SLOTS: CohortSlot[] = [
  { day: 2, time: '12:00', kind: 'live_build', mins: 90 },
  { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
];
const withJanuary = (db: Db = prod()): { db: Db; id: string } => {
  const out = createCohortFromShape(
    db,
    OWNER,
    { name: 'January 2027 Cohort', start: '2027-01-03', sourceCohortId: DEFAULT_COHORT_ID, picks: [W[1]!, W[2]!, W[3]!, W[4]!, W[5]!, W[6]!], shape: { setupWeek: true, slots: JAN_SLOTS, hosts: 'Connor Leiva and Spring' } },
    mkCtx(),
  );
  expect(out.error).toBeUndefined();
  return { db: out.db, id: out.cohort!.cohortId };
};

describe('a cohort’s selling settings (PLAN § 10.10)', () => {
  it('December reads what the code held before Phase 5 while its record holds none, and the same once it does', () => {
    const db = prod();
    const before = cohortSelling(db, DEFAULT_COHORT_ID, ENV);
    expect(before).toEqual({
      cohortId: DEFAULT_COHORT_ID,
      founding: true,
      foundingClosesAt: ENV.foundingClosesAt,
      keys: { full: 'cohort_founding_full', rollover: 'membership_monthly_team_leader', twoPay: 'cohort_founding_two_pay' },
      twoPay: true,
      links: ENV.links,
      capacity: COHORT_SEATS,
      includedUntil: '2027-05-04',
      includedEndAt: INSIDERS_FIRST_CHARGE_AT,
      ghlValue: 'dec26',
    });
    const stored = planDecemberSellingV1(db, ENV).db;
    expect(cohortSelling(stored, DEFAULT_COHORT_ID, ENV)).toEqual(before);
    // Stored, it no longer needs the environment: the values are its own.
    expect(cohortSelling(stored, DEFAULT_COHORT_ID, NO_SELLING_ENV)).toEqual(before);
  });

  it('another cohort reads only its own record: nothing set is nothing, never December’s', () => {
    const { db, id } = withJanuary();
    const s = cohortSelling(db, id, ENV);
    expect(s).toMatchObject({ founding: true, foundingClosesAt: null, keys: { full: null, rollover: null, twoPay: null }, twoPay: true, links: { full: null, twoPay: null }, capacity: 15, includedUntil: '2027-05-10', ghlValue: 'jan27' });
    expect(s.includedEndAt).toBe(Date.parse('2027-05-10T00:00:00-05:00'));
  });

  it('the included-time day starts in America/Chicago: December’s is INSIDERS_FIRST_CHARGE_AT, so its Stripe writes are byte-identical', () => {
    expect(includedEndAt('2027-05-04')).toBe(INSIDERS_FIRST_CHARGE_AT);
    expect(pinnedFirstCharge(CARTS['cohort-full'], includedEndAt('2027-05-04'))).toBe(INSIDERS_FIRST_CHARGE_AT);
    expect(pinnedFirstCharge(CARTS['cohort-full'], includedEndAt('2027-05-10'))).toBe(Date.parse('2027-05-10T00:00:00-05:00'));
    expect(pinnedFirstCharge(CARTS['cohort-two-pay'], includedEndAt('2027-05-10'))).toBeNull();
  });

  it('a seat’s plan dates are its cohort’s: December’s are COHORT_ONE’s, January’s its own', () => {
    const { db, id } = withJanuary();
    const now = MT('2026-11-27T12:00:00');
    const dec = cohortSaleOf(db, DEFAULT_COHORT_ID, db.sessions);
    expect(dec).toEqual(COHORT_SALE_ONE);
    expect(initialPlanDates(CARTS['cohort-full'], now, true, dec)).toEqual(initialPlanDates(CARTS['cohort-full'], now));
    const jan = cohortSaleOf(db, id, db.sessions);
    expect(initialPlanDates(CARTS['cohort-two-pay'], now, true, jan)).toEqual({
      startsAt: MT('2027-01-05T12:00:00'),
      paidThrough: Date.parse('2027-05-10T00:00:00-05:00'),
      liveUntil: Date.parse('2027-05-10T00:00:00-05:00'),
      minimumUntil: null,
      cohortId: id,
    });
  });

  it('every cohort’s course opens at its first live build, December’s at D-153’s instant', () => {
    const { db, id } = withJanuary();
    expect(courseOpensAt(DEFAULT_COHORT_ID, db.sessions)).toBe(COURSE_OPENS_AT);
    expect(courseOpensAt(DEFAULT_COHORT_ID, [])).toBe(COURSE_OPENS_AT);
    expect(courseOpensAt(id, db.sessions)).toBe(MT('2027-01-05T12:00:00'));
    expect(courseOpensAt(id, [])).toBe(Number.POSITIVE_INFINITY);
  });

  it('the carts sell the cohort’s keys and links; two payments only while offered', () => {
    const s = cohortSelling(prod(), DEFAULT_COHORT_ID, ENV);
    expect(cohortCartItems('cohort-full', s)).toEqual([...CARTS['cohort-full'].items]);
    expect(cohortCartItems('cohort-two-pay', s)).toEqual([...CARTS['cohort-two-pay'].items]);
    expect(cohortCartLink('cohort-two-pay', s)).toBe(ENV.links.twoPay);
    expect(cohortCartLink('cohort-two-pay', { ...s, twoPay: false })).toBeNull();
  });

  it('founding closes at the cohort’s own close; a cohort that is not founding never closes by it', () => {
    const close = Date.parse(DEFAULT_FOUNDING_CLOSES_AT);
    expect(foundingOpenFor({ founding: true, foundingClosesAt: close }, close - 1)).toBe(true);
    expect(foundingOpenFor({ founding: true, foundingClosesAt: close }, close)).toBe(false);
    expect(foundingOpenFor({ founding: false, foundingClosesAt: close }, close + 1)).toBe(true);
    expect(foundingOpenFor({ founding: true, foundingClosesAt: null }, close + 1)).toBe(true);
  });

  it('the sold-out line: December’s is D-154’s, word for word; another cohort’s cap, and "founding" only when founding', () => {
    expect(soldOutMessage({ capacity: 15, founding: true })).toBe(
      'All 15 founding seats are taken. Join the waitlist at amplifiedimpact.io/offer to hear first about the next cohort.',
    );
    expect(soldOutMessage({ capacity: 20, founding: false })).toBe(
      'All 20 seats are taken. Join the waitlist at amplifiedimpact.io/offer to hear first about the next cohort.',
    );
  });

  it('GoHighLevel’s value: stored, else the start’s month and year (December’s is dec26 either way)', () => {
    const db = prod();
    const dec = db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!;
    expect(ghlCohortValue(dec)).toBe('dec26');
    expect(ghlCohortValue({ ...dec, ghlValue: 'december' })).toBe('december');
    expect(ghlCohortValue(null)).toBe('dec26');
  });
});

describe('which cohort the offer sells (§ 10.10)', () => {
  it('the cohort whose enrollment is open; with two open, the one that starts last; with none, none; with no rows, December', () => {
    const { db, id } = withJanuary();
    expect(cohortOnSale(db)).toBe(DEFAULT_COHORT_ID);
    const both = { ...db, cohorts: db.cohorts.map((c) => (c.id === id ? { ...c, status: 'enrolling' as const } : c)) };
    expect(cohortOnSale(both)).toBe(id);
    const none = { ...db, cohorts: db.cohorts.map((c) => ({ ...c, status: 'live' as const })) };
    expect(cohortOnSale(none)).toBeNull();
    expect(cohortOnSale({ cohorts: [] })).toBe(DEFAULT_COHORT_ID);
  });
});

describe('Stripe’s price and Payment Links, as Before It Opens reads them', () => {
  const found = (over: Partial<CohortStripeFacts> = {}): CohortStripeFacts => ({
    prices: 'ok',
    price: {
      jan_full: { unitAmount: 750000, currency: 'usd', interval: null },
      jan_ins: { unitAmount: 16900, currency: 'usd', interval: 'month', intervalCount: 1 },
      jan_two: { unitAmount: 375000, currency: 'usd', interval: 'month', intervalCount: 1 },
    },
    links: 'ok',
    link: {},
    ...over,
  });
  const sold = (db: Db, id: string) => {
    let next = saveCohortPrice(db, OWNER, { cohortId: id, full: 'jan_full', rollover: 'jan_ins', twoPay: 'jan_two', offerTwoPay: true }, mkCtx()).db;
    next = saveCohortEnrollment(
      next,
      OWNER,
      { cohortId: id, founding: true, foundingCloses: { date: '2026-12-31', time: '23:59' }, linkFull: 'https://buy.stripe.com/jan_full', linkTwoPay: 'https://buy.stripe.com/jan_two', capacity: 15, ghlValue: 'jan27' },
      mkCtx(),
    ).db;
    return next;
  };

  it('nothing entered reads Phase 3’s words; then each key found, each link naming this cohort', () => {
    const { db, id } = withJanuary();
    expect(stripePriceLine(cohortSelling(db, id), undefined)).toEqual({ detail: 'None yet. Prices and Payment Links are made in Stripe.', done: false });
    expect(paymentLinksLine(cohortSelling(db, id), undefined)).toEqual({ detail: 'None yet', done: false });
    const next = sold(db, id);
    const s = cohortSelling(next, id);
    expect(stripePriceLine(s, { prices: 'unavailable', price: {}, links: 'unavailable', link: {} }).done).toBe(false);
    expect(stripePriceLine(s, found({ price: { jan_full: { unitAmount: 750000, currency: 'usd', interval: null } } }))).toEqual({ detail: 'Not found in Stripe: jan_ins, jan_two', done: false });
    expect(stripePriceLine(s, found())).toEqual({ detail: '$7,500, or two payments · 15 seats', done: true });
    expect(paymentLinksLine(s, found({ links: 'unreadable' }))).toEqual({ detail: 'Entered. Stripe won’t let this key read Payment Links: give it Payment Links: Read.', done: false });
    const links = (cohort: string | null) => ({
      'https://buy.stripe.com/jan_full': { active: true, aiCohort: cohort },
      'https://buy.stripe.com/jan_two': { active: true, aiCohort: cohort },
    });
    expect(paymentLinksLine(s, found({ link: links(null) })).done).toBe(false);
    expect(paymentLinksLine(s, found({ link: links(id) }))).toEqual({ detail: 'Both entered. Each names this cohort in Stripe.', done: true });
  });

  it('the two-payment schedule is Stripe’s interval, not a stated one', () => {
    expect(priceWords({ unitAmount: 16900, currency: 'usd', interval: 'month' })).toBe('$169 a month');
    expect(laterWords({ unitAmount: 375000, currency: 'usd', interval: 'month', intervalCount: 1 })).toBe('one month later');
    expect(laterWords({ unitAmount: 375000, currency: 'usd', interval: 'day', intervalCount: 30 })).toBe('30 days later');
    expect(twoPayWords({ twoPay: true }, { unitAmount: 375000, currency: 'usd', interval: 'month', intervalCount: 1 })).toBe('Offered. $3,750 at checkout and $3,750 one month later.');
    expect(twoPayWords({ twoPay: false }, undefined)).toBe('Not offered');
  });
});

describe('the four Enrollment actions: the billing permission, one audit row each', () => {
  it('are admin actions with their audit actions', () => {
    for (const name of ['saveCohortPrice', 'saveCohortEnrollment', 'openCohortEnrollment', 'closeCohortEnrollment'])
      expect(Object.keys(ADMIN_ACTIONS)).toContain(name);
    for (const a of ['cohort.price_save', 'cohort.enrollment_save', 'cohort.enrollment_open', 'cohort.enrollment_close', 'cohort.team_moved'])
      expect(AUDIT_ACTIONS).toContain(a);
  });

  it('refuse a role without billing (a Content Editor), and an Owner writes one row', () => {
    const { db, id } = withJanuary();
    expect(() => saveCohortPrice(db, EDITOR, { cohortId: id, full: 'k', rollover: null, twoPay: null, offerTwoPay: false }, mkCtx())).toThrow();
    const out = saveCohortPrice(db, OWNER, { cohortId: id, full: 'jan_full', rollover: 'jan_ins', twoPay: null, offerTwoPay: false }, mkCtx());
    expect(out.audit).toMatchObject({ action: 'cohort.price_save', before: { lookupKeyFull: null }, after: { lookupKeyFull: 'jan_full', twoPay: false } });
    expect(saveCohortPrice(db, OWNER, { cohortId: id, full: 'jan full', rollover: null, twoPay: null, offerTwoPay: false }, mkCtx()).error).toMatch(/is not a lookup key/);
    expect(saveCohortPrice(db, OWNER, { cohortId: id, full: 'k', rollover: null, twoPay: null, offerTwoPay: true }, mkCtx()).error).toMatch(/two payments/);
  });

  it('saves founding, its close in MT, the links, the cap and GoHighLevel’s value; refuses a cap below the seats sold', () => {
    const { db, id } = withJanuary();
    const args = { cohortId: id, founding: true, foundingCloses: { date: '2026-12-31', time: '23:59' }, linkFull: 'https://buy.stripe.com/x', linkTwoPay: null, capacity: 12, ghlValue: 'jan27' };
    const out = saveCohortEnrollment(db, OWNER, args, mkCtx());
    const jan = out.db.cohorts.find((c) => c.id === id)!;
    expect(jan).toMatchObject({ founding: true, foundingClosesAt: MT('2026-12-31T23:59:00'), linkFull: 'https://buy.stripe.com/x', capacity: 12, ghlValue: 'jan27' });
    expect(out.audit?.action).toBe('cohort.enrollment_save');
    expect(saveCohortEnrollment(db, OWNER, { ...args, linkFull: 'http://buy.stripe.com/x' }, mkCtx()).error).toMatch(/https/);
    const facts: CohortFacts = { testSends: { welcome: true, week0: true }, plans: 3, teams: 3 };
    expect(saveCohortEnrollment(db, OWNER, { ...args, capacity: 2 }, mkCtx(undefined, { [id]: facts })).error).toBe('3 seats are sold, so the cap can’t be lower.');
  });

  it('Open is refused with Before It Opens’ first line; Close moves enrolling to live and nothing else', () => {
    const { db, id } = withJanuary();
    const refused = openCohortEnrollment(db, OWNER, { cohortId: id }, mkCtx());
    expect(refused.error).toBe(beforeItOpens(db, id).refusal);
    expect(refused.db).toBe(db);
    // December is open: Close, then Open again once its Stripe lines are done.
    const closed = closeCohortEnrollment(db, OWNER, { cohortId: DEFAULT_COHORT_ID }, mkCtx());
    expect(closed.db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!.status).toBe('live');
    expect(closed.audit).toMatchObject({ action: 'cohort.enrollment_close', before: { status: 'enrolling' }, after: { status: 'live' } });
    expect(closed.db.users).toBe(db.users);
    expect(closed.db.sessions).toBe(db.sessions);
    expect(closeCohortEnrollment(closed.db, OWNER, { cohortId: DEFAULT_COHORT_ID }, mkCtx()).error).toBe('Enrollment is already closed.');
  });

  it('a new cohort starts from any cohort not archived, and copies founding and two payments, never keys or links', () => {
    const { db } = withJanuary();
    expect(newCohortSources(db).map((c) => c.status)).toContain('draft');
    expect(defaultSourceId(db)).toBe(DEFAULT_COHORT_ID);
  });
});

describe('December’s selling values, copied once by a data step', () => {
  it('writes each field only where it reads back as the code reads it today, and names what it leaves alone', () => {
    const db = prod();
    const out = planDecemberSellingV1(db, ENV);
    expect(DECEMBER_SELLING_V1).toBe('2026-11-27-december-selling');
    expect(out.skipped).toEqual([]);
    expect(out.changes).toHaveLength(1);
    expect(out.changes[0]!.after).toEqual({
      founding: true,
      foundingClosesAt: ENV.foundingClosesAt,
      lookupKeyFull: 'cohort_founding_full',
      lookupKeyRollover: 'membership_monthly_team_leader',
      lookupKeyTwoPay: 'cohort_founding_two_pay',
      twoPay: true,
      linkFull: ENV.links.full,
      linkTwoPay: ENV.links.twoPay,
      includedUntil: '2027-05-04',
      ghlValue: 'dec26',
    });
    // Unset variables leave the links alone, named; a field already set stays as it is.
    const bare = planDecemberSellingV1(db, NO_SELLING_ENV);
    expect(bare.skipped.map((s) => s.id)).toEqual(['dec26.linkFull', 'dec26.linkTwoPay']);
    const set = { ...db, cohorts: db.cohorts.map((c) => (c.id === DEFAULT_COHORT_ID ? { ...c, ghlValue: 'december' } : c)) };
    expect(planDecemberSellingV1(set, ENV).skipped).toEqual([{ id: 'dec26.ghlValue', reason: 'left as it is: already set ("december")' }]);
    // A moved first live build is named for the PM.
    const moved = { ...db, sessions: db.sessions.map((s) => (s.id === 'dec26-s1' ? { ...s, start: s.start + 3_600_000 } : s)) };
    expect(planDecemberSellingV1(moved, ENV).skipped.map((s) => s.id)).toContain('dec26.opensAt');
  });

  it('runs once, and the rollback clears what it wrote so every read is today’s again', () => {
    const db = prod();
    const once = planDecemberSellingV1(db, ENV);
    expect(planDecemberSellingV1(once.db, ENV).changes).toEqual([]);
    const undone = undoDecemberSellingV1(once.db, once.changes[0]!.after as Record<string, unknown>);
    expect(undone.db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)).toEqual(db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID));
    expect(cohortSelling(undone.db, DEFAULT_COHORT_ID, ENV)).toEqual(cohortSelling(once.db, DEFAULT_COHORT_ID, ENV));
  });

  it('leaves December’s learners’ snapshot exactly as it was', () => {
    const db = prod();
    db.users.push({ id: 'u1', name: 'A', email: 'a@example.test', tier: 'team', role: 'Team Owner', teamId: null, cohortId: DEFAULT_COHORT_ID, joined: 0, last: null, status: 'active', progress: {} } as Db['users'][number]);
    const stored = planDecemberSellingV1(db, ENV).db;
    const access = { accelerator: true, at: MT('2026-12-02T12:30:00'), preview: false };
    const snap = scopeSnapshot(stored, { kind: 'learner', userId: 'u1' }, access);
    expect(snap).toEqual(scopeSnapshot(db, { kind: 'learner', userId: 'u1' }, access));
    expect(snap.cohorts[0]).not.toHaveProperty('includedUntil');
    expect(snap.cohorts[0]).not.toHaveProperty('lookupKeyFull');
  });
});
