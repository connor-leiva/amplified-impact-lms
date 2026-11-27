import { describe, expect, it } from 'vitest';
import { ICONS, consoleCan } from '@ai/core';
import type { ConsoleCap } from '@ai/core';
import {
  AREAS,
  AREA_IDS,
  GROUP_ICON,
  R2_GROUPS,
  R2_NAV,
  adminNav,
  areaPath,
  areaTabs,
  badgeText,
  crumbsOf,
  navPages,
  peekAfterClick,
  placeOf,
  tabPath,
} from './adminNav';
import type { AdminNavEntry, AdminNavGroup, AdminNavInput, AdminNavPage } from './adminNav';

// D-160 R2-1b: the R2 admin sidebar's model (BUILD-SPEC § 4, `NAV` in AdminRedesign.jsx). D-239: rows that open, one
// at most. D-253 (R-5 Phase 1, ADMIN-RESTRUCTURE-SPEC.md § 3): Overview, Program, Cohort, People and Revenue as single
// rows, a hairline, then Operations and Access.

const COUNTS = { drafts: 6, requests: 2, incidents: 1, waiting: 0 };
const nav = (over: Partial<AdminNavInput> = {}) =>
  adminNav({ pathname: '/admin/no-such-page', role: 'Owner', fullNav: true, counts: COUNTS, cohortId: 'dec26', peek: undefined, ...over });
const pages = (e: AdminNavEntry[]) => e.filter((x): x is AdminNavPage => x.kind === 'page');
const groups = (e: AdminNavEntry[]) => e.filter((x): x is AdminNavGroup => x.kind === 'group');
const labels = (e: AdminNavEntry[]) => e.map((x) => (x.kind === 'page' ? x.label : [x.label, ...x.rows.map((r) => r.label)]));
const ROLES = ['Owner', 'Admin', 'Support', 'Instructor', 'Content Editor'] as const;

/**
 * The capability each page's sidebar row had before D-253 (`R2_NAV` at main @ 038cd39), by the row's id. A tab keeps
 * its row's (spec § 4, rule 5). Course settings had no row; its route had no capability.
 */
const BEFORE: Record<string, ConsoleCap | null> = {
  curriculum: null,
  'course-settings': null,
  vault: null,
  cohorts: null,
  learners: null,
  community: 'console.view',
  announce: null,
  users: 'users.read',
  workspaces: 'workspaces.read',
  masquerade: 'masquerade.start',
  billing: 'billing.read',
  tiers: null,
  usage: 'usage.read',
};
/** The rows each role saw in production before D-253 (main's `adminNav`, `fullNav: false`), as page ids. */
const SAW_BEFORE: Record<(typeof ROLES)[number], string[]> = {
  Owner: ['overview', 'health', 'curriculum', 'builder', 'vault', 'cohorts', 'announce', 'learners', 'community', 'workspaces', 'users', 'masquerade', 'tiers', 'billing', 'usage', 'incidents', 'audit', 'api', 'jobs', 'email', 'integrations', 'deploys', 'db', 'flags', 'roles', 'staff'],
  Admin: ['overview', 'health', 'curriculum', 'builder', 'vault', 'cohorts', 'announce', 'learners', 'community', 'workspaces', 'users', 'masquerade', 'tiers', 'billing', 'usage', 'incidents', 'audit', 'api', 'jobs', 'email', 'integrations', 'deploys', 'db', 'flags', 'roles', 'staff'],
  Support: ['overview', 'health', 'curriculum', 'builder', 'vault', 'cohorts', 'announce', 'learners', 'community', 'workspaces', 'users', 'tiers', 'billing', 'usage', 'incidents', 'audit', 'api', 'jobs', 'email', 'staff'],
  Instructor: ['overview', 'curriculum', 'builder', 'vault', 'cohorts', 'announce', 'learners', 'tiers', 'staff'],
  'Content Editor': ['overview', 'curriculum', 'builder', 'vault', 'cohorts', 'announce', 'learners', 'tiers', 'staff'],
};
/** What each role reaches now: the single rows, each tab it may open (by the page it was), and the groups' rows. */
function seesNow(role: string): string[] {
  const out = ['overview'];
  for (const a of AREA_IDS) for (const t of areaTabs(a, role)) out.push(t.was);
  // Every week (the Module Builder) is Curriculum's record: reached wherever Curriculum is.
  if (out.includes('curriculum')) out.push('builder');
  for (const g of groups(nav({ role, fullNav: false }))) for (const r of g.rows) out.push(r.id);
  return [...new Set(out)];
}

