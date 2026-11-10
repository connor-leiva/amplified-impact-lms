// Copy the offer's buyers into GoHighLevel, with their tags (D-076). The waitlist's loop
// (jobs/ghl-sync.ts) runs this after its own rows on every tick, with the same rules:
//
//   - THE ORDER IS THE RECORD. The webhook writes the order and moves on; this runs later and makes the
//     copy. A GHL outage delays a welcome email, never a purchase.
//   - CLAIM, SYNC, RECORD, with a lease (`ghl_next_attempt_at`) so two replicas never sync one row at
//     the same time, and backoff on a row failure. A systemic failure (token, rate limit, outage) hands
//     the attempts back and pauses.
//   - RE-SYNC ON CHANGE. Every webhook step that adds a tag (paid, payment failed, membership ended,
//     refunded, abandoned) sets `ghl_synced_at` back to null, so the next tick adds the new tag. Tags
//     only accumulate: `refunded` is how a GHL workflow learns to stop, since `offer-buyer` stays.
//   - A PENDING ORDER IS NEVER COPIED. Someone who opened Checkout and has not paid or let it expire is
//     not yet anyone GHL should write to.
//
// PRIVACY: row ids, counts and status codes in the log; never a name, an address or a phone number.

import { eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { orders } from '../db/schema';
import { clock } from '../lib/clock';
import { buyerTags, syncBuyerContact } from '../integrations/ghl';
import type { Fetch, GhlConfig, GhlFailureKind } from '../integrations/ghl';
import { BACKOFF_MS, BATCH, LEASE_MS, MAX_ATTEMPTS, SYSTEMIC_PAUSE_MS, UNAUTHORIZED_PAUSE_MS } from './ghl-sync';
import type { GhlSyncLog, GhlSyncRun } from './ghl-sync';

const SYSTEMIC: ReadonlySet<GhlFailureKind> = new Set(['unauthorized', 'rate-limited', 'server', 'timeout', 'network']);

interface ClaimedOrder {
  id: string;
  plan: string;
  option: string;
  status: string;
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  campaign: string | null;
  sms_consent: boolean;
  paid_at: string | number | null;
  payment_failed_at: string | number | null;
  membership_ended_at: string | number | null;
  refunded_at: string | number | null;
  ghl_attempts: number;
  created_at: string | number;
}

const num = (v: string | number | null): number | null => (v === null ? null : Number(v));

export async function claimDueOrders(db: Database, now: number, batch: number = BATCH): Promise<ClaimedOrder[]> {
  const rows = (await db.execute(sql`
    update ${orders}
       set ghl_attempts = ghl_attempts + 1,
           ghl_next_attempt_at = ${now + LEASE_MS}
     where id in (
       select id from ${orders}
        where ghl_synced_at is null
          and status <> 'pending'
          and email is not null
          and ghl_attempts < ${MAX_ATTEMPTS}
          and (ghl_next_attempt_at is null or ghl_next_attempt_at <= ${now})
        order by created_at, id
        limit ${batch}
        for update skip locked)
    returning id, plan, option, status, name, email, phone, company, campaign, sms_consent, paid_at,
              payment_failed_at, membership_ended_at, refunded_at, ghl_attempts, created_at`)) as unknown as ClaimedOrder[];
  return [...rows].sort((a, b) => Number(a.created_at) - Number(b.created_at) || (a.id < b.id ? -1 : 1));
}

const errorCode = (r: { kind: GhlFailureKind; status?: number; step: string }): string =>
  `${r.step}:${r.kind}${r.status === undefined ? '' : `:${r.status}`}`;

/** One pass over the buyers. Same shape of result as the waitlist's tick. */
export async function runGhlOrderSync(options: { db: Database; log: GhlSyncLog; config: GhlConfig; fetch?: Fetch }): Promise<GhlSyncRun> {
  const { db, log, config } = options;
  const run: GhlSyncRun = { ran: true, claimed: 0, synced: 0, created: 0, failed: 0, gaveUp: 0 };
  const rows = await claimDueOrders(db, clock.now());
  run.claimed = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const facts = {
      plan: row.plan,
      option: row.option,
      status: row.status,
      paidAt: num(row.paid_at),
      paymentFailedAt: num(row.payment_failed_at),
      membershipEndedAt: num(row.membership_ended_at),
      refundedAt: num(row.refunded_at),
      campaign: row.campaign,
      smsConsent: row.sms_consent,
      phone: row.phone,
    };
    const now = clock.now();
    if (buyerTags(facts).length === 0) {
      // Nothing to say about this order yet (an expired link session with no plan we sell).
      await db.update(orders).set({ ghlSyncedAt: now, ghlNextAttemptAt: null, ghlError: null }).where(eq(orders.id, row.id));
      continue;
    }
    const result = await syncBuyerContact(
      { ...facts, name: row.name, email: row.email, company: row.company },
      { config, ...(options.fetch ? { fetch: options.fetch } : {}) },
    );

    if (result.ok) {
      await db
        .update(orders)
        .set({ ghlContactId: result.contactId, ghlSyncedAt: now, ghlNextAttemptAt: null, ghlError: null })
        .where(eq(orders.id, row.id));
      run.synced += 1;
      if (result.created) run.created += 1;
      if (result.tagsDropped.length) {
        log.error({ order: row.id, contact: result.contactId, dropped: result.tagsDropped }, 'GHL dropped tags this buyer already had; restore them in GHL');
      }
      continue;
    }

    if (SYSTEMIC.has(result.kind)) {
      const pause = result.kind === 'unauthorized' ? UNAUTHORIZED_PAUSE_MS : SYSTEMIC_PAUSE_MS;
      const deferred = rows.slice(i).map((r) => r.id);
      for (const id of deferred) {
        await db
          .update(orders)
          .set({ ghlAttempts: sql`greatest(${orders.ghlAttempts} - 1, 0)`, ghlNextAttemptAt: now + pause, ghlError: errorCode(result) })
          .where(eq(orders.id, id));
      }
      run.paused = { kind: result.kind, ...(result.status === undefined ? {} : { status: result.status }), rowsDeferred: deferred.length };
      log.warn({ kind: result.kind, status: result.status, deferred: deferred.length }, 'GHL unavailable for buyers; paused, nothing lost');
      break;
    }

    const attempts = row.ghl_attempts;
    const gaveUp = attempts >= MAX_ATTEMPTS;
    await db
      .update(orders)
      .set({ ghlError: errorCode(result), ghlNextAttemptAt: gaveUp ? null : now + BACKOFF_MS[attempts - 1]! })
      .where(eq(orders.id, row.id));
    run.failed += 1;
    if (gaveUp) run.gaveUp += 1;
    log[gaveUp ? 'error' : 'warn']({ order: row.id, kind: result.kind, status: result.status, attempts }, 'GHL refused a buyer contact');
  }
  return run;
}
