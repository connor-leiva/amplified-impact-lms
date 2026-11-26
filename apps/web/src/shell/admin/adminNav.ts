// The admin sidebar of the Admin redesign R2 (D-160, BUILD-SPEC § 4): `NAV` in
// design-reference/admin-redesign-r2/AdminRedesign.jsx, as a pure model the shell renders.
//
// PURE. No router, no storage, no React: the shell passes in where the viewer is, who they are, the
// counts behind the roll-ups and the group they peeked into, and gets back what to draw.
//
// D-239 (ADMIN-SIDEBAR-SPEC.md, Connor, Nov 22: "Much much better!"): rows that open, one at most; a shut group's
// roll-up; the rail and its fly-outs; `peek` and `roll`.
//
// D-253 (R-5 Phase 1, ADMIN-RESTRUCTURE-SPEC.md § 3, Connor, Nov 25: "This is perfect, create a handoff for Claude
// code for me."): the frame. Overview, Program, Cohort, People and Revenue are single rows (the mockup's `SOLO`), each
// opening its page; in the rail each is one icon with no fly-out. Then a hairline, then Operations (System Health
// first) and Access, which stay groups that open. The four pages have tabs (`AREAS`), each tab one of yesterday's
// screens, which keeps the capability its sidebar row had: a tab a role can't open is not drawn, and a page with no
// tab left is not in the sidebar. Nothing a role could open before is closed to it, and nothing is newly open.
//
// Which rows show:
//   - `fullNav` (the parity fixture only): the reference's `NAV`. Staff & Roles is not in it (`offMockup`), so it is
//     left out there; production keeps it under Access (D11, D-160 R2-3a).
//   - by capability: a Console row or tab shows only to a role `consoleCan` lets open it (the server still enforces).

import { consoleCan } from '@ai/core';
import type { ConsoleCap, IconName } from '@ai/core';

export const R2_GROUPS = ['Overview', 'Program', 'Cohort', 'People', 'Revenue', 'Operations', 'Access'] as const;
export type R2Group = (typeof R2_GROUPS)[number];
/** The rows that open their page (the mockup's `SOLO`). */
export const SOLO_GROUPS = ['Overview', 'Program', 'Cohort', 'People', 'Revenue'] as const;
export type SoloGroup = (typeof SOLO_GROUPS)[number];
/** The groups that open: the system pages, under the hairline. */
export type SystemGroup = 'Operations' | 'Access';
export const isSolo = (g: R2Group): g is SoloGroup => (SOLO_GROUPS as readonly string[]).includes(g);

/** What a count says (D-239). Each hides at zero. `waiting` (D-238): Community threads whose last word is a member's. */
export type BadgeKey = 'drafts' | 'requests' | 'incidents' | 'waiting';
export type NavCounts = Readonly<Record<BadgeKey, number>>;

/** A row in a group that opens (Operations, Access). */
export interface R2NavDef {
  id: string;
  label: string;
  icon: IconName;
  path: string;
  /** The Console capability that opens it; none for the admin's own screens. */
  cap?: ConsoleCap;
  badge?: BadgeKey;
  /** Shown only outside the parity fixture: a screen the reference's `NAV` does not list (Staff & Roles). */
  offMockup?: true;
}

const row = (id: string, label: string, icon: IconName, path: string, extra: Partial<R2NavDef> = {}): R2NavDef => ({
  id,
  label,
  icon,
  path,
  ...extra,
});

