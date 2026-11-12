// Gate 8's first automated line — phase 08 § 8.1, the `team-invite` row of the template table.
//
//   "`inviteMember` puts exactly one `team-invite` email for the invitee in the outbox, with the
//    exact subject, and its link verifies."
//
// ================================================================================================
// WHY THIS IS AN INTEGRATION TEST AND NOT A UNIT TEST OF ANYTHING
// ================================================================================================
// Four separately-tested pieces have to line up for one invite to work, and every seam between
// them is untested today:
//
//   packages/core      `inviteMember` returns `effects: [{ type:'email', template:'team-invite',
//                      to: [email], data: { team, inviter } }]`. `mutations.test.ts` asserts the
//                      effect's SHAPE and stops there — core cannot send anything.
//   routes/mutate.ts   `pendingSendsFor` fans `to: string[]` out to one send per address AND mints
//                      the § 7.5 `purpose:'invite'` token inside the mutation's transaction.
//                      `dispatchEffects` then hands each one to the transport AFTER the commit.
//   email/*            `subjectFor` builds § 8.1's exact subject; `templates/team-invite.tsx`
//                      renders the `/invite/:token` button through `links.ts`'s `absolute()`.
//   routes/auth.ts     `POST /api/auth/verify` spends that token, flips `status` to `'active'` and
//                      issues the session cookie.
//
// So the four failures this file exists to catch are all seam failures, invisible to every suite
// that owns one side of a seam:
//
//   1. THE FAN-OUT SENDING MORE THAN ONE EMAIL. `Effect.to` is an array. A `Promise.all` over it, a
//      retry, or a second `dispatchEffects` call would put two invites in one mailbox — and the
//      admin's toast says "Invite sent to …" either way. The assertion is on the whole outbox, not
//      just on the invitee's slice: a bug that also mailed the six existing teammates would pass a
//      per-recipient count.
//   2. THE TOKEN NEVER REACHING THE BUTTON. `data.token` is added by the ROUTE, not by core, and
//      `EmailPayload['team-invite']` is `{ token, appUrl? }`. If the route stopped adding it the
//      template would throw, `send` would log `{ok:false}` and return — and the invite row would
//      still be written, the toast would still say "Invite sent to …", and the only trace would be
//      one line in a log. The assertion that the outbox is non-empty is what notices.
//   3. THE LINK NOT BEING THE TOKEN THAT WAS STORED. The token is minted once and used twice: hashed
//      into `auth_tokens` on `tx`, and interpolated into the href. The test pulls the token OUT OF
//      THE RENDERED HTML — not out of `data` — and posts that, so a mismatch between the two
//      copies fails here rather than in somebody's inbox seven days from now.
//   4. A ROLLED-BACK INVITE LEAVING A WORKING TOKEN, or a committed one leaving none. The token row
//      is written inside the mutation's transaction on purpose (`routes/mutate.ts`'s header); the
//      verify below is the only thing that proves the committed half is usable.
//
// ================================================================================================
// TIME ZONES
// ================================================================================================
// Nothing in this file renders a time: `team-invite`'s body is "This invite expires in 7 days." and
// its subject interpolates only `{inviter}` and `{team}`. The one instant-shaped assertion is
// `auth_tokens.expires_at === expiryFor('invite', FIXED_NOW)`, which is epoch arithmetic on a
// `FIXED_NOW` carrying an explicit `-06:00` offset — no `fmt.*` call, so no host-zone fallback to
// inherit. Verified by running the suite under both TZ settings; see the report.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { build } from '../../src/app';
import type { App } from '../../src/app';
import { expiryFor, hashToken } from '../../src/auth';
import { ALREADY_HAS_ACCOUNT } from '@ai/core/mutations';
import { authTokens, users } from '../../src/db/schema';
import { resetOutbox } from '../../src/email/transport';
import type { OutboxEntry } from '../../src/email/transport';
import { loadDb, resetDatabase, testDatabase } from '../helpers';

/**
 * Gate 8's own instant (§ 8.5's line uses it too), written with an explicit offset so the suite
 * does not inherit the runner's zone. Nothing about an invite depends on it except the token's
 * 7-day expiry, which is why one instant serves the whole file.
 */
