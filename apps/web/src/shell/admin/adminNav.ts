// The admin sidebar of the Admin redesign R2 (D-160, BUILD-SPEC § 4): `NAV` in
// design-reference/admin-redesign-r2/AdminRedesign.jsx, as a pure model the shell renders.
//
// PURE. No router, no storage, no React: the shell passes in where the viewer is, who they are, the
// counts behind the badges and the groups they opened or closed, and gets back what to draw.
//
// Which rows show:
//   - `fullNav` (the parity fixture only): the mockup's whole `NAV`, so the shell can be compared with
//     its refs before every screen exists. A row whose screen is not built yet goes to its future
//     address, which is the Console 404 today.
//   - otherwise (production, and the ordinary fixture): only rows whose screen exists. Each later R2
//     PR sets `built` on its row when its screen lands. Staff & Roles is not in the mockup's `NAV`,
//     but D11 keeps roles and the `PermKey` matrix on `/admin/staff`, so its row stays under Access
//     in production (`offMockup`; where it belongs in the R2 NAV is Connor's call, D-160 R2-3a).
//   - by capability: a Console row shows only to a role `consoleCan` lets open it (the server still
//     enforces), and a group with no rows is left out.

import { consoleCan } from '@ai/core';
import type { ConsoleCap, IconName } from '@ai/core';

export const R2_GROUPS = ['Health', 'Build', 'Support', 'Revenue', 'Operations', 'Access'] as const;
export type R2Group = (typeof R2_GROUPS)[number];

/** What a badge counts. Each hides at zero (BUILD-SPEC § 4). */
export type BadgeKey = 'drafts' | 'requests' | 'incidents';
export type NavCounts = Readonly<Record<BadgeKey, number>>;

export interface R2NavDef {
  id: string;
  label: string;
  icon: IconName;
  path: string;
  /** The screen exists, so production shows the row. */
  built: boolean;
  /** The Console capability that opens it; none for the existing admin screens. */
  cap?: ConsoleCap;
  badge?: BadgeKey;
  /** Shown only outside the parity fixture: a screen the mockup's `NAV` does not list (Staff & Roles). */
  offMockup?: true;
}

const row = (
  id: string,
  label: string,
  icon: IconName,
  path: string,
  built: boolean,
  extra: Partial<R2NavDef> = {},
): R2NavDef => ({
  id,
  label,
  icon,
  path,
  built,
  ...extra,
});