/** The groups that open, in the mockup's order. The mockup's `'ops'` rows read `ops.read`. */
export const R2_NAV: readonly (readonly [SystemGroup, readonly R2NavDef[]])[] = [
  [
    'Operations',
    [
      // D-253: System Health moves in from Health, first (spec § 3).
      row('health', 'System Health', 'r2Health', '/admin/health', { cap: 'console.view' }),
      row('incidents', 'Incidents', 'r2Incidents', '/admin/incidents', { cap: 'incidents.read', badge: 'incidents' }),
      row('audit', 'Audit Log', 'r2Audit', '/admin/audit', { cap: 'audit.read' }),
      row('api', 'API & Webhooks', 'r2Api', '/admin/api', { cap: 'api.read' }),
      row('jobs', 'Scheduled Jobs', 'r2Jobs', '/admin/jobs', { cap: 'jobs.read' }),
      row('email', 'Email Log', 'r2Email', '/admin/email', { cap: 'email.read' }),
      row('integrations', 'Integrations', 'r2Integrations', '/admin/integrations', { cap: 'ops.read' }),
      row('deploys', 'Deploys & Commits', 'r2Deploys', '/admin/deploys', { cap: 'ops.read' }),
      row('db', 'DB Health', 'r2Db', '/admin/db', { cap: 'ops.read' }),
      row('flags', 'Environment Flags', 'r2Flags', '/admin/flags', { cap: 'ops.read' }),
    ],
  ],
  [
    'Access',
    [
      row('roles', 'Roles & Permissions', 'r2Roles', '/admin/roles', { cap: 'ops.read' }),
      row('staff', 'Staff & Roles', 'r2Users', '/admin/staff', { offMockup: true }),
    ],
  ],
];

// ---- the four pages and their tabs ------------------------------------------------------------------------------------

export type AreaId = 'program' | 'cohort' | 'people' | 'revenue';
export const AREA_IDS: readonly AreaId[] = ['program', 'cohort', 'people', 'revenue'];

export interface AreaTabDef {
  id: string;
  label: string;
  /** The sidebar row (or page) it was before D-253, whose capability it keeps. */
  was: string;
  cap?: ConsoleCap;
}

export interface AreaDef {
  id: AreaId;
  label: SoloGroup;
  /** The sidebar's icon (the mockup's `GIC`). */
  icon: IconName;
  /** The palette's icon (the mockup's `P` aliases: People draws `users`, Revenue `usage`). */
  paletteIcon: IconName;
  /** Drawn once its page exists (spec Phase 1): Cohort's Overview, Submissions and Settings, and People's Utah Life, come later. */
  tabs: readonly AreaTabDef[];
}

export const AREAS: Readonly<Record<AreaId, AreaDef>> = {
  program: {
    id: 'program',
    label: 'Program',
    icon: 'r2Curriculum',
    paletteIcon: 'r2Curriculum',
    tabs: [
      { id: 'curriculum', label: 'Curriculum', was: 'curriculum' },
      // D-174's page, in no nav until now; reachable here (spec Phase 1).
      // D-255 (PLAN.md § 10.8): Title Case, as every tab heading.
      { id: 'settings', label: 'Course Settings', was: 'course-settings' },
      { id: 'vault', label: 'Resource Vault', was: 'vault' },
    ],
  },
  cohort: {
    id: 'cohort',
    label: 'Cohort',
    icon: 'r2Cohorts',
    paletteIcon: 'r2Cohorts',
    // D-255 (R-5 Phase 3): Overview, first, at the cohort's own address, and Settings, last. Both are the Cohorts row's
    // (`was: 'cohorts'`), as Schedule is. Submissions is Phase 7's.
    tabs: [
      { id: 'overview', label: 'Overview', was: 'cohorts' },
      { id: 'schedule', label: 'Schedule', was: 'cohorts' },
      { id: 'people', label: 'People', was: 'learners' },
      { id: 'community', label: 'Community', was: 'community', cap: 'console.view' },
      { id: 'announcements', label: 'Announcements', was: 'announce' },
      { id: 'settings', label: 'Settings', was: 'cohorts' },
    ],
  },
  people: {
    id: 'people',
    label: 'People',
    icon: 'r2Learners',
    paletteIcon: 'r2Users',
    tabs: [
      { id: 'everyone', label: 'Everyone', was: 'users', cap: 'users.read' },
      { id: 'teams', label: 'Teams', was: 'workspaces', cap: 'workspaces.read' },
      // D-162 3b: the Owner's and Admin's. Support reaches its lock card by address, as before.
      { id: 'masquerade', label: 'Masquerade', was: 'masquerade', cap: 'masquerade.start' },
    ],
  },
  revenue: {
    id: 'revenue',
    label: 'Revenue',
    icon: 'r2Billing',
    paletteIcon: 'r2Usage',
    tabs: [
      // Billing's own Summary, until Phase 8; its five lists are Payments.
      { id: 'summary', label: 'Summary', was: 'billing', cap: 'billing.read' },
      { id: 'payments', label: 'Payments', was: 'billing', cap: 'billing.read' },
      { id: 'plans', label: 'Plans & Upgrades', was: 'tiers' },
      { id: 'usage', label: 'Usage', was: 'usage', cap: 'usage.read' },
    ],
  },
};