describe('the admin sidebar (D-253: the frame)', () => {
  it('is five single rows, a hairline, then Operations (System Health first) and Access, with the mockup’s icons', () => {
    expect(labels(nav())).toEqual([
      'Overview',
      'Program',
      'Cohort',
      'People',
      'Revenue',
      ['Operations', 'System Health', 'Incidents', 'Audit Log', 'API & Webhooks', 'Scheduled Jobs', 'Email Log', 'Integrations', 'Deploys & Commits', 'DB Health', 'Environment Flags'],
      ['Access', 'Roles & Permissions'],
    ]);
    expect([...R2_GROUPS]).toEqual(['Overview', 'Program', 'Cohort', 'People', 'Revenue', 'Operations', 'Access']);
    // The hairline is above the first group that opens, and only there.
    expect(groups(nav()).map((g) => [g.label, g.sep === true])).toEqual([
      ['Operations', true],
      ['Access', false],
    ]);
    expect(GROUP_ICON).toEqual({
      Overview: 'r2Overview',
      Program: 'r2Curriculum',
      Cohort: 'r2Cohorts',
      People: 'r2Learners',
      Revenue: 'r2Billing',
      Operations: 'r2Health',
      Access: 'r2Roles',
    });
    for (const g of R2_GROUPS) expect(ICONS[GROUP_ICON[g]], g).toBeTruthy();
    for (const [, rows] of R2_NAV) for (const r of rows) expect(ICONS[r.icon], r.id).toBeTruthy();
    for (const a of AREA_IDS) expect(ICONS[AREAS[a].paletteIcon], a).toBeTruthy();
  });

  it('draws each page’s tabs this phase: those whose page exists', () => {
    const tabs = (a: (typeof AREA_IDS)[number]) => AREAS[a].tabs.map((t) => t.label);
    expect(tabs('program')).toEqual(['Curriculum', 'Course Settings', 'Resource Vault']);
    expect(tabs('cohort')).toEqual(['Overview', 'Schedule', 'People', 'Community', 'Announcements', 'Settings']);
    expect(tabs('people')).toEqual(['Everyone', 'Teams', 'Masquerade']);
    expect(tabs('revenue')).toEqual(['Summary', 'Payments', 'Plans & Upgrades', 'Usage']);
  });

  it('keeps Staff & Roles under Access in production, and leaves it out of the parity fixture (D11, the reference’s NAV)', () => {
    expect(groups(nav({ fullNav: false })).find((g) => g.label === 'Access')!.rows.map((r) => r.label)).toEqual(['Roles & Permissions', 'Staff & Roles']);
    expect(labels(nav()).flat()).not.toContain('Staff & Roles');
  });

  it('a tab keeps its row’s capability (rule 5)', () => {
    for (const a of AREA_IDS) for (const t of AREAS[a].tabs) expect(t.cap ?? null, `${a} › ${t.label}`).toBe(BEFORE[t.was]);
  });

  it('opens nothing new and closes nothing for any role: the pages each role reaches are the ones it saw before', () => {
    // Course settings (D-174) had no row: every staff role reached it by its address and from a week card, and its
    // route asks no capability. It is in the sidebar now (spec Phase 1), for every role, as before by address.
    for (const role of ROLES) {
      expect(seesNow(role).filter((x) => x !== 'course-settings').sort(), role).toEqual([...SAW_BEFORE[role]].sort());
      expect(seesNow(role), role).toContain('course-settings');
    }
  });

  it('draws only the tabs a role may open, and leaves out a page with none (rule 5)', () => {
    const tabsFor = (role: string) => Object.fromEntries(AREA_IDS.map((a) => [a, areaTabs(a, role).map((t) => t.label)]));
    expect(tabsFor('Owner')).toEqual(tabsFor('Admin'));
    expect(tabsFor('Owner')).toEqual({
      program: ['Curriculum', 'Course Settings', 'Resource Vault'],
      cohort: ['Overview', 'Schedule', 'People', 'Community', 'Announcements', 'Settings'],
      people: ['Everyone', 'Teams', 'Masquerade'],
      revenue: ['Summary', 'Payments', 'Plans & Upgrades', 'Usage'],
    });
    // Support: Masquerade is the Owner's and Admin's (D-162 3b); Support reads billing (D3).
    expect(tabsFor('Support')).toEqual({
      program: ['Curriculum', 'Course Settings', 'Resource Vault'],
      cohort: ['Overview', 'Schedule', 'People', 'Community', 'Announcements', 'Settings'],
      people: ['Everyone', 'Teams'],
      revenue: ['Summary', 'Payments', 'Plans & Upgrades', 'Usage'],
    });
    // Instructor and Content Editor have no Console capability: no Community, no People page, Revenue is Plans & upgrades.
    for (const role of ['Instructor', 'Content Editor']) {
      expect(tabsFor(role), role).toEqual({
        program: ['Curriculum', 'Course Settings', 'Resource Vault'],
        cohort: ['Overview', 'Schedule', 'People', 'Announcements', 'Settings'],
        people: [],
        revenue: ['Plans & Upgrades'],
      });
      expect(labels(nav({ role, fullNav: false })), role).toEqual(['Overview', 'Program', 'Cohort', 'Revenue', ['Access', 'Staff & Roles']]);
      // Its Revenue row opens the one tab it may open.
      expect(pages(nav({ role, fullNav: false })).find((p) => p.label === 'Revenue')!.to).toBe('/admin/revenue/plans');
      // With no Operations, the hairline is above Access.
      expect(groups(nav({ role, fullNav: false })).map((g) => [g.label, g.sep === true])).toEqual([['Access', true]]);
    }
    // Support: no ops.read, so no Integrations, Deploys, DB Health, Flags or Roles (D3), and Access only in production.
    expect(labels(nav({ role: 'Support' }))).toEqual([
      'Overview',
      'Program',
      'Cohort',
      'People',
      'Revenue',
      ['Operations', 'System Health', 'Incidents', 'Audit Log', 'API & Webhooks', 'Scheduled Jobs', 'Email Log'],
    ]);
  });

  it('sends each single row to its page, the Cohort row to the cohort the admin is on', () => {
    expect(pages(nav()).map((p) => [p.label, p.to])).toEqual([
      ['Overview', '/admin'],
      ['Program', '/admin/program'],
      ['Cohort', '/admin/cohort/dec26'],
      ['People', '/admin/people'],
      ['Revenue', '/admin/revenue'],
    ]);
    expect(pages(nav({ cohortId: 'jan27' })).find((p) => p.label === 'Cohort')!.to).toBe('/admin/cohort/jan27');
  });

  it('lights the row holding the page, by address, records and tabs included', () => {
    const lit = (pathname: string) => {
      const e = nav({ pathname });
      return [...pages(e).filter((p) => p.active).map((p) => p.label), ...groups(e).flatMap((g) => g.rows.filter((r) => r.active).map((r) => r.id))];
    };
    expect(lit('/admin')).toEqual(['Overview']);
    expect(lit('/admin/program')).toEqual(['Program']);
    expect(lit('/admin/program/course')).toEqual(['Program']);
    expect(lit('/admin/program/weeks/m1')).toEqual(['Program']);
    expect(lit('/admin/cohort/dec26')).toEqual(['Cohort']);
    expect(lit('/admin/cohort/dec26/community/2')).toEqual(['Cohort']);
    expect(lit('/admin/people/teams/ws_northshore')).toEqual(['People']);
    expect(lit('/admin/people/u_1042')).toEqual(['People']);
    expect(lit('/admin/masquerade/learner-view')).toEqual(['People']);
    expect(lit('/admin/revenue/payments/failed')).toEqual(['Revenue']);
    expect(lit('/admin/health')).toEqual(['health']);
    expect(lit('/admin/incidents/INC-0007')).toEqual(['incidents']);
    expect(lit('/admin/api/hooks')).toEqual(['api']);
    expect(lit('/admin/no-such-page')).toEqual([]);
    expect(lit('/admin/search')).toEqual([]);
  });

  it('rolls up what waits on a single row, each saying what it counts, hidden at zero (spec § 3)', () => {
    const roll = (label: string, over: Partial<AdminNavInput> = {}) => pages(nav(over)).find((p) => p.label === label)?.roll;
    expect(roll('Program')).toEqual({ text: '6 draft' });
    expect(roll('Program', { counts: { ...COUNTS, drafts: 0 } })).toBeUndefined();
    // Cohort: the Community's threads waiting, for the cohort it opens; "Draft" when that cohort is a draft.
    expect(roll('Cohort')).toBeUndefined();
    expect(roll('Cohort', { counts: { ...COUNTS, waiting: 3 } })).toEqual({ text: '3 waiting' });
    expect(roll('Cohort', { counts: { ...COUNTS, waiting: 3 }, cohortDraft: true })).toEqual({ text: 'Draft', draft: true });
    // An Instructor has no Community tab, so no "waiting" on its Cohort row.
    expect(roll('Cohort', { counts: { ...COUNTS, waiting: 3 }, role: 'Instructor', fullNav: false })).toBeUndefined();
    // Revenue: no "N failed" until there is a count Billing already holds (D-253). Upgrade requests are on the tab.
    expect(roll('Revenue', { counts: { ...COUNTS, requests: 5 } })).toBeUndefined();
    expect(roll('Overview')).toBeUndefined();
    expect(roll('People')).toBeUndefined();
    // A row's roll-up shows whether or not it is the page (the mockup's Cohort row, lit, with "3 waiting").
    expect(roll('Program', { pathname: '/admin/program' })).toEqual({ text: '6 draft' });
  });

  it('rolls up a shut group: its first count; an open group shows none (D-239)', () => {
    const closed = (label: string, over: Partial<AdminNavInput> = {}) => groups(nav(over)).find((x) => x.label === label)?.roll;
    expect(closed('Operations')).toEqual({ text: '1 incident', alert: true });
    expect(closed('Operations', { counts: { ...COUNTS, incidents: 3 } })).toEqual({ text: '3 incidents', alert: true });
    expect(closed('Operations', { counts: { ...COUNTS, incidents: 0 } })).toBeUndefined();
    expect(closed('Operations', { peek: 'Operations' })).toBeUndefined();
    expect(closed('Operations', { pathname: '/admin/health' })).toBeUndefined();
    expect(closed('Access')).toBeUndefined();
    const incidents = groups(nav({ pathname: '/admin/health' }))[0]!.rows.find((r) => r.id === 'incidents');
    expect(incidents).toMatchObject({ badge: '1 incident', alert: true });
    expect([badgeText('requests', { ...COUNTS, requests: 1 }), badgeText('incidents', { ...COUNTS, incidents: 3 })]).toEqual(['1 request', '3 incidents']);
    expect(badgeText('waiting', { ...COUNTS, waiting: 3 })).toBe('3 waiting');
    expect(badgeText('waiting', COUNTS)).toBeUndefined();
  });

  it('opens one group: the one holding the page, or the one peeked; going to a single row’s page shuts them (D-239)', () => {
    const open = (over: Partial<AdminNavInput>) => groups(nav(over)).filter((g) => g.open).map((g) => g.label);
    expect(open({ pathname: '/admin/audit' })).toEqual(['Operations']);
    expect(open({ pathname: '/admin/roles' })).toEqual(['Access']);
    expect(open({ pathname: '/admin/program' })).toEqual([]);
    expect(open({ pathname: '/admin/audit', peek: 'Access' })).toEqual(['Access']);
    expect(groups(nav({ pathname: '/admin/audit', peek: 'Access' })).find((g) => g.label === 'Operations')).toMatchObject({ active: true, open: false });
    expect(open({ pathname: '/admin/audit', peek: null })).toEqual([]);
    expect(peekAfterClick('Operations', true)).toBeNull();
    expect(peekAfterClick('Operations', false)).toBe('Operations');
  });
});