/** `NAV`, in the mockup's order. The mockup's `'ops'` rows read `ops.read`. */
export const R2_NAV: readonly (readonly [R2Group, readonly R2NavDef[]])[] = [
  [
    'Health',
    [
      row('overview', 'Overview', 'r2Overview', '/admin', true),
      row('health', 'System Health', 'r2Health', '/admin/health', false, { cap: 'console.view' }),
    ],
  ],
  [
    'Build',
    [
      row('curriculum', 'Curriculum', 'r2Curriculum', '/admin/curriculum', true, { badge: 'drafts' }),
      row('builder', 'Module Builder', 'r2Builder', '/admin/curriculum/new', true),
      row('vault', 'Resource Vault', 'r2Vault', '/admin/vault', true),
      row('cohorts', 'Cohorts & Sessions', 'r2Cohorts', '/admin/cohorts', true),
      row('announce', 'Announcements', 'r2Announce', '/admin/announcements', true),
    ],
  ],
  [
    'Support',
    [
      row('learners', 'Learners & Teams', 'r2Learners', '/admin/learners', true),
      row('workspaces', 'Workspaces', 'r2Workspaces', '/admin/workspaces', true, { cap: 'workspaces.read' }),
      row('users', 'Users', 'r2Users', '/admin/users', true, { cap: 'users.read' }),
      row('masquerade', 'Masquerade', 'r2Masquerade', '/admin/masquerade', false, { cap: 'console.view' }),
    ],
  ],
  [
    'Revenue',
    [
      row('tiers', 'Tiers & Upgrades', 'r2Tiers', '/admin/tiers', true, { badge: 'requests' }),
      row('billing', 'Billing', 'r2Billing', '/admin/billing', false, { cap: 'billing.read' }),
      row('usage', 'Usage', 'r2Usage', '/admin/usage', false, { cap: 'usage.read' }),
    ],
  ],
  [
    'Operations',
    [
      row('incidents', 'Incidents', 'r2Incidents', '/admin/incidents', true, {
        cap: 'incidents.read',
        badge: 'incidents',
      }),
      row('audit', 'Audit Log', 'r2Audit', '/admin/audit', true, { cap: 'audit.read' }),
      row('api', 'API & Webhooks', 'r2Api', '/admin/api', true, { cap: 'api.read' }),
      row('jobs', 'Scheduled Jobs', 'r2Jobs', '/admin/jobs', true, { cap: 'jobs.read' }),
      row('email', 'Email Log', 'r2Email', '/admin/email', false, { cap: 'email.read' }),
      row('integrations', 'Integrations', 'r2Integrations', '/admin/integrations', false, { cap: 'ops.read' }),
      row('deploys', 'Deploys & Commits', 'r2Deploys', '/admin/deploys', false, { cap: 'ops.read' }),
      row('db', 'DB Health', 'r2Db', '/admin/db', false, { cap: 'ops.read' }),
      row('flags', 'Environment Flags', 'r2Flags', '/admin/flags', false, { cap: 'ops.read' }),
    ],
  ],
  [
    'Access',
    [
      row('roles', 'Roles & Permissions', 'r2Roles', '/admin/roles', true, { cap: 'ops.read' }),
      row('staff', 'Staff & Roles', 'r2Users', '/admin/staff', true, { offMockup: true }),
    ],
  ],
];

/** The rail's one icon per group (`GIC` in the mockup). */
export const GROUP_ICON: Readonly<Record<R2Group, IconName>> = {
  Health: 'r2Overview',
  Build: 'r2Curriculum',
  Support: 'r2Learners',
  Revenue: 'r2Billing',
  Operations: 'r2Health',
  Access: 'r2Roles',
};

/** Open until the viewer closes them (Connor, Nov 15, 11:24 AM MST). */
export const DEFAULT_OPEN: Readonly<Partial<Record<R2Group, true>>> = { Health: true, Build: true };

export type OpenState = Readonly<Record<string, boolean>>;

const norm = (pathname: string): string => {
  const p = pathname.replace(/\/+$/, '');
  return p === '' ? '/' : p;
};

/**
 * The row the viewer is on, by address, or null (the Console 404, Denied's own page, a screen that is
 * not built yet). Module Builder holds `/admin/curriculum/new` and every AI Employee it edits.
 */
export function activeRowId(pathname: string): string | null {
  const p = norm(pathname);
  if (p.startsWith('/admin/curriculum/')) return 'builder';
  // API & Webhooks' deliveries tab has its own address (D-165, spec § 8: `admin/api[/:tab]`): one row, one page.
  if (p.startsWith('/admin/api/')) return 'api';
  const parent = recordParent(p);
  if (parent) return parent;
  for (const [, rows] of R2_NAV) for (const r of rows) if (r.built && r.id !== 'builder' && r.path === p) return r.id;
  return null;
}

export interface AdminNavInput {
  pathname: string;
  /** The viewer's staff role, for `consoleCan`. */
  role: string | null;
  fullNav: boolean;
  counts: NavCounts;
  /** The viewer's remembered choices, by group label. */
  open: OpenState;
}

export interface AdminNavRow {
  id: string;
  label: string;
  icon: IconName;
  to: string;
  active: boolean;
  /** The count pill: "6 draft", "2", "1". Absent at zero. */
  badge?: string;
}

export interface AdminNavGroup {
  label: R2Group;
  icon: IconName;
  rows: AdminNavRow[];
  /** It holds the page the viewer is on. */
  active: boolean;
  open: boolean;
  /** A closed group's alert, "1 incident", drawn in --bad at the right of its header. */
  alert?: string;
}

