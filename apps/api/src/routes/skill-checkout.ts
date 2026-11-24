// POST /api/skills/:id/checkout: a Checkout Session for one skill, $37 once (Connor, 2026-11-23).
//
// Signed in, a learner, and not a member of an access group. Utah Life and every other group grant
// is a 403: those learners never reach Stripe from here. A free skill, a skill that is not published,
// a skill that is not released yet, and a skill this learner can already open are refused. The price
// id comes from `STRIPE_PRICE_SKILL_SINGLE`. Nothing in this file is a secret.
//
// The session is `mode=payment`, with `ai_plan=skill`, `ai_option=single`, `skill_id`, and the
// learner's id as `client_reference_id` and `user_id`. The webhook writes `skill_purchases`. Success
// returns to that skill's guide.

import type { FastifyInstance, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { guidePageOf, skillIdOfPage } from '@ai/core/skill-guides';
import { SKILL_AI_OPTION, SKILL_AI_PLAN, SKILL_PURCHASE } from '../billing/catalog';
import { SKILL_GUEST_OFFER, guestSkillReturn } from '../billing/skill-purchase';
import type { OfferConfig } from '../billing/config';
import type { BillingStripe } from '../billing/stripe';
import { SESSION_COOKIE, createSession, markActive, requireJsonSameOrigin, requireSession, sessionCookieOptions, viewerOrThrow } from '../auth';
import { getDb } from '../db/client';
import { skills, users } from '../db/schema';
import { absolute } from '../email/templates/links';
import { clock } from '../lib/clock';
import { accessOf, stateFor } from './skills';
import type { SkillRow } from './skills';

export const SKILL_CHECKOUT_PATH = '/api/skills/:id/checkout';

const GROUP = 'Skill checkout is not part of team access.';
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

/** Stripe's success address for a signed-out $37 checkout. The return signs a new account in. */
export const GUEST_RETURN_PATH = '/api/skills/guest-return';
const UNAVAILABLE = 'Skill checkout is not available right now.';
const NOT_FOR_SALE = 'This skill is not for sale.';
const ALREADY = 'You already have this skill.';

export interface SkillCheckoutOptions {
  stripe: BillingStripe | null;
  config: OfferConfig;
}

export function registerSkillCheckoutRoutes(app: FastifyInstance, options: SkillCheckoutOptions): void {
  // After Stripe. A new guest account is signed in and sent to the skill. An account that already
  // has a password is sent to sign-in. No cookie is trusted from the query: the session is read
  // back from Stripe, and it has to be a paid guest skill purchase.
  app.get(GUEST_RETURN_PATH, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'private, no-store');
    const raw = new URL(req.url, 'https://learn.local').searchParams.get('session_id') ?? '';
    const refuse = (next = '/skill-library') => reply.redirect(`/sign-in?next=${encodeURIComponent(next)}`, 302);
    if (!SESSION_ID.test(raw) || !options.stripe) return refuse();
    let checkout;
    try {
      checkout = await options.stripe.retrieveCheckoutSession(raw);
    } catch (err) {
      req.log.warn({ err: err instanceof Error ? err.name : 'error' }, 'guest return could not read the checkout');
      return refuse();
    }
    const db = getDb();
    const now = clock.now();
    const back = await guestSkillReturn(checkout, db, now, req.log, {
      invitesFrom: options.config.invitesFrom,
      invitesEnabled: options.config.invitesEnabled,
      skillGuestCheckout: options.config.skillGuestCheckout,
    });
    if (back.action === 'enter') {
      const sessionId = await createSession(db, back.userId, now);
      await markActive(db, back.userId, now);
      reply.setCookie(SESSION_COOKIE, sessionId, sessionCookieOptions());
      return reply.redirect(back.next, 302);
    }
    return refuse(back.next);
  });

  // Signed-out buyers. Off, this is the stopgap Payment Link. On, Stripe collects the email and the
  // webhook creates the account. No session, so a marketing page can link here.
  app.get<{ Params: { id: string } }>('/api/skills/:id/guest-checkout', async (req, reply): Promise<FastifyReply> => {
    if (!options.config.skillGuestCheckout) return reply.redirect(SKILL_PURCHASE.stopgapHref, 302);
    const skillId = skillIdOfPage(req.params.id);
    if (!skillId) return reply.code(404).send({ error: 'Not found' });
    const [skill] = await getDb().select().from(skills).where(eq(skills.id, skillId)).limit(1);
    const now = clock.now();
    if (!skill || skill.status !== 'published' || skill.free || skill.releasedAt > now) return reply.code(404).send({ error: NOT_FOR_SALE });
    if (!options.stripe || !options.config.skillPriceId) {
      req.log.error({ skill: skill.id }, 'guest skill checkout is not configured; sending the stopgap link');
      return reply.redirect(SKILL_PURCHASE.stopgapHref, 302);
    }
    let successUrl: string;
    let cancelUrl: string;
    try {
      const page = guidePageOf(skill.id);
      successUrl = absolute(`${GUEST_RETURN_PATH}?session_id={CHECKOUT_SESSION_ID}`);
      cancelUrl = absolute(`/skill-library/${page}`);
    } catch {
      return reply.redirect(SKILL_PURCHASE.stopgapHref, 302);
    }
    const session = await options.stripe.createCheckoutSession({
      priceId: options.config.skillPriceId,
      successUrl,
      cancelUrl,
      clientReferenceId: `guest-${randomUUID()}`,
      customerEmail: null,
      metadata: { skill_id: skill.id, ai_plan: SKILL_AI_PLAN, ai_option: SKILL_AI_OPTION, offer: SKILL_GUEST_OFFER },
      idempotencyKey: `skill-guest-${skill.id}-${randomUUID()}`,
      collectName: true,
    });
    return reply.redirect(session.url, 302);
  });

  app.post<{ Params: { id: string } }>(SKILL_CHECKOUT_PATH, { preHandler: [requireSession, requireJsonSameOrigin] }, async (req, reply): Promise<FastifyReply> => {
    const { actor } = viewerOrThrow(req);
    if (actor.kind !== 'learner') return reply.code(403).send({ error: GROUP });
    const access = await accessOf(actor.userId);
    if (!access) return reply.code(403).send({ error: GROUP });
    if (access.groups.length > 0) return reply.code(403).send({ error: GROUP });

    const [skill] = await getDb().select().from(skills).where(eq(skills.id, req.params.id)).limit(1);
    if (!skill || skill.status !== 'published') return reply.code(404).send({ error: 'Not found' });
    const now = clock.now();
    if (skill.free || skill.releasedAt > now) return reply.code(400).send({ error: NOT_FOR_SALE });
    if (stateFor(access.role, access.plans, skill as SkillRow, now, access.purchased.has(skill.id)) === 'open') {
      return reply.code(409).send({ error: ALREADY });
    }
    if (!options.stripe || !options.config.skillPriceId) {
      req.log.error({ skill: skill.id }, 'skill checkout is not configured');
      return reply.code(503).send({ error: UNAVAILABLE });
    }

    let successUrl: string;
    let cancelUrl: string;
    try {
      const page = guidePageOf(skill.id);
      successUrl = absolute(`/skill-library/${page}?session_id={CHECKOUT_SESSION_ID}`);
      cancelUrl = absolute(`/skill-library/${page}`);
    } catch {
      req.log.error({ skill: skill.id }, 'APP_URL is not set: skill checkout has nowhere to return');
      return reply.code(503).send({ error: UNAVAILABLE });
    }

    const [user] = await getDb().select({ email: users.email }).from(users).where(eq(users.id, actor.userId)).limit(1);
    const session = await options.stripe.createCheckoutSession({
      priceId: options.config.skillPriceId,
      successUrl,
      cancelUrl,
      clientReferenceId: actor.userId,
      customerEmail: user?.email ?? null,
      metadata: {
        skill_id: skill.id,
        ai_plan: SKILL_AI_PLAN,
        ai_option: SKILL_AI_OPTION,
        user_id: actor.userId,
      },
      idempotencyKey: `skill-${actor.userId}-${skill.id}-${randomUUID()}`,
    });
    req.log.info({ skill: skill.id, session: session.id, user: actor.userId }, 'skill checkout');
    return reply.send({ url: session.url });
  });
}
