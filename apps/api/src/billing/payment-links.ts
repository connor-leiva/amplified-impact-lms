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

import { COHORT_SEATS } from './catalog';
import { foundingOpen } from './config';
import type { OfferConfig } from './config';
import { cohortSeatsSold } from './provision';
import type { BillingLog } from './provision';
import type { BillingStripe, PaymentLinkInfo } from './stripe';
import type { Database } from '../db/client';
import { getDb } from '../db/client';

/** Our mark on a link the cap turned off. Cleared when the cap turns it back on. */
export const SOLD_OUT_MARK = 'ai_soldout';

/** What a turned-off link says to someone who opens it: the sales page's own sold-out line. */
export const SOLD_OUT_MESSAGE = 'All 15 founding seats are taken. Join the waitlist at amplifiedimpact.io/offer to hear first about the next cohort.';

export type LinkAction = 'turned-off' | 'already-off' | 'turned-on' | 'held-off' | 'on' | 'off' | 'skipped:not-accelerator' | 'failed';

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
}): Promise<SeatCapOutcome> {
  const { sold, stripe, ids, mayReopen, now, log } = options;
  const full = sold >= COHORT_SEATS;
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
      const ours = link.metadata[SOLD_OUT_MARK] === '1';
      const minute = Math.floor(now / MINUTE);
      if (full) {
        if (!link.active) {
          links.push({ id, action: 'already-off' });
          continue;
        }
        await stripe.updatePaymentLink(
          id,
          { active: false, inactive_message: SOLD_OUT_MESSAGE, metadata: { [SOLD_OUT_MARK]: '1' } },
          `accel-cap-${id}-off-${sold}-${minute}`,
        );
        log.error({ link: id, sold, seats: COHORT_SEATS }, `AI Accelerator sold out (${sold} of ${COHORT_SEATS}): its Payment Link is turned off`);
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
      log.warn({ link: id, sold, seats: COHORT_SEATS }, `AI Accelerator seat freed (${sold} of ${COHORT_SEATS}): its Payment Link is back on`);
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

/**
 * Count, then reconcile. Skipped (null) with no Stripe key or no link ids (a test key with no
 * `PAYMENT_LINK_ID_*`). A count that fails is not 0: it changes nothing, and the next tick retries.
 */
export async function reconcileAcceleratorSeats(options: {
  stripe: BillingStripe | null;
  config: Pick<OfferConfig, 'open' | 'foundingClosesAt' | 'seatCapLinks'>;
  now: number;
  log: BillingLog;
  db?: Pick<Database, 'select'>;
}): Promise<SeatCapOutcome | null> {
  const { stripe, config, now, log } = options;
  if (!stripe || config.seatCapLinks.length === 0) return null;
  let sold: number;
  try {
    sold = await cohortSeatsSold(options.db ?? getDb());
  } catch (err) {
    log.error({ reason: (err as { code?: string }).code ?? 'error' }, 'seat cap: the seats could not be counted; nothing changed, the next tick retries');
    return null;
  }
  return syncAcceleratorPaymentLinks({
    sold,
    stripe,
    ids: config.seatCapLinks,
    mayReopen: config.open && foundingOpen(config, now),
    now,
    log,
  });
}
