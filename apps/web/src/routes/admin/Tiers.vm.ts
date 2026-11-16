// The Admin Tiers & Upgrades view-model: a pure port of `renderVals()` in
// design-reference/Admin Tiers.dc.html. Contract: SCREENS § 4.8, phase 06 § 6.1.
//
// PURE. No React, no hooks, no router, no `Date.now()`: `now` arrives as an argument, and each
// `onClick="{{ … }}"` thunk in the reference becomes data the component carries out — the arguments
// for `setTierPrice`, `setModuleTier` or `setRequestStatus`.
//
// EVERY licence count, revenue figure and the sub line add `db.base`, the aggregate for the ~134
// learners the fixture does not model individually (phase 06 § 6.2):
//
//     agents = base.agent + users.filter(tier === 'agent').length
//     teams  = base.teams + db.teams.length
//
// In http mode the API returns `ZERO_BASE`, so the same arithmetic shows live numbers. Nothing here
// branches on where the data came from.

import { adminStamp, fmt, sortedModules } from '@ai/core';
import type { Db, IconName, Tier, UpgradeRequest } from '@ai/core';

// ---------------------------------------------------------------------------------------------
// View-model shape
// ---------------------------------------------------------------------------------------------

/** What an Access Matrix cell shows. The reference computes the three colours inline; CSS keys off this. */
export type MatrixState = 'included' | 'gated' | 'off';

export interface TierCard {
  id: Tier;
  /** `Agent` / `Team`. The card heading is `{name} Tier`. */
  name: string;
  /** `1 seat` for an individual tier, `{seats} seats` for the team tier. */
  seatsLabel: string;
  /** `{n} licenses` or `{n} teams`, the baseline included. */
  licenses: string;
  /** The raw number in the price input, which is bound straight to `setTierPrice`. */
  price: number;
  per: string;
  blurb: string;
  features: string[];
  revenue: string;
  /** The Team card carries the action-line border. */
  team: boolean;
}

export interface MatrixRow {
  key: string;
  label: string;
  state: MatrixState;
  icon: IconName;
  /** The `title`, which is also the cell's accessible name. Empty on the five fixed features. */
  title: string;
  /** `setModuleTier` arguments on an employee row; `null` on a fixed feature, which is inert. */
  toggle: { id: string; tier: Tier } | null;
}

export interface RequestAction {
  /** The status the button sets, which is also what the CSS keys its colours off. */
  status: UpgradeRequest['status'];
  label: string;
}

export interface RequestRow {
  id: string;
  name: string;
  email: string;
  source: string;
  ago: string;
  /** What `avatarColor` hashes: the learner when there is one, otherwise the request itself. */
  avatarId: string;
  status: UpgradeRequest['status'];
  /** The status token's label, straight from the reference's map. */
  statusLabel: string;
  /** A new request's row is tinted with the locked background. */
  isNew: boolean;
  actions: RequestAction[];
}

export interface TiersVM {
  summary: string;
  tiers: TierCard[];
  matrix: MatrixRow[];
  requests: RequestRow[];
  noRequests: boolean;
  /** `{n} open · {$} potential`, or empty when nothing is open. */
  pipeline: string;
}

// ---------------------------------------------------------------------------------------------
// Constants, ported verbatim
// ---------------------------------------------------------------------------------------------

/**
 * The five tier differences the reference lists under the employees, with whether the Agent tier
 * includes each one. Fixed copy, not data: these rows are not modules and cannot be toggled.
 */
const FIXED: readonly [string, boolean][] = [
  ['Live sessions, replays & transcripts', true],
  ['Resource & Compliance Vault', true],
  ['Team Hub & progress tracking', false],
  ['Executive Build Vault', false],
  ['Team seats (up to 7)', false],
];

/**
 * The status token's label per request status. `closed` reads `Not Started` because the reference
 * writes `{ label: 'Closed', ...lib.STATUS.none }` — the spread lands last, so `STATUS.none.label`
 * wins. The reference is the oracle (CLAUDE.md › Sources of truth), so the quirk is ported.
 */
const STATUS_LABEL: Record<UpgradeRequest['status'], string> = {
  new: 'New',
  contacted: 'Contacted',
  converted: 'Converted',
  closed: 'Not Started',
};

/** Rows run new → contacted → converted → closed, newest first inside each group. */
const ORDER: Record<UpgradeRequest['status'], number> = { new: 0, contacted: 1, converted: 2, closed: 3 };

// ---------------------------------------------------------------------------------------------
// The view-model
// ---------------------------------------------------------------------------------------------

