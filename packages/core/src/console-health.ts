// The Admin Console's System Health and Build hub (D-169, spec §§ 7.1–7.2). Pure: the API settles each
// source (`apps/api/src/console/health.ts`) and hands the results here, and `composeHealth` turns them
// into `GET /api/console/health`'s answer. The Health screen's view-model only words what this decides.
//
// EIGHT TILES, EACH ON ITS OWN. A tile is `{ value | null, status: ok | attention | unavailable,
// detail? }` (spec § 7.1). A source that failed, or that this server has no way to read yet, makes
// ITS tile `unavailable` (with the reason) and nothing else: the answer is never a 500 because one
// source broke, and a tile that needs two sources (Failed webhooks: Stripe's and GHL's) is unavailable
// when either is, rather than showing half a count as the whole (spec § 13: never a partial figure).

import { nearCap } from './console-support';
import type { WorkspaceRow } from './console-support';
import { FIXED_SEAT_PLANS } from './console-view';
import { COHORT_SEATS } from './offer';
import type { PlanKind, SkillSet } from './offer';

// ================================================================================================
// The answer
// ================================================================================================

/** The eight tiles, in the screen's order (spec § 7.1). */
export const HEALTH_TILE_KEYS = [
  'connectedBrowsers',
  'signInSuccess',
  'failedPayments',
  'failedWebhooks',
  'jobFailures',
  'openIncidents',
  'mrr',
  'acceleratorSeats',
] as const;
export type HealthTileKey = (typeof HEALTH_TILE_KEYS)[number];

export type HealthTileStatus = 'ok' | 'attention' | 'unavailable';

/**
 * Why a tile has no value: its source isn't set up on this server (`not_configured`), it failed
 * (`failed`), or Stripe has no key or lacks a Read permission (Billing's two refusals, D-163).
 */
export const HEALTH_UNAVAILABLE = ['not_configured', 'failed', 'stripe_not_connected', 'stripe_permission_missing'] as const;
export type HealthUnavailable = (typeof HEALTH_UNAVAILABLE)[number];

export interface HealthTile<D = undefined> {
  value: number | null;
  status: HealthTileStatus;
  detail?: D;
  /** Only on an `unavailable` tile. */
  reason?: HealthUnavailable;
}

export interface HealthTiles {
  /** `EventHub.clients()`: browsers holding `/api/events` open on THIS server process. */
  connectedBrowsers: HealthTile;
  /** Percent, one decimal, rounded down; null when nobody signed in over the window. */
  signInSuccess: HealthTile<{ attempts: number }>;
  failedPayments: HealthTile;
  failedWebhooks: HealthTile<{ stripe: number; ghl: number }>;
  /** Jobs with a failed tick over the window; `jobs` is how many jobs ticked at all. */
  jobFailures: HealthTile<{ failedJobs: string[]; jobs: number }>;
  openIncidents: HealthTile<{ top: { id: string; severity: HealthSeverity } | null }>;
  /** Cents a month (D-163's MRR: active and past due, no tax, no trials). */
  mrr: HealthTile<{ activeSubscriptions: number }>;
  /** Seats sold, by D-154's own counter; `cap` is the product rule, view only. */
  acceleratorSeats: HealthTile<{ cap: number }>;
}

export const HEALTH_SEVERITIES = ['sev1', 'sev2', 'sev3'] as const;
export type HealthSeverity = (typeof HEALTH_SEVERITIES)[number];

/** One thing a person should look at, linked to its screen by the view-model (at most six). */
export type HealthAttention =
  | { kind: 'incident'; id: string; title: string; severity: HealthSeverity; openedAt: number }
  | {
      kind: 'payment';
      invoiceId: string;
      customer: string | null;
      teamId: string | null;
      plan: string | null;
      amountCents: number;
      attempts: number;
      /** Stripe's retries still to come, when the source knows them (it doesn't, with these scopes). */
      retriesLeft: number | null;
    }
  | { kind: 'webhook'; eventId: string; eventType: string; receivedAt: number; error: string | null; attempts: number | null }
  | { kind: 'ghl'; gaveUp: number; retrying: number }
  | { kind: 'job'; job: string; failures: number; lastAt: number; error: string | null }
  | { kind: 'seats'; teamId: string; name: string; plan: PlanKind | null; used: number; cap: number };

