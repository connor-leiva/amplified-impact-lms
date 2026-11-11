// Amplified Impact's own GHL sub-account (D-135, Connor's update of Nov 11): a one-time script that
// gets the new location ready before the move off Spring's. It does not run in the app; `ghl-cli.ts`
// runs it, by hand. It is a DRY RUN unless given `--apply`, and safe to run again: it looks before it
// writes.
//
//   SETUP (`ghl:setup`): in the NEW location, the pipeline (Amplified Impact: Lead, Free Skills,
//   Checkout Started, Buyer, Refunded/Canceled), every tag this app writes, and the five contact
//   custom fields. Anything that already exists by name is used, never changed or duplicated. It
//   prints the ids as Railway variable lines for Connor to paste.
//
// RATE LIMITS. HighLevel allows about 100 calls per 10 seconds per location. The script makes one
// call at a time with a pause between them, wait out a 429 (its Retry-After, or 10 seconds), retry a
// 5xx a few times, and stop on a rejected token.
//
// PRIVACY. What it prints is counts, tag names, ids of things Connor created, and step names. Never a
// token.

import { BUYER_TAGS, DECEMBER_INTEREST_TAG, FIELD_ENV, FREE_SKILLS_TAG, STAGE_ENV, LMS_LOGGED_IN_TAG, SMS_CONSENT_TAG, SOURCE_TAGS, SRC_TAGS, TEAM_SIZE_TAGS, call } from './ghl';
import type { CallResult, Fetch, FieldKey, GhlConfig, StageKey } from './ghl';

const PLANS = ['library', 'cohort', 'agents', 'membership', 'agent_plan'] as const;

/** Every tag this app writes, by name. */
export const APP_TAGS: readonly string[] = [
  ...new Set([
    ...Object.values(SOURCE_TAGS).flat(),
    FREE_SKILLS_TAG,
    ...Object.values(SRC_TAGS),
    'src-direct',
    'src-other',
    ...Object.values(TEAM_SIZE_TAGS),
    DECEMBER_INTEREST_TAG,
    SMS_CONSENT_TAG,
    BUYER_TAGS.buyer,
    ...PLANS.map((p) => BUYER_TAGS.plan(p)),
    BUYER_TAGS.payFull,
    BUYER_TAGS.payTwo,
    BUYER_TAGS.payYear,
    BUYER_TAGS.payMonthly,
    BUYER_TAGS.payYearly,
    ...Object.values(BUYER_TAGS.alias),
    ...PLANS.map((p) => BUYER_TAGS.abandoned(p)),
    BUYER_TAGS.paymentFailed,
    BUYER_TAGS.membershipEnded,
    BUYER_TAGS.canceledAlias,
    BUYER_TAGS.refunded,
    BUYER_TAGS.refundedAlias,
    BUYER_TAGS.forum,
    LMS_LOGGED_IN_TAG,
  ]),
];

/** The new location's pipeline, as Connor's update names it, and which of the sync's stages each one is. */
export const PIPELINE_NAME = 'Amplified Impact';
export const PIPELINE_STAGES: readonly { name: string; keys: StageKey[] }[] = [
  { name: 'Lead', keys: ['lead'] },
  { name: 'Free Skills', keys: ['freeSkills'] },
  { name: 'Checkout Started', keys: ['checkoutStarted'] },
  { name: 'Buyer', keys: ['purchased'] },
  { name: 'Refunded/Canceled', keys: ['refunded', 'canceled'] },
];

/** The five contact fields, by the name Connor sees and the type GHL stores. */
export const CUSTOM_FIELDS: readonly { key: FieldKey; name: string; dataType: 'TEXT' | 'MONETORY' | 'DATE' }[] = [
  { key: 'offer', name: 'AI Offer', dataType: 'TEXT' },
  { key: 'cohort', name: 'AI Cohort', dataType: 'TEXT' },
  { key: 'amount', name: 'AI Amount', dataType: 'MONETORY' },
  { key: 'purchaseDate', name: 'AI Purchase Date', dataType: 'DATE' },
  { key: 'lmsLogin', name: 'LMS Login', dataType: 'TEXT' },
];

export interface ScriptOptions {
  config: Pick<GhlConfig, 'token' | 'locationId'>;
  fetch?: Fetch;
  /** Milliseconds between calls. */
  spacingMs?: number;
  sleep?: (ms: number) => Promise<void>;
  print?: (line: string) => void;
}

export class ScriptStopped extends Error {}

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * A fetch that keeps to HighLevel's limits: one call at a time, spaced, a 429 waited out (Retry-After,
 * else 10s, up to 6 times), a 5xx retried 3 times. The script passes it to the client's `call`.
 */
export function politeFetch(inner: Fetch, spacingMs: number, sleep: (ms: number) => Promise<void>): Fetch {
  let last = 0;
  return (async (url: string | URL | Request, init?: RequestInit) => {
    let limited = 0;
    let failed = 0;
    for (;;) {
      const wait = last + spacingMs - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      const res = await inner(url, init);
      if (res.status === 429 && limited < 6) {
        limited += 1;
        const after = Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : 10_000);
        continue;
      }
      if (res.status >= 500 && failed < 3) {
        failed += 1;
        await sleep(2_000 * failed);
        continue;
      }
      return res;
    }
  }) as Fetch;
}