export function tiersVM(db: Db, now: number): TiersVM {
  const B = db.base;
  const users = db.users.filter((u) => u.status !== 'invited');

  // The two figures every price on this screen is multiplied by.
  const agentN = B.agent + users.filter((u) => u.tier === 'agent').length;
  const teamN = B.teams + db.teams.length;

  const priceOf = (id: Tier): number => db.tiers.find((t) => t.id === id)?.price ?? 0;

  const tiers: TierCard[] = db.tiers.map((t) => {
    const isTeam = t.id === 'team';
    const n = isTeam ? teamN : agentN;
    return {
      id: t.id,
      name: t.name,
      seatsLabel: isTeam ? `${t.seats} seats` : '1 seat',
      licenses: `${n} ${isTeam ? 'teams' : 'licenses'}`,
      price: t.price,
      per: isTeam ? 'per team, per cohort' : 'per agent, per cohort',
      blurb: t.blurb,
      features: t.features,
      revenue: fmt.money(n * t.price),
      team: isTeam,
    };
  });

  // ---- Access Matrix: the published employees, then the five fixed differences -----------------
  const mods = sortedModules(db).filter((m) => m.status !== 'draft');
  const matrix: MatrixRow[] = [
    ...mods.map((m): MatrixRow => {
      const on = m.tier === 'agent';
      return {
        key: m.id,
        label: m.name,
        state: on ? 'included' : 'gated',
        icon: on ? 'check' : 'lock',
        title: on ? 'Gate to Team only' : 'Include in Agent Tier',
        toggle: { id: m.id, tier: on ? 'team' : 'agent' },
      };
    }),
    ...FIXED.map(([label, on]): MatrixRow => ({
      key: label,
      label,
      state: on ? 'included' : 'off',
      icon: on ? 'check' : 'x',
      title: '',
      toggle: null,
    })),
  ];

  // ---- Upgrade Requests ------------------------------------------------------------------------
  const requests: RequestRow[] = db.requests
    .slice()
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.at - a.at)
    .map((q) => {
      const open = q.status === 'new' || q.status === 'contacted';
      const actions: RequestAction[] = [];
      if (q.status === 'new') actions.push({ status: 'contacted', label: 'Mark Contacted' });
      // Converting runs `upgradeUser`, so a request with no learner account cannot be converted.
      if (open && q.userId) actions.push({ status: 'converted', label: 'Convert to Team' });
      if (open) actions.push({ status: 'closed', label: 'Close' });
      return {
        id: q.id,
        name: q.name,
        email: q.email,
        source: q.source,
        ago: fmt.ago(q.at, now),
        avatarId: q.userId || q.id,
        status: q.status,
        statusLabel: STATUS_LABEL[q.status],
        isNew: q.status === 'new',
        actions,
      };
    });

  const openN = db.requests.filter((q) => q.status === 'new' || q.status === 'contacted').length;
  const uplift = priceOf('team') - priceOf('agent');
  const total = agentN * priceOf('agent') + teamN * priceOf('team');

  return {
    summary: `December 2026 Cohort revenue ${fmt.money(total)} · ${agentN} Agent licenses · ${teamN} teams`,
    tiers,
    matrix,
    requests,
    noRequests: !requests.length,
    pipeline: openN ? `${openN} open · ${fmt.money(openN * uplift)} potential` : '',
  };
}

// ================================================================================================
// R2 (D-160 R2-3): Tiers & Upgrades on the signed-off Admin redesign (AdminRedesign.jsx `Tiers`). The
// same snapshot and the same `db.base` rule as above; the words are the mockup's, its times MST
// (`adminStamp`, BUILD-SPEC § 7). A Team Tier may come in more than one size (the mockup's 16 and 41
// seats): each card then counts the teams of its size.
// ================================================================================================

export interface TierR2Card {
  key: string;
  id: Tier;
  /** `Agent Tier`. */
  title: string;
  /** `1 seat`, `16 seats`. */
  seats: string;
  /** `104 licenses`, `5 teams`. */
  count: string;
  price: number;
  per: string;
  blurb: string;
  features: string[];
  revenue: string;
}

export interface RequestR2Row {
  id: string;
  name: string;
  /** `Agent → Team · 16 seats`; without a recorded ask, `Agent → Team`. */
  ask: string;
  /** The Team Tier's price over the Agent Tier's, or `—` with no prices. */
  value: string;
  received: string;
  at: number;
  status: { label: 'Pending' | 'Contacted' | 'Approved' | 'Declined'; tone: 'warn' | 'info' | 'ok' | 'off' };
  open: boolean;
  /** What the "…" offers, the old screen's: each sets a status (`setRequestStatus`). */
  actions: RequestAction[];
}

