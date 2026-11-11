// GoHighLevel (LeadConnector API v2): put a /ai101 waitlist sign-up into the CRM. DECISIONS.md D-033.
//
// The waitlist row in Postgres is the system of record; this file makes a COPY in GHL so marketing
// can work the list there (workflows, the welcome email, the December announcements). It is called
// only by jobs/ghl-sync.ts, after the sign-up is already stored, so nothing here can refuse, slow
// down or lose a sign-up.
//
// AUTH. A Private Integration Token (`pit-…`) with the `contacts.write` scope, sent as a Bearer
// token. HighLevel's v1 location API keys are past end of support. Every call carries `Version`.
//
// TWO CALLS, AND WHY TAGS ARE NOT IN THE FIRST ONE. `POST /contacts/upsert` creates or updates the
// contact by the location's duplicate rule — but its `tags` field OVERWRITES every tag the contact
// already has (HighLevel's own docs). An existing client who joins the waitlist would silently lose
// every tag marketing ever gave them. So the upsert carries no tags, and the tags go in a second
// call, `POST /contacts/{id}/tags`.
//
// THE UNION. HighLevel's docs do not say outright whether that second call appends or replaces. So
// it is sent the UNION of the contact's tags (as the upsert response reports them) and ours. If it
// appends, re-adding a tag the contact already has is a no-op; if it replaces, the union is exactly
// the set that should survive. Correct either way, with no need to have guessed right. The response
// is then checked, and a tag that went missing is reported — by name, never with contact details.
//
// ATTRIBUTION IS IN TAGS, NOT THE `source` FIELD. Tags only ever accumulate; `source` holds one
// value, and an upsert would overwrite an existing client's original lead source with this page.
//
// SMS (D-034). A phone number reaches GHL ONLY with SMS consent. GHL can text any contact that has a
// number — a workflow, a bulk send, a mis-built filter — so the guarantee that someone who did not
// tick the box is never texted is made here, by GHL never having their number at all. A number given
// without consent stays in the waitlist row. With consent, the number goes in the upsert and the
// contact gets `sms-consent`, the tag every SMS workflow should filter on. Email consent comes with
// every sign-up, so there is nothing to gate for email. The consent's proof (when, and the exact
// wording) stays in the row, where the database enforces it; GHL gets the fact, not the evidence.
//
// TEAM SIZE AND DECEMBER INTEREST (D-046). /retool's form asks the visitor's team size and has an
// unchecked "Tell me about the December leadership track" box; both reach GHL as TAGS, for
// attribution's reason (they only accumulate, and marketing filters on them). The size becomes a tag
// through an allow-list (`TEAM_SIZE_TAGS`), as `?src=` does, so nothing but the four sizes can ever
// mint one; the box becomes `december-interest`, on a contact who ticked it and only then. Any row
// that carries them gets them, and only /retool's rows do.
//
// PRIVACY. Nothing this file returns or throws contains the visitor's name, address or phone, the
// token, or a response body (which can echo them). Failures are reported as a kind and a status.

import { GUIDE_SLUGS } from '../routes/guide-list';

/** The API host for v2. */
export const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

/** The `Version` header every v2 call must carry. */
export const GHL_API_VERSION = '2021-07-28';

/** Per request. GHL is a copy, so a slow call just means the next tick tries again. */
export const GHL_TIMEOUT_MS = 10_000;

/** On every waitlist contact. `ai101-waitlist` is the tag GHL workflows trigger on. */
export const WAITLIST_TAGS = ['ai101-waitlist', 'event-expcon-2026'] as const;

/**
 * The tags each kind of sign-up carries, by the row's `source` (D-038). One table holds every form's
 * sign-ups, so the source decides which GHL workflow a contact enters: the waitlist's, or a free
 * guide's (its slug: `task-sync-starter`, D-038; `ops-time-audit`, D-039). A source with no entry gets
 * no form tag at all, never the waitlist's: a new form must be added here before its contacts can
 * trigger anything.
 */
export const SOURCE_TAGS: Readonly<Record<string, readonly string[]>> = {
  'expcon-2026-ai101': WAITLIST_TAGS,
  // The offer page's cohort waitlist (D-076, D-077).
  'cohort-waitlist': ['cohort-waitlist'],
  // Every free guide, tagged with its own slug: `task-sync-starter` (D-038), `ops-time-audit` (D-039),
  // `voice-profile`, Spring's lead magnet (D-040), `reel-editor`, the first Claude skill (D-045),
  // `retool`, the "Retool, Don't Replace" talk's page (D-046), and each skill page after them (D-052
  // on). From `GUIDE_SLUGS`, so a guide added there is tagged without a second list to keep.
  ...Object.fromEntries(GUIDE_SLUGS.map((slug) => [slug, [slug]])),
};