describe('the four pages’ addresses (spec § 3)', () => {
  it('has a page address and a tab address for each tab', () => {
    expect(AREA_IDS.map((a) => areaPath(a, 'dec26'))).toEqual(['/admin/program', '/admin/cohort/dec26', '/admin/people', '/admin/revenue']);
    const all = AREA_IDS.flatMap((a) => AREAS[a].tabs.map((t) => tabPath(a, t.id, 'dec26')));
    expect(all).toEqual([
      '/admin/program',
      '/admin/program/course',
      '/admin/program/vault',
      '/admin/cohort/dec26',
      '/admin/cohort/dec26/schedule',
      '/admin/cohort/dec26/people',
      '/admin/cohort/dec26/community',
      '/admin/cohort/dec26/announcements',
      '/admin/cohort/dec26/settings',
      '/admin/people',
      '/admin/people/teams',
      '/admin/people/masquerade',
      '/admin/revenue',
      '/admin/revenue/payments',
      '/admin/revenue/plans',
      '/admin/revenue/usage',
    ]);
    // Every tab's address is the place of that tab (a page's first tab is its own address, which names no tab).
    for (const a of AREA_IDS)
      for (const t of AREAS[a].tabs)
        expect(placeOf(tabPath(a, t.id, 'dec26')), `${a}:${t.id}`).toMatchObject(a === 'cohort' && t.id === 'overview' ? { area: a } : { area: a, tab: t.id });
  });

  it('knows a place by its address, and no place for one that is no page', () => {
    expect(placeOf('/admin/')).toEqual({ row: 'overview', group: 'Overview' });
    expect(placeOf('/admin/cohort/dec26')).toEqual({ row: 'cohort', group: 'Cohort', area: 'cohort', cohortId: 'dec26' });
    expect(placeOf('/admin/cohort/dec26/community/7')).toEqual({ row: 'cohort', group: 'Cohort', area: 'cohort', cohortId: 'dec26', tab: 'community', record: true });
    expect(placeOf('/admin/program/weeks/new')).toMatchObject({ area: 'program', tab: 'curriculum', record: true });
    expect(placeOf('/admin/people/u_1042')).toMatchObject({ area: 'people', tab: 'everyone', record: true });
    expect(placeOf('/admin/people/teams/ws_1')).toMatchObject({ area: 'people', tab: 'teams', record: true });
    expect(placeOf('/admin/revenue/payments/invoices')).toEqual({ row: 'revenue', group: 'Revenue', area: 'revenue', tab: 'payments' });
    expect(placeOf('/admin/incidents/INC-0007')).toEqual({ row: 'incidents', group: 'Operations', record: true });
    // D-255: New cohort is a page of the Cohort row's, named in the crumb.
    expect(placeOf('/admin/cohort/new')).toEqual({ row: 'cohort', group: 'Cohort', area: 'cohort', record: true, newCohort: true });
    expect(placeOf('/admin/cohort/dec26/settings')).toEqual({ row: 'cohort', group: 'Cohort', area: 'cohort', cohortId: 'dec26', tab: 'settings' });
    // D-265: `/admin/cohort/:id/submissions` is a page now (the staff cards that left the week); its tab is Phase 7's.
    expect(placeOf('/admin/cohort/dec26/submissions')).toEqual({ row: 'cohort', group: 'Cohort', area: 'cohort', cohortId: 'dec26', page: 'Submissions' });
    expect(crumbsOf(placeOf('/admin/cohort/dec26/submissions'), { cohortId: 'dec26' })).toEqual([
      { kind: 'link', label: 'Cohort', to: '/admin/cohort/dec26' },
      { kind: 'here', label: 'Submissions' },
    ]);
    for (const p of ['/admin/no-such-page', '/admin/cohort', '/admin/cohort/dec26/submissions/x', '/admin/program/weeks', '/admin/people/u_1/x', '/admin/revenue/summary', '/admin/denied', '/sessions'])
      expect(placeOf(p), p).toBeNull();
  });
});

