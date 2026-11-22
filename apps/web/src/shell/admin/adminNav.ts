// The admin sidebar of the Admin redesign R2 (D-160, BUILD-SPEC § 4): `NAV` in
// design-reference/admin-redesign-r2/AdminRedesign.jsx, as a pure model the shell renders.
//
// PURE. No router, no storage, no React: the shell passes in where the viewer is, who they are, the
// counts behind the badges and the group they peeked into, and gets back what to draw.
//
// D-239 (ADMIN-SIDEBAR-SPEC.md, Connor, Nov 22: "Much much better!"): six rows, one open. A group is a row
// with its icon, its name, a roll-up of what is waiting inside it when it is closed, and a chevron. One group
// is open at most: the one holding the page, or the one clicked (`peek`); going to a page resets it. Its pages
// are plain words on a guide line; each count says what it counts ("2 requests", "1 incident").
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

/** What a badge counts. Each hides at zero (BUILD-SPEC § 4). `waiting` (D-239): Community threads whose last word is
 * a member's; 0 until the admin Community (R-3) feeds it. */
export type BadgeKey = 'drafts' | 'requests' | 'incidents' | 'waiting';
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
      row('health', 'System Health', 'r2Health', '/admin/health', true, { cap: 'console.view' }),
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
      // D-162 3b: built, for the roles that can start one (spec § 6). Support reaches its lock card by address.
      row('masquerade', 'Masquerade', 'r2Masquerade', '/admin/masquerade', true, { cap: 'masquerade.start' }),
    ],
  ],
  [
    'Revenue',
    [
      row('tiers', 'Tiers & Upgrades', 'r2Tiers', '/admin/tiers', true, { badge: 'requests' }),
      row('billing', 'Billing', 'r2Billing', '/admin/billing', true, { cap: 'billing.read' }),
      row('usage', 'Usage', 'r2Usage', '/admin/usage', true, { cap: 'usage.read' }),
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
      row('email', 'Email Log', 'r2Email', '/admin/email', true, { cap: 'email.read' }),
      row('integrations', 'Integrations', 'r2Integrations', '/admin/integrations', true, { cap: 'ops.read' }),
      row('deploys', 'Deploys & Commits', 'r2Deploys', '/admin/deploys', true, { cap: 'ops.read' }),
      row('db', 'DB Health', 'r2Db', '/admin/db', true, { cap: 'ops.read' }),
      row('flags', 'Environment Flags', 'r2Flags', '/admin/flags', true, { cap: 'ops.read' }),
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

/**
 * A group's own landing page that the mockup's `NAV` has no row for (D-169): the Build hub,
 * `/admin/build` (spec § 7.2). It gets no sidebar row, because the signed-off sidebar draws none and the
 * eye check forbids drawing one; the viewer reaches it from the "Build" crumb on every Build screen and
 * from the ⌘K palette's pages. Shown to a role that may open it, outside the parity fixture.
 */
export const GROUP_HUBS: Readonly<Partial<Record<R2Group, { id: string; label: string; icon: IconName; path: string; cap: ConsoleCap }>>> = {
  Build: { id: 'build', label: 'Build', icon: 'r2Curriculum', path: '/admin/build', cap: 'console.view' },
};

/** The hub a group's crumb links to, for this viewer, or null. */
export function groupHub(group: R2Group, role: string | null, fullNav: boolean): string | null {
  const hub = GROUP_HUBS[group];
  return hub && !fullNav && consoleCan(role, hub.cap) ? hub.path : null;
}

/** The hubs the viewer may open, as palette pages (after the sidebar's rows). */
export function hubPages(role: string | null, fullNav: boolean): { id: string; label: string; icon: IconName; to: string }[] {
  return R2_GROUPS.flatMap((g) => {
    const hub = GROUP_HUBS[g];
    return hub && groupHub(g, role, fullNav) ? [{ id: hub.id, label: hub.label, icon: hub.icon, to: hub.path }] : [];
  });
}

/** The rail's one icon per group (`GIC` in the mockup). */
export const GROUP_ICON: Readonly<Record<R2Group, IconName>> = {
  Health: 'r2Overview',
  Build: 'r2Curriculum',
  Support: 'r2Learners',
  Revenue: 'r2Billing',
  Operations: 'r2Health',
  Access: 'r2Roles',
};

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
  // Billing's tabs have their own addresses (D-163, spec § 8: `admin/billing[/:tab]`): one row, one page.
  if (p.startsWith('/admin/billing/')) return 'billing';
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
  /**
   * D-239: the group open by hand. `undefined`: the group holding the page; `null`: none; a group: that one. View
   * state for the session; the shell clears it when the address changes.
   */
  peek: R2Group | null | undefined;
}

export interface AdminNavRow {
  id: string;
  label: string;
  icon: IconName;
  to: string;
  active: boolean;
  /** The count pill: "6 draft", "2 requests", "1 incident", "3 waiting". Absent at zero. */
  badge?: string;
  /** The pill is an alert (incidents): drawn in --bad on --badb. */
  alert?: true;
}

export interface AdminNavGroup {
  label: R2Group;
  icon: IconName;
  rows: AdminNavRow[];
  /** It holds the page the viewer is on. */
  active: boolean;
  open: boolean;
  /**
   * D-239: a closed group's roll-up, what is waiting inside it: the first of its rows with a count, in the group's
   * order ("6 draft", "2 requests", "1 incident", "3 waiting"). Absent when the group is open (its rows carry their
   * own) or nothing waits. `alert` for incidents, drawn in --bad.
   */
  roll?: { text: string; alert: boolean };
}

/** D-239: a count as its row says it. Absent at zero. */
export function badgeText(key: BadgeKey | undefined, counts: NavCounts): string | undefined {
  if (!key) return undefined;
  const n = counts[key];
  if (!(n > 0)) return undefined;
  if (key === 'drafts') return `${n} draft`;
  if (key === 'requests') return `${n} request${n === 1 ? '' : 's'}`;
  if (key === 'incidents') return `${n} incident${n === 1 ? '' : 's'}`;
  return `${n} waiting`;
}

/** The sidebar, as the shell draws it. */
export function adminNav({ pathname, role, fullNav, counts, peek }: AdminNavInput): AdminNavGroup[] {
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
          ...(badge && d.badge === 'incidents' ? { alert: true as const } : {}),
        };
      });
    if (!rows.length) continue;
    const active = rows.some((r) => r.active);
    const isOpen = peek === undefined ? active : peek === label;
    const first = rows.find((r) => r.badge);
    out.push({
      label,
      icon: GROUP_ICON[label],
      rows,
      active,
      open: isOpen,
      ...(!isOpen && first?.badge ? { roll: { text: first.badge, alert: first.alert === true } } : {}),
    });
  }
  return out;
}