/** A seat-pressure row: a workspace's seats, or the AI Accelerator's (`teamId` null). */
export interface HealthSeatRow {
  key: string;
  name: string;
  kind: PlanKind | null;
  used: number;
  cap: number;
  teamId: string | null;
}

/** PR 9's deploy statuses (`DeployStatus`, D-168); null when the source can't say (GitHub's commits). */
export type HealthDeployStatus = 'live' | 'succeeded' | 'failed' | 'building' | 'removed' | 'skipped';

export interface HealthDeployRow {
  sha: string;
  message: string;
  author: string | null;
  at: number;
  status: HealthDeployStatus | null;
}

/**
 * Deploy history (PR 9): the recent deploys; or "Not configured" (no read-only GitHub or Railway token),
 * with the live commit when Railway names one; or unavailable (the read failed).
 */
export type HealthDeploys =
  | { state: 'ok'; rows: HealthDeployRow[] }
  | { state: 'not_configured'; live: string | null }
  | { state: 'unavailable' };

export interface HealthResponse {
  asOf: number;
  tiles: HealthTiles;
  attention: HealthAttention[];
  /** The five fullest seat caps; null when the read failed. */
  seatPressure: HealthSeatRow[] | null;
  /** The three latest deploys; null for a role without `ops.read`, which sees no ops page (D3). */
  deploys: HealthDeploys | null;
}

export const HEALTH_ATTENTION_MAX = 6;
export const HEALTH_SEAT_TOP = 5;
export const HEALTH_DEPLOYS = 3;
/** Sign-ins, failed payments, webhooks and jobs are read over the last day. */
export const HEALTH_WINDOW_MS = 24 * 3600_000;
/** Sign-in success needs a look under 95%, once at least 20 sign-ins make the figure mean something. */
export const SIGN_IN_FLOOR_PCT = 95;
export const SIGN_IN_MIN_ATTEMPTS = 20;

// ================================================================================================
// Composing it
// ================================================================================================

/** A source's result, as the API settled it. */
export type Settled<T> = { ok: true; value: T } | { ok: false; reason: HealthUnavailable };

export interface HealthIncident {
  id: string;
  title: string;
  severity: HealthSeverity;
  status: 'open' | 'acknowledged';
  openedAt: number;
  /** The auto-open rule's fingerprint (`job:ghl-orders`), for a job failure it already covers. */
  fingerprint: string | null;
}

export interface HealthJobs {
  /** Every job that ticked over the window. */
  jobs: string[];
  failures: { job: string; failures: number; lastAt: number; error: string | null }[];
}

export interface HealthBilling {
  failedPayments: number;
  mrrCents: number;
  activeSubscriptions: number;
  /** The failed payments themselves, newest first. */
  failed: Extract<HealthAttention, { kind: 'payment' }>[];
}

/** A workspace's seats, as the Workspaces list reads them (`listWorkspaces`). */
export type HealthWorkspace = Pick<WorkspaceRow, 'teamId' | 'name' | 'planKind' | 'planStatus' | 'seatsUsed' | 'seatCap'>;

export interface HealthInputs {
  browsers: Settled<number>;
  signIns: Settled<{ attempts: number; ok: number }>;
  billing: Settled<HealthBilling>;
  /** Every errored, unprocessed event (`total`), and the newest few of them. */
  stripeWebhooks: Settled<{ total: number; rows: Extract<HealthAttention, { kind: 'webhook' }>[] }>;
  ghl: Settled<{ gaveUp: number; retrying: number }>;
  jobs: Settled<HealthJobs>;
  incidents: Settled<HealthIncident[]>;
  seats: Settled<{ sold: number; cap: number }>;
  workspaces: Settled<readonly HealthWorkspace[]>;
  /** Null: the viewer can't read deploys. */
  deploys: Settled<HealthDeploys> | null;
}

const off = <D>(reason: HealthUnavailable): HealthTile<D> => ({ value: null, status: 'unavailable', reason });
const flag = (n: number): HealthTileStatus => (n > 0 ? 'attention' : 'ok');

/** Percent, rounded down to one decimal, so 99.96% is never shown as 100%. */
export const successPct = (ok: number, attempts: number): number => Math.floor((ok * 1000) / attempts) / 10;

const SEV_RANK: Record<HealthSeverity, number> = { sev1: 0, sev2: 1, sev3: 2 };
const bySeverity = (a: HealthIncident, b: HealthIncident) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.openedAt - b.openedAt || (a.id < b.id ? -1 : 1);

