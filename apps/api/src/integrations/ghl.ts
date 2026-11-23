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
//
// D-134 ADDS, AND CHANGES NOTHING ABOVE: marketing aliases next to the existing tags (`ai-lead-free-
// skills`, `ai-buyer-*`, `ai-refunded`, `ai-canceled`), `lms-logged-in` for a learner's first sign-in,
// contact custom fields and one opportunity in one pipeline. The last two are off until Connor sets
// their ids (GHL_FIELD_*, GHL_PIPELINE_ID and GHL_STAGE_*), and a failure in either never undoes or
// blocks the contact and its tags, which are written first. They live at the end of this file.

import { createHash } from 'node:crypto';
import { ACCELERATOR_COHORT_ID } from '@ai/core/accelerator';
import { PLAN_NAMES } from '@ai/core/offer';
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
 * The five free skills' sign-up sources ("Get 5 Free Skills", D-134). Each keeps its own slug tag; this
 * adds one pack tag beside it, so marketing can filter the pack without listing five slugs. The same
 * five as the Library's `FREE_FIVE` (apps/web) and core's `FREE_SKILLS` plus the Voice Profile.
 */
export const FREE_SKILL_SOURCES: readonly string[] = ['ai-brain-setup', 'voice-profile', 'ai-brain-tuneup', 'perfect-week', 'inbox-meeting-follow-through'];
export const FREE_SKILLS_TAG = 'ai-lead-free-skills';

/** A learner's first sign-in to the LMS (D-134). */
export const LMS_LOGGED_IN_TAG = 'lms-logged-in';

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
    ...(FREE_SKILL_SOURCES.includes(source) ? [FREE_SKILLS_TAG] : []),
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
  /** D-134: contact custom field ids, by what they hold. A field with no id is never written. */
  fields?: Partial<Record<FieldKey, string>>;
  /** D-134: the one pipeline this app writes to, and its stage ids. Null or absent: no opportunities. */
  pipeline?: GhlPipeline | null;
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
  return { token, locationId, fields: readFieldIds(env), pipeline: readPipeline(env) };
}

/**
 * The pause switch (D-134): `GHL_SYNC_ENABLED=false`, exactly, stops the loop without deleting the
 * token from Railway. Unset, or any other value, changes nothing: the loop runs whenever
 * `readGhlConfig` is on, as it did before this switch existed.
 */
export const ghlSyncPaused = (env: NodeJS.ProcessEnv = process.env): boolean => (env.GHL_SYNC_ENABLED ?? '').trim() === 'false';

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
  | { ok: false; kind: GhlFailureKind; status?: number; step: GhlStep };

/** Which call failed. `fields` and `opportunity` are D-134's, and come after the contact and its tags. */
export type GhlStep = 'upsert' | 'tags' | 'fields' | 'opportunity';

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

export type CallResult = { ok: true; body: unknown } | { ok: false; kind: GhlFailureKind; status?: number };