describe('the breadcrumb (the mockup’s Crumbs)', () => {
  const trail = (path: string, record?: string) =>
    crumbsOf(placeOf(path), { record: record ?? null, cohortId: 'dec26' }).map((c) => (c.kind === 'link' ? `[${c.label}](${c.to})` : `${c.kind}:${c.label}`));
  it('is Admin / Cohort / Schedule on a tab, the page a link to its own address', () => {
    expect(trail('/admin/cohort/dec26/schedule')).toEqual(['[Cohort](/admin/cohort/dec26)', 'here:Schedule']);
    expect(trail('/admin/cohort/dec26')).toEqual(['[Cohort](/admin/cohort/dec26)', 'here:Overview']);
    expect(trail('/admin/cohort/dec26/settings')).toEqual(['[Cohort](/admin/cohort/dec26)', 'here:Settings']);
    expect(trail('/admin/cohort/new')).toEqual(['[Cohort](/admin/cohort/dec26)', 'record:New Cohort']);
    expect(trail('/admin/program')).toEqual(['[Program](/admin/program)', 'here:Curriculum']);
    expect(trail('/admin/program/course')).toEqual(['[Program](/admin/program)', 'here:Course Settings']);
    expect(trail('/admin/revenue/payments/failed')).toEqual(['[Revenue](/admin/revenue)', 'here:Payments']);
    expect(trail('/admin')).toEqual(['here:Overview']);
  });
  it('adds a record’s name once the page knows it, its tab then a link too', () => {
    expect(trail('/admin/people/teams/ws_northshore', 'Northshore Group')).toEqual(['[People](/admin/people)', '[Teams](/admin/people/teams)', 'record:Northshore Group']);
    expect(trail('/admin/people/teams/ws_northshore')).toEqual(['[People](/admin/people)', '[Teams](/admin/people/teams)']);
    expect(trail('/admin/people/u_1042', 'Elena Vargas')).toEqual(['[People](/admin/people)', '[Everyone](/admin/people)', 'record:Elena Vargas']);
    expect(trail('/admin/program/weeks/m1', 'Marketing AI Employee')).toEqual(['[Program](/admin/program)', '[Curriculum](/admin/program)', 'record:Marketing AI Employee']);
    expect(trail('/admin/cohort/dec26/community/2', 'Welcome')).toEqual(['[Cohort](/admin/cohort/dec26)', '[Community](/admin/cohort/dec26/community)', 'record:Welcome']);
    expect(trail('/admin/masquerade/learner-view', 'Learner view')).toEqual(['[People](/admin/people)', '[Masquerade](/admin/people/masquerade)', 'record:Learner view']);
  });
  it('is Admin / Operations / Audit Log on a system page, a record under its row', () => {
    expect(trail('/admin/audit')).toEqual(['group:Operations', 'here:Audit Log']);
    expect(trail('/admin/health')).toEqual(['group:Operations', 'here:System Health']);
    expect(trail('/admin/roles')).toEqual(['group:Access', 'here:Roles & Permissions']);
    expect(trail('/admin/api/hooks')).toEqual(['group:Operations', 'here:API & Webhooks']);
    expect(trail('/admin/incidents/INC-0007', 'INC-0007')).toEqual(['group:Operations', '[Incidents](/admin/incidents)', 'record:INC-0007']);
    expect(trail('/admin/no-such-page')).toEqual([]);
  });
});

