// /admin/health on R2 (D-169, spec § 7.1): the mockup's `Health()`, as a pure model. The screen
// renders what this returns from `GET /api/console/health`; every figure is the API's. Production
// prints spec § 7.1's eight tiles and "Seat pressure"; the fixture's `HealthSample` (fixture build
// only) carries the mockup's own "Live sessions", "p95 latency", "DB connections" and "Services".
//
// THE MOCKUP'S WORDS where it has them, for both: "Healthy · 24h", "Needs review", "3 GHL, 1 Stripe",
// "12 of 12 succeeded", "Sev 2 · INC-0007", "None", "Open since …", "… is past due", "… used all 5
// attempts", "… is at 15 of 16 seats", "Latest deploy", "All deploys", "All systems normal".
//
// ONE ZONE (D-160): every time is MST through `adminStamp`. Statuses are a word and a tone, never colour
// alone. Seat bars are never red (`seatBar`).

import { HEALTH_DEPLOYS, adminStamp, healthHeadline, planLine, seatBar, seatPct, usdCents, usdWhole } from '@ai/core';
import type {
  AdminStatus,
  HealthAttention,
  HealthDeployStatus,
  HealthResponse,
  HealthSeverity,
  HealthTileKey,
  HealthUnavailable,
  SeatBar,
} from '@ai/core';
import type { HealthSample } from '../../data/console';
import { teamPath } from '../../shell/admin/addresses';

export const NONE = '—';

export const HEALTH_COPY = {
  title: 'System Health',
  description: 'learn.amplifiedimpact.io right now. Times are MST (America/Phoenix).',
  head: {
    normal: 'All systems normal',
    attention: 'Needs attention',
    unavailable: 'Some checks unavailable',
  },
  tiles: {
    connectedBrowsers: 'Connected browsers',
    signInSuccess: 'Sign-in success',
    failedPayments: 'Failed payments',
    failedWebhooks: 'Failed webhooks',
    jobFailures: 'Job failures, 24h',
    openIncidents: 'Open incidents',
    mrr: 'MRR',
    acceleratorSeats: 'Accelerator seats',
  } satisfies Record<HealthTileKey, string>,
  thisServer: 'on this server',
  healthy24h: 'Healthy · 24h',
  low24h: 'Below 95% · 24h',
  noSignIns: 'No sign-ins · 24h',
  needsReview: 'Needs review',
  none: 'None',
  noRuns: 'No runs · 24h',
  soldOut: 'Sold out',
  unavailable: {
    not_configured: 'Not configured',
    failed: 'Unavailable',
    stripe_not_connected: 'Stripe isn’t connected',
    stripe_permission_missing: 'Stripe needs a permission',
  } satisfies Record<HealthUnavailable, string>,
  attention: 'Needs attention',
  nothing: { title: 'Nothing needs attention', body: 'Failed payments, webhooks, and jobs show up here when they happen.' },
  services: 'Services',
  seats: 'Seat pressure',
  noSeats: 'No seat caps yet',
  latestDeploy: 'Latest deploy',
  recentDeploys: 'Recent deploys',
  allDeploys: 'All deploys',
  notConfigured: 'Not configured',
  deploysNeed: 'History shows once a read-only GitHub or Railway token is set.',
} as const;

const C = HEALTH_COPY;
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

export interface TileVM {
  key: HealthTileKey;
  label: string;
  value: string;
  sub?: string;
  tone?: 'ok' | 'bad' | null;
  to?: string;
}

export interface AttentionVM {
  key: string;
  title: string;
  meta: string;
  pill: AdminStatus;
  to: string;
}

export interface SeatVM {
  key: string;
  name: string;
  to: string;
  pct: number;
  bar: SeatBar;
  text: string;
}

export interface DeployVM {
  sha: string;
  status: AdminStatus | null;
  message: string;
  byline: string;
}

export type SideCardVM =
  | { kind: 'services'; title: string; rows: { name: string; status: AdminStatus }[] }
  | { kind: 'seats'; title: string; rows: SeatVM[] | null }
  | { kind: 'deploys'; title: string; link: { label: string; to: string }; state: 'ok' | 'not_configured' | 'unavailable'; rows: DeployVM[] };

export interface HealthVM {
  pill: AdminStatus;
  tiles: TileVM[];
  attention: AttentionVM[];
  side: SideCardVM[];
}