/** One v2 call. Exported for the location scripts (`ghl-location.ts`); the sync goes through the functions above. */
export async function call(path: string, body: unknown, options: SyncOptions, method: 'POST' | 'PUT' | 'GET' = 'POST'): Promise<CallResult> {
  const doFetch = options.fetch ?? fetch;
  let res: Response;
  try {
    res = await doFetch(`${GHL_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${options.config.token}`,
        Version: GHL_API_VERSION,
        ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
        Accept: 'application/json',
      },
      ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
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

/** A plan kind as a tag word: `agent_plan` is `agent-plan`, like every other tag's hyphens. */
const tagWord = (plan: string): string => plan.replace(/_/g, '-');

/** Every tag a buyer can carry, for the approval list and the test that holds it. */
export const BUYER_TAGS = {
  buyer: 'offer-buyer',
  plan: (plan: string) => `plan-${tagWord(plan)}`,
  payFull: 'pay-full',
  payTwo: 'pay-two',
  /** Amplified Insiders' two ways to pay (D-104); `pay-monthly` is also the Agent Plan's monthly. */
  payYear: 'pay-year',
  payMonthly: 'pay-monthly',
  /** The Amplified Agent Plan paid yearly, a price that renews each year (D-106). Not Insiders' `pay-year`. */
  payYearly: 'pay-yearly',
  /**
   * D-134's marketing aliases, beside the tags above (which stay exactly as they are): one per plan
   * sold, and one each for a full refund and an ended membership. The Skill Library has none.
   */
  alias: { cohort: 'ai-buyer-accelerator', membership: 'ai-buyer-insiders', agent_plan: 'ai-buyer-agent-plan', agents: 'ai-buyer-team-plan' } as Readonly<Record<string, string>>,
  refundedAlias: 'ai-refunded',
  canceledAlias: 'ai-canceled',
  abandoned: (plan: string) => `checkout-abandoned-${tagWord(plan)}`,
  paymentFailed: 'payment-failed',
  membershipEnded: 'membership-ended',
  refunded: 'refunded',
  forum: 'event-forum-nov-2026',
  /** A $37 skill. Tags only. No workflow is started from these. */
  skillBuyer: 'bought-skill-37',
  skill: (id: string) => `skill-${id}`,
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

const OFFER_PLANS = ['library', 'cohort', 'agents', 'membership', 'agent_plan'];

/** The tags one order should carry now. Tags are never removed, so a later event only adds. */
export function buyerTags(o: BuyerFacts): string[] {
  if (!OFFER_PLANS.includes(o.plan)) return [];
  const tags: string[] = [];
  const bought = o.paidAt !== null || o.status === 'paid' || o.status === 'trialing' || o.refundedAt !== null;
  if (bought) {
    tags.push(BUYER_TAGS.buyer, BUYER_TAGS.plan(o.plan));
    if (o.plan === 'cohort') tags.push(o.option === 'two_pay' ? BUYER_TAGS.payTwo : BUYER_TAGS.payFull);
    if (o.plan === 'membership') tags.push(o.option === 'year_upfront' ? BUYER_TAGS.payYear : BUYER_TAGS.payMonthly);
    if (o.plan === 'agent_plan') tags.push(o.option === 'yearly' ? BUYER_TAGS.payYearly : BUYER_TAGS.payMonthly);
    if (Object.hasOwn(BUYER_TAGS.alias, o.plan)) tags.push(BUYER_TAGS.alias[o.plan]!);
  } else if (o.status === 'expired') {
    tags.push(BUYER_TAGS.abandoned(o.plan));
  }
  if (o.paymentFailedAt !== null) tags.push(BUYER_TAGS.paymentFailed);
  if (o.membershipEndedAt !== null) tags.push(BUYER_TAGS.membershipEnded, BUYER_TAGS.canceledAlias);
  if (o.refundedAt !== null) tags.push(BUYER_TAGS.refunded, BUYER_TAGS.refundedAlias);
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

/** A skill bought on its own. The contact and two tags. No opportunity and no workflow. */
export async function syncSkillContact(
  contact: { email: string; name: string | null; skillId: string },
  options: SyncOptions,
): Promise<GhlResult> {
  const upsertBody: Record<string, unknown> = { locationId: options.config.locationId, email: contact.email, ...nameParts(contact.name) };
  return upsertAndTag(upsertBody, [BUYER_TAGS.skillBuyer, BUYER_TAGS.skill(contact.skillId)], options);
}

/** The upsert, then the tags as a union with what the contact already has (see the header). */
export async function upsertAndTag(upsertBody: Record<string, unknown>, ours: readonly string[], options: SyncOptions): Promise<GhlResult> {
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

// --- D-134: a learner's first sign-in ---------------------------------------------------------------

/** The learner as the login queue reads them: no phone, so the number rule cannot even come up. */
export interface LoginContact {
  email: string;
  name: string | null;
}

/** Create or update the learner's contact and add `lms-logged-in`. Idempotent, like the others. */
export async function syncLoginContact(contact: LoginContact, options: SyncOptions): Promise<GhlResult> {
  const upsertBody: Record<string, unknown> = { locationId: options.config.locationId, email: contact.email, ...nameParts(contact.name) };
  return upsertAndTag(upsertBody, [LMS_LOGGED_IN_TAG], options);
}

/** "Pat Q. Buyer" as GHL's first and last name. Nothing at all for no name: an empty one would blank it. */
function nameParts(name: string | null): Record<string, string> {
  const [first, ...rest] = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!first) return {};
  return rest.length ? { firstName: first, lastName: rest.join(' ') } : { firstName: first };
}

// --- D-134: custom fields and the pipeline, each off until its ids are set ---------------------------
//
// IDS, NEVER NAMES. Connor creates the fields and the pipeline in GHL (or `ghl:setup` does) and pastes
// their ids into Railway. The code has no default for any of them, so a deploy before he does writes
// exactly what it wrote before: the contact and its tags.
//
// NEVER BLANK A FIELD. A value is sent only when there is one: no empty string, no null, no zero
// amount. An existing contact's field is therefore never cleared by this app.
//
// ONE OPPORTUNITY PER CONTACT, IN ONE PIPELINE. Found by contact and pipeline, created if missing, and
// moved only forward: a lead stage never replaces a purchase stage, and among the purchase stages it
// follows what the contact's orders say now (`contactTarget` in jobs/ghl-extras.ts), so a refunded
// opportunity goes back to Purchased only when a paid order that is not refunded exists. A stage this
// app does not know (one Connor added and moved the deal to) is left alone by any lead stage.

/** The contact custom fields, and the Railway variable that holds each one's id. */
export const FIELD_ENV = {
  offer: 'GHL_FIELD_OFFER',
  cohort: 'GHL_FIELD_COHORT',
  amount: 'GHL_FIELD_AMOUNT',
  purchaseDate: 'GHL_FIELD_PURCHASE_DATE',
  lmsLogin: 'GHL_FIELD_LMS_LOGIN',
} as const;
export type FieldKey = keyof typeof FIELD_ENV;

/** The pipeline's stages, and the variable that holds each one's id. Only `GHL_PIPELINE_ID` and the ones set are used. */
export const STAGE_ENV = {
  lead: 'GHL_STAGE_LEAD',
  freeSkills: 'GHL_STAGE_FREE_SKILLS',
  checkoutStarted: 'GHL_STAGE_CHECKOUT_STARTED',
  purchased: 'GHL_STAGE_PURCHASED',
  paymentFailed: 'GHL_STAGE_PAYMENT_FAILED',
  canceled: 'GHL_STAGE_CANCELED',
  refunded: 'GHL_STAGE_REFUNDED',
} as const;
export type StageKey = keyof typeof STAGE_ENV;

export interface GhlPipeline {
  id: string;
  stages: Partial<Record<StageKey, string>>;
}

/** The value `LMS Login` gets after a learner's first sign-in. */
export const LMS_SIGNED_IN = 'signed-in';

function readFieldIds(env: NodeJS.ProcessEnv): Partial<Record<FieldKey, string>> {
  const out: Partial<Record<FieldKey, string>> = {};
  for (const [key, name] of Object.entries(FIELD_ENV) as [FieldKey, string][]) {
    const id = (env[name] ?? '').trim();
    if (id !== '') out[key] = id;
  }
  return out;
}

function readPipeline(env: NodeJS.ProcessEnv): GhlPipeline | null {
  const id = (env.GHL_PIPELINE_ID ?? '').trim();
  if (id === '') return null;
  const stages: Partial<Record<StageKey, string>> = {};
  for (const [key, name] of Object.entries(STAGE_ENV) as [StageKey, string][]) {
    const stage = (env[name] ?? '').trim();
    if (stage !== '') stages[key] = stage;
  }
  return Object.keys(stages).length ? { id, stages } : null;
}

/** Bumped when what a sync writes changes, so every row is synced again once (D-134). */
export const SYNC_VERSION = 2;

const shortHash = (v: unknown): string => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 10);

/**
 * What a completed sync of a row wrote, as a short string the row keeps (`ghl_sync_stamp`). A row
 * whose stamp differs from today's is synced again ONCE, through the same loop, batch and backoff as
 * any other: that is the backfill when this code ships, when Connor adds a field or the pipeline, and
 * when `GHL_LOCATION_ID` moves to the new sub-account. Hashes, so neither the location nor an id is
 * ever written to the database or a log.
 */
export function syncStamp(config: GhlConfig): string {
  const fields = Object.entries(config.fields ?? {}).sort();
  const pipeline = config.pipeline ? [config.pipeline.id, Object.entries(config.pipeline.stages).sort()] : null;
  return `v${SYNC_VERSION}.${shortHash(config.locationId)}.${fields.length ? shortHash(fields) : '-'}.${pipeline ? shortHash(pipeline) : '-'}`;
}

/** What a contact's fields should say. Each is optional: a missing one is not sent. */
export interface FieldValues {
  offer?: string;
  cohort?: string;
  /** Dollars. */
  amount?: number;
  /** YYYY-MM-DD, in America/Chicago. */
  purchaseDate?: string;
  lmsLogin?: string;
}

/** A day in America/Chicago, as GHL's date fields take it. */
export function chicagoDate(ms: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Each plan's display name (`PLAN_NAMES`), keyed by any string so an unknown plan reads as undefined. */
export const PLAN_NAMES_FOR_GHL: Readonly<Record<string, string>> = PLAN_NAMES;

/** An order's field values: its plan's name, the cohort for the Accelerator, the amount and the day it was paid. */
export function orderFieldValues(o: { plan: string; amountTotal: number | null; paidAt: number | null }): FieldValues {
  const out: FieldValues = {};
  if (Object.hasOwn(PLAN_NAMES_FOR_GHL, o.plan)) out.offer = PLAN_NAMES_FOR_GHL[o.plan]!;
  if (o.plan === 'cohort') out.cohort = ACCELERATOR_COHORT_ID;
  if (typeof o.amountTotal === 'number' && o.amountTotal > 0) out.amount = Math.round(o.amountTotal) / 100;
  if (typeof o.paidAt === 'number') out.purchaseDate = chicagoDate(o.paidAt);
  return out;
}

/** The custom-field items for the fields that have both an id and a value. Empty values never go. */
export function fieldItems(values: FieldValues, ids: Partial<Record<FieldKey, string>> = {}): { id: string; field_value: string | number }[] {
  const items: { id: string; field_value: string | number }[] = [];
  for (const key of Object.keys(FIELD_ENV) as FieldKey[]) {
    const id = ids[key];
    const value = values[key];
    if (!id) continue;
    if (typeof value === 'string' && value.trim() !== '') items.push({ id, field_value: value.trim() });
    else if (typeof value === 'number' && Number.isFinite(value) && value > 0) items.push({ id, field_value: value });
  }
  return items;
}

export type ExtraResult = { ok: true; action: 'skipped' | 'written' | 'created' | 'moved' | 'unchanged' } | { ok: false; kind: GhlFailureKind; status?: number; step: GhlStep };

/** Write the contact's custom fields: `PUT /contacts/{id}` with only `customFields`, so nothing else on it changes. */
export async function setContactFields(contactId: string, values: FieldValues, options: SyncOptions): Promise<ExtraResult> {
  const items = fieldItems(values, options.config.fields);
  if (items.length === 0) return { ok: true, action: 'skipped' };
  const res = await call(`/contacts/${encodeURIComponent(contactId)}`, { customFields: items }, options, 'PUT');
  if (!res.ok) return { ok: false, kind: res.kind, step: 'fields', ...statusOf(res) };
  return { ok: true, action: 'written' };
}

/** Where a contact belongs in the pipeline, and what its opportunity is called and worth. */
export interface OpportunityTarget {
  stage: StageKey;
  name: string;
  /** Dollars, from the order behind the stage, when there is one. */
  monetaryValue?: number;
}

/**
 * Forward only: a move happens when the target's rank is at least the current stage's. The lead
 * stages rank below every purchase stage; the purchase stages share a rank, so among them the
 * opportunity follows the orders. A stage this app does not know sits between the two.
 */
export const STAGE_RANK: Readonly<Record<StageKey, number>> = { lead: 0, freeSkills: 1, checkoutStarted: 2, purchased: 4, paymentFailed: 4, canceled: 4, refunded: 4 };
const UNKNOWN_STAGE_RANK = 3;

/** Free Skills and Checkout Started fall back to Lead when only Lead is set. The others have no fallback. */
export function stageId(pipeline: GhlPipeline, stage: StageKey): string | null {
  return pipeline.stages[stage] ?? (stage === 'freeSkills' || stage === 'checkoutStarted' ? (pipeline.stages.lead ?? null) : null);
}

export const opportunityStatus = (stage: StageKey): 'open' | 'won' | 'lost' =>
  stage === 'purchased' ? 'won' : stage === 'canceled' || stage === 'refunded' ? 'lost' : 'open';

/**
 * The contact's one opportunity in the pipeline: found by contact and pipeline, created if there is
 * none, otherwise moved forward and its value kept current. A call is made only when something
 * changes, so syncing the same row twice writes nothing the second time.
 */
export async function upsertOpportunity(contactId: string, target: OpportunityTarget, options: SyncOptions): Promise<ExtraResult> {
  const { pipeline, locationId } = options.config;
  if (!pipeline) return { ok: true, action: 'skipped' };
  const stage = stageId(pipeline, target.stage);
  if (!stage) return { ok: true, action: 'skipped' };

  const query = new URLSearchParams({ location_id: locationId, pipeline_id: pipeline.id, contact_id: contactId, limit: '1' });
  const found = await call(`/opportunities/search?${query.toString()}`, undefined, options, 'GET');
  if (!found.ok) return { ok: false, kind: found.kind, step: 'opportunity', ...statusOf(found) };
  const list = asRecord(found.body)?.opportunities;
  const existing = Array.isArray(list) ? list.map(asRecord).find((o) => o !== null && (o.contactId === undefined || o.contactId === contactId) && (o.pipelineId === undefined || o.pipelineId === pipeline.id)) ?? null : null;
  const value = typeof target.monetaryValue === 'number' && target.monetaryValue > 0 ? { monetaryValue: target.monetaryValue } : {};

  if (!existing) {
    const created = await call(
      '/opportunities/',
      { pipelineId: pipeline.id, locationId, contactId, name: target.name, status: opportunityStatus(target.stage), pipelineStageId: stage, ...value },
      options,
    );
    if (!created.ok) return { ok: false, kind: created.kind, step: 'opportunity', ...statusOf(created) };
    return { ok: true, action: 'created' };
  }

  const id = typeof existing.id === 'string' ? existing.id : null;
  if (!id) return { ok: false, kind: 'malformed', step: 'opportunity' };
  const currentStage = typeof existing.pipelineStageId === 'string' ? existing.pipelineStageId : null;
  const currentKey = (Object.keys(STAGE_ENV) as StageKey[]).find((k) => pipeline.stages[k] !== undefined && pipeline.stages[k] === currentStage);
  const currentRank = currentKey ? STAGE_RANK[currentKey] : UNKNOWN_STAGE_RANK;
  const move = currentStage !== stage && STAGE_RANK[target.stage] >= currentRank;

  const patch: Record<string, unknown> = {};
  if (move) {
    patch.pipelineStageId = stage;
    patch.status = opportunityStatus(target.stage);
    if (STAGE_RANK[target.stage] === STAGE_RANK.purchased && existing.name !== target.name) patch.name = target.name;
  }
  if (value.monetaryValue !== undefined && existing.monetaryValue !== value.monetaryValue && (move || STAGE_RANK[target.stage] >= currentRank)) patch.monetaryValue = value.monetaryValue;
  if (Object.keys(patch).length === 0) return { ok: true, action: 'unchanged' };

  const updated = await call(`/opportunities/${encodeURIComponent(id)}`, { pipelineId: pipeline.id, ...patch }, options, 'PUT');
  if (!updated.ok) return { ok: false, kind: updated.kind, step: 'opportunity', ...statusOf(updated) };
  return { ok: true, action: move ? 'moved' : 'written' };
}