/** The Overview's row. No tabs; every staff role. */
export const OVERVIEW = { id: 'overview', label: 'Overview' as const, icon: 'r2Overview' as IconName, path: '/admin' };

const cohortBase = (cohortId: string) => `/admin/cohort/${encodeURIComponent(cohortId)}`;

/** A page's own address, with no tab named: its first tab (the Cohort's, the first tab drawn). */
export function areaPath(area: AreaId, cohortId: string): string {
  if (area === 'cohort') return cohortBase(cohortId);
  return `/admin/${area}`;
}

/** A tab's address (spec § 3). */
export function tabPath(area: AreaId, tab: string, cohortId: string): string {
  switch (area) {
    case 'program':
      return tab === 'settings' ? '/admin/program/course' : tab === 'vault' ? '/admin/program/vault' : '/admin/program';
    case 'cohort':
      return tab === 'overview' ? cohortBase(cohortId) : `${cohortBase(cohortId)}/${tab}`;
    case 'people':
      return tab === 'everyone' ? '/admin/people' : `/admin/people/${tab}`;
    case 'revenue':
      return tab === 'summary' ? '/admin/revenue' : `/admin/revenue/${tab}`;
  }
}

/** The tabs a role may open, in order. A tab it can't open is not drawn (spec § 4, rule 5). */
export function areaTabs(area: AreaId, role: string | null): AreaTabDef[] {
  return AREAS[area].tabs.filter((t) => !t.cap || consoleCan(role, t.cap));
}

// ---- where an address is ----------------------------------------------------------------------------------------------

/** Where the viewer is: the sidebar's row (a single row's id is its page's: `program`, `cohort`, …), and on a page with tabs, the tab. */
export interface Place {
  row: string;
  group: R2Group;
  area?: AreaId;
  /** The tab, when the address names one; absent at a page's own address (its first tab). */
  tab?: string;
  cohortId?: string;
  /** A record under the row or tab (a team, a person, an incident, a thread, a week): its crumb is its name. */
  record?: true;
  /** D-255: New cohort, `/admin/cohort/new`: "Admin / Cohort / New Cohort". */
  newCohort?: true;
}

const norm = (pathname: string): string => {
  const p = pathname.replace(/\/+$/, '');
  return p === '' ? '/' : p;
};

const seg = (p: string): string[] => p.split('/').filter(Boolean);
const one = (s: string | undefined): boolean => !!s && !s.includes('/');