/** D-239: a click on a group's row. The open group closes (none is open); any other opens, closing the rest. */
export const peekAfterClick = (group: R2Group, open: boolean): R2Group | null => (open ? null : group);

/**
 * A record's page (D-160 R2-1c, the mockup's `PARENT`): `/admin/workspaces/:teamId` belongs to the
 * Workspaces row, `/admin/users/:userId` to Users and `/admin/incidents/:id` to Incidents (D-167), so
 * their row stays active and their group open.
 */
export const RECORD_PARENTS: Readonly<Record<string, string>> = {
  '/admin/workspaces/': 'workspaces',
  '/admin/users/': 'users',
  // D-162 3b: the mockup's learner view (`as`) belongs to Masquerade.
  '/admin/masquerade/': 'masquerade',
  // D-167: an incident belongs to the Incidents row (the mockup's `PARENT`: incident → incidents).
  '/admin/incidents/': 'incidents',
};

/** The mockup's learner view, whose parent crumb is drawn as the page's (bold), not as a link back. */
export const LEARNER_VIEW_PATH = '/admin/masquerade/learner-view';

function recordParent(p: string): string | null {
  for (const [prefix, id] of Object.entries(RECORD_PARENTS))
    if (p.startsWith(prefix) && p.length > prefix.length && !p.slice(prefix.length).includes('/')) return id;
  return null;
}

export interface CrumbTrail {
  group: R2Group;
  page: string;
  /** A group's hub (`/admin/build`): the trail is `Admin / {group}`, the group the current page. */
  hub?: true;
  /** A record's page: the row's own address, which its crumb links back to. */
  parent?: string;
  /** False when the row's crumb is drawn bold rather than as that link (the learner view, as the mockup's). */
  parentLink?: false;
}

/**
 * The breadcrumb's trail after `Admin` (`Admin / {group} / {page}`), when the address is a row's,
 * whether or not the viewer's role shows that row: Denied keeps the page's place, as the mockup's does.
 * A record's page adds its name after the row's (the shell reads the name from the page).
 */
/** D-174: Course settings, a page of the curriculum's own (not a row of the nav, so every cell keeps its sidebar). */
export const COURSE_SETTINGS_PATH = '/admin/curriculum/course';

export function crumbTrail(pathname: string): CrumbTrail | null {
  for (const g of R2_GROUPS) if (GROUP_HUBS[g]?.path === norm(pathname)) return { group: g, page: g, hub: true };
  // Its trail is a record's: `Admin / Build / Curriculum / Course settings` (the page names itself).
  if (norm(pathname) === COURSE_SETTINGS_PATH) return { group: 'Build', page: 'Curriculum', parent: '/admin/curriculum' };
  const id = activeRowId(pathname);
  if (!id) return null;
  const record = recordParent(norm(pathname)) !== null;
  for (const [group, defs] of R2_NAV) {
    const d = defs.find((x) => x.id === id);
    if (d && record && norm(pathname) === LEARNER_VIEW_PATH)
      return { group, page: d.label, parent: d.path, parentLink: false };
    if (d) return record ? { group, page: d.label, parent: d.path } : { group, page: d.label };
  }
  return null;
}
