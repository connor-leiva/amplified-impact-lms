// The sidebar nav model, ported from the shell's `renderVals` in
// design-reference/Amplified Impact LMS.dc.html: the `item` helper (line 335), the
// kids/empHead/main/tail block (lines 338-350) and the admin `g(...)` groups (lines 352-360).
// Contract: SCREENS § 2.1. Signature: docs/phases/04-shell-and-data.md § 4.2.
//
// PURE. No router, no setState, no closures over component state — the prototype's `go: () => …`
// thunks become a declarative `action` and the shell decides what each one means: navigate, open
// the Locked Employee Preview, or toggle the AI Employees group. That is what makes it structurally
// impossible for a locked child to navigate (SCREENS § 2.1, phase 04 gate).

import { ICONS, buildOf, canAccess, fmt, isOpen, visibleModules } from '@ai/core';
import { isAcceleratorModule } from '@ai/core/accelerator';
import type { AIEmployee, Db, IconName, Learner } from '@ai/core';
import type { NavItemToken } from '../components/NavItem';

/** What a row does when it is clicked. The shell, not the model, carries this out. */
export type NavAction = { to: string } | { openLocked: string } | { toggleEmployees: true };

export interface NavEntry {
  key: string;
  label: string;
  icon?: IconName;
  depth: 0 | 1;
  active: boolean;
  locked: boolean;
  disabled?: boolean;
  /** The compact trailing token. `null` on a locked row: NavItem draws the lock instead. */
  token?: NavItemToken | null;
  badge?: string;
  badgeTitle?: string;
  chev?: 'open' | 'closed';
  title: string;
  action: NavAction;
}

export interface NavGroup {
  label?: string;
  showLabel: boolean;
  items: NavEntry[];
}

/** Where the viewer is. `employeeId` is the `/employees/:employeeId` param when there is one. */
export interface NavRoute {
  pathname: string;
  employeeId?: string;
}
/** The name phase 04 § 4.2 gives this type in its sketch. */
export type Route = NavRoute;

/** Every path a nav row can point at (phase 04 § 4.1). */
export const NAV_PATHS = {
  dashboard: '/',
  sessions: '/sessions',
  team: '/team',
  vault: '/vault',
  overview: '/admin',
  curriculum: '/admin/curriculum',
  builder: '/admin/curriculum/new',
  avault: '/admin/vault',
  cohorts: '/admin/cohorts',
  learners: '/admin/learners',
  announce: '/admin/announcements',
  tiers: '/admin/tiers',
  staff: '/admin/staff',
} as const;

export const employeePath = (id: string): string => `/employees/${id}`;

/** The AI Accelerator's pages (D-110). Outside the shell, so not one of `NAV_PATHS`' screens. */
export const COURSE_PATH = '/course';

const EMP_PREFIX = '/employees/';

/** Trailing slashes are not a different screen. `/sessions/` is `/sessions`. */
const norm = (pathname: string): string => {
  const p = pathname.replace(/\/+$/, '');
  return p === '' ? '/' : p;
};

/**
 * The AI Employee the viewer is on, or null. The param wins when the shell hands one over;
 * otherwise it is read off the path, so the model works for a caller that only has a location.
 */
function activeEmployeeId(route: NavRoute): string | null {
  const p = norm(route.pathname);
  if (!p.startsWith(EMP_PREFIX)) return null;
  return route.employeeId ?? p.slice(EMP_PREFIX.length).split('/')[0] ?? null;
}

/** The reference's `ic[m.icon] || ic.bot`: an unrecognised module icon falls back to the bot. */
const moduleIcon = (m: Pick<AIEmployee, 'icon'>): IconName => (m.icon in ICONS ? m.icon : 'bot');

/** Only the two badge fields the reference's `extra` ever carries. */
type Extra = Pick<NavEntry, 'badge' | 'badgeTitle'>;

/** The reference's `item(k, label, icon, extra)`: depth 0, not locked, no token, `title = label`. */
const item = (
  key: string,
  label: string,
  icon: IconName,
  to: string,
  active: boolean,
  extra: Extra = {},
): NavEntry => ({
  key,
  label,
  icon,
  depth: 0,
  active,
  locked: false,
  token: null,
  title: label,
  action: { to },
  ...extra,
});

/**
 * Dashboard · Sessions · the AI Employees group header · one child per visible AI Employee ·
 * Team Hub (Team tier only) · Resource Vault.
 *
 * Collapsed (rail) returns THREE groups — main, children, tail — and drops the group header, so
 * the rail shows the employee icons directly. Expanded returns ONE group in reading order.
 */
