// The Admin Console's incidents, PR 8 (D-167, spec § 7.14, D5). Pure, like the rest of @ai/core: the
// API evaluates the auto-open rules with these (`apps/api/src/console/incident-rules.ts`) and serves
// the shapes below, and the web prints them through the same words (`routes/console/incidents.vm.ts`).
//
// THE RULES (D5: fixed, deduped by fingerprint, no notifications). Once per scheduler tick:
//   - a job's last 3 finished ticks all failed                                  → sev2  `job:<job>`
//   - a Stripe event errored and is still unprocessed 15 minutes after it came → sev2  `stripe:<type>`
//   - more than 5 GHL rows gave up                                              → sev3  `ghl:gave_up`
//   - API 5xx above 5% over the last 10 minutes, with at least 50 requests      → sev1  `api:5xx`
// A rule that fires while an incident with its fingerprint is unresolved appends a `signal` event to
// that incident instead of opening another (the partial unique index holds it too) — but only for
// evidence newer than the incident's last system event, so a condition that persists does not write
// a row every minute. Evidence older than the fingerprint's last resolution never reopens it.

import { NOTE_BODY_MAX, cleanNoteBody } from './console-support';

const MINUTE = 60_000;

// ================================================================================================
// The record
// ================================================================================================

export const INCIDENT_SEVERITIES = ['sev1', 'sev2', 'sev3'] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_STATUSES = ['open', 'acknowledged', 'resolved'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

/** What a timeline line records: the opening, a repeat of its rule, and each staff action. */
export const INCIDENT_EVENT_KINDS = ['opened', 'signal', 'acknowledged', 'resolved', 'note'] as const;
export type IncidentEventKind = (typeof INCIDENT_EVENT_KINDS)[number];

export const isIncidentSeverity = (v: unknown): v is IncidentSeverity => typeof v === 'string' && (INCIDENT_SEVERITIES as readonly string[]).includes(v);
export const isIncidentStatus = (v: unknown): v is IncidentStatus => typeof v === 'string' && (INCIDENT_STATUSES as readonly string[]).includes(v);

/** `INC-0007`: the number, four digits at least. */
export const incidentIdOf = (n: number): string => `INC-${String(n).padStart(4, '0')}`;
const INCIDENT_ID = /^INC-(\d{4,9})$/;
/** The number of an incident id, or null when it is not one. */
export const incidentNumberOf = (id: unknown): number | null => {
  const m = typeof id === 'string' ? INCIDENT_ID.exec(id) : null;
  return m ? Number(m[1]) : null;
};

/** A title is 3 to 200 characters, trimmed. */
export const INCIDENT_TITLE_MIN = 3;
export const INCIDENT_TITLE_MAX = 200;
export function cleanIncidentTitle(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().replace(/\s+/g, ' ');
  return t.length >= INCIDENT_TITLE_MIN && t.length <= INCIDENT_TITLE_MAX ? t : null;
}

/** A note, and a resolution's note: 1 to 2,000 characters, as a staff note is. */
export const INCIDENT_NOTE_MAX = NOTE_BODY_MAX;
export const cleanIncidentNote = cleanNoteBody;

export interface IncidentPerson {
  id: string;
  name: string | null;
}

/** One row of `GET /api/console/incidents`. Times are epoch ms. */
export interface IncidentRow {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  /** Who has it: whoever acknowledged it, else resolved it, else opened it; null for the system's own, unacknowledged. */
  owner: IncidentPerson | null;
  openedAt: number;
}

export interface IncidentEventView {
  id: string;
  at: number;
  kind: IncidentEventKind;
  /** The staff member; null for the system. */
  actor: IncidentPerson | null;
  body: string | null;
  /** The Console page the evidence is on (`INCIDENT_LINKS`), or null. */
  link: string | null;
}

/** `GET /api/console/incidents/:id`: the row, who did what, and the timeline, oldest first. */
export interface IncidentDetail extends IncidentRow {
  /** The rule that opened it (`job:ghl-orders`); null when staff opened it. */
  fingerprint: string | null;
  openedBy: IncidentPerson | null;
  acknowledgedAt: number | null;
  acknowledgedBy: IncidentPerson | null;
  resolvedAt: number | null;
  resolvedBy: IncidentPerson | null;
  events: IncidentEventView[];
}

export interface IncidentFilters {
  status?: IncidentStatus;
}

/** `GET /api/console/incidents/summary`: what the sidebar's "1 incident" counts (open, not yet acknowledged). */
export interface IncidentSummary {
  open: number;
}

/** Who has it (see `IncidentRow.owner`). */
export const incidentOwner = (r: { acknowledgedBy: IncidentPerson | null; resolvedBy: IncidentPerson | null; openedBy: IncidentPerson | null }): IncidentPerson | null =>
  r.acknowledgedBy ?? r.resolvedBy ?? r.openedBy;

// ================================================================================================
// The auto-open rules
// ================================================================================================

/** D5's thresholds, as fixed constants. */
export const INCIDENT_RULES = {
  /** A job's last this-many finished ticks all failed. */
  jobFailedTicks: 3,
  /** A Stripe event errored and still unprocessed this long after it arrived. */
  stripeStuckMs: 15 * MINUTE,
  /** More than this many GHL rows gave up. */
  ghlGaveUpOver: 5,
  /** API 5xx above this share of requests… */
  api5xxOver: 0.05,
  /** …over this window… */
  apiWindowMs: 10 * MINUTE,
  /** …with at least this many requests. */
  apiMinRequests: 50,
} as const;

export const INCIDENT_RULE_IDS = ['job_failures', 'stripe_stuck', 'ghl_gave_up', 'api_5xx'] as const;
export type IncidentRuleId = (typeof INCIDENT_RULE_IDS)[number];

/** Where each rule's evidence is, in the Console. A job's carries `?job=`. */
export const INCIDENT_LINKS = {
  jobs: '/admin/jobs',
  webhooks: '/admin/api/webhooks',
  api: '/admin/api',
} as const;

/** One finished job tick (`job_ticks`, succeeded or failed). */
export interface JobTickFact {
  job: string;
  status: 'succeeded' | 'failed';
  finishedAt: number;
}

/** A Stripe event with an error on record and no `processed_at` (`stripe_events`). */
export interface StripeErrorFact {
  id: string;
  type: string;
  receivedAt: number;
}

/** GHL rows out of attempts and not synced (`crmSyncReport()`), and the newest one's last attempt. */
export interface GhlGaveUpFact {
  count: number;
  latestAt: number | null;
}

/** API requests and their 5xx answers over the rule's window (`api_metrics`). */
export interface ApiWindowFact {
  requests: number;
  errors5xx: number;
}

/** What the rules read. A source that is missing or failed is empty / null and fires nothing. */
export interface IncidentSignals {
  jobTicks: readonly JobTickFact[];
  stripeErrors: readonly StripeErrorFact[];
  ghl: GhlGaveUpFact | null;
  api: ApiWindowFact | null;
}

export const NO_SIGNALS: IncidentSignals = { jobTicks: [], stripeErrors: [], ghl: null, api: null };

export interface IncidentObservation {
  rule: IncidentRuleId;
  fingerprint: string;
  severity: IncidentSeverity;
  title: string;
  /** The opening event's sentence. */
  opened: string;
  /** A repeat's sentence. */
  signal: string;
  link: string;
  /** When the newest evidence became evidence. A repeat counts only past the incident's last system event. */
  evidenceAt: number;
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** A job's run of failed ticks, newest first: how many in a row, and when the newest finished. */
export function failureStreak(ticks: readonly JobTickFact[]): { count: number; latestAt: number | null } {
  const sorted = [...ticks].sort((a, b) => b.finishedAt - a.finishedAt);
  let count = 0;
  for (const t of sorted) {
    if (t.status !== 'failed') break;
    count += 1;
  }
  return { count, latestAt: count ? sorted[0]!.finishedAt : null };
}

/** "4.0%": one decimal. */
const pct = (ratio: number): string => `${(Math.round(ratio * 1000) / 10).toFixed(1)}%`;

/** Every rule that fires on these signals at `now`, in the rules' order. */
export function observeIncidents(s: IncidentSignals, now: number): IncidentObservation[] {
  const out: IncidentObservation[] = [];
  const R = INCIDENT_RULES;

  // 1. Three failed ticks in a row, per job.
  const byJob = new Map<string, JobTickFact[]>();
  for (const t of s.jobTicks) byJob.set(t.job, [...(byJob.get(t.job) ?? []), t]);
  for (const job of [...byJob.keys()].sort()) {
    const streak = failureStreak(byJob.get(job)!);
    if (streak.count < R.jobFailedTicks) continue;
    out.push({
      rule: 'job_failures',
      fingerprint: `job:${job}`,
      severity: 'sev2',
      title: `Job ${job} is failing`,
      opened: `Opened automatically after ${R.jobFailedTicks} failed runs of ${job}.`,
      signal: `${job} failed again: ${streak.count} failed runs in a row.`,
      link: `${INCIDENT_LINKS.jobs}?job=${encodeURIComponent(job)}`,
      evidenceAt: streak.latestAt!,
    });
  }

  // 2. A Stripe event errored and still unprocessed 15 minutes on, per event type.
  const byType = new Map<string, StripeErrorFact[]>();
  for (const e of s.stripeErrors) if (now - e.receivedAt > R.stripeStuckMs) byType.set(e.type, [...(byType.get(e.type) ?? []), e]);
  for (const type of [...byType.keys()].sort()) {
    const stuck = byType.get(type)!;
    out.push({
      rule: 'stripe_stuck',
      fingerprint: `stripe:${type}`,
      severity: 'sev2',
      title: `Stripe ${type} is not being processed`,
      opened: `Opened automatically after ${plural(stuck.length, `${type} delivery`, `${type} deliveries`)} errored and stayed unprocessed for over 15 minutes.`,
      signal: `Another ${type} delivery errored and stayed unprocessed for over 15 minutes: ${stuck.length} in all.`,
      link: `${INCIDENT_LINKS.webhooks}?type=${encodeURIComponent(type)}&n=${stuck.length}`,
      evidenceAt: Math.max(...stuck.map((e) => e.receivedAt)) + R.stripeStuckMs,
    });
  }

  // 3. More than five GHL rows gave up.
  if (s.ghl && s.ghl.count > R.ghlGaveUpOver) {
    out.push({
      rule: 'ghl_gave_up',
      fingerprint: 'ghl:gave_up',
      severity: 'sev3',
      title: `GHL sync gave up on ${s.ghl.count} rows`,
      opened: `Opened automatically after ${s.ghl.count} GHL rows gave up.`,
      signal: `More GHL rows gave up: ${s.ghl.count} in all.`,
      link: `${INCIDENT_LINKS.webhooks}?source=ghl&n=${s.ghl.count}`,
      evidenceAt: s.ghl.latestAt ?? now,
    });
  }

  // 4. API 5xx above 5% over 10 minutes, with at least 50 requests. Its evidence is the window's start,
  // so a rate that stays high signals once per window, not once per tick.
  if (s.api && s.api.requests >= R.apiMinRequests && s.api.errors5xx / s.api.requests > R.api5xxOver) {
    const share = pct(s.api.errors5xx / s.api.requests);
    out.push({
      rule: 'api_5xx',
      fingerprint: 'api:5xx',
      severity: 'sev1',
      title: 'API 5xx errors above 5%',
      opened: `Opened automatically: ${share} of ${s.api.requests} API requests answered 5xx over 10 minutes.`,
      signal: `Still above 5%: ${share} of ${s.api.requests} API requests answered 5xx over 10 minutes.`,
      link: INCIDENT_LINKS.api,
      evidenceAt: now - R.apiWindowMs,
    });
  }
  return out;
}

/** An unresolved incident a rule may repeat on: its fingerprint, and when the system last wrote to it. */
export interface UnresolvedIncident {
  id: string;
  fingerprint: string;
  lastSystemAt: number;
}

export type IncidentWrite =
  | { kind: 'open'; observation: IncidentObservation }
  | { kind: 'signal'; incidentId: string; observation: IncidentObservation };

/**
 * What to write for these observations: open an incident for a fingerprint with none unresolved (unless
 * the evidence predates its last resolution), or signal an unresolved one with evidence newer than
 * the system's last line on it. Anything else writes nothing.
 */
export function planIncidentWrites(
  observations: readonly IncidentObservation[],
  state: { unresolved: readonly UnresolvedIncident[]; lastResolvedAt: Readonly<Record<string, number>> },
): IncidentWrite[] {
  const out: IncidentWrite[] = [];
  for (const o of observations) {
    const live = state.unresolved.find((u) => u.fingerprint === o.fingerprint);
    if (live) {
      if (o.evidenceAt > live.lastSystemAt) out.push({ kind: 'signal', incidentId: live.id, observation: o });
      continue;
    }
    const resolved = state.lastResolvedAt[o.fingerprint];
    if (resolved === undefined || o.evidenceAt > resolved) out.push({ kind: 'open', observation: o });
  }
  return out;
}

// ================================================================================================
// The words (the mockup's, where it has them)
// ================================================================================================

export const INCIDENT_SEVERITY_LABELS: Readonly<Record<IncidentSeverity, string>> = { sev1: 'Sev 1', sev2: 'Sev 2', sev3: 'Sev 3' };
export const INCIDENT_STATUS_LABELS: Readonly<Record<IncidentStatus, string>> = { open: 'Open', acknowledged: 'Acknowledged', resolved: 'Resolved' };

/** A person's name, or what to call a staff member whose row is gone. */
const who = (p: IncidentPerson | null): string => p?.name ?? 'A staff member';

/**
 * A timeline line's words: the system's own sentence, or the staff action ("Acknowledged by Avery
 * Stone.", the mockup's). A note is its author's, "Imani Brooks: …"; a resolution carries its note.
 */
export function incidentEventText(e: Pick<IncidentEventView, 'kind' | 'actor' | 'body'>): string {
  const body = e.body ?? '';
  switch (e.kind) {
    case 'opened':
      return e.actor ? `Opened by ${who(e.actor)}.` : body;
    case 'signal':
      return body;
    case 'acknowledged':
      return `Acknowledged by ${who(e.actor)}.`;
    case 'resolved':
      return body ? `Resolved by ${who(e.actor)}. ${body}` : `Resolved by ${who(e.actor)}.`;
    case 'note':
      return e.actor ? `${who(e.actor)}: ${body}` : body;
  }
}

export interface IncidentLinked {
  /** `INCIDENT_LINKS`' page, with its query. */
  to: string;
  icon: 'jobs' | 'api';
  label: string;
}

/** A link's identity: its page and query without the count (`n`), which a later line updates. */
const linkKey = (link: string): string => {
  const [path, query = ''] = link.split('?');
  const q = new URLSearchParams(query);
  q.delete('n');
  q.sort();
  return `${path}?${q.toString()}`;
};

/**
 * The "Linked" card: each distinct page the timeline's evidence links to, in first-seen order, with
 * the latest count a later line gave it. A job's is "Job ghl-orders" and the webhooks' "3 webhook
 * deliveries" (the mockup's words); the API's is its endpoints.
 */
export function incidentLinked(events: readonly Pick<IncidentEventView, 'link'>[]): IncidentLinked[] {
  const out: (IncidentLinked & { key: string })[] = [];
  for (const e of events) {
    if (!e.link) continue;
    const [path, query = ''] = e.link.split('?');
    const q = new URLSearchParams(query);
    const n = Number(q.get('n'));
    let item: IncidentLinked | null = null;
    if (path === INCIDENT_LINKS.jobs) item = { to: e.link, icon: 'jobs', label: q.get('job') ? `Job ${q.get('job')}` : 'Scheduled jobs' };
    else if (path === INCIDENT_LINKS.webhooks)
      item = { to: e.link, icon: 'api', label: Number.isInteger(n) && n > 0 ? plural(n, 'webhook delivery', 'webhook deliveries') : 'Webhook deliveries' };
    else if (path === INCIDENT_LINKS.api) item = { to: e.link, icon: 'api', label: 'API endpoints' };
    if (!item) continue;
    const key = linkKey(e.link);
    const at = out.findIndex((l) => l.key === key);
    if (at >= 0) out[at] = { ...item, key };
    else out.push({ ...item, key });
  }
  return out.map(({ key: _key, ...l }) => l);
}
