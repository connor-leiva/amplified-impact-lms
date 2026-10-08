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
// PRIVACY. Nothing this file returns or throws contains the visitor's name or address, the token, or
// a response body (which can echo both). Failures are reported as a kind and a status code.

/** The API host for v2. */
export const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

/** The `Version` header every v2 call must carry. */
export const GHL_API_VERSION = '2021-07-28';

/** Per request. GHL is a copy, so a slow call just means the next tick tries again. */
export const GHL_TIMEOUT_MS = 10_000;

/** On every waitlist contact. `ai101-waitlist` is the tag GHL workflows trigger on. */
export const WAITLIST_TAGS = ['ai101-waitlist', 'event-expcon-2026'] as const;

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

/** Every tag one sign-up should carry in GHL. HighLevel stores tags lowercase; these already are. */
export function waitlistTags(src: string | null | undefined): string[] {
  return [...WAITLIST_TAGS, srcTag(src)];
}

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

  const upserted = await call('/contacts/upsert', upsertBody, options);
  if (!upserted.ok) return { ok: false, kind: upserted.kind, step: 'upsert', ...statusOf(upserted) };

  const body = asRecord(upserted.body);
  const record = asRecord(body?.contact) ?? body;
  const contactId = typeof record?.id === 'string' && record.id !== '' ? record.id : null;
  if (!contactId) return { ok: false, kind: 'malformed', step: 'upsert' };
  const created = body?.new === true;
  const before = asTags(record?.tags);

  const ours = waitlistTags(contact.src);
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