/**
 * The `?src=` values that may become a CRM tag.
 *
 * `src` arrives in a public URL anyone can edit, already reduced to a short slug by
 * routes/ai101.ts. An allow-list stops that URL from minting arbitrary tags in the CRM
 * (`?src=anything` would otherwise become a tag). Anything else is `src-other`, and the raw value is
 * still in the waitlist row.
 */
export const SRC_TAGS: Readonly<Record<string, string>> = { qr: 'src-qr', ig: 'src-ig' };

/** The channel tag for one sign-up's `src`. No `src` means a typed URL or a shared link. */
export function srcTag(src: string | null | undefined): string {
  if (src === null || src === undefined || src.trim() === '') return 'src-direct';
  return SRC_TAGS[src.trim().toLowerCase()] ?? 'src-other';
}

/** On a contact who consented to texts, and only then. SMS workflows filter on it. */
export const SMS_CONSENT_TAG = 'sms-consent';

/**
 * /retool's team sizes (D-046; `TEAM_SIZES` in routes/ai101.ts) and the tag each one becomes. An
 * allow-list for `SRC_TAGS`'s reason, and the database's CHECK already holds the column to these
 * four: this does not trust that alone. `+` is spelled out, since a tag is a word typed into a
 * filter. Any other value, or none, is no team tag at all.
 */
export const TEAM_SIZE_TAGS: Readonly<Record<string, string>> = {
  '1-10': 'team-size-1-10',
  '11-25': 'team-size-11-25',
  '26-50': 'team-size-26-50',
  '51+': 'team-size-51-plus',
};

/**
 * The team-size tag for one sign-up, or null. An OWN key only: a plain lookup would hand back
 * `Object.prototype`'s members for a value such as `constructor`, and a function is not a tag.
 */
export function teamSizeTag(teamSize: string | null | undefined): string | null {
  if (typeof teamSize !== 'string') return null;
  const key = teamSize.trim();
  return Object.hasOwn(TEAM_SIZE_TAGS, key) ? TEAM_SIZE_TAGS[key]! : null;
}

/** On a contact who ticked /retool's "Tell me about the December leadership track" box (D-046). */
export const DECEMBER_INTEREST_TAG = 'december-interest';

/**
 * Every tag one sign-up should carry in GHL. HighLevel stores tags lowercase; these already are.
 * `source` defaults to the waitlist's, which every row had before D-038. `team` is the row's team
 * size and December box (D-046), which only /retool's rows have; left out, it adds nothing.
 */
export function waitlistTags(
  src: string | null | undefined,
  textable = false,
  source = 'expcon-2026-ai101',
  team: Pick<WaitlistContact, 'teamSize' | 'decemberInterest'> = {},
): string[] {
  const size = teamSizeTag(team.teamSize);
  return [
    ...(SOURCE_TAGS[source] ?? []),
    srcTag(src),
    ...(size === null ? [] : [size]),
    ...(team.decemberInterest === true ? [DECEMBER_INTEREST_TAG] : []),
    ...(textable ? [SMS_CONSENT_TAG] : []),
  ];
}

/** Consented AND has a number. The database refuses consent without one; this does not trust that. */
export const isTextable = (c: Pick<WaitlistContact, 'phone' | 'smsConsent'>): boolean =>
  c.smsConsent === true && typeof c.phone === 'string' && c.phone.trim() !== '';

export interface GhlConfig {
  token: string;
  locationId: string;
}

/**
 * The integration's configuration, or null when it is switched off.
 *
 * BOTH variables or nothing, and no default for either: a half-configured integration is off, not
 * guessing. That is also what makes it safe to deploy before the variables exist in Railway.
 */
export function readGhlConfig(env: NodeJS.ProcessEnv = process.env): GhlConfig | null {
  const token = (env.GHL_TOKEN ?? '').trim();
  const locationId = (env.GHL_LOCATION_ID ?? '').trim();
  if (token === '' || locationId === '') return null;
  return { token, locationId };
}