function badgeText(key: BadgeKey | undefined, counts: NavCounts): string | undefined {
  if (!key) return undefined;
  const n = counts[key];
  if (!(n > 0)) return undefined;
  return key === 'drafts' ? `${n} draft` : String(n);
}

/** Whether a group is open: the viewer's choice, else the default; always while it holds the page. */
export function isGroupOpen(group: R2Group, active: boolean, open: OpenState): boolean {
  return active || (open[group] ?? DEFAULT_OPEN[group] === true);
}

/** The sidebar, as the shell draws it. */
export function adminNav({ pathname, role, fullNav, counts, open }: AdminNavInput): AdminNavGroup[] {
  const activeId = activeRowId(pathname);
  const out: AdminNavGroup[] = [];
  for (const [label, defs] of R2_NAV) {
    const rows = defs
      .filter((d) => (fullNav ? !d.offMockup : d.built) && (!d.cap || consoleCan(role, d.cap)))
      .map<AdminNavRow>((d) => {
        const badge = badgeText(d.badge, counts);
        return {
          id: d.id,
          label: d.label,
          icon: d.icon,
          to: d.path,
          active: d.id === activeId,
          ...(badge ? { badge } : {}),
        };
      });
    if (!rows.length) continue;
    const active = rows.some((r) => r.active);
    const isOpen = isGroupOpen(label, active, open);
    const incidents = rows.some((r) => r.id === 'incidents') ? counts.incidents : 0;
    out.push({
      label,
      icon: GROUP_ICON[label],
      rows,
      active,
      open: isOpen,
      ...(!isOpen && incidents > 0 ? { alert: `${incidents} incident${incidents === 1 ? '' : 's'}` } : {}),
    });
  }
  return out;
}

/**
 * A header click (the mockup's `setOpen({ ...open, [g]: has ? 1 : !open[g] })`): the group holding
 * the page cannot close while its page is active, so clicking it only remembers it open; any other
 * group flips. The result is what to remember.
 */
export function toggleGroup(group: R2Group, active: boolean, open: OpenState): OpenState {
  if (active) return { ...open, [group]: true };
  return { ...open, [group]: !isGroupOpen(group, false, open) };
}

/**
 * A record's page (D-160 R2-1c, the mockup's `PARENT`): `/admin/workspaces/:teamId` belongs to the
 * Workspaces row, `/admin/users/:userId` to Users and `/admin/incidents/:id` to Incidents (D-167), so
 * their row stays active and their group open.
 */
export const RECORD_PARENTS: Readonly<Record<string, string>> = {
  '/admin/workspaces/': 'workspaces',
  '/admin/users/': 'users',
  // D-167: an incident belongs to the Incidents row (the mockup's `PARENT`: incident → incidents).
  '/admin/incidents/': 'incidents',
};

function recordParent(p: string): string | null {
  for (const [prefix, id] of Object.entries(RECORD_PARENTS))
    if (p.startsWith(prefix) && p.length > prefix.length && !p.slice(prefix.length).includes('/')) return id;
  return null;
}

export interface CrumbTrail {
  group: R2Group;
  page: string;
  /** A record's page: the row's own address, which its crumb links back to. */
  parent?: string;
}

/**
 * The breadcrumb's trail after `Admin` (`Admin / {group} / {page}`), when the address is a row's,
 * whether or not the viewer's role shows that row: Denied keeps the page's place, as the mockup's does.
 * A record's page adds its name after the row's (the shell reads the name from the page).
 */
export function crumbTrail(pathname: string): CrumbTrail | null {
  const id = activeRowId(pathname);
  if (!id) return null;
  const record = recordParent(norm(pathname)) !== null;
  for (const [group, defs] of R2_NAV) {
    const d = defs.find((x) => x.id === id);
    if (d) return record ? { group, page: d.label, parent: d.path } : { group, page: d.label };
  }
  return null;
}