/** The place an admin address is, or null (the Console 404, Denied's own page, the search page). */
export function placeOf(pathname: string): Place | null {
  const p = norm(pathname);
  if (p === '/admin') return { row: 'overview', group: 'Overview' };
  const s = seg(p);
  if (s[0] !== 'admin') return null;
  const [, a, b, c, d, e] = s;
  if (a === 'program') {
    const at = (tab: string, record?: true): Place => ({ row: 'program', group: 'Program', area: 'program', tab, ...(record ? { record } : {}) });
    if (b === undefined) return at('curriculum');
    if (c === undefined && b === 'course') return at('settings');
    if (c === undefined && b === 'vault') return at('vault');
    // A week (Module Builder today): a record of Curriculum's.
    if (b === 'weeks' && one(c) && d === undefined) return at('curriculum', true);
    return null;
  }
  // D-255: New cohort (`/admin/cohort/new`), a page of the Cohort row's, named in the crumb as a record is.
  if (a === 'cohort' && b === 'new' && c === undefined) return { row: 'cohort', group: 'Cohort', area: 'cohort', record: true, newCohort: true };
  if (a === 'cohort' && b !== undefined) {
    const at = (tab: string | undefined, record?: true): Place => ({
      row: 'cohort',
      group: 'Cohort',
      area: 'cohort',
      cohortId: decodeURIComponent(b),
      ...(tab ? { tab } : {}),
      ...(record ? { record } : {}),
    });
    if (c === undefined) return at(undefined);
    if (d === undefined && AREAS.cohort.tabs.some((t) => t.id === c)) return at(c);
    if (c === 'community' && one(d) && e === undefined) return at('community', true);
    return null;
  }
  if (a === 'people') {
    const at = (tab: string, record?: true): Place => ({ row: 'people', group: 'People', area: 'people', tab, ...(record ? { record } : {}) });
    if (b === undefined) return at('everyone');
    if (c === undefined && b === 'teams') return at('teams');
    if (c === undefined && b === 'masquerade') return at('masquerade');
    if (b === 'teams' && one(c) && d === undefined) return at('teams', true);
    if (c === undefined) return at('everyone', true);
    return null;
  }
  // D-162 3b: the learner view keeps its address (spec § 3), a record of People › Masquerade.
  if (a === 'masquerade' && b === 'learner-view' && c === undefined)
    return { row: 'people', group: 'People', area: 'people', tab: 'masquerade', record: true };
  if (a === 'revenue') {
    const at = (tab: string): Place => ({ row: 'revenue', group: 'Revenue', area: 'revenue', tab });
    if (b === undefined) return at('summary');
    // Payments' lists have their own addresses (D-163): one tab, not records.
    if (b === 'payments' && (c === undefined || (one(c) && d === undefined))) return at('payments');
    if (c === undefined && (b === 'plans' || b === 'usage')) return at(b);
    return null;
  }
  for (const [group, rows] of R2_NAV)
    for (const r of rows) {
      if (p === r.path) return { row: r.id, group };
      // An incident is a record of the Incidents row (D-167); API & Webhooks' deliveries tab is its own page (D-165).
      if (r.id === 'incidents' && p.startsWith('/admin/incidents/') && one(p.slice('/admin/incidents/'.length)))
        return { row: r.id, group, record: true };
      if (r.id === 'api' && p.startsWith('/admin/api/') && one(p.slice('/admin/api/'.length))) return { row: r.id, group };
    }
  return null;
}

// ---- the sidebar ------------------------------------------------------------------------------------------------------

export interface AdminNavInput {
  pathname: string;
  /** The viewer's staff role, for `consoleCan`. */
  role: string | null;
  fullNav: boolean;
  counts: NavCounts;
  /** The cohort the Cohort row opens (the address's, else the one looked at last, else the default). */
  cohortId: string;
  /** That cohort is a draft: its roll-up says "Draft" (spec § 3). */
  cohortDraft?: boolean;
  /**
   * D-239: the group open by hand. `undefined`: the group holding the page; `null`: none; a group: that one. View
   * state for the session; the shell clears it when the address changes. Only Operations and Access open.
   */
  peek: SystemGroup | null | undefined;
}

export interface AdminNavRow {
  id: string;
  label: string;
  icon: IconName;
  to: string;
  active: boolean;
  /** The count pill: "1 incident". Absent at zero. */
  badge?: string;
  /** The pill is an alert (incidents): drawn in --bad on --badb. */
  alert?: true;
}

/** A single row (the mockup's `SOLO`): it opens its page, with what waits on it beside its name. */
export interface AdminNavPage {
  kind: 'page';
  label: SoloGroup;
  id: string;
  icon: IconName;
  to: string;
  active: boolean;
  /** "6 draft", "3 waiting", or "Draft" (`draft`, in the warn colour). Absent at zero. */
  roll?: { text: string; draft?: true };
}

/** A group that opens (Operations, Access). */
export interface AdminNavGroup {
  kind: 'group';
  label: SystemGroup;
  icon: IconName;
  rows: AdminNavRow[];
  /** It holds the page the viewer is on. */
  active: boolean;
  open: boolean;
  /** D-239: a shut group's roll-up, its first row's count ("1 incident"). Absent when open or when nothing waits. */
  roll?: { text: string; alert: boolean };
  /** The hairline above it: the first group after the single rows (spec § 3, the mockup's `gsep`). */
  sep?: true;
}

