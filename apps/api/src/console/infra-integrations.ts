// Integrations, PR 9 (D-168, spec § 7.13): each service's state, mode, and last success and error
// from real tables, and "Check now" for Stripe and Resend.
//
// WHERE EACH CARD'S FACTS COME FROM (a source that isn't in this build is "Unavailable", never a guess):
//   Stripe       configured by `readOfferConfig`; mode `keyMode`; last success and error from
//                `stripe_events` (the newest processed event, the newest that errored, with its short
//                reason, which `billing/webhook.ts` already keeps free of data).
//   GoHighLevel  `readGhlConfig` and the pause switch; last success and error from `crmSyncReport()`
//                (the newest synced row, the newest row with an error, as its status: never an email).
//   Zoom         not configured: the app has no Zoom route or reader (spec § 7.9); join links are
//                pasted per session.
//   Google       `readGoogleConfig`; no table records a Google sign-in's outcome: Unavailable. (`api_metrics`,
//                D-165, counts route answers, not Google's: the callback redirects either way.)
//   Resend       its key and `resolveMode`; last success and error from `email_log` (D-166): the newest
//                send Resend accepted, the newest it didn't, with its kind in the Email Log's words.
//   Storage      `readS3Config`; no table records a bucket call: Unavailable. (The file routes presign
//                locally, without calling the bucket, so their `api_metrics` rows prove nothing about it.)
//   GA4, Meta    www only (D-155), with their public ids from `lib/analytics.ts`. Nothing is checked.
//
// CHECK NOW reads and changes nothing. Stripe: Billing's scope probe, handed in by `app.ts`, which
// asks Stripe the smallest question each Read permission allows. Resend: `GET /domains` with the key
// (a sending-only key answers `restricted_api_key`, which proves the key is real). A provider's own
// words never come back; the answer is a closed outcome and a status code. 5 a minute per session,
// and one Check per service is reused for 10 seconds across everyone.

import { desc, eq, isNotNull, isNull, and, max } from 'drizzle-orm';
import { EMAIL_ERROR_LABELS, INTEGRATION_IDS, INTEGRATION_NAMES, PROBE_INTEGRATIONS, WWW_ONLY_INTEGRATIONS, integrationState, statusLine } from '@ai/core';
import type { EmailErrorKind } from '@ai/core';
import type { EnvPresence, IntegrationId, IntegrationStamp, IntegrationView, OpsModes, ProbeIntegration, ProbeResult } from '@ai/core';
import { getDb } from '../db/client';
import type { Database } from '../db/client';
import { emailLog, stripeEvents } from '../db/schema';
import { GA4_MEASUREMENT_ID, META_PIXEL_ID } from '../lib/analytics';
import { crmSyncReport } from '../routes/crm-sync';
import type { CrmSyncReport } from '../routes/crm-sync';
import { envPresence, googleConfigured, opsModes, storageConfigured } from './infra-env';
import type { FetchLike } from './infra-deploys';

type Env = NodeJS.ProcessEnv;

/** Stripe's Read permissions as Billing's probe reports them (D-163): true, false (refused), null (couldn't tell). */
export type StripeScopes = Record<string, boolean | null>;

export interface IntegrationsDeps {
  env?: Env;
  fetch?: FetchLike;
  now: () => number;
  /** Billing's scope probe over its read client (null without a Stripe key). */
  stripeScopes?: (() => Promise<StripeScopes>) | null;
  /** For a test: the CRM sync report instead of reading the tables. */
  crm?: () => Promise<CrmSyncReport>;
}

const DETAIL_MAX = 60;
const stamp = (at: number | null | undefined, detail: string | null = null): IntegrationStamp =>
  at === null || at === undefined ? 'none' : { at: Number(at), detail: detail === null ? null : detail.slice(0, DETAIL_MAX) };

/** `step:kind:status` (integrations/ghl.ts) as the card prints it: "401 Unauthorized", else the kind. */
export function ghlErrorDetail(error: string): string {
  const [, kind, status] = error.split(':');
  const code = Number(status);
  return Number.isInteger(code) && code >= 100 ? statusLine(code) : (kind ?? 'error');
}

