// D-134: what the GHL loops do AFTER a contact and its tags are written: the contact's custom fields
// and its one opportunity in the pipeline. Both are off until their ids are set (integrations/ghl.ts),
// and neither can undo or block the contact and its tags, which are already in GHL by the time this
// runs. The three loops (ghl-sync.ts, ghl-orders.ts, ghl-logins.ts) share it, and the bookkeeping that
// follows from its answer, so the rules below hold the same way for a sign-up, a buyer and a login:
//
//   - ALL DONE: the row is synced, stamped with today's `syncStamp`, and not tried again until it
//     changes (or the stamp does).
//   - A ROW FAILURE in a field or the opportunity (GHL refused it, or answered something unreadable):
//     the row keeps `ghl_synced_at` and its contact id, because the contact and its tags ARE in GHL,
//     but not the new stamp, so it is tried again on the usual backoff, with the reason in `ghl_error`.
//   - 401 OR 403 on a field or the opportunity: the token works for contacts (that call just
//     succeeded) and lacks a scope for this one. That is not the row's fault, and it would be every
//     row's: the attempt is handed back, the row waits UNAUTHORIZED_PAUSE, and the rest of the tick
//     skips the extras altogether while still writing contacts and tags.
//   - ANY OTHER SYSTEMIC failure (rate limit, 5xx, timeout, network): as for a contact, the tick stops
//     and every row it had not finished is handed back and paused.
//
// WHICH STAGE. A contact's place in the pipeline comes from EVERY order and sign-up we hold for its
// email, not from the row being synced, so a buyer who later downloads a free guide stays Purchased,
// and a refunded buyer moves back to Purchased only when a paid order that is not refunded exists.

import { sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { ai101Waitlist, orders, plans } from '../db/schema';
import { FREE_SKILL_SOURCES, LMS_SIGNED_IN, PLAN_NAMES_FOR_GHL, orderFieldValues, setContactFields, upsertOpportunity } from '../integrations/ghl';
import type { ExtraResult, FieldValues, GhlConfig, GhlFailureKind, GhlStep, OpportunityTarget, StageKey, Fetch } from '../integrations/ghl';

const SYSTEMIC: ReadonlySet<GhlFailureKind> = new Set(['unauthorized', 'rate-limited', 'server', 'timeout', 'network']);

/** One order as the contact's state reads it. */
interface OrderFacts {
  id: string;
  plan: string;
  status: string;
  amount_total: number | null;
  paid_at: string | number | null;
  payment_failed_at: string | number | null;
  membership_ended_at: string | number | null;
  refunded_at: string | number | null;
  created_at: string | number;
  plan_status: string | null;
}

const num = (v: string | number | null): number | null => (v === null ? null : Number(v));

/** One order's stage, or null for an order that says nothing about the pipeline. */
export function orderStage(o: Pick<OrderFacts, 'status' | 'paid_at' | 'payment_failed_at' | 'membership_ended_at' | 'refunded_at' | 'plan_status'>): StageKey | null {
  if (o.refunded_at !== null) return 'refunded';
  if (o.membership_ended_at !== null) return 'canceled';
  // "Not yet recovered": the plan is still past due (an invoice that pays clears it), or the checkout's
  // own payment failed and no plan was ever made.
  if (o.plan_status === 'past_due' || (o.status === 'failed' && o.payment_failed_at !== null)) return 'paymentFailed';
  if (o.status === 'paid' || o.status === 'trialing' || o.paid_at !== null) return 'purchased';
  if (o.status === 'expired') return 'checkoutStarted';
  return null;
}

/** Which state wins when a contact has several: the one that needs someone's attention first. */
const PRIORITY: readonly StageKey[] = ['paymentFailed', 'purchased', 'refunded', 'canceled', 'checkoutStarted', 'freeSkills', 'lead'];

export interface ContactState {
  target: OpportunityTarget | null;
  fields: FieldValues;
}

/** Where the contact with this email belongs, and what its fields should say, from everything we hold for it. */
export async function contactState(db: Database, email: string): Promise<ContactState> {
  const rows = (await db.execute(sql`
    select o.id, o.plan, o.status, o.amount_total, o.paid_at, o.payment_failed_at, o.membership_ended_at,
           o.refunded_at, o.created_at, p.status as plan_status
      from ${orders} o left join ${plans} p on p.order_id = o.id
     where lower(o.email) = lower(${email}) and o.status <> 'pending'`)) as unknown as OrderFacts[];
  const signUps = (await db.execute(sql`select source from ${ai101Waitlist} where lower(email) = lower(${email})`)) as unknown as { source: string }[];

  const staged = rows
    .map((o) => ({ o, stage: orderStage(o) }))
    .filter((x): x is { o: OrderFacts; stage: StageKey } => x.stage !== null);
  if (signUps.length) staged.push({ o: null as unknown as OrderFacts, stage: signUps.some((s) => FREE_SKILL_SOURCES.includes(s.source)) ? 'freeSkills' : 'lead' });

  for (const stage of PRIORITY) {
    const here = staged.filter((x) => x.stage === stage);
    if (!here.length) continue;
    const orderRows = here.map((x) => x.o).filter((o): o is OrderFacts => o !== null);
    if (!orderRows.length) return { target: { stage, name: 'Amplified Impact' }, fields: {} };
    // The latest order in that state is the contact's primary one.
    const primary = orderRows.sort((a, b) => (num(b.paid_at) ?? Number(b.created_at)) - (num(a.paid_at) ?? Number(a.created_at)))[0]!;
    const name = PLAN_NAMES_FOR_GHL[primary.plan] ?? 'Amplified Impact';
    const amount = typeof primary.amount_total === 'number' && primary.amount_total > 0 ? Math.round(primary.amount_total) / 100 : undefined;
    const bought = stage !== 'checkoutStarted';
    return {
      target: { stage, name, ...(bought && amount !== undefined ? { monetaryValue: amount } : {}) },
      fields: bought ? orderFieldValues({ plan: primary.plan, amountTotal: primary.amount_total, paidAt: num(primary.paid_at) }) : {},
    };
  }
  return { target: null, fields: {} };
}

/** What the extras came to, for the loop's bookkeeping. */
export type ExtrasOutcome =
  | { kind: 'done' }
  | { kind: 'row'; failure: ExtraFailure }
  | { kind: 'scope'; failure: ExtraFailure }
  | { kind: 'systemic'; failure: ExtraFailure };
export type ExtraFailure = { kind: GhlFailureKind; status?: number; step: GhlStep };

/** Per tick: once a 401/403 on the extras is seen, the rest of the tick skips them (see the header). */
export interface ExtrasTick {
  scopeBlocked: ExtraFailure | null;
}

export const extrasError = (f: ExtraFailure): string => `${f.step}:${f.kind}${f.status === undefined ? '' : `:${f.status}`}`;

/**
 * The fields and the opportunity for one contact whose tags just went in. `which` says what kind of
 * row it is: a login writes only the LMS Login field; a sign-up only the opportunity (its contact has
 * no purchase to put in the fields, or has orders that write them); an order both.
 */
export async function syncExtras(
  db: Database,
  contactId: string,
  email: string,
  which: 'waitlist' | 'order' | 'login',
  options: { config: GhlConfig; fetch?: Fetch },
  tick: ExtrasTick,
): Promise<ExtrasOutcome> {
  const { config } = options;
  const wantsFields = Object.keys(config.fields ?? {}).length > 0 && which !== 'waitlist';
  const wantsPipeline = config.pipeline !== null && config.pipeline !== undefined && which !== 'login';
  if (!wantsFields && !wantsPipeline) return { kind: 'done' };
  if (tick.scopeBlocked) return { kind: 'scope', failure: tick.scopeBlocked };

  const syncOptions = { config, ...(options.fetch ? { fetch: options.fetch } : {}) };
  const state = which === 'login' ? { target: null, fields: { lmsLogin: LMS_SIGNED_IN } } : await contactState(db, email);
  const steps: (() => Promise<ExtraResult>)[] = [];
  if (wantsFields) steps.push(() => setContactFields(contactId, state.fields, syncOptions));
  if (wantsPipeline && state.target) steps.push(() => upsertOpportunity(contactId, state.target!, syncOptions));

  for (const step of steps) {
    const result = await step();
    if (result.ok) continue;
    const failure: ExtraFailure = { kind: result.kind, step: result.step, ...(result.status === undefined ? {} : { status: result.status }) };
    if (result.kind === 'unauthorized') {
      tick.scopeBlocked = failure;
      return { kind: 'scope', failure };
    }
    return SYSTEMIC.has(result.kind) ? { kind: 'systemic', failure } : { kind: 'row', failure };
  }
  return { kind: 'done' };
}

/** The columns every GHL-synced table shares, as `set()` takes them. */
export interface SyncColumns {
  ghlContactId?: string;
  ghlSyncedAt?: number;
  ghlNextAttemptAt?: number | null;
  ghlError?: string | null;
  ghlSyncStamp?: string;
}

/**
 * The row's new bookkeeping once its contact and tags are in GHL, from what the extras came to. A
 * `systemic` or `scope` outcome hands the attempt back (the caller subtracts it) and pauses the row.
 */
export function afterContact(
  outcome: ExtrasOutcome,
  ctx: { now: number; contactId: string; stamp: string; attempts: number; backoffMs: readonly number[]; maxAttempts: number; pauseMs: { unauthorized: number; systemic: number } },
): { set: SyncColumns; gaveUp: boolean; handBack: boolean } {
  const base = { ghlContactId: ctx.contactId, ghlSyncedAt: ctx.now };
  if (outcome.kind === 'done') return { set: { ...base, ghlSyncStamp: ctx.stamp, ghlNextAttemptAt: null, ghlError: null }, gaveUp: false, handBack: false };
  const error = extrasError(outcome.failure);
  if (outcome.kind === 'row') {
    const gaveUp = ctx.attempts >= ctx.maxAttempts;
    return { set: { ...base, ghlError: error, ghlNextAttemptAt: gaveUp ? null : ctx.now + ctx.backoffMs[ctx.attempts - 1]! }, gaveUp, handBack: false };
  }
  const pause = outcome.kind === 'scope' || outcome.failure.kind === 'unauthorized' ? ctx.pauseMs.unauthorized : ctx.pauseMs.systemic;
  return { set: { ...base, ghlError: error, ghlNextAttemptAt: ctx.now + pause }, gaveUp: false, handBack: true };
}