export function portalNav(
  db: Db,
  user: Learner,
  route: NavRoute,
  now: number,
  collapsed: boolean,
  empOpen: boolean,
): NavGroup[] {
  const path = norm(route.pathname);
  const at = (p: string): boolean => path === p;
  const onEmployee = activeEmployeeId(route);
  const mods = visibleModules(db);

  const kids: NavEntry[] = mods.map((m): NavEntry => {
    const locked = !canAccess(user, m);
    const soon = !locked && !isOpen(m, now);
    const b = buildOf(user, m);
    // `m.opens ? … : …` keeps the reference's truthiness check, not a null check.
    const token: NavItemToken = soon
      ? { kind: 'custom', tone: 'neutral', icon: 'clock', label: m.opens ? fmt.date(m.opens) : 'Soon' }
      : { kind: 'build', state: b.state, n: b.n, total: b.total };
    const title = locked
      ? `${m.name} · Team tier`
      : soon
        ? `${m.name} · Opens ${m.opens ? fmt.date(m.opens) : 'soon'}`
        : `${m.name} · ${
            b.state === 'verified'
              ? 'Built'
              : b.state === 'in_progress'
                ? `${b.n} of ${b.total} steps verified`
                : 'Not started'
          }`;
    return {
      key: m.id,
      label: m.short,
      icon: moduleIcon(m),
      depth: collapsed ? 0 : 1,
      active: onEmployee === m.id,
      locked,
      token: locked ? null : token,
      title,
      // A locked child opens the preview. It has no `to`, so it cannot navigate.
      action: locked ? { openLocked: m.id } : { to: employeePath(m.id) },
    };
  });

  const included = mods.filter((m) => canAccess(user, m)).length;

  const main: NavEntry[] = [
    item('dashboard', 'Dashboard', 'grid', NAV_PATHS.dashboard, at(NAV_PATHS.dashboard)),
    item('sessions', 'Sessions', 'radio', NAV_PATHS.sessions, at(NAV_PATHS.sessions)),
    // The AI Accelerator's pages (D-110), for a learner whose snapshot carries the course: the
    // snapshot only does when their plan opens it. Never in the prototype, which has no course.
    ...(mods.some((m) => isAcceleratorModule(m.id)) ? [item('course', 'Course', 'book', COURSE_PATH, false)] : []),
  ];

  const head: NavEntry = {
    key: 'emp',
    label: 'AI Employees',
    icon: 'bot',
    depth: 0,
    active: false,
    locked: false,
    token: null,
    badge: String(included),
    badgeTitle: `${included} included in your tier`,
    chev: empOpen ? 'open' : 'closed',
    title: 'AI Employees',
    action: { toggleEmployees: true },
  };

  const tail: NavEntry[] = [
    ...(user.tier === 'team' ? [item('team', 'Team Hub', 'users', NAV_PATHS.team, at(NAV_PATHS.team))] : []),
    item('vault', 'Resource Vault', 'archive', NAV_PATHS.vault, at(NAV_PATHS.vault)),
  ];

  return collapsed
    ? [
        { showLabel: false, items: main },
        { showLabel: false, items: kids },
        { showLabel: false, items: tail },
      ]
    : [{ showLabel: false, items: [...main, head, ...(empOpen ? kids : []), ...tail] }];
}

/**
 * Insights · Content · Delivery · People · Revenue. Group labels are hidden in the rail.
 * Module Builder stays active for `/admin/curriculum/new` and for editing an existing AI Employee,
 * which is the prototype's single `builder` screen.
 */
export function adminNav(db: Db, route: NavRoute, collapsed: boolean): NavGroup[] {
  const path = norm(route.pathname);
  const at = (p: string): boolean => path === p;
  const inBuilder = path.startsWith(`${NAV_PATHS.curriculum}/`);

  const newReq = db.requests.filter((q) => q.status === 'new').length;
  const drafts = db.modules.filter((m) => m.status === 'draft').length;
  const g = (label: string, items: NavEntry[]): NavGroup => ({ label, showLabel: !collapsed, items });

  const draftBadge: Extra = drafts
    ? { badge: `${drafts} Draft`, badgeTitle: `${drafts} draft AI Employee${drafts === 1 ? '' : 's'}` }
    : {};
  const reqBadge: Extra = newReq
    ? { badge: String(newReq), badgeTitle: `${newReq} new upgrade request${newReq === 1 ? '' : 's'}` }
    : {};

  return [
    g('Insights', [item('overview', 'Overview', 'chart', NAV_PATHS.overview, at(NAV_PATHS.overview))]),
    g('Content', [
      item('curriculum', 'Curriculum', 'layers', NAV_PATHS.curriculum, at(NAV_PATHS.curriculum), draftBadge),
      item('builder', 'Module Builder', 'pencil', NAV_PATHS.builder, inBuilder),
      item('avault', 'Resource Vault', 'archive', NAV_PATHS.avault, at(NAV_PATHS.avault)),
    ]),
    g('Delivery', [
      item('cohorts', 'Cohorts & Sessions', 'calendar', NAV_PATHS.cohorts, at(NAV_PATHS.cohorts)),
      item('announce', 'Announcements', 'send', NAV_PATHS.announce, at(NAV_PATHS.announce)),
    ]),
    g('People', [
      item('learners', 'Learners & Teams', 'users', NAV_PATHS.learners, at(NAV_PATHS.learners)),
      item('staff', 'Staff & Roles', 'shield', NAV_PATHS.staff, at(NAV_PATHS.staff)),
    ]),
    g('Revenue', [item('tiers', 'Tiers & Upgrades', 'card', NAV_PATHS.tiers, at(NAV_PATHS.tiers), reqBadge)]),
  ];
}