/** A plan whose seats count toward its cap: active, trialing or past due. */
const LIVE_PLAN = ['active', 'trialing', 'past_due'];

/** A seat row that needs a look: nearly full (`nearCap`), and not a fixed-seat plan that is simply full. */
export const seatsNeedLook = (r: Pick<HealthSeatRow, 'kind' | 'used' | 'cap'>): boolean =>
  nearCap(r.used, r.cap) && !(r.kind !== null && FIXED_SEAT_PLANS.includes(r.kind) && r.used >= r.cap);

/** Whether an open incident already covers a job's failures (its fingerprint names the job). */
const covers = (i: HealthIncident, job: string): boolean => i.status === 'open' && (i.fingerprint?.split(/[:/\s]/).includes(job) ?? false);

/** The workspace rows that count, as seat rows: a live plan and a cap. */
export function workspaceSeats(rows: readonly HealthWorkspace[]): HealthSeatRow[] {
  return rows
    .filter((r) => r.planStatus !== null && LIVE_PLAN.includes(r.planStatus) && r.seatCap > 0)
    .map((r) => ({ key: r.teamId, name: r.name, kind: r.planKind, used: r.seatsUsed, cap: r.seatCap, teamId: r.teamId }));
}

/** The `n` fullest: by share of the cap, then by seats used, then by name. */
export function topSeatPressure(rows: readonly HealthSeatRow[], n: number = HEALTH_SEAT_TOP): HealthSeatRow[] {
  return [...rows]
    .filter((r) => r.cap > 0)
    .sort((a, b) => b.used / b.cap - a.used / a.cap || b.used - a.used || a.name.localeCompare(b.name))
    .slice(0, n);
}

/**
 * Needs attention, at most six, in this order: open incidents (by severity, oldest first), failed
 * payments, Stripe webhook deliveries that failed, GHL rows that gave up or are retrying (one line),
 * failing jobs an open incident doesn't already cover, and nearly-full seat caps (fullest first).
 */
export function attentionItems(i: HealthInputs): HealthAttention[] {
  const out: HealthAttention[] = [];
  const open = i.incidents.ok ? i.incidents.value.filter((x) => x.status === 'open').sort(bySeverity) : [];
  for (const x of open) out.push({ kind: 'incident', id: x.id, title: x.title, severity: x.severity, openedAt: x.openedAt });
  if (i.billing.ok) out.push(...i.billing.value.failed);
  if (i.stripeWebhooks.ok) out.push(...[...i.stripeWebhooks.value.rows].sort((a, b) => b.receivedAt - a.receivedAt));
  if (i.ghl.ok && i.ghl.value.gaveUp + i.ghl.value.retrying > 0) out.push({ kind: 'ghl', ...i.ghl.value });
  if (i.jobs.ok)
    for (const f of [...i.jobs.value.failures].sort((a, b) => b.lastAt - a.lastAt))
      if (!open.some((x) => covers(x, f.job))) out.push({ kind: 'job', ...f });
  if (i.workspaces.ok)
    for (const r of topSeatPressure(workspaceSeats(i.workspaces.value).filter(seatsNeedLook), HEALTH_ATTENTION_MAX))
      out.push({ kind: 'seats', teamId: r.teamId!, name: r.name, plan: r.kind, used: r.used, cap: r.cap });
  return out.slice(0, HEALTH_ATTENTION_MAX);
}