function client(o: ScriptOptions) {
  const fetchImpl = politeFetch(o.fetch ?? fetch, o.spacingMs ?? 150, o.sleep ?? realSleep);
  const options = { config: { ...o.config }, fetch: fetchImpl };
  const must = (r: CallResult, what: string): unknown => {
    if (r.ok) return r.body;
    if (r.kind === 'unauthorized') throw new ScriptStopped(`${what}: the token was refused (${r.status ?? ''}). Check the token and its scopes (see the README).`);
    throw new ScriptStopped(`${what}: ${r.kind}${r.status ? ` ${r.status}` : ''}`);
  };
  return {
    options,
    get: async (path: string, what: string) => must(await call(path, undefined, options, 'GET'), what),
    post: async (path: string, body: unknown, what: string) => must(await call(path, body, options, 'POST'), what),
  };
}

const rec = (v: unknown): Record<string, unknown> => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const list = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.map(rec) : []);
const same = (a: unknown, b: string) => typeof a === 'string' && a.trim().toLowerCase() === b.toLowerCase();

export interface SetupResult {
  applied: boolean;
  /** Railway variable name to id, for everything that exists after the run (or would, in a dry run: `(new)`). */
  env: Record<string, string>;
  created: { pipeline: boolean; tags: string[]; fields: string[] };
  /** Stages the existing pipeline lacks. This script never edits a pipeline that is already there. */
  missingStages: string[];
}

/** SETUP: the pipeline, the tags and the fields in the new location. See the header. */
export async function setupLocation(o: ScriptOptions & { apply: boolean }): Promise<SetupResult> {
  const print = o.print ?? (() => {});
  const ghl = client(o);
  const loc = encodeURIComponent(o.config.locationId);
  const out: SetupResult = { applied: o.apply, env: {}, created: { pipeline: false, tags: [], fields: [] }, missingStages: [] };
  const NEW = '(new)';

  // The pipeline.
  const pipelines = list(rec(await ghl.get(`/opportunities/pipelines?locationId=${loc}`, 'Reading pipelines')).pipelines);
  let pipeline = pipelines.find((p) => same(p.name, PIPELINE_NAME));
  if (!pipeline) {
    out.created.pipeline = true;
    print(`${o.apply ? 'Creating' : 'Would create'} the pipeline "${PIPELINE_NAME}" with ${PIPELINE_STAGES.map((s) => s.name).join(', ')}.`);
    if (o.apply) {
      const made = rec(
        await ghl.post(
          '/opportunities/pipelines',
          { name: PIPELINE_NAME, locationId: o.config.locationId, stages: PIPELINE_STAGES.map((s, i) => ({ name: s.name, position: i })) },
          'Creating the pipeline',
        ),
      );
      pipeline = rec(made.pipeline ?? made);
    }
  } else {
    print(`The pipeline "${PIPELINE_NAME}" already exists; it is used as it is.`);
  }
  out.env.GHL_PIPELINE_ID = typeof pipeline?.id === 'string' ? pipeline.id : NEW;
  const stages = list(pipeline?.stages);
  for (const s of PIPELINE_STAGES) {
    const found = stages.find((x) => same(x.name, s.name));
    if (!found && pipeline && !out.created.pipeline) out.missingStages.push(s.name);
    for (const key of s.keys) out.env[STAGE_ENV[key]] = typeof found?.id === 'string' ? found.id : NEW;
  }
  if (out.missingStages.length) print(`The existing pipeline has no stage named ${out.missingStages.map((n) => `"${n}"`).join(', ')}. Add it in GHL, then run this again.`);

  // The tags.
  const tags = list(rec(await ghl.get(`/locations/${loc}/tags`, 'Reading tags')).tags);
  const have = new Set(tags.map((t) => String(t.name ?? '').toLowerCase()));
  for (const name of APP_TAGS) {
    if (have.has(name)) continue;
    out.created.tags.push(name);
    if (o.apply) await ghl.post(`/locations/${loc}/tags`, { name }, 'Creating a tag');
  }
  print(`${o.apply ? 'Created' : 'Would create'} ${out.created.tags.length} of ${APP_TAGS.length} tags; the rest already exist.`);

  // The custom fields.
  const fields = list(rec(await ghl.get(`/locations/${loc}/customFields?model=contact`, 'Reading custom fields')).customFields);
  for (const f of CUSTOM_FIELDS) {
    let found = fields.find((x) => same(x.name, f.name));
    if (!found) {
      out.created.fields.push(f.name);
      if (o.apply) found = rec(rec(await ghl.post(`/locations/${loc}/customFields`, { name: f.name, dataType: f.dataType, model: 'contact' }, 'Creating a custom field')).customField);
    }
    out.env[FIELD_ENV[f.key]] = typeof found?.id === 'string' ? found.id : NEW;
  }
  print(`${o.apply ? 'Created' : 'Would create'} ${out.created.fields.length} custom fields: ${out.created.fields.join(', ') || 'none'}.`);
  return out;
}