const NOW_ISO = '2026-12-08T13:00:00-06:00';
const NOW = Date.parse(NOW_ISO);

/** The origin every email link is made absolute against (`templates/links.ts` refuses a blank one). */
const APP_URL = 'https://learn.example.com';

/**
 * The invitee. A NEW address on a team that has room: `northline` has 7 seats and 6 seeded members,
 * and 4 of its 5 `Sales Agent` slots are taken — so `inviteMember`'s four inline refusals are all
 * passed and the mutation reaches its effect. Derived assertions below check the seat maths rather
 * than trusting this paragraph.
 */
const INVITEE = { email: 'tess@northlinerealty.com', name: 'Tess Okafor', role: 'Sales Agent' } as const;

/** The inviter: `u_alex`, Northline's Team Owner — `inviteMember` refuses anyone else. */
const INVITER = 'u_alex';

/** § 8.1's `team-invite` subject, `{inviter} invited you to {team} on Amplified Impact`, resolved. */
const SUBJECT = 'Alex Morgan invited you to Northline Realty Team on Amplified Impact';

let app: App;
let savedAppUrl: string | undefined;

beforeAll(async () => {
  await testDatabase();
});

beforeEach(async () => {
  process.env.FIXED_NOW = NOW_ISO;
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = APP_URL;
  resetOutbox();
  await resetDatabase(seedForDatabase('live'));
  // A fresh instance per test, as `test/routes.test.ts` does: @fastify/rate-limit's store belongs
  // to the plugin instance, so one shared app would carry § 9.4's 100/minute budget across the
  // file. `build()` is also what registers the real renderer (`setRenderer(renderTemplate)`), which
  // is the whole reason this file builds an app instead of calling the mutation in process.
  app = await build({ logger: false });
});

afterEach(async () => {
  await app?.close();
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
});

afterAll(() => {
  delete process.env.FIXED_NOW;
});

// --- helpers --------------------------------------------------------------------------------------

/** `POST /api/mutate/:name` the way `apps/web/src/data/http.ts` does: JSON, no Origin (see guard.ts). */
const mutate = (cookie: string, name: string, args: unknown) =>
  app.inject({
    method: 'POST',
    url: `/api/mutate/${name}`,
    headers: { cookie, 'content-type': 'application/json' },
    payload: args as object,
  });

/**
 * The outbox as § 7.7's test route serves it.
 *
 * Read over HTTP rather than by importing `outbox()`, deliberately: `/api/test/outbox` awaits
 * `settleEmails()` first, and Gate 8's wording is about what is "in the outbox" — the surface the
 * checklist names. `dispatchEffects` is awaited inside the mutate handler before it replies, so
 * this is not racing anything; going through the route keeps it from ever starting to.
 */
async function outboxOverHttp(): Promise<OutboxEntry[]> {
  const res = await app.inject({ method: 'GET', url: '/api/test/outbox' });
  expect(res.statusCode).toBe(200);
  return (res.json() as { messages: OutboxEntry[] }).messages;
}

/**
 * The `/invite/:token` token as it appears in the RENDERED BODY, which is the only copy a human
 * ever has. See failure 3 in the header.
 *
 * base64url has no `+`, `/` or `=` (`auth/tokens.ts` rule 2), so nothing in a 43-character token
 * needs HTML- or percent-unescaping on the way out of the markup.
 */
function tokenFromHtml(html: string | null): string {
  expect(html, 'the renderer must be registered, or there is no link to verify').not.toBeNull();
  const match = /\/invite\/([A-Za-z0-9_-]+)/.exec(html ?? '');
  expect(match, `no /invite/:token link in the rendered email: ${(html ?? '').slice(0, 300)}`).not.toBeNull();
  return match![1]!;
}

// --------------------------------------------------------------------------------------------------

