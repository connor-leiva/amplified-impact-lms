// Dry run, unless you pass --apply. Lists paid Checkout Sessions that are single-skill purchases
// (metadata offer=single_skill_37, or a `skill` dropdown whose value is the skill id with the hyphens
// removed) and prints what would be recorded. --apply writes skill_purchases through the same function
// the webhook uses. It does not send email unless SKILL_GUEST_CHECKOUT=on, and it never calls
// GoHighLevel. Do not point it at a live key until Connor says so.
//
//   pnpm --filter @ai/api exec tsx src/billing/backfill-skill-purchases.ts
//   pnpm --filter @ai/api exec tsx src/billing/backfill-skill-purchases.ts --apply

import Stripe from 'stripe';
import { SKILL_GUEST_OFFER, skillCheckoutCompleted, skillIdOfCompact } from './skill-purchase';
import { readOfferConfig } from './config';
import { getDb } from '../db/client';

const apply = process.argv.includes('--apply');

function skillOf(session: Stripe.Checkout.Session): string | null {
  const meta = session.metadata?.skill_id?.trim();
  if (meta) return meta;
  for (const field of session.custom_fields ?? []) {
    if (field.key !== 'skill') continue;
    const found = skillIdOfCompact(field.dropdown?.value ?? field.text?.value ?? '');
    if (found) return found;
  }
  return null;
}

function isSkillSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.offer === SKILL_GUEST_OFFER || skillOf(session) !== null;
}

async function main(): Promise<void> {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!key) {
    console.log(apply ? 'STRIPE_SECRET_KEY is not set. Nothing was written.' : 'STRIPE_SECRET_KEY is not set. Dry run has nothing to list.');
    return;
  }
  const stripe = new Stripe(key);
  const config = readOfferConfig();
  const db = apply ? getDb() : null;
  let seen = 0;
  let matched = 0;
  for await (const session of stripe.checkout.sessions.list({ limit: 100, status: 'complete' })) {
    seen += 1;
    if (!isSkillSession(session) || session.payment_status !== 'paid') continue;
    matched += 1;
    const email = session.customer_details?.email ?? session.customer_email ?? '';
    const skill = skillOf(session);
    console.log(`${apply ? 'apply' : 'dry-run'}\t${session.id}\t${skill ?? ''}\t${email}`);
    if (apply && db) {
      const word = await skillCheckoutCompleted(session, db, Date.now(), console, {
        invitesFrom: config.invitesFrom,
        invitesEnabled: config.invitesEnabled,
        skillGuestCheckout: config.skillGuestCheckout,
      });
      console.log(`  ${word}`);
    }
  }
  console.log(`${apply ? 'Applied' : 'Dry run'}: ${matched} skill sessions of ${seen} complete sessions. No GoHighLevel call was made.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : 'backfill failed');
  process.exitCode = 1;
});