/** The mockup's `TONE` for the words this screen prints. */
const TONE: Readonly<Record<string, AdminStatus['tone']>> = {
  Healthy: 'ok',
  Connected: 'ok',
  Live: 'ok',
  Succeeded: 'ok',
  Degraded: 'bad',
  Failed: 'bad',
  'Past due': 'bad',
  'Sev 1': 'bad',
  'Sev 2': 'bad',
  'Sev 3': 'warn',
  Waiting: 'warn',
  'Not configured': 'warn',
  Building: 'run',
  Retrying: 'run',
  Removed: 'off',
  Skipped: 'off',
};
export const statusOf = (label: string): AdminStatus => ({ label, tone: TONE[label] ?? 'neutral' });

export const sevLabel = (s: HealthSeverity): string => `Sev ${s.slice(3)}`;

const DEPLOY_LABEL: Record<HealthDeployStatus, string> = {
  live: 'Live',
  succeeded: 'Succeeded',
  failed: 'Failed',
  building: 'Building',
  removed: 'Removed',
  skipped: 'Skipped',
};

/** Each tile's screen, as the mockup's `go` sends it. */
const TILE_TO: Record<HealthTileKey, string> = {
  connectedBrowsers: '/admin/revenue/usage',
  signInSuccess: '/admin/revenue/usage',
  failedPayments: '/admin/revenue/payments/failed',
  failedWebhooks: '/admin/api/hooks',
  jobFailures: '/admin/jobs',
  openIncidents: '/admin/incidents',
  mrr: '/admin/revenue',
  acceleratorSeats: '/admin/revenue',
};

const count = (n: number, bad: string): Pick<TileVM, 'sub' | 'tone'> => (n > 0 ? { sub: bad, tone: 'bad' } : { sub: C.none, tone: 'ok' });

function tileVM(r: HealthResponse, key: HealthTileKey): TileVM {
  const base = { key, label: C.tiles[key], to: TILE_TO[key] };
  const t = r.tiles[key];
  if (t.status === 'unavailable' || t.value === null) {
    if (key === 'signInSuccess' && t.status !== 'unavailable') return { ...base, value: NONE, sub: C.noSignIns, tone: null };
    return { ...base, value: NONE, sub: C.unavailable[t.reason ?? 'failed'], tone: null };
  }
  const n = t.value;
  switch (key) {
    case 'connectedBrowsers':
      return { ...base, value: String(n), sub: C.thisServer, tone: null };
    case 'signInSuccess':
      return { ...base, value: `${n.toFixed(1)}%`, ...(t.status === 'attention' ? { sub: C.low24h, tone: 'bad' } : { sub: C.healthy24h, tone: 'ok' }) };
    case 'failedPayments':
      return { ...base, value: String(n), ...count(n, C.needsReview) };
    case 'failedWebhooks': {
      const d = r.tiles.failedWebhooks.detail ?? { ghl: 0, stripe: 0 };
      const parts = [d.ghl > 0 ? `${d.ghl} GHL` : null, d.stripe > 0 ? `${d.stripe} Stripe` : null].filter(Boolean).join(', ');
      return { ...base, value: String(n), ...count(n, parts) };
    }
    case 'jobFailures': {
      const d = r.tiles.jobFailures.detail ?? { failedJobs: [], jobs: 0 };
      if (n > 0) return { ...base, value: String(n), sub: d.failedJobs.join(', '), tone: 'bad' };
      return { ...base, value: '0', ...(d.jobs > 0 ? { sub: `${d.jobs} of ${d.jobs} succeeded`, tone: 'ok' } : { sub: C.noRuns, tone: null }) };
    }
    case 'openIncidents': {
      const top = r.tiles.openIncidents.detail?.top;
      return { ...base, value: String(n), ...count(n, top ? `${sevLabel(top.severity)} · ${top.id}` : '') };
    }
    case 'mrr': {
      const subs = r.tiles.mrr.detail?.activeSubscriptions ?? 0;
      return { ...base, value: usdWhole(n), sub: `${subs} active ${plural(subs, 'subscription')}`, tone: null };
    }
    case 'acceleratorSeats': {
      const cap = r.tiles.acceleratorSeats.detail?.cap ?? 0;
      return { ...base, value: `${n} / ${cap}`, sub: n >= cap ? C.soldOut : `${cap - n} left`, tone: null };
    }
  }
}