/** One sign-up, as the sync job reads it from the waitlist row. */
export interface WaitlistContact {
  firstName: string;
  email: string;
  brokerage: string | null;
  src: string | null;
  /** E.164, or null. Sent to GHL only when `smsConsent` is true. */
  phone: string | null;
  smsConsent: boolean;
  /** Which form the sign-up came from (the row's `source`): it picks the tags. Waitlist by default. */
  source?: string;
  /**
   * /retool's two (D-046): one of its four team sizes, and whether the December box was ticked. Null
   * and false on every other form's row; optional, like `source`, so a caller that predates them
   * means "neither".
   */
  teamSize?: string | null;
  decemberInterest?: boolean;
}

/** Why a sync did not happen. A kind and a status, never a body. */
export type GhlFailureKind =
  | 'unauthorized' // 401/403: the token is wrong, revoked, or lacks contacts.write
  | 'rejected' // 400/422: GHL refused the request
  | 'rate-limited' // 429
  | 'server' // 5xx
  | 'timeout'
  | 'network'
  | 'malformed'; // a 2xx we could not read a contact id out of

export type GhlResult =
  | {
      ok: true;
      contactId: string;
      /** HighLevel's own word on whether the upsert created the contact. */
      created: boolean;
      /** Tags the contact had before that the response no longer lists. Should always be empty. */
      tagsDropped: string[];
    }
  | { ok: false; kind: GhlFailureKind; status?: number; step: 'upsert' | 'tags' };

export type Fetch = typeof fetch;

export interface SyncOptions {
  config: GhlConfig;
  fetch?: Fetch;
  timeoutMs?: number;
}

function kindForStatus(status: number): GhlFailureKind {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rate-limited';
  if (status >= 500) return 'server';
  return 'rejected';
}

type CallResult = { ok: true; body: unknown } | { ok: false; kind: GhlFailureKind; status?: number };

async function call(path: string, body: unknown, options: SyncOptions): Promise<CallResult> {
  const doFetch = options.fetch ?? fetch;
  let res: Response;
  try {
    res = await doFetch(`${GHL_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.config.token}`,
        Version: GHL_API_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs ?? GHL_TIMEOUT_MS),
    });
  } catch (err) {
    // An abort from the timeout surfaces as a TimeoutError (or AbortError on older runtimes).
    const name = (err as { name?: string } | null)?.name;
    return { ok: false, kind: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network' };
  }
  if (!res.ok) return { ok: false, kind: kindForStatus(res.status), status: res.status };
  try {
    return { ok: true, body: await res.json() };
  } catch {
    return { ok: false, kind: 'malformed', status: res.status };
  }
}

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const asTags = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string').map((t) => t.toLowerCase()) : [];

/**
 * Create or update the contact for one sign-up, then tag it.
 *
 * Idempotent: the same sign-up synced twice lands on the same contact (the upsert matches it) with
 * the same tags (re-adding a tag is a no-op). That is what lets the sync job retry freely, and what
 * makes a second replica running the same row harmless rather than a duplicate.
 */
export async function syncWaitlistContact(contact: WaitlistContact, options: SyncOptions): Promise<GhlResult> {
  const upsertBody: Record<string, unknown> = {
    locationId: options.config.locationId,
    email: contact.email,
    firstName: contact.firstName,
  };
  // Only when the visitor gave one: an empty value would blank an existing contact's company.
  if (contact.brokerage && contact.brokerage.trim() !== '') upsertBody.companyName = contact.brokerage.trim();
  // See the header: no consent, no number in the CRM.
  const textable = isTextable(contact);
  if (textable) upsertBody.phone = contact.phone!.trim();
  return upsertAndTag(upsertBody, waitlistTags(contact.src, textable, contact.source, contact), options);
}

// --- buyers (D-076) ---------------------------------------------------------------------------------
// The offer's orders reach GHL the same way: the order row is the record, GHL a copy, tags only ever
// added. The tags below drive Sarah O.'s welcome and intake workflows and Matt's follow-ups, and are
// Connor's to approve. `offer-buyer` rather than `buyer`: in a CRM of real estate contacts, "buyer"
// already means a home buyer.

/** Every tag a buyer can carry, for the approval list and the test that holds it. */
export const BUYER_TAGS = {
  buyer: 'offer-buyer',
  plan: (plan: string) => `plan-${plan}`,
  payFull: 'pay-full',
  payTwo: 'pay-two',
  /** Amplified Insiders' two ways to pay (D-104). */
  payYear: 'pay-year',
  payMonthly: 'pay-monthly',
  abandoned: (plan: string) => `checkout-abandoned-${plan}`,
  paymentFailed: 'payment-failed',
  membershipEnded: 'membership-ended',
  refunded: 'refunded',
  forum: 'event-forum-nov-2026',
} as const;

