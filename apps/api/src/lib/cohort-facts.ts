// R-5 Phase 3 (D-255): what the Cohort page needs to know about a cohort that the snapshot does not hold.
//
//   testSends   whether each of the two test sends went out for this cohort: an `ok` row of `welcome.test_send` and of
//               `week0.test_send` in `audit_log`, targeting the cohort (PLAN.md § 10.3: no new table).
//   plans       cohort plans placed in it, any status, not a test account's (D-202): a seat sold. Once there is one,
//               its included time is frozen (Q-22).
//   teams       its Teams by the spec's rule 2, the one rule (R-5 audit, D-267, `cohortRoster`): teams whose newest live
//               `cohort` plan is for it, test accounts left out. A comp's team is placed like any seat.
//   learners    the people on those teams of kind learner who are not test accounts.
//   intake      of those teams, how many have not started their intake (no `team_intake` row), and how many sent one
//               that did not reach GoHighLevel (`ghl_sync_status` is `failed`): the "Needs you" rows.
//   readiness   of those teams, how many have someone signed in, their intake submitted, and are paid in full.
//   secondPayments  R-5 audit (D-267): of those teams' two-payment seats, the second payments still to come: how many,
//               each one's amount when they agree, and the next one's date (`secondPaymentAt`, a month after the first).
//
//   teamRows    R-5 Phase 7 (D-268): one row per roster team for Cohort › People: its live cohort plan's payment (paid in
//               full, on two payments with how many made, or a comp) and its intake (submitted, a draft, not started).
//
//   stripe      R-5 Phase 5 (D-262): what Stripe says about the cohort's lookup keys (its active price under each, through
//               the price cache, `PriceBook`) and its Payment Links (each stored address found in Stripe, and the cohort
//               its metadata names, `ai_cohort`). Read only: Prices: Read and Payment Links: Read on the restricted key.
//
// Read-only. "Before it opens" (`beforeItOpens` in `@ai/core`) reads these beside the snapshot, and so does Open
// enrollment's refusal, so the checklist and the refusal cannot drift. Two booleans and counts; no names.

import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { secondPaymentAt } from '@ai/core';
import type { CohortFacts, CohortRoster } from '@ai/core';
import type { CohortStripeFacts, StripeLink, StripePrice } from '@ai/core/cohort-selling';
import type { Database } from '../db/client';
import { accounts, auditLog, orders, plans, teamIntake, users } from '../db/schema';
import { envOf, sellingOf } from '../billing/cohort-sale';
import type { OfferConfig } from '../billing/config';
import type { PriceCache } from '../billing/prices';
import type { BillingStripe } from '../billing/stripe';
import { cohortRoster } from './cohort-roster';

type Reader = Pick<Database, 'select'>;

/** What Stripe says about one cohort's keys and links, read only. */
export type StripeFactsReader = (db: Reader, cohortId: string) => Promise<CohortStripeFacts>;

const isPermission = (err: unknown): boolean => {
  const e = err as { statusCode?: number; type?: string; raw?: { statusCode?: number } };
  return e?.statusCode === 403 || e?.raw?.statusCode === 403 || e?.type === 'StripePermissionError';
};

/**
 * R-5 Phase 5 (D-262): the reader the facts route and Open enrollment use. With no Stripe key, both halves are
 * `unavailable`. A key that may not read Payment Links makes the links `unreadable`, which Before It Opens says.
 */
export function stripeFactsReader(deps: {
  stripe: BillingStripe | null;
  prices: PriceCache;
  config: Pick<OfferConfig, 'foundingClosesAt' | 'paymentLinks'>;
  now: () => number;
}): StripeFactsReader {
  return async (db, cohortId) => {
    const selling = await sellingOf(db, cohortId, envOf(deps.config));
    const keys = [selling.keys.full, selling.keys.rollover, selling.twoPay ? selling.keys.twoPay : null].filter((k): k is string => !!k);
    const urls = [selling.links.full, selling.twoPay ? selling.links.twoPay : null].filter((u): u is string => !!u);
    const out: { prices: CohortStripeFacts['prices']; price: Record<string, StripePrice | null>; links: CohortStripeFacts['links']; link: Record<string, StripeLink | null> } =
      { prices: 'unavailable', price: {}, links: 'unavailable', link: {} };
    if (!deps.stripe) return out;
    try {
      const got = keys.length ? await deps.prices.lookup?.(keys, deps.now()) : {};
      if (got) {
        out.prices = 'ok';
        for (const k of keys) {
          const p = got[k];
          out.price[k] = p ? { unitAmount: p.unitAmount, currency: p.currency, interval: p.interval, intervalCount: p.intervalCount ?? null } : null;
        }
      }
    } catch {
      out.prices = 'unavailable';
    }
    try {
      if (!deps.stripe.paymentLinksByUrl) out.links = 'unavailable';
      else {
        const found = urls.length ? await deps.stripe.paymentLinksByUrl(urls) : new Map();
        out.links = 'ok';
        for (const u of urls) {
          const l = found.get(u);
          out.link[u] = l ? { active: l.active, aiCohort: l.metadata.ai_cohort ?? null } : null;
        }
      }
    } catch (err) {
      out.links = isPermission(err) ? 'unreadable' : 'unavailable';
    }
    return out;
  };
}