export function attentionVM(a: HealthAttention): AttentionVM {
  switch (a.kind) {
    case 'incident':
      return { key: `i:${a.id}`, title: a.title, meta: `Open since ${adminStamp(a.openedAt)}`, pill: statusOf(sevLabel(a.severity)), to: `/admin/incidents/${encodeURIComponent(a.id)}` };
    case 'payment': {
      const last = a.retriesLeft !== null ? `${a.retriesLeft} ${plural(a.retriesLeft, 'retry', 'retries')} left` : `${a.attempts} failed ${plural(a.attempts, 'attempt')}`;
      return {
        key: `p:${a.invoiceId}`,
        title: `${a.customer ?? a.invoiceId} is past due`,
        meta: [a.plan, usdCents(a.amountCents), last].filter(Boolean).join(' · '),
        pill: statusOf('Past due'),
        to: '/admin/revenue/payments/failed',
      };
    }
    case 'webhook':
      return {
        key: `w:${a.eventId}`,
        title: a.attempts !== null ? `Stripe ${a.eventType} used all ${a.attempts} attempts` : `Stripe ${a.eventType} failed`,
        meta: a.error ?? `Received ${adminStamp(a.receivedAt)}`,
        pill: statusOf('Failed'),
        to: '/admin/api/hooks',
      };
    case 'ghl':
      return {
        key: 'ghl',
        title: a.gaveUp > 0 ? `${a.gaveUp} GHL ${plural(a.gaveUp, 'sync')} gave up` : `${a.retrying} GHL ${plural(a.retrying, 'sync')} retrying`,
        meta: `${a.gaveUp} gave up · ${a.retrying} retrying`,
        pill: statusOf(a.gaveUp > 0 ? 'Failed' : 'Retrying'),
        to: '/admin/api/hooks',
      };
    case 'job':
      return {
        key: `j:${a.job}`,
        title: `${a.job} failed ${a.failures} ${plural(a.failures, 'time')} in 24h`,
        meta: [`Last failed ${adminStamp(a.lastAt)}`, a.error].filter(Boolean).join(' · '),
        pill: statusOf('Failed'),
        to: '/admin/jobs',
      };
    case 'seats':
      return {
        key: `s:${a.teamId}`,
        title: `${a.name} is at ${a.used} of ${a.cap} seats`,
        meta: planLine(a.plan, a.cap),
        pill: statusOf('Waiting'),
        to: teamPath(a.teamId),
      };
  }
}

function headPill(r: HealthResponse): AdminStatus {
  const h = healthHeadline(r);
  if (h.kind === 'incidents') return { label: `${h.n} open ${plural(h.n, 'incident')}`, tone: 'bad' };
  if (h.kind === 'attention') return { label: C.head.attention, tone: 'warn' };
  if (h.kind === 'unavailable') return { label: C.head.unavailable, tone: 'neutral' };
  return { label: C.head.normal, tone: 'ok' };
}

function deploysVM(d: NonNullable<HealthResponse['deploys']>, max: number): SideCardVM {
  const link = { label: C.allDeploys, to: '/admin/deploys' };
  if (d.state !== 'ok') {
    const rows = d.state === 'not_configured' && d.live ? [{ sha: d.live.slice(0, 7), status: statusOf('Live'), message: C.deploysNeed, byline: '' }] : [];
    return { kind: 'deploys', title: C.recentDeploys, link, state: d.state, rows };
  }
  const rows = d.rows.slice(0, max).map((x) => ({
    sha: x.sha.slice(0, 7),
    status: x.status ? statusOf(DEPLOY_LABEL[x.status]) : null,
    message: x.message,
    byline: [x.author, adminStamp(x.at)].filter(Boolean).join(' · '),
  }));
  return { kind: 'deploys', title: rows.length === 1 ? C.latestDeploy : C.recentDeploys, link, state: 'ok', rows };
}

export function healthVM(r: HealthResponse, sample: HealthSample | null = null): HealthVM {
  const tiles = (['connectedBrowsers', 'signInSuccess', 'failedPayments', 'failedWebhooks', 'jobFailures', 'openIncidents', 'mrr', 'acceleratorSeats'] as const).map((key) => {
    const t = tileVM(r, key);
    const over = sample?.tiles[key];
    return over ? { ...t, ...over } : t;
  });
  const side: SideCardVM[] = [];
  if (sample) side.push({ kind: 'services', title: C.services, rows: sample.services.map(([name, st]) => ({ name, status: statusOf(st) })) });
  else
    side.push({
      kind: 'seats',
      title: C.seats,
      rows:
        r.seatPressure?.map((s) => ({
          key: s.key,
          name: s.name,
          to: s.teamId ? teamPath(s.teamId) : '/admin/revenue',
          pct: seatPct(s.used, s.cap),
          bar: seatBar(s.used, s.cap, s.kind),
          text: `${s.used} / ${s.cap}`,
        })) ?? null,
    });
  if (r.deploys) side.push(deploysVM(r.deploys, sample?.deploys ?? HEALTH_DEPLOYS));
  return { pill: headPill(r), tiles, attention: r.attention.map(attentionVM), side };
}
