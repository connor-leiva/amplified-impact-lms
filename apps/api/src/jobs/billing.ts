// The offer's timed jobs: owner invites held for `INVITES_FROM` (D-078), and the AI Accelerator's
// combined 15-seat cap on its two Stripe Payment Links (D-154), reconciled every tick as the backstop
// to the webhook's.
//
// Provisioning creates the account the moment a sale is paid, but before `INVITES_FROM` (Mon, Nov 16,
// 8 am Central) it holds the owner's invite, so the login arrives beside Sarah O.'s welcome email
// rather than on a Saturday night with nothing around it. This loop sends the held ones once that
// instant passes. Armed by a database, like the waitlist's GHL loop, and not by `fixtureOnly`:
// production runs fixture mode with a database, and the buyers still need their invites.

import type { Database } from '../db/client';
import { clock } from '../lib/clock';
import { sendHeldInvites } from '../billing/provision';
import { sendDueWelcomes } from './welcome';
import { sendWeek0Open } from './week0-open';
import type { BillingLog } from '../billing/provision';
import { reconcileAcceleratorSeats } from '../billing/payment-links';
import type { OfferConfig } from '../billing/config';
import type { BillingStripe } from '../billing/stripe';

export const BILLING_TICK_MS = 60_000;

export interface BillingLoop {
  readonly running: boolean;
  stop(): Promise<void>;
}

export function startBillingLoop(options: {
  database: boolean;
  invitesFrom: number;
  log: BillingLog;
  db?: Database;
  intervalMs?: number;
  /** D-154: the Stripe client and the offer configuration the seat cap reads. Absent: no seat cap. */
  seatCap?: { stripe: BillingStripe | null; config: Pick<OfferConfig, 'open' | 'foundingClosesAt' | 'seatCapLinks'> };
}): BillingLoop {
  if (!options.database) return { running: false, stop: async () => {} };
  let inFlight: Promise<void> | null = null;
  let timer: NodeJS.Timeout | null = setInterval(() => {
    if (inFlight) return;
    inFlight = sendHeldInvites({ db: options.db, log: options.log, now: clock.now(), invitesFrom: options.invitesFrom })
      .then(
        () => {},
        (err: unknown) => options.log.error({ reason: (err as { code?: string }).code ?? 'error' }, 'held invites tick failed; the next tick retries'),
      )
      // The seat cap never throws; it logs and waits for the next tick.
      .then(async () => {
        await sendDueWelcomes({ db: options.db, log: options.log, now: clock.now() });
      })
      .then(
        () => {},
        (err: unknown) => options.log.error({ reason: (err as { code?: string }).code ?? 'error' }, 'cohort welcome tick failed; the next tick retries'),
      )
      // The Week 0 Is Open email, beside the welcome: off until its Console switch, then once per owner enrolled then.
      .then(async () => {
        await sendWeek0Open({ db: options.db, log: options.log, now: clock.now() });
      })
      .then(
        () => {},
        (err: unknown) => options.log.error({ reason: (err as { code?: string }).code ?? 'error' }, 'week 0 email tick failed; the next tick retries'),
      )
      .then(async () => {
        if (options.seatCap) await reconcileAcceleratorSeats({ ...options.seatCap, now: clock.now(), log: options.log, db: options.db });
      })
      .finally(() => {
        inFlight = null;
      });
  }, options.intervalMs ?? BILLING_TICK_MS);
  timer.unref();
  return {
    get running() {
      return timer !== null;
    },
    async stop() {
      if (timer) clearInterval(timer);
      timer = null;
      if (inFlight) await inFlight;
    },
  };
}