async function stripeStamps(db: Database): Promise<{ ok: IntegrationStamp; bad: IntegrationStamp }> {
  const [ok] = await db.select({ at: max(stripeEvents.processedAt) }).from(stripeEvents).where(and(isNotNull(stripeEvents.processedAt), isNull(stripeEvents.error)));
  const [bad] = await db
    .select({ at: stripeEvents.receivedAt, error: stripeEvents.error })
    .from(stripeEvents)
    .where(isNotNull(stripeEvents.error))
    .orderBy(desc(stripeEvents.receivedAt))
    .limit(1);
  return { ok: stamp(ok?.at ?? null), bad: bad ? stamp(bad.at, bad.error) : 'none' };
}

/** Resend, from the email log (D-166): only what went through Resend, never the log file or the test outbox. */
async function resendStamps(db: Database): Promise<{ ok: IntegrationStamp; bad: IntegrationStamp }> {
  const [ok] = await db.select({ at: max(emailLog.at) }).from(emailLog).where(and(eq(emailLog.provider, 'resend'), eq(emailLog.status, 'sent')));
  const [bad] = await db
    .select({ at: emailLog.at, kind: emailLog.errorKind })
    .from(emailLog)
    .where(and(eq(emailLog.provider, 'resend'), eq(emailLog.status, 'failed')))
    .orderBy(desc(emailLog.at), desc(emailLog.id))
    .limit(1);
  const words = bad?.kind ? (EMAIL_ERROR_LABELS[bad.kind as EmailErrorKind] ?? null) : null;
  return { ok: stamp(ok?.at ?? null), bad: bad ? stamp(bad.at, words) : 'none' };
}

function ghlStamps(report: CrmSyncReport): { ok: IntegrationStamp; bad: IntegrationStamp } {
  const rows = [...report.recent, ...report.problems];
  let ok: number | null = null;
  let bad: { at: number; error: string } | null = null;
  for (const r of rows) {
    if (r.syncedAt !== null && (ok === null || r.syncedAt > ok)) ok = r.syncedAt;
    const at = r.lastAttemptAt;
    if (r.error !== null && at !== null && (bad === null || at > bad.at)) bad = { at, error: r.error };
  }
  return { ok: stamp(ok), bad: bad ? stamp(bad.at, ghlErrorDetail(bad.error)) : 'none' };
}

const secretsOf = (env: EnvPresence[], group: string, labels: Record<string, string>): IntegrationView['secrets'] =>
  env.filter((e) => e.group === group && labels[e.name]).map((e) => ({ label: labels[e.name]!, state: e.state }));

function card(
  id: IntegrationId,
  facts: { configured: boolean; paused?: boolean; mode: string | null; ok: IntegrationStamp; bad: IntegrationStamp; source: string | null; secrets: IntegrationView['secrets'] },
): IntegrationView {
  return {
    id,
    ...INTEGRATION_NAMES[id],
    state: integrationState({ configured: facts.configured, paused: facts.paused, lastSuccess: facts.ok, lastError: facts.bad }),
    mode: facts.mode,
    lastSuccess: facts.ok,
    lastError: facts.bad,
    source: facts.source,
    secrets: facts.secrets,
    publicId: null,
    probe: (PROBE_INTEGRATIONS as readonly string[]).includes(id),
  };
}

/** `GET /api/console/integrations`: one card per service, in the mockup's order. */
export async function readIntegrations(deps: IntegrationsDeps, db: Database = getDb()): Promise<IntegrationView[]> {
  const env = deps.env ?? process.env;
  const presence = envPresence(env);
  const modes: OpsModes = opsModes(env);
  const has = (name: string) => presence.find((p) => p.name === name)?.state === 'present';
  const stripe = await stripeStamps(db);
  const resend = await resendStamps(db);
  const crm = await (deps.crm ?? (() => crmSyncReport(env)))();
  const ghl = ghlStamps(crm);
  const cards: Record<IntegrationId, IntegrationView> = {
    stripe: card('stripe', {
      configured: has('Stripe secret key'),
      mode: modes.stripe,
      ok: stripe.ok,
      bad: stripe.bad,
      source: 'stripe_events',
      secrets: secretsOf(presence, 'Stripe', { 'Stripe secret key': 'Secret key', 'Stripe webhook signing secret': 'Webhook signing secret' }),
    }),
    ghl: card('ghl', {
      configured: modes.ghl !== 'off',
      paused: modes.ghl === 'paused',
      mode: modes.ghl,
      ok: ghl.ok,
      bad: ghl.bad,
      source: 'crm_sync',
      secrets: secretsOf(presence, 'GoHighLevel', { 'GoHighLevel access token': 'Access token', 'GoHighLevel location ID': 'Location ID' }),
    }),
    zoom: card('zoom', { configured: false, mode: null, ok: 'unavailable', bad: 'unavailable', source: null, secrets: [] }),
    google: card('google', {
      configured: googleConfigured(env),
      mode: null,
      ok: 'unavailable',
      bad: 'unavailable',
      source: null,
      secrets: secretsOf(presence, 'Google', { 'Google OAuth client secret': 'OAuth client secret' }),
    }),
    resend: card('resend', {
      configured: has('Resend API key'),
      mode: modes.email,
      ok: resend.ok,
      bad: resend.bad,
      source: 'email_log',
      secrets: secretsOf(presence, 'Resend', { 'Resend API key': 'API key', 'Resend webhook signing secret': 'Webhook signing secret' }),
    }),
    storage: card('storage', {
      configured: storageConfigured(env),
      mode: null,
      ok: 'unavailable',
      bad: 'unavailable',
      source: null,
      secrets: secretsOf(presence, 'Storage', { 'Storage access key': 'Access key' }),
    }),
    ga4: { ...card('ga4', { configured: true, mode: null, ok: 'none', bad: 'none', source: null, secrets: [] }), state: 'www_only', publicId: GA4_MEASUREMENT_ID },
    meta: { ...card('meta', { configured: true, mode: null, ok: 'none', bad: 'none', source: null, secrets: [] }), state: 'www_only', publicId: META_PIXEL_ID },
  };
  return INTEGRATION_IDS.map((id) => cards[id]);
}