export type AdminNavEntry = AdminNavPage | AdminNavGroup;

/** The rail's one icon per group or page (`GIC` in the mockup). */
export const GROUP_ICON: Readonly<Record<R2Group, IconName>> = {
  Overview: 'r2Overview',
  Program: AREAS.program.icon,
  Cohort: AREAS.cohort.icon,
  People: AREAS.people.icon,
  Revenue: AREAS.revenue.icon,
  Operations: 'r2Health',
  Access: 'r2Roles',
};

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

/**
 * A single row's roll-up (spec § 3): Program "N draft"; Cohort "N waiting" for the cohort it opens, or "Draft" when that
 * cohort is a draft. Revenue's "N failed" waits for a count Billing already holds (D-253): none is drawn yet. Upgrade
 * requests are counted on Plans & upgrades, not on the row.
 */
function rollOf(area: AreaId, input: AdminNavInput, tabs: AreaTabDef[]): AdminNavPage['roll'] {
  if (area === 'program') {
    const t = badgeText('drafts', input.counts);
    return t ? { text: t } : undefined;
  }
  if (area === 'cohort') {
    if (input.cohortDraft) return { text: 'Draft', draft: true };
    // "Waiting" is the Community's, so it shows to a role that can open the Community tab.
    const t = tabs.some((x) => x.id === 'community') ? badgeText('waiting', input.counts) : undefined;
    return t ? { text: t } : undefined;
  }
  return undefined;
}

/** Where a single row goes: its page's own address, or its first tab this role may open when that is another. */
function pageTarget(area: AreaId, tabs: AreaTabDef[], cohortId: string): string {
  const first = tabs[0]!;
  return first.id === AREAS[area].tabs[0]!.id ? areaPath(area, cohortId) : tabPath(area, first.id, cohortId);
}

/** The sidebar, as the shell draws it. */
export function adminNav(input: AdminNavInput): AdminNavEntry[] {
  const { pathname, role, fullNav, counts, peek, cohortId } = input;
  const place = placeOf(pathname);
  const out: AdminNavEntry[] = [
    { kind: 'page', label: 'Overview', id: OVERVIEW.id, icon: GROUP_ICON.Overview, to: OVERVIEW.path, active: place?.row === 'overview' },
  ];
  for (const area of AREA_IDS) {
    const tabs = areaTabs(area, role);
    // A page with no tab left is not in the sidebar.
    if (!tabs.length) continue;
    const roll = rollOf(area, input, tabs);
    out.push({
      kind: 'page',
      label: AREAS[area].label,
      id: area,
      icon: AREAS[area].icon,
      to: pageTarget(area, tabs, cohortId),
      active: place?.area === area,
      ...(roll ? { roll } : {}),
    });
  }
  let first = true;
  for (const [label, defs] of R2_NAV) {
    const rows = defs
      .filter((d) => (fullNav ? !d.offMockup : true) && (!d.cap || consoleCan(role, d.cap)))
      .map<AdminNavRow>((d) => {
        const badge = badgeText(d.badge, counts);
        return {
          id: d.id,
          label: d.label,
          icon: d.icon,
          to: d.path,
          active: place?.row === d.id,
          ...(badge ? { badge } : {}),
          ...(badge && d.badge === 'incidents' ? { alert: true as const } : {}),
        };
      });
    if (!rows.length) continue;
    const active = rows.some((r) => r.active);
    const isOpen = peek === undefined ? active : peek === label;
    const firstCount = rows.find((r) => r.badge);
    out.push({
      kind: 'group',
      label,
      icon: GROUP_ICON[label],
      rows,
      active,
      open: isOpen,
      ...(!isOpen && firstCount?.badge ? { roll: { text: firstCount.badge, alert: firstCount.alert === true } } : {}),
      ...(first ? { sep: true as const } : {}),
    });
    first = false;
  }
  return out;
}