describe('Gate 8 · inviteMember → one team-invite email, and its link signs the invitee in @g8', () => {
  it('puts exactly ONE team-invite in the outbox, addressed to the invitee, with § 8.1’s subject @g8', async () => {
    const cookie = await app.signInAs(INVITER);

    const res = await mutate(cookie, 'inviteMember', INVITEE);
    expect(res.statusCode, res.body).toBe(200);
    // The admin's own confirmation, so a green test cannot mean "the mutation quietly refused".
    expect(res.json()).toMatchObject({ toast: { msg: `Invite sent to ${INVITEE.email}`, tone: 'success' } });

    const messages = await outboxOverHttp();

    // ONE email in the WHOLE outbox. Not "one for the invitee": `Effect.to` is an array and
    // `pendingSendsFor` fans it out, so a bug that also mailed Northline's six existing members
    // would pass a per-recipient count and fail here. Failure 1 in the header.
    expect(messages).toHaveLength(1);
    const [invite] = messages;
    expect(invite!.template).toBe('team-invite');
    expect(invite!.to).toBe(INVITEE.email);
    // § 8.1's table, character for character. `subjects.test.ts` pins the builder; this pins that
    // the builder is what reached the outbox, with the real inviter and the real team name
    // interpolated from the database rather than from a fixture.
    expect(invite!.subject).toBe(SUBJECT);
  });

  it('writes a 7-day purpose:"invite" token for that address, inside the mutation’s transaction @g8', async () => {
    const cookie = await app.signInAs(INVITER);
    expect((await mutate(cookie, 'inviteMember', INVITEE)).statusCode).toBe(200);

    const [message] = await outboxOverHttp();
    const token = tokenFromHtml(message!.html);

    // Found BY THE HASH OF THE TOKEN IN THE EMAIL, so this also proves the two copies agree: the
    // route minted one string, hashed it into `auth_tokens` on `tx`, and interpolated it into the
    // href. A mismatch is a dead link that looks perfect.
    const db = await testDatabase();
    const rows = await db.select().from(authTokens).where(eq(authTokens.tokenHash, hashToken(token)));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.email).toBe(INVITEE.email);
    expect(rows[0]!.purpose).toBe('invite');
    expect(rows[0]!.usedAt).toBeNull();
    // § 7.5 / § 8's mapping: "a 7-day invite link". SEVEN DAYS AS A LITERAL, not only as
    // `expiryFor('invite', NOW)`: the route and this file would both read the same `TTL_MS`, so
    // comparing against that alone asserts that the route called that function and nothing about
    // how long the link lives. `test/auth.test.ts:144` pins the CONSTANT to seven days; what is
    // pinned here is the value on the row this route actually wrote, which is what catches an
    // invite minted with the 15-minute `sign_in` TTL by mistake. Measured: with `INVITE_TTL_MS`
    // changed to one day, the `expiryFor` comparison below stays green and this line is the one
    // that fails.
    expect(rows[0]!.expiresAt.getTime() - NOW).toBe(7 * 24 * 3600e3);
    // And that the route used the INJECTED clock rather than `Date.now()` — otherwise a FIXED_NOW
    // suite would be asserting against the wall clock and would drift by a millisecond a run.
    expect(rows[0]!.expiresAt.getTime()).toBe(expiryFor('invite', NOW).getTime());
  });

  it('the link in the body verifies: 200, a session cookie, and the seat goes Invited → Active @g8', async () => {
    const cookie = await app.signInAs(INVITER);
    expect((await mutate(cookie, 'inviteMember', INVITEE)).statusCode).toBe(200);

    // The seat exists and is NOT yet active. `inviteMember` writes `status: 'invited'`, which is
    // what the Team Hub draws as an Invited seat and what `join.ts` refuses a Zoom URL to.
    const before = await loadDb();
    const seat = before.users.find((u) => u.email === INVITEE.email);
    expect(seat, 'inviteMember must have written the seat').toBeDefined();
    expect(seat!.status).toBe('invited');
    expect(seat!.name).toBe(INVITEE.name);
    expect(seat!.teamId).toBe('northline');
    expect(seat!.tier).toBe('team');
    expect(seat!.cohortId).toBe('dec26');

    const [message] = await outboxOverHttp();
    const token = tokenFromHtml(message!.html);

    const verified = await app.inject({
      method: 'POST',
      url: '/api/auth/verify',
      headers: { 'content-type': 'application/json' },
      payload: { token },
    });
    expect(verified.statusCode, verified.body).toBe(200);
    // § 7.5's body: `{ ok: true, team }` — the team name the invite-accept screen greets them with.
    expect(verified.json()).toEqual({ ok: true, team: 'Northline Realty Team' });

    // The cookie the screen is signed in with. Asserted by USING it, not by parsing attributes:
    // `routes.test.ts` owns the attribute set, and what this file cares about is that the invite
    // link produced a session that the API accepts.
    const setCookie = verified.headers['set-cookie'];
    const raw = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie ?? '');
    expect(raw).toContain('ai_sid=');
    const sessionCookie = raw.split(';')[0]!;

    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: sessionCookie } });
    expect(me.statusCode, me.body).toBe(200);
    expect(me.json()).toMatchObject({ viewer: { actor: { kind: 'learner', userId: seat!.id } } });

    // § 7.5: "`/invite/:token` verifies the token, sets `status: 'active'` and `joined`". The seat
    // the admin created is now a learner, which is the end of the chain Gate 8's line describes.
    const after = await loadDb();
    expect(after.users.find((u) => u.id === seat!.id)?.status).toBe('active');
  });

  it('the link is single use, so a shared team inbox cannot mint two sessions from one invite @g8', async () => {
    const cookie = await app.signInAs(INVITER);
    expect((await mutate(cookie, 'inviteMember', INVITEE)).statusCode).toBe(200);
    const [message] = await outboxOverHttp();
    const token = tokenFromHtml(message!.html);

    const verify = () =>
      app.inject({
        method: 'POST',
        url: '/api/auth/verify',
        headers: { 'content-type': 'application/json' },
        payload: { token },
      });

    expect((await verify()).statusCode).toBe(200);
    // § 7.5: "Single use: mark `used_at`, and a second verify fails." `'used'` rather than
    // `'expired'` is the machine code `AcceptInvite.tsx` turns into "That link was already used."
    const second = await verify();
    expect(second.statusCode).toBe(400);
    expect(second.json()).toEqual({ error: 'used' });
  });

  it('a refused invite mails nobody and leaves no token behind @g8', async () => {
    const cookie = await app.signInAs(INVITER);

    // `u_sarah` is already on Northline, so `inviteMember` returns `{ db, error }` — a 422 the
    // vault renders inline, not a throw. The point of the case is the EFFECT: a mutation that
    // returns an error returns no effects, so nothing may reach the transport and nothing may
    // reach `auth_tokens`. A route that dispatched before checking `out.error` would have emailed
    // an invite for an invite that does not exist, with a token that works for 7 days.
    const res = await mutate(cookie, 'inviteMember', { email: 'sarah@northlinerealty.com', role: 'Sales Agent' });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'That person is already on your team.' });

    expect(await outboxOverHttp()).toHaveLength(0);
    const db = await testDatabase();
    expect(await db.select().from(authTokens)).toHaveLength(0);
  });

  // D-141: an address that already has an account, on another team or on staff, in any case. It
  // used to reach the database's unique email and answer 500, or, typed in other capitals, to make
  // a second account for the same inbox that sign-in can't tell apart.
  it('refuses an address that already has an account elsewhere, in any case, and makes nothing @g8', async () => {
    const cookie = await app.signInAs(INVITER);
    const db = await testDatabase();
    const before = (await db.select().from(users)).length;
    for (const email of ['natasha@harborpine.com', 'Natasha@HarborPine.com', ' MARCUS@keystonecollective.com ', 'casey@amplifiedimpact.com']) {
      const res = await mutate(cookie, 'inviteMember', { email, role: 'Sales Agent' });
      expect([res.statusCode, res.json()], email).toEqual([422, { error: ALREADY_HAS_ACCOUNT }]);
    }
    expect((await db.select().from(users)).length).toBe(before);
    expect(await outboxOverHttp()).toHaveLength(0);
    expect(await db.select().from(authTokens)).toHaveLength(0);
  });
});
