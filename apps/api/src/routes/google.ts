// "Continue With Google" (D-139). The protocol is `auth/google.ts`; this is the HTTP surface and the
// rule for which account a Google sign-in opens.
//
//   GET /api/auth/providers         → { google: boolean }   whether the sign-in screens show the button
//   GET /api/auth/google            → 302 to Google's account chooser, with a signed flow cookie
//   GET /api/auth/google/callback   → 302 to `/` signed in (`/skill-library` with no cohort portal, D-150), or to `/login?google=<why>`
//
// OFF UNTIL CONFIGURED. Without `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `APP_URL` the two
// Google routes answer 404 and `providers` says `google: false`, so the button stays hidden.
//
// WHICH ACCOUNT. Google's verified email, or the Google account already linked:
//   - A Google account linked before (its `sub` in `google_identities`) opens that user.
//   - Otherwise the verified email is matched to an existing user, case-insensitively, the same
//     lookup as every other sign-in. That includes an account a checkout made whose owner never set
//     a password. The Google account is then linked, so later sign-ins match on `sub`.
//   - An address in an access group's DOMAIN (D-148: exactly `liveutah.com`, any case), which Google
//     says is verified (D-149): Google has proven the inbox, as a spent sign-in link does. It is
//     recorded as verified, so the group's skills open, and a member with no account gets one the
//     way a link makes it (`accountForGroupAddress`: Agent tier, team of one, no Stripe, no email),
//     then is signed in. Google's Workspace domain (`hd`) is logged as matching or not, not required.
//   - Any other address with no account: nobody is created. This app has no accounts without a
//     purchase, an invite or an access group, so the screen says "We couldn't find an account for
//     that email…" and points to Email Me a Sign-In Link Instead and Forgot Password?.
//   - Staff (the Owner and every other console role): only when Google's email is exactly the one
//     on the account, character for character, every time, even once linked.
//   - A user already linked to a different Google account is refused, and says so.
// An `invited` learner becomes `active`, as a set password or an accepted invite makes them: a
// Google-verified address is the same proof of the inbox. Held invites skip active owners
// (`sendHeldInvites`), exactly as they do after a password is set.
//
// THE SESSION is password sign-in's with "Keep me signed in" on (the screen's default): 30 days,
// rolling, for staff and learners alike.
//
// NEVER LOGGED: an address, a name, a token, a `sub`. Refusals log their code and nothing else.

import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createSession, markActive, SESSION_COOKIE, sessionCookieOptions, userByEmail, userById } from '../auth';
import type { UserRow } from '../auth';
import { authorizationUrl, googleClient, newFlow, sameString } from '../auth/google';
import type { FlowSecrets, GoogleConfig, GoogleIdentity } from '../auth/google';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { googleIdentities, users } from '../db/schema';
import { domainGroupsOf, emailDomainOf, recordVerified } from '../billing/access-groups';
import { clock } from '../lib/clock';
import { landingFor } from '../lib/landing';
import { safeNext } from '@ai/core/landing';
import { accountForGroupAddress } from './auth';
import { LOGIN_IP_MAX, LOGIN_IP_WINDOW } from './password';
import { recordUsage } from '../lib/usage';

/** The flow's cookie: the state, the PKCE verifier and the nonce, signed, for ten minutes. */
export const GOOGLE_FLOW_COOKIE = 'ai_google';
const FLOW_PATH = '/api/auth/google';
const FLOW_TTL_S = 10 * 60;

/** Where every refusal lands: the sign-in screen, which turns `google=<why>` into words. */
export const SIGN_IN_PATH = '/login';
export type GoogleRefusal = 'no-account' | 'unverified' | 'linked-elsewhere' | 'failed';

const flowCookieOptions = (env: NodeJS.ProcessEnv = process.env) => ({
  path: FLOW_PATH,
  httpOnly: true,
  // Lax, not Strict: Google's redirect back is a top-level cross-site GET, which Lax still carries.
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production' ? true : ('auto' as const),
  signed: true,
});

/** The flow's secrets, and D-151's `next`: a guided setup to land on once signed in, already checked. */
type Flow = FlowSecrets & { next: string | null };

function readFlow(req: FastifyRequest): Flow | null {
  const raw = req.cookies[GOOGLE_FLOW_COOKIE];
  if (!raw) return null;
  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid || unsigned.value === null) return null;
  try {
    const v = JSON.parse(unsigned.value) as Partial<FlowSecrets> & { next?: unknown };
    if (typeof v.state !== 'string' || typeof v.verifier !== 'string' || typeof v.nonce !== 'string') return null;
    return { state: v.state, verifier: v.verifier, nonce: v.nonce, next: safeNext(v.next) };
  } catch {
    return null;
  }
}

/**
 * The user a verified Google identity opens, or why not. Links the Google account on a first
 * match. See the header for each rule.
 */