/** D-239: a click on a group's row. The open group closes (none is open); any other opens, closing the rest. */
export const peekAfterClick = (group: SystemGroup, open: boolean): SystemGroup | null => (open ? null : group);

// ---- the pages the palette and the search page offer -------------------------------------------------------------------

export interface NavPage {
  id: string;
  label: string;
  icon: IconName;
  to: string;
  /** A page's tab ("Program › Curriculum"): the palette lists these only once something is typed (the mockup's `s && m(x.l)`). */
  tab?: true;
}

/**
 * The pages a role may open (the mockup's `searchAll` Pages): the single rows and the groups' rows in the sidebar's
 * order, then each page's tabs as "Program › Curriculum".
 */
export function navPages(role: string | null, fullNav: boolean, cohortId: string): NavPage[] {
  const out: NavPage[] = [{ id: OVERVIEW.id, label: OVERVIEW.label, icon: OVERVIEW.icon, to: OVERVIEW.path }];
  for (const area of AREA_IDS) {
    const tabs = areaTabs(area, role);
    if (tabs.length) out.push({ id: area, label: AREAS[area].label, icon: AREAS[area].paletteIcon, to: pageTarget(area, tabs, cohortId) });
  }
  for (const [, defs] of R2_NAV)
    for (const d of defs)
      if ((fullNav ? !d.offMockup : true) && (!d.cap || consoleCan(role, d.cap))) out.push({ id: d.id, label: d.label, icon: d.icon, to: d.path });
  for (const area of AREA_IDS)
    for (const t of areaTabs(area, role))
      out.push({ id: `${area}:${t.id}`, label: `${AREAS[area].label} › ${t.label}`, icon: AREAS[area].paletteIcon, to: tabPath(area, t.id, cohortId), tab: true });
  return out;
}

// ---- the breadcrumb ---------------------------------------------------------------------------------------------------

/**
 * A crumb: a group's name (`group`, plain), a link back (`link`), the page or tab the viewer is on (`here`, bold), or a
 * record's name (`record`, bold, cut short with an ellipsis).
 */
export type Crumb = { kind: 'group' | 'here' | 'record'; label: string } | { kind: 'link'; label: string; to: string };

/**
 * The breadcrumb after `Admin` (the mockup's `Crumbs`): `Operations / Audit Log` for a group's page; `Cohort / Schedule`
 * for a tab, the page a link to its own address; a record adds its name once the page knows it (`People / Teams /
 * Northshore Group`), the tab then a link too. Overview is `Overview`. Empty for an address that is no page's (the
 * 404, Denied, the search page).
 */
export function crumbsOf(place: Place | null, opts: { record?: string | null; cohortId: string }): Crumb[] {
  if (!place) return [];
  const name = place.record && opts.record ? opts.record : null;
  if (place.row === 'overview') return [{ kind: 'here', label: OVERVIEW.label }];
  // D-255: "Admin / Cohort / New Cohort" (the mockup's `hereOf`, in Title Case).
  if (place.newCohort)
    return [
      { kind: 'link', label: AREAS.cohort.label, to: areaPath('cohort', opts.cohortId) },
      { kind: 'record', label: 'New Cohort' },
    ];
  if (place.area) {
    const area = AREAS[place.area];
    const cohortId = place.cohortId ?? opts.cohortId;
    const tab = area.tabs.find((t) => t.id === (place.tab ?? area.tabs[0]!.id))!;
    return [
      { kind: 'link', label: area.label, to: areaPath(place.area, cohortId) },
      place.record ? { kind: 'link', label: tab.label, to: tabPath(place.area, tab.id, cohortId) } : { kind: 'here', label: tab.label },
      ...(name ? [{ kind: 'record' as const, label: name }] : []),
    ];
  }
  for (const [group, defs] of R2_NAV) {
    const d = defs.find((x) => x.id === place.row);
    if (!d) continue;
    return [
      { kind: 'group', label: group },
      place.record ? { kind: 'link', label: d.label, to: d.path } : { kind: 'here', label: d.label },
      ...(name ? [{ kind: 'record' as const, label: name }] : []),
    ];
  }
  return [];
}