export const isWwwOnly = (id: IntegrationId): boolean => WWW_ONLY_INTEGRATIONS.includes(id);

// --- Check now ---------------------------------------------------------------------------------

export const RESEND_DOMAINS = 'https://api.resend.com/domains';
const PROBE_TIMEOUT_MS = 5000;

/** Resend: the key answers a read (`GET /domains`). A sending-only key's `restricted_api_key` is a real key. */
export async function probeResend(env: Env, fetchImpl: FetchLike, now: number): Promise<ProbeResult> {
  const key = (env.RESEND_API_KEY ?? '').trim();
  const result = (outcome: ProbeResult['outcome'], status: number | null = null): ProbeResult => ({ id: 'resend', outcome, at: now, status, missing: [] });
  if (!key) return result('not_configured');
  let res: Response;
  try {
    res = await fetchImpl(RESEND_DOMAINS, { method: 'GET', headers: { authorization: `Bearer ${key}`, accept: 'application/json' }, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
  } catch {
    return result('unreachable');
  }
  if (res.ok) return result('ok');
  if (res.status === 401 || res.status === 403) {
    const body = (await res.json().catch(() => null)) as { name?: unknown } | null;
    return body?.name === 'restricted_api_key' ? result('ok') : result('refused', res.status);
  }
  if (res.status === 429) return result('rate_limited', 429);
  return result('failed', res.status);
}

/** Stripe: Billing's scope probe. Every Read permission there is ok; a refused one is named. */
export async function probeStripe(scopes: (() => Promise<StripeScopes>) | null | undefined, now: number): Promise<ProbeResult> {
  const result = (outcome: ProbeResult['outcome'], missing: string[] = []): ProbeResult => ({ id: 'stripe', outcome, at: now, status: null, missing });
  if (!scopes) return result('not_configured');
  let got: StripeScopes;
  try {
    got = await scopes();
  } catch {
    return result('unreachable');
  }
  const missing = Object.entries(got)
    .filter(([, v]) => v === false)
    .map(([k]) => k);
  if (missing.length) return result('scope_missing', missing);
  return Object.values(got).every((v) => v === true) ? result('ok') : result('failed');
}

const recent = new Map<ProbeIntegration, ProbeResult>();
export const PROBE_REUSE_MS = 10_000;

/** Forget the reused Check results (a test's `beforeEach`). */
export function resetProbes(): void {
  recent.clear();
}

/** One Check now, reused for 10 seconds across every caller. */
export async function checkIntegration(id: ProbeIntegration, deps: IntegrationsDeps): Promise<ProbeResult> {
  const now = deps.now();
  const last = recent.get(id);
  if (last && now >= last.at && now - last.at < PROBE_REUSE_MS) return last;
  const env = deps.env ?? process.env;
  const fetchImpl: FetchLike = deps.fetch ?? ((input, init) => fetch(input, init));
  const out = id === 'resend' ? await probeResend(env, fetchImpl, now) : await probeStripe(deps.stripeScopes, now);
  recent.set(id, out);
  return out;
}