export async function matchGoogleUser(
  db: Database,
  identity: GoogleIdentity,
  now: number,
): Promise<{ user: UserRow } | { refused: 'no-account' | 'linked-elsewhere' }> {
  const staffOk = (user: UserRow) => user.kind !== 'staff' || user.email === identity.email;

  const [linked] = await db.select().from(googleIdentities).where(eq(googleIdentities.sub, identity.sub)).limit(1);
  if (linked) {
    const user = await userById(db, linked.userId);
    if (user) return staffOk(user) ? { user } : { refused: 'no-account' };
    // The linked account was removed. Forget the link and match by email, as on a first visit.
    await db.delete(googleIdentities).where(eq(googleIdentities.sub, identity.sub));
  }

  const user = await userByEmail(db, identity.email);
  if (!user || !staffOk(user)) return { refused: 'no-account' };
  const [other] = await db.select().from(googleIdentities).where(eq(googleIdentities.userId, user.id)).limit(1);
  if (other && other.sub !== identity.sub) return { refused: 'linked-elsewhere' };
  if (!other) {
    // Two tabs finishing at once both reach here; the second insert is a no-op, and the check
    // below finds the first one's row.
    await db.insert(googleIdentities).values({ sub: identity.sub, userId: user.id, linkedAt: new Date(now) }).onConflictDoNothing();
    const [mine] = await db.select().from(googleIdentities).where(eq(googleIdentities.userId, user.id)).limit(1);
    if (!mine || mine.sub !== identity.sub) return { refused: 'linked-elsewhere' };
  }
  return { user };
}

export interface GoogleRouteOptions {
  broadcast: () => void;
  /** Null: not configured, so the routes are 404 and the button is hidden. */
  config: GoogleConfig | null;
}

export function registerGoogleRoutes(app: FastifyInstance, { broadcast, config }: GoogleRouteOptions): void {
  const client = config ? googleClient(config) : null;

  app.get('/api/auth/providers', async (_req, reply) => {
    reply.header('cache-control', 'no-store');
    return { google: client !== null };
  });

  app.get(FLOW_PATH, async (req, reply) => {
    if (!client) return reply.code(404).send({ error: 'Not found' });
    const flow = newFlow();
    // D-151: `?next=/skill-library/<page>`, kept in the signed cookie for the callback. Anything else is dropped.
    const next = safeNext((req.query as Record<string, unknown>).next);
    reply.setCookie(GOOGLE_FLOW_COOKIE, JSON.stringify(next ? { ...flow, next } : flow), { ...flowCookieOptions(), maxAge: FLOW_TTL_S });
    reply.header('cache-control', 'no-store');
    return reply.redirect(authorizationUrl(client.config, flow), 302);
  });

  app.get(
    `${FLOW_PATH}/callback`,
    { config: { rateLimit: { max: LOGIN_IP_MAX, timeWindow: LOGIN_IP_WINDOW } } },
    async (req, reply) => {
      if (!client) return reply.code(404).send({ error: 'Not found' });
      reply.header('cache-control', 'no-store');

      const refuse = (why: GoogleRefusal | null, problem: string): FastifyReply => {
        req.log.info({ problem }, 'google sign-in refused');
        return reply.redirect(why ? `${SIGN_IN_PATH}?google=${why}` : SIGN_IN_PATH, 302);
      };

      // One use: whatever happens next, this browser's flow is over.
      const flow = readFlow(req);
      reply.clearCookie(GOOGLE_FLOW_COOKIE, flowCookieOptions());

      const q = req.query as Record<string, unknown>;
      // The person closed Google's chooser or said no: back to the screen, with nothing to apologise for.
      if (typeof q.error === 'string') return refuse(null, `google:${q.error === 'access_denied' ? 'access_denied' : 'error'}`);
      if (!flow) return refuse('failed', 'no-flow-cookie');
      if (typeof q.state !== 'string' || !sameString(q.state, flow.state)) return refuse('failed', 'state');
      if (typeof q.code !== 'string' || q.code === '' || q.code.length > 2048) return refuse('failed', 'no-code');

      const now = clock.now();
      const result = await client.finish(q.code, flow, now);
      if (!result.ok) return refuse(result.problem === 'unverified' ? 'unverified' : 'failed', result.problem);

      const db = getDb();
      // D-149: an access group's address, verified by Google (`finish` refuses any other). Recorded
      // as proven, as a spent link records it, and given its account if it has none. Logs group ids
      // and whether Google's Workspace domain matches; never the address.
      const groups = await domainGroupsOf(db, result.identity.email, now);
      if (groups.length > 0) {
        await recordVerified(db, result.identity.email, now);
        const made = await accountForGroupAddress(db, result.identity.email, now);
        const hd = result.identity.hd?.trim().toLowerCase() ?? null;
        req.log.info({ groups: groups.map((g) => g.id), made, hd: hd === null ? 'none' : hd === emailDomainOf(result.identity.email) ? 'match' : 'other' }, 'google sign-in for an access group');
      }
      const match = await matchGoogleUser(db, result.identity, now);
      if ('refused' in match) return refuse(match.refused, match.refused);
      const { user } = match;

      let activated = false;
      if (user.kind === 'learner' && user.status === 'invited') {
        await db.update(users).set({ status: 'active', joined: user.joined ?? now }).where(eq(users.id, user.id));
        activated = true;
      }
      const sessionId = await createSession(db, user.id, now, { remember: true });
      await markActive(db, user.id, now);
      reply.setCookie(SESSION_COOKIE, sessionId, sessionCookieOptions(process.env, { remember: true }));
      recordUsage(req, user.id, 'sign_in'); // D-166: a usage count, after the sign-in; it changes nothing here.
      // An activated owner changes a `users` row, which every teammate's Team Hub shows.
      if (activated) broadcast();
      // D-151: the guided setup the visitor came from, when there is one. Otherwise D-150: a learner with
      // no cohort portal (an access group's member) goes straight to the Skill Library.
      return reply.redirect(flow.next ?? (await landingFor(db, user, now)), 302);
    },
  );
}