/** The facts about one order that decide its tags. */
export interface BuyerFacts {
  plan: string;
  option: string;
  status: string;
  paidAt: number | null;
  paymentFailedAt: number | null;
  membershipEndedAt: number | null;
  refundedAt: number | null;
  campaign: string | null;
  smsConsent: boolean;
  phone: string | null;
}

const OFFER_PLANS = ['library', 'cohort', 'agents', 'membership'];

/** The tags one order should carry now. Tags are never removed, so a later event only adds. */
export function buyerTags(o: BuyerFacts): string[] {
  if (!OFFER_PLANS.includes(o.plan)) return [];
  const tags: string[] = [];
  const bought = o.paidAt !== null || o.status === 'paid' || o.status === 'trialing' || o.refundedAt !== null;
  if (bought) {
    tags.push(BUYER_TAGS.buyer, BUYER_TAGS.plan(o.plan));
    if (o.plan === 'cohort') tags.push(o.option === 'two_pay' ? BUYER_TAGS.payTwo : BUYER_TAGS.payFull);
    if (o.plan === 'membership') tags.push(o.option === 'year_upfront' ? BUYER_TAGS.payYear : BUYER_TAGS.payMonthly);
  } else if (o.status === 'expired') {
    tags.push(BUYER_TAGS.abandoned(o.plan));
  }
  if (o.paymentFailedAt !== null) tags.push(BUYER_TAGS.paymentFailed);
  if (o.membershipEndedAt !== null) tags.push(BUYER_TAGS.membershipEnded);
  if (o.refundedAt !== null) tags.push(BUYER_TAGS.refunded);
  if (tags.length && o.campaign === 'forum') tags.push(BUYER_TAGS.forum);
  if (tags.length && isTextable(o)) tags.push(SMS_CONSENT_TAG);
  return tags;
}

export interface BuyerContact extends BuyerFacts {
  name: string | null;
  email: string;
  company: string | null;
}

/** Create or update the buyer's contact and add the order's tags. Idempotent, like the waitlist's. */
export async function syncBuyerContact(contact: BuyerContact, options: SyncOptions): Promise<GhlResult> {
  const upsertBody: Record<string, unknown> = { locationId: options.config.locationId, email: contact.email };
  const name = (contact.name ?? '').trim();
  if (name) {
    const [first, ...rest] = name.split(/\s+/);
    upsertBody.firstName = first;
    if (rest.length) upsertBody.lastName = rest.join(' ');
  }
  if (contact.company && contact.company.trim() !== '') upsertBody.companyName = contact.company.trim();
  if (isTextable(contact)) upsertBody.phone = contact.phone!.trim();
  return upsertAndTag(upsertBody, buyerTags(contact), options);
}

/** The upsert, then the tags as a union with what the contact already has (see the header). */
async function upsertAndTag(upsertBody: Record<string, unknown>, ours: readonly string[], options: SyncOptions): Promise<GhlResult> {
  const upserted = await call('/contacts/upsert', upsertBody, options);
  if (!upserted.ok) return { ok: false, kind: upserted.kind, step: 'upsert', ...statusOf(upserted) };

  const body = asRecord(upserted.body);
  const record = asRecord(body?.contact) ?? body;
  const contactId = typeof record?.id === 'string' && record.id !== '' ? record.id : null;
  if (!contactId) return { ok: false, kind: 'malformed', step: 'upsert' };
  const created = body?.new === true;
  const before = asTags(record?.tags);

  const union = [...new Set([...before, ...ours])];
  const tagged = await call(`/contacts/${encodeURIComponent(contactId)}/tags`, { tags: union }, options);
  if (!tagged.ok) return { ok: false, kind: tagged.kind, step: 'tags', ...statusOf(tagged) };

  // The response lists the contact's tags after the operation. If it carries no list at all there is
  // nothing to check against, which is not the same as a dropped tag.
  const afterRaw = asRecord(tagged.body)?.tags;
  const after = new Set(asTags(afterRaw));
  const tagsDropped = Array.isArray(afterRaw) ? before.filter((t) => !after.has(t)) : [];

  return { ok: true, contactId, created, tagsDropped };
}

function statusOf(r: { status?: number }): { status?: number } {
  return r.status === undefined ? {} : { status: r.status };
}