const notTest = sql`not exists (
  select 1 from ${accounts} a
  join ${users} u on u.id = a.owner_user_id
  where a.id = ${plans.accountId} and u.is_test
)`;

/** A comp is not a seat sold and not paid in full (the same counts a test account is left out of). */
const notComp = sql`not exists (
  select 1 from ${orders} o
  where o.id = ${plans.orderId} and o.origin = 'comp'
)`;

export async function cohortFactsOf(db: Reader, cohortId: string, stripe?: StripeFactsReader, known?: CohortRoster): Promise<CohortFacts> {
  const sends = await db
    .select({ action: auditLog.action })
    .from(auditLog)
    .where(
      and(
        inArray(auditLog.action, ['welcome.test_send', 'week0.test_send']),
        eq(auditLog.outcome, 'ok'),
        eq(auditLog.targetType, 'cohort'),
        eq(auditLog.targetId, cohortId),
      ),
    );
  const sold = await db
    .select({ status: plans.status, option: plans.option, teamId: accounts.teamId })
    .from(plans)
    .innerJoin(accounts, eq(accounts.id, plans.accountId))
    .where(and(eq(plans.kind, 'cohort'), eq(plans.cohortId, cohortId), notTest, notComp));
  // R-5 audit (D-267): its teams and learners are the one rule's (`cohortRoster`): a team is in one cohort at a time
  // (Q-23), a comp's team is placed like any seat, and an access group's member is in none.
  const roster = (known ?? (await cohortRoster(db)))[cohortId] ?? { teams: [], learners: [] };
  const live = roster.teams;
  const inRoster = new Set(live);
  const people = roster.learners.length
    ? await db.select({ id: users.id, teamId: users.teamId, last: users.last }).from(users).where(inArray(users.id, roster.learners))
    : [];
  // R-5 audit (D-267): the second payments still to come on its two-payment seats in the roster (not a comp, not a test
  // account's): Needs You's "2 second payments are on the calendar".
  const twoPay = live.length
    ? await db
        .select({ teamId: accounts.teamId, paymentsMade: orders.paymentsMade, amountTotal: orders.amountTotal, paidAt: orders.paidAt, createdAt: orders.createdAt })
        .from(plans)
        .innerJoin(accounts, eq(accounts.id, plans.accountId))
        .innerJoin(orders, eq(orders.id, plans.orderId))
        .where(and(eq(plans.kind, 'cohort'), eq(plans.cohortId, cohortId), eq(plans.option, 'two_pay'), ne(plans.status, 'ended'), notTest, notComp))
    : [];
  const owed = twoPay.filter((p) => inRoster.has(p.teamId) && (p.paymentsMade ?? 0) === 1);
  const amounts = [...new Set(owed.map((p) => p.amountTotal))];
  const dues = owed.map((p) => secondPaymentAt(Number(p.paidAt ?? p.createdAt)));
  const intake = live.length
    ? await db
        .select({ teamId: teamIntake.teamId, ghl: teamIntake.ghlSyncStatus, submittedAt: teamIntake.submittedAt })
        .from(teamIntake)
        .where(inArray(teamIntake.teamId, live))
    : [];
  // R-5 Phase 7 (D-268): each roster team's live cohort plan for this cohort (a comp included: it is placed like any seat).
  const seats = live.length
    ? await db
        .select({ teamId: accounts.teamId, option: plans.option, origin: orders.origin, paymentsMade: orders.paymentsMade, createdAt: plans.createdAt })
        .from(plans)
        .innerJoin(accounts, eq(accounts.id, plans.accountId))
        .leftJoin(orders, eq(orders.id, plans.orderId))
        .where(and(eq(plans.kind, 'cohort'), eq(plans.cohortId, cohortId), ne(plans.status, 'ended'), inArray(accounts.teamId, live)))
    : [];
  const teamRows: NonNullable<CohortFacts['teamRows']> = {};
  for (const t of live) {
    const seat = seats.filter((p) => p.teamId === t).sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
    const row = intake.find((r) => r.teamId === t);
    teamRows[t] = {
      pay: !seat ? null : seat.origin === 'comp' ? 'comp' : seat.option === 'two_pay' ? 'two_pay' : 'full',
      paymentsMade: Number(seat?.paymentsMade ?? 0),
      intake: !row ? 'not_started' : row.submittedAt !== null ? 'submitted' : 'draft',
    };
  }
  return {
    testSends: {
      welcome: sends.some((s) => s.action === 'welcome.test_send'),
      week0: sends.some((s) => s.action === 'week0.test_send'),
    },
    plans: sold.length,
    teams: live.length,
    learners: people.length,
    intakeNotStarted: live.length - intake.length,
    intakeGhlFailed: intake.filter((r) => r.ghl === 'failed').length,
    signedIn: new Set(people.filter((u) => u.last !== null).map((u) => u.teamId)).size,
    intakeSubmitted: intake.filter((r) => r.submittedAt !== null).length,
    paidInFull: new Set(sold.filter((p) => p.status !== 'ended' && p.option === 'full' && inRoster.has(p.teamId)).map((p) => p.teamId)).size,
    secondPayments: {
      count: owed.length,
      each: amounts.length === 1 && amounts[0] !== null ? Number(amounts[0]) : null,
      next: dues.length ? Math.min(...dues) : null,
    },
    teamRows,
    ...(stripe ? { stripe: await stripe(db, cohortId) } : {}),
  };
}
