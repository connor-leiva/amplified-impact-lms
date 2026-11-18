import { canAccess, fmt, sessionFor, visibleModules } from '@ai/core';
import type { Db, IconName, Learner } from '@ai/core';

// The view-model for /team-tier, ported from design-reference/Portal Upgrade.dc.html `renderVals()`.
// Pure: no React, no clock read. Colours and icon paths stay out of here — the component keys its
// CSS off `aMuted` and `up.state`, and renders `icon` through <Icon>.

export interface TeamTierAdd {
  id: string;
  name: string;
  icon: IconName;
  headline: string;
  /** At most three, blanks dropped. */
  outputs: string[];
  sessLine: string;
}

export interface TeamTierCompareRow {
  label: string;
  a: string;
  t: string;
  /** The Agent cell is the em dash, so it reads as `--text-disabled` rather than secondary. */
  aMuted: boolean;
}

export interface TeamTierCta {
  state: 'available' | 'requested';
  label: string;
  icon: IconName;
  note: string;
}

export interface TeamTierVM {
  adds: TeamTierAdd[];
  compare: TeamTierCompareRow[];
  up: TeamTierCta;
  price: string;
  seats: number;
  features: string[];
}

/** `✓` and `—`, exactly as the reference writes the two compare cells. */
const YES = '✓';
const NO = '—';

export function teamTierVM(db: Db, user: Learner, now: number): TeamTierVM {
  const team = db.tiers.find((t) => t.id === 'team') ?? null;
  const agent = db.tiers.find((t) => t.id === 'agent') ?? null;

  // The reference asks `canAccess` about a synthetic Agent-tier viewer, not about `user`: this page
  // sells what Agent tier is missing, so the list is the same whoever is looking at it.
  const vis = visibleModules(db);
  const locked = vis.filter((m) => !canAccess({ tier: 'agent' }, m));

  const adds: TeamTierAdd[] = locked.map((m) => {
    const s = m.session ? sessionFor(db, user.cohortId, m.session) : null;
    return {
      id: m.id,
      name: m.name,
      icon: m.icon,
      headline: m.headline || m.outcome,
      outputs: m.outputs.filter(Boolean).slice(0, 3),
      sessLine: s ? `Session ${s.n} · ${fmt.day(s.start)}` : 'Self-paced',
    };
  });

  const compare: TeamTierCompareRow[] = [
    { label: 'AI Employees', a: String(vis.length - locked.length), t: String(vis.length) },
    { label: 'Seats', a: String(agent?.seats ?? 0), t: String(team?.seats ?? 0) },
    { label: 'Live Sessions and Replays', a: YES, t: YES },
    { label: 'Resource & Compliance Vault', a: YES, t: YES },
    { label: 'Team Hub with Progress Tracking', a: NO, t: YES },
    { label: 'Executive Build Vault', a: NO, t: YES },
  ].map((r) => ({ ...r, aMuted: r.a === NO }));

  const open =
    db.requests.find((q) => q.userId === user.id && (q.status === 'new' || q.status === 'contacted')) ?? null;

  const up: TeamTierCta = open
    ? {
        state: 'requested',
        label: 'Consultation Requested',
        icon: 'check',
        note: `Requested ${fmt.agoInline(open.at, now)} · we’ll reach out within 1 business day`,
      }
    : {
        state: 'available',
        label: 'Book Upgrade Consultation',
        icon: 'calendar',
        note: '15-minute call · Your Agent tier progress carries over',
      };

  return {
    adds,
    compare,
    up,
    price: fmt.money(team?.price ?? 0),
    seats: team?.seats ?? 0,
    features: team?.features ?? [],
  };
}
