// The AI Accelerator's combined 15-seat cap, kept on Stripe (DECISIONS.md D-154).
//
// Two Payment Links sell the AI Accelerator (paid in full, two payments). Each has its own Stripe
// sales limit of 15, which is not a combined cap: together they could sell 30. The site already counts
// both together (`cohortSeatsSold`, every `cohort` plan not `ended`) and hides both buttons at 15; this
// turns the links themselves off, so a link that is bookmarked, shared or already open cannot sell
// past it either. It supersedes D-104's "Ampy turns the links off by hand; the code never changes
// Stripe".
//
// ONE DESIRED STATE, NOTHING ELSE:
//   - 15 or more sold: each link that is on goes off, with a waitlist line and our mark
//     (`ai_soldout=1`), so we know it was the cap that turned it off.
//   - Under 15 (a refund ended a plan): each link that is off AND carries our mark comes back on, and
//     loses the mark, but only while the offer is open (`OFFER_OPEN`) and founding prices still sell.
//     A link that is off for any other reason (Connor turned it off, founding closed, a retired link)
//     is never touched.
// It reads each link first and changes only what differs, so running it twice with the same count
// changes nothing the second time.
//
// WHERE IT RUNS: after a webhook event that can add or end an Accelerator plan (a completed checkout,
// a paid invoice, a refund, a deleted subscription), and on the billing loop's 60-second tick, so a
// missed or half-failed webhook cannot leave the links on at 15 or off at 14.
//
// RACES. Provisioning holds an advisory lock (`provisionOrder`), so two sales cannot both count 14.
// What cannot be closed is Stripe's side: a Checkout already open when the links go off can still
// be paid. That seat is provisioned like any other (a paid checkout is never refused), the existing
// "seat N past 15" error is logged for Connor, and the links stay off. Nothing is refunded here.
//
// It never throws: a failure is logged (ids and counts only, never a name or an email) and the next
// tick tries again. A 403 means the restricted key has no Payment Links permission yet.
//
// R-5 PHASE 5 (D-262, PLAN.md § 10.5): PER COHORT. Each cohort's seats are counted on their own (`cohortSeatsSold` by
// `plans.cohort_id`) against its own cap (`capacity`), and only its own links are turned off and on, with its own
// sold-out line. December's links are the two D-154 named (`seatCapLinks`: `PAYMENT_LINK_ID_*`, else the live ids), so
// its calls are byte-identical. Another cohort's are found from the addresses stored on it (`paymentLinksByUrl`, a
// read), and a link whose `ai_cohort` names another cohort is never touched. A link reopens only while `OFFER_OPEN` is
// on, its cohort's enrollment is open (Close stops it), and its founding, if it is founding, has not closed.

import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { cohortSelling, enrollmentOpen, foundingOpenFor, soldOutMessage } from '@ai/core/cohort-selling';
import { COHORT_SEATS } from './catalog';
import type { OfferConfig } from './config';
import { envOf, sellingCohorts } from './cohort-sale';
import { cohortSeatsSold } from './provision';
import type { BillingLog } from './provision';
import type { BillingStripe, PaymentLinkInfo } from './stripe';
import type { Database } from '../db/client';
import { getDb } from '../db/client';

/** Our mark on a link the cap turned off. Cleared when the cap turns it back on. */
export const SOLD_OUT_MARK = 'ai_soldout';

/**
 * What a turned-off link says to someone who opens it: the sales page's own sold-out line, December's. Another
 * cohort's is `soldOutMessage` of its cap and founding (`@ai/core/cohort-selling`).
 */
export const SOLD_OUT_MESSAGE = soldOutMessage({ capacity: COHORT_SEATS, founding: true });

export type LinkAction =
  | 'turned-off'
  | 'already-off'
  | 'turned-on'
  | 'held-off'
  | 'on'
  | 'off'
  | 'skipped:not-accelerator'
  | 'skipped:other-cohort'
  | 'failed';