export interface AccessR2Row {
  id: string;
  name: string;
  /** In the Agent Tier (`agent`), or Team only. */
  agent: boolean;
  /** `setModuleTier`'s arguments. */
  toggle: { id: string; tier: Tier };
}

export interface TiersR2VM {
  summary: string;
  cards: TierR2Card[];
  requests: RequestR2Row[];
  matrix: AccessR2Row[];
}

const R2_REQUEST_STATUS: Record<UpgradeRequest['status'], RequestR2Row['status']> = {
  new: { label: 'Pending', tone: 'warn' },
  contacted: { label: 'Contacted', tone: 'info' },
  converted: { label: 'Approved', tone: 'ok' },
  closed: { label: 'Declined', tone: 'off' },
};

export function tiersR2VM(db: Db): TiersR2VM {
  const B = db.base;
  const users = db.users.filter((u) => u.status !== 'invited');
  const agentN = B.agent + users.filter((u) => u.tier === 'agent').length;
  const teamTiers = db.tiers.filter((t) => t.id === 'team').sort((a, b) => a.seats - b.seats);

  /** The teams a Team Tier card counts: every team, or with several sizes, the teams of its size. */
  const teamsFor = (seats: number): number => {
    if (teamTiers.length <= 1) return B.teams + db.teams.length;
    const i = teamTiers.findIndex((t) => t.seats === seats);
    const below = i > 0 ? teamTiers[i - 1]!.seats : 0;
    const last = i === teamTiers.length - 1;
    return (i === 0 ? B.teams : 0) + db.teams.filter((t) => t.seats > below && (last || t.seats <= seats)).length;
  };

  const cards = db.tiers.map((t): TierR2Card => {
    const team = t.id === 'team';
    const n = team ? teamsFor(t.seats) : agentN;
    return {
      key: `${t.id}-${t.seats}`,
      id: t.id,
      title: `${t.name} Tier`,
      seats: team ? `${t.seats} seats` : '1 seat',
      count: `${n} ${team ? 'teams' : 'licenses'}`,
      price: t.price,
      per: team ? 'per team, per cohort' : 'per agent, per cohort',
      blurb: t.blurb,
      features: t.features,
      revenue: fmt.money(n * t.price),
    };
  });
  const revenue = db.tiers.reduce((a, t) => a + (t.id === 'team' ? teamsFor(t.seats) : agentN) * t.price, 0);
  const teamN = B.teams + db.teams.length;
  const cohort = db.cohorts.find((c) => c.id === 'dec26') ?? db.cohorts[0];

  const agentPrice = db.tiers.find((t) => t.id === 'agent')?.price;
  const teamPrice = teamTiers[0]?.price;
  const value = agentPrice !== undefined && teamPrice !== undefined ? fmt.money(teamPrice - agentPrice) : '—';
  const isOpenReq = (q: UpgradeRequest) => q.status === 'new' || q.status === 'contacted';

  const requests = db.requests
    .slice()
    // The open ones first, oldest first (a queue); then the rest, newest first.
    .sort((a, b) => Number(isOpenReq(b)) - Number(isOpenReq(a)) || (isOpenReq(a) ? a.at - b.at : b.at - a.at))
    .map((q): RequestR2Row => {
      const open = isOpenReq(q);
      const actions: RequestAction[] = [];
      if (q.status === 'new') actions.push({ status: 'contacted', label: 'Mark Contacted' });
      if (open && q.userId) actions.push({ status: 'converted', label: 'Convert to Team' });
      if (open) actions.push({ status: 'closed', label: 'Decline' });
      return {
        id: q.id,
        name: q.name,
        ask: q.ask ?? 'Agent → Team',
        value,
        received: adminStamp(q.at),
        at: q.at,
        status: R2_REQUEST_STATUS[q.status],
        open,
        actions,
      };
    });

  return {
    summary: `${cohort ? `${cohort.name} Cohort` : 'Cohort'} revenue ${db.tiers.length ? fmt.money(revenue) : '—'} · ${agentN} Agent licenses · ${teamN} teams`,
    cards,
    requests,
    matrix: sortedModules(db).map((m) => ({
      id: m.id,
      name: m.name,
      agent: m.tier === 'agent',
      toggle: { id: m.id, tier: m.tier === 'agent' ? 'team' : 'agent' },
    })),
  };
}
