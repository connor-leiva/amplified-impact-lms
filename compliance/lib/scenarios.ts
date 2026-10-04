export type Role = 'agent' | 'owner' | 'admin';
export type Region = 'page' | 'sidebar' | 'header' | 'main' | 'dialog' | 'drawer';
export type Action =
  | {
      click: {
        role: 'button' | 'tab' | 'link' | 'row' | 'menuitem';
        name: string | RegExp;
        within?: 'sidebar' | 'main' | 'header' | 'dialog';
        nth?: number;
      };
    }
  | { fill: { label: string; value: string } }
  | { press: string }
  | { scroll: { region: 'main'; y: number } };

export interface Scenario {
  id: string; // golden file stem, e.g. "dash-agent-live"
  gate: 3 | 4 | 5 | 6 | 7; // first phase gate that must pass this scenario
  role: Role;
  ref: string; // reference hash after role, e.g. "workspace/marketing"
  path: string; // app route, e.g. "/employees/marketing"
  phase?: 'week0' | 'live' | 'post'; // default 'live'
  viewport?: 'desktop' | 'laptop' | 'mobile' | 'sheet';
  theme?: 'light' | 'dark';
  tz?: string; // default America/Chicago
  sidebar?: 'full' | 'rail';
  refFile?: string; // default "Amplified Impact LMS.dc.html"
  actions?: Action[];
  regions?: Region[]; // default ['page', 'main']
}

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1024, height: 768 },
  mobile: { width: 390, height: 844 },
  sheet: { width: 3000, height: 1400 },
} as const;

export const PHASE_NOW = {
  week0: '2026-11-27T10:42:00-06:00',
  live: '2026-12-07T10:42:00-06:00',
  post: '2027-01-12T10:42:00-06:00',
} as const; // matches handoff-starter/fixtures/phase-now.json

const S = (s: Scenario) => s;