export interface SeatCapOutcome {
  sold: number;
  links: { id: string; action: LinkAction }[];
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
let permissionLoggedAt = -Infinity;

/** Tests only. */
export function resetSeatCapLogForTests(): void {
  permissionLoggedAt = -Infinity;
}

const isPermissionError = (err: unknown): boolean => {
  const e = err as { statusCode?: number; type?: string; raw?: { statusCode?: number } };
  return e?.statusCode === 403 || e?.raw?.statusCode === 403 || e?.type === 'StripePermissionError';
};

/**
 * One reconcile of both links against `sold`. Pure of the database: the caller counts. Idempotency
 * keys carry the link, the direction, the count and the minute, so a retried request in the same
 * minute is one change, and a later flip at the same count (15, then 14, then 15 again) is a new one
 * rather than Stripe replaying the first answer.
 */
export async function syncAcceleratorPaymentLinks(options: {
  sold: number;
  stripe: BillingStripe;
  ids: readonly string[];
  /** `OFFER_OPEN` and founding prices still on sale: the only time the cap turns a link back on. */
  mayReopen: boolean;
  now: number;
  log: BillingLog;
  /** R-5 Phase 5 (D-262): the cohort's cap and sold-out line; December's (15) by default. */
  cap?: number;
  message?: string;
  /** R-5 Phase 5: a link whose `ai_cohort` names another cohort is left alone. Absent: not checked (December's links). */
  cohortId?: string;
}): Promise<SeatCapOutcome> {
  const { sold, stripe, ids, mayReopen, now, log } = options;
  const cap = options.cap ?? COHORT_SEATS;
  const SOLD_OUT = options.message ?? SOLD_OUT_MESSAGE;
  const full = sold >= cap;
  const links: SeatCapOutcome['links'] = [];
  for (const id of ids) {
    try {
      const link: PaymentLinkInfo = await stripe.retrievePaymentLink(id);
      const plan = link.metadata.ai_plan;
      if (plan !== undefined && plan !== 'cohort') {
        // Never the Insiders, Team Plan or Agent Plan links, whatever a variable says.
        log.error({ link: id, plan }, 'seat cap: this Payment Link is not an AI Accelerator link; left alone');
        links.push({ id, action: 'skipped:not-accelerator' });
        continue;
      }
      if (options.cohortId !== undefined && link.metadata.ai_cohort !== options.cohortId) {
        log.error({ link: id, cohort: options.cohortId }, 'seat cap: this Payment Link names another cohort (ai_cohort); left alone');
        links.push({ id, action: 'skipped:other-cohort' });
        continue;
      }
      const ours = link.metadata[SOLD_OUT_MARK] === '1';
      const minute = Math.floor(now / MINUTE);
      if (full) {
        if (!link.active) {
          links.push({ id, action: 'already-off' });
          continue;
        }
        await stripe.updatePaymentLink(
          id,
          { active: false, inactive_message: SOLD_OUT, metadata: { [SOLD_OUT_MARK]: '1' } },
          `accel-cap-${id}-off-${sold}-${minute}`,
        );
        log.error({ link: id, sold, seats: cap }, `AI Accelerator sold out (${sold} of ${cap}): its Payment Link is turned off`);
        links.push({ id, action: 'turned-off' });
        continue;
      }
      if (link.active) {
        links.push({ id, action: 'on' });
        continue;
      }
      if (!ours) {
        // Off for a reason that is not ours: Connor's, founding's, a retired link's. Never reopened here.
        links.push({ id, action: 'off' });
        continue;
      }
      if (!mayReopen) {
        links.push({ id, action: 'held-off' });
        continue;
      }
      await stripe.updatePaymentLink(id, { active: true, metadata: { [SOLD_OUT_MARK]: '' } }, `accel-cap-${id}-on-${sold}-${minute}`);
      log.warn({ link: id, sold, seats: cap }, `AI Accelerator seat freed (${sold} of ${cap}): its Payment Link is back on`);
      links.push({ id, action: 'turned-on' });
    } catch (err) {
      links.push({ id, action: 'failed' });
      if (isPermissionError(err)) {
        // Until Connor adds Payment Links: Read and Write to the restricted key. Once an hour, not every tick.
        if (now - permissionLoggedAt >= HOUR) {
          permissionLoggedAt = now;
          log.error(
            { link: id, sold },
            'seat cap: Stripe refused (403). Add Payment Links: Read and Write to the website-checkout restricted key; the next tick retries',
          );
        }
      } else {
        const e = err as { code?: string; type?: string; statusCode?: number };
        log.error({ link: id, sold, reason: e?.code ?? e?.type ?? 'error', status: e?.statusCode }, 'seat cap: a Payment Link change failed; the next tick retries');
      }
    }
  }
  return { sold, links };
}

type SeatCapConfig = Pick<OfferConfig, 'open' | 'foundingClosesAt' | 'seatCapLinks'> & Partial<Pick<OfferConfig, 'paymentLinks'>>;

/**
 * Count one cohort's seats, then reconcile its links (December's by default). Skipped (null) with no Stripe key or no
 * links (a test key with no `PAYMENT_LINK_ID_*` for December; no stored addresses, or none Stripe can find, for another
 * cohort). A count that fails is not 0: it changes nothing, and the next tick retries.
 */
export async function reconcileAcceleratorSeats(options: {
  stripe: BillingStripe | null;
  config: SeatCapConfig;
  now: number;
  log: BillingLog;
  db?: Pick<Database, 'select'>;
  /** R-5 Phase 5 (D-262): the cohort; December's by default, as D-154 reconciled. */
  cohortId?: string;
}): Promise<SeatCapOutcome | null> {
  const { stripe, config, now, log } = options;
  const cohortId = options.cohortId ?? DEFAULT_COHORT_ID;
  const db = options.db ?? getDb();
  if (!stripe) return null;
  let sold: number;
  let ids: readonly string[];
  let cap: number;
  let message: string;
  let mayReopen: boolean;
  try {
    const all = await sellingCohorts(db);
    const row = all.find((c) => c.id === cohortId);
    const selling = cohortSelling({ cohorts: all }, cohortId, envOf({ foundingClosesAt: config.foundingClosesAt, paymentLinks: config.paymentLinks ?? {} }));
    ids = options.cohortId === undefined ? config.seatCapLinks : await cohortLinkIds(stripe, [selling.links.full, selling.links.twoPay]);
    if (ids.length === 0) return null;
    sold = await cohortSeatsSold(db, cohortId);
    cap = selling.capacity;
    message = soldOutMessage(selling);
    // A database that holds no row for it (December, in a test database) sells it, as before R-5.
    mayReopen = config.open && (row ? enrollmentOpen(row) : true) && foundingOpenFor(selling, now);
  } catch (err) {
    log.error({ reason: (err as { code?: string }).code ?? 'error', cohort: cohortId }, 'seat cap: the seats could not be counted; nothing changed, the next tick retries');
    return null;
  }
  return syncAcceleratorPaymentLinks({
    sold,
    stripe,
    ids,
    mayReopen,
    now,
    log,
    cap,
    message,
    ...(options.cohortId === undefined ? {} : { cohortId }),
  });
}

/** The ids of a cohort's Payment Links, found from their stored addresses (a read; none when Stripe can't be asked). */
async function cohortLinkIds(stripe: BillingStripe, urls: readonly (string | null)[]): Promise<string[]> {
  const want = urls.filter((u): u is string => !!u);
  if (!want.length || !stripe.paymentLinksByUrl) return [];
  const found = await stripe.paymentLinksByUrl(want);
  return want.map((u) => found.get(u)?.id).filter((id): id is string => !!id);
}

/**
 * R-5 Phase 5 (D-262): every cohort's seat cap, each on its own links: December's (D-154's ids), then every other
 * cohort that stores a link address. What the webhook and the billing loop run. Never throws.
 */
export async function reconcileCohortSeats(options: {
  stripe: BillingStripe | null;
  config: SeatCapConfig;
  now: number;
  log: BillingLog;
  db?: Pick<Database, 'select'>;
}): Promise<{ cohortId: string; outcome: SeatCapOutcome | null }[]> {
  if (!options.stripe) return [];
  const out: { cohortId: string; outcome: SeatCapOutcome | null }[] = [];
  out.push({ cohortId: DEFAULT_COHORT_ID, outcome: await reconcileAcceleratorSeats(options) });
  let others: string[] = [];
  try {
    others = (await sellingCohorts(options.db ?? getDb()))
      .filter((c) => c.id !== DEFAULT_COHORT_ID && (c.linkFull || c.linkTwoPay) && c.archivedAt === undefined)
      .map((c) => c.id);
  } catch (err) {
    options.log.error({ reason: (err as { code?: string }).code ?? 'error' }, 'seat cap: the cohorts could not be read; the next tick retries');
  }
  for (const cohortId of others) {
    try {
      out.push({ cohortId, outcome: await reconcileAcceleratorSeats({ ...options, cohortId }) });
    } catch (err) {
      options.log.error({ reason: (err as { code?: string }).code ?? 'error', cohort: cohortId }, 'seat cap: a cohort’s links could not be read; the next tick retries');
    }
  }
  return out;
}