export function composeHealth(i: HealthInputs, asOf: number): HealthResponse {
  const tiles: HealthTiles = {
    connectedBrowsers: i.browsers.ok ? { value: i.browsers.value, status: 'ok' } : off(i.browsers.reason),
    signInSuccess: !i.signIns.ok
      ? off(i.signIns.reason)
      : i.signIns.value.attempts === 0
        ? { value: null, status: 'ok', detail: { attempts: 0 } }
        : (() => {
            const pct = successPct(i.signIns.value.ok, i.signIns.value.attempts);
            const low = i.signIns.value.attempts >= SIGN_IN_MIN_ATTEMPTS && pct < SIGN_IN_FLOOR_PCT;
            return { value: pct, status: low ? 'attention' : 'ok', detail: { attempts: i.signIns.value.attempts } };
          })(),
    failedPayments: i.billing.ok ? { value: i.billing.value.failedPayments, status: flag(i.billing.value.failedPayments) } : off(i.billing.reason),
    failedWebhooks:
      i.stripeWebhooks.ok && i.ghl.ok
        ? (() => {
            const stripe = i.stripeWebhooks.value.total;
            const ghl = i.ghl.value.gaveUp + i.ghl.value.retrying;
            return { value: stripe + ghl, status: flag(stripe + ghl), detail: { stripe, ghl } };
          })()
        : off(!i.stripeWebhooks.ok ? i.stripeWebhooks.reason : (i.ghl as { reason: HealthUnavailable }).reason),
    jobFailures: i.jobs.ok
      ? (() => {
          const failedJobs = [...new Set(i.jobs.value.failures.map((f) => f.job))].sort();
          return { value: failedJobs.length, status: flag(failedJobs.length), detail: { failedJobs, jobs: new Set(i.jobs.value.jobs).size } };
        })()
      : off(i.jobs.reason),
    openIncidents: i.incidents.ok
      ? (() => {
          const open = i.incidents.value.filter((x) => x.status === 'open').sort(bySeverity);
          const top = open[0] ? { id: open[0].id, severity: open[0].severity } : null;
          return { value: open.length, status: flag(open.length), detail: { top } };
        })()
      : off(i.incidents.reason),
    mrr: i.billing.ok
      ? { value: i.billing.value.mrrCents, status: 'ok', detail: { activeSubscriptions: i.billing.value.activeSubscriptions } }
      : off(i.billing.reason),
    acceleratorSeats: i.seats.ok ? { value: i.seats.value.sold, status: 'ok', detail: { cap: i.seats.value.cap } } : off(i.seats.reason),
  };
  // The AI Accelerator's seats count beside the workspaces' (the R1 mock's "Seat-cap pressure" lists it).
  const accelerator: HealthSeatRow[] = i.seats.ok
    ? [{ key: 'accelerator', name: 'AI Accelerator', kind: 'cohort', used: i.seats.value.sold, cap: i.seats.value.cap, teamId: null }]
    : [];
  return {
    asOf,
    tiles,
    attention: attentionItems(i),
    seatPressure: i.workspaces.ok ? topSeatPressure([...workspaceSeats(i.workspaces.value), ...accelerator]) : null,
    deploys:
      i.deploys === null
        ? null
        : !i.deploys.ok
          ? { state: 'unavailable' }
          : i.deploys.value.state === 'ok'
            ? { state: 'ok', rows: i.deploys.value.rows.slice(0, HEALTH_DEPLOYS) }
            : i.deploys.value,
  };
}

/** The AI Accelerator's cap, view only (D-154). */
export const HEALTH_SEAT_CAP = COHORT_SEATS;

/**
 * The head's one status: the open incidents, else that something needs attention, else that a check
 * couldn't be read, else "All systems normal" (the mockup's empty state).
 */
export type HealthHeadline =
  | { kind: 'incidents'; n: number }
  | { kind: 'attention' }
  | { kind: 'unavailable' }
  | { kind: 'normal' };

export function healthHeadline(r: Pick<HealthResponse, 'tiles' | 'attention'>): HealthHeadline {
  const n = r.tiles.openIncidents.value ?? 0;
  if (n > 0) return { kind: 'incidents', n };
  const tiles = HEALTH_TILE_KEYS.map((k) => r.tiles[k].status);
  if (r.attention.length > 0 || tiles.includes('attention')) return { kind: 'attention' };
  if (tiles.includes('unavailable')) return { kind: 'unavailable' };
  return { kind: 'normal' };
}

// ================================================================================================
// The Build hub (spec § 7.2): the skill library, read-only
// ================================================================================================

export const SKILL_STATUSES = ['draft', 'published', 'hidden'] as const;
export type SkillStatus = (typeof SKILL_STATUSES)[number];

/** One `skills` row, as `GET /api/console/skills` answers it. No file keys: they are bucket paths. */
export interface ConsoleSkillRow {
  id: string;
  title: string;
  sets: SkillSet;
  free: boolean;
  status: SkillStatus;
  releasedAt: number;
}

/** The sets, short, as the Build hub's Skills table prints them (the R1 mock's words). */
export const SKILL_SET_SHORT: Readonly<Record<SkillSet, string>> = { owner_ops: 'Owner-ops', agent: 'Agent', both: 'Both' };
export const SKILL_STATUS_LABELS: Readonly<Record<SkillStatus, string>> = { draft: 'Draft', published: 'Published', hidden: 'Hidden' };