export const SCENARIOS: Scenario[] = [
  // Phase 03: component contract sheet
  S({
    id: 'states-light',
    gate: 3,
    role: 'agent',
    ref: '',
    refFile: 'States.dc.html',
    path: '/__states',
    viewport: 'sheet',
    regions: ['page'],
  }),
  S({
    id: 'states-dark',
    gate: 3,
    role: 'agent',
    ref: '',
    refFile: 'States.dc.html',
    path: '/__states',
    viewport: 'sheet',
    theme: 'dark',
    regions: ['page'],
  }),

  // Phase 04: shell (sidebar + header only)
  ...(['agent', 'owner', 'admin'] as const).map((role) =>
    S({
      id: `shell-${role}`,
      gate: 4,
      role,
      ref: role === 'admin' ? 'overview' : 'dashboard',
      path: role === 'admin' ? '/admin' : '/',
      regions: ['sidebar', 'header'],
    }),
  ),
  S({
    id: 'shell-agent-rail',
    gate: 4,
    role: 'agent',
    ref: 'dashboard',
    path: '/',
    sidebar: 'rail',
    regions: ['sidebar', 'header'],
  }),
  S({
    id: 'shell-agent-laptop',
    gate: 4,
    role: 'agent',
    ref: 'dashboard',
    path: '/',
    viewport: 'laptop',
    regions: ['sidebar', 'header'],
  }),
  S({
    id: 'shell-agent-dark',
    gate: 4,
    role: 'agent',
    ref: 'dashboard',
    path: '/',
    theme: 'dark',
    regions: ['sidebar', 'header'],
  }),
  S({ id: 'shell-agent-mobile', gate: 4, role: 'agent', ref: 'dashboard', path: '/', viewport: 'mobile', regions: ['header'] }),
  S({
    id: 'shell-agent-mobile-drawer',
    gate: 4,
    role: 'agent',
    ref: 'dashboard',
    path: '/',
    viewport: 'mobile',
    actions: [{ click: { role: 'button', name: 'Open menu', within: 'header' } }],
    regions: ['sidebar'],
  }),
  S({
    id: 'shell-profile-menu',
    gate: 4,
    role: 'agent',
    ref: 'dashboard',
    path: '/',
    tz: 'America/New_York',
    actions: [
      { click: { role: 'button', name: /Jamie Ortiz/, within: 'sidebar' } },
      { click: { role: 'button', name: 'Change' } },
    ],
    regions: ['page'],
  }),
  S({
    id: 'shell-locked-preview',
    gate: 4,
    role: 'agent',
    ref: 'dashboard',
    path: '/',
    actions: [{ click: { role: 'button', name: /Meetings/, within: 'sidebar' } }],
    regions: ['dialog'],
  }),

  // Phase 05: learner portal
  S({ id: 'dash-agent-live', gate: 5, role: 'agent', ref: 'dashboard', path: '/' }),
  S({ id: 'dash-agent-week0', gate: 5, role: 'agent', ref: 'dashboard', path: '/', phase: 'week0' }),
  S({ id: 'dash-agent-post', gate: 5, role: 'agent', ref: 'dashboard', path: '/', phase: 'post' }),
  S({ id: 'dash-owner-live', gate: 5, role: 'owner', ref: 'dashboard', path: '/' }),
  S({ id: 'dash-agent-eastern', gate: 5, role: 'agent', ref: 'dashboard', path: '/', tz: 'America/New_York' }),
  S({ id: 'dash-agent-dark', gate: 5, role: 'agent', ref: 'dashboard', path: '/', theme: 'dark' }),
  S({ id: 'dash-agent-laptop', gate: 5, role: 'agent', ref: 'dashboard', path: '/', viewport: 'laptop' }),
  S({ id: 'dash-agent-mobile', gate: 5, role: 'agent', ref: 'dashboard', path: '/', viewport: 'mobile' }),
  S({ id: 'emp-agent-marketing', gate: 5, role: 'agent', ref: 'workspace/marketing', path: '/employees/marketing' }),
  S({ id: 'emp-agent-sales', gate: 5, role: 'agent', ref: 'workspace/sales', path: '/employees/sales' }),
  S({ id: 'emp-agent-database', gate: 5, role: 'agent', ref: 'workspace/database', path: '/employees/database' }),
  S({ id: 'emp-owner-meetings', gate: 5, role: 'owner', ref: 'workspace/meetings', path: '/employees/meetings' }),
  S({
    id: 'emp-agent-marketing-transcript',
    gate: 5,
    role: 'agent',
    ref: 'workspace/marketing',
    path: '/employees/marketing',
    actions: [{ click: { role: 'button', name: 'Transcript', within: 'main' } }],
  }),
  S({
    id: 'emp-agent-marketing-checklist',
    gate: 5,
    role: 'agent',
    ref: 'workspace/marketing',
    path: '/employees/marketing',
    actions: [{ scroll: { region: 'main', y: 900 } }],
  }),
  S({
    id: 'emp-agent-marketing-prompt',
    gate: 5,
    role: 'agent',
    ref: 'workspace/marketing',
    path: '/employees/marketing',
    actions: [{ click: { role: 'button', name: 'View', within: 'main' } }],
    regions: ['drawer'],
  }),
  S({ id: 'emp-agent-laptop', gate: 5, role: 'agent', ref: 'workspace/sales', path: '/employees/sales', viewport: 'laptop' }),
  S({ id: 'emp-agent-mobile', gate: 5, role: 'agent', ref: 'workspace/sales', path: '/employees/sales', viewport: 'mobile' }),
  S({ id: 'sessions-agent', gate: 5, role: 'agent', ref: 'sessions', path: '/sessions' }),
  S({ id: 'sessions-owner-eastern', gate: 5, role: 'owner', ref: 'sessions', path: '/sessions', tz: 'America/New_York' }),
  S({ id: 'team-owner', gate: 5, role: 'owner', ref: 'team', path: '/team' }),
  S({
    id: 'team-owner-invite',
    gate: 5,
    role: 'owner',
    ref: 'team',
    path: '/team',
    actions: [{ click: { role: 'button', name: 'Invite Member' } }],
    regions: ['page'],
  }),
  S({
    id: 'team-owner-member',
    gate: 5,
    role: 'owner',
    ref: 'team',
    path: '/team',
    actions: [{ click: { role: 'row', name: /Priya Shah/ } }],
    regions: ['drawer'],
  }),
  S({ id: 'vault-agent', gate: 5, role: 'agent', ref: 'vault', path: '/vault' }),
  S({
    id: 'vault-agent-exec',
    gate: 5,
    role: 'agent',
    ref: 'vault',
    path: '/vault',
    actions: [{ click: { role: 'button', name: /Executive Build Vault/ } }],
  }),
  S({
    id: 'vault-owner-exec',
    gate: 5,
    role: 'owner',
    ref: 'vault',
    path: '/vault',
    actions: [{ click: { role: 'button', name: /Executive Build Vault/ } }],
  }),
  S({ id: 'tier-agent', gate: 5, role: 'agent', ref: 'upgrade', path: '/team-tier' }),

  // Phase 06: admin console
  ...(
    [
      ['overview', '/admin'],
      ['curriculum', '/admin/curriculum'],
      ['builder/marketing', '/admin/curriculum/marketing'],
      ['builder', '/admin/curriculum/new'],
      ['cohorts', '/admin/cohorts'],
      ['learners', '/admin/learners'],
      ['avault', '/admin/vault'],
      ['announce', '/admin/announcements'],
      ['tiers', '/admin/tiers'],
      ['staff', '/admin/staff'],
    ] as const
  ).map(([ref, path]) => S({ id: `admin-${ref.replace('/', '-') || 'new'}`, gate: 6, role: 'admin', ref, path })),
  S({
    id: 'admin-builder-locked',
    gate: 6,
    role: 'admin',
    ref: 'builder/meetings',
    path: '/admin/curriculum/meetings',
    actions: [{ click: { role: 'button', name: 'Locked Preview' } }],
  }),
  S({
    id: 'admin-cohorts-edit',
    gate: 6,
    role: 'admin',
    ref: 'cohorts',
    path: '/admin/cohorts',
    actions: [{ click: { role: 'button', name: 'Edit', nth: 2 } }],
    regions: ['drawer'],
  }),
  S({
    id: 'admin-learners-teams',
    gate: 6,
    role: 'admin',
    ref: 'learners',
    path: '/admin/learners',
    actions: [{ click: { role: 'button', name: 'Teams' } }],
  }),
  S({
    id: 'admin-learner-drawer',
    gate: 6,
    role: 'admin',
    ref: 'learners',
    path: '/admin/learners',
    actions: [{ click: { role: 'row', name: /Jamie Ortiz/ } }],
    regions: ['drawer'],
  }),
  S({
    id: 'admin-vault-upload',
    gate: 6,
    role: 'admin',
    ref: 'avault',
    path: '/admin/vault',
    actions: [{ click: { role: 'button', name: 'Upload Resource' } }],
    regions: ['drawer'],
  }),
  S({ id: 'admin-overview-dark', gate: 6, role: 'admin', ref: 'overview', path: '/admin', theme: 'dark' }),
  S({ id: 'admin-overview-laptop', gate: 6, role: 'admin', ref: 'overview', path: '/admin', viewport: 'laptop' }),
];