describe('the palette’s pages (spec Phase 1: the four pages and their tabs)', () => {
  it('lists the single rows, then the system pages, then each page’s tabs, by capability', () => {
    const owner = navPages('Owner', false, 'dec26');
    expect(owner.filter((p) => !p.tab).map((p) => p.label)).toEqual([
      'Overview',
      'Program',
      'Cohort',
      'People',
      'Revenue',
      'System Health',
      'Incidents',
      'Audit Log',
      'API & Webhooks',
      'Scheduled Jobs',
      'Email Log',
      'Integrations',
      'Deploys & Commits',
      'DB Health',
      'Environment Flags',
      'Roles & Permissions',
      'Staff & Roles',
    ]);
    expect(owner.filter((p) => p.tab).map((p) => p.label)).toEqual([
      'Program › Curriculum',
      'Program › Course Settings',
      'Program › Resource Vault',
      'Cohort › Overview',
      'Cohort › Schedule',
      'Cohort › People',
      'Cohort › Community',
      'Cohort › Announcements',
      'Cohort › Settings',
      'People › Everyone',
      'People › Teams',
      'People › Masquerade',
      'Revenue › Summary',
      'Revenue › Payments',
      'Revenue › Plans & Upgrades',
      'Revenue › Usage',
    ]);
    expect(owner.find((p) => p.label === 'Cohort › People')).toMatchObject({ to: '/admin/cohort/dec26/people', icon: 'r2Cohorts' });
    expect(owner.find((p) => p.label === 'People')).toMatchObject({ to: '/admin/people', icon: 'r2Users' });
    expect(owner.find((p) => p.label === 'Revenue')).toMatchObject({ to: '/admin/revenue', icon: 'r2Usage' });
    // A page or tab a role can't open is never offered.
    const instructor = navPages('Instructor', false, 'dec26').map((p) => p.label);
    expect(instructor).not.toContain('People');
    expect(instructor).not.toContain('Cohort › Community');
    expect(instructor).not.toContain('Revenue › Payments');
    expect(instructor).toContain('Revenue › Plans & Upgrades');
    for (const p of navPages('Support', false, 'dec26')) if (p.id === 'people:masquerade') throw new Error('Support offered Masquerade');
    expect(navPages('Owner', true, 'dec26').map((p) => p.label)).not.toContain('Staff & Roles');
    expect(consoleCan('Support', 'masquerade.start')).toBe(false);
  });
});
