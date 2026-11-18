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

  // Phase 04: shell and Phase 05: learner portal. Every scenario is retired: D-182 (the user's request of
  // Nov 18, 2026) made the learner portal at /learn (D-177, built to the signed-off learner mockup in
  // docs/design/learner-v2/, not to design-reference/) every learner's portal, and retired the screens these
  // scenarios compared with the reference, whose addresses now redirect there. The learner shells
  // (`shell-agent`, `shell-owner`, `shell-agent-rail`, `shell-agent-laptop`, `shell-agent-dark`,
  // `shell-agent-mobile`, `shell-agent-mobile-drawer`, `shell-profile-menu`, `shell-locked-preview`), the
  // dashboard (`dash-agent-live`, `dash-agent-week0`, `dash-agent-post`, `dash-owner-live`,
  // `dash-agent-eastern`, `dash-agent-dark`, `dash-agent-laptop`, `dash-agent-mobile`), the AI Employee
  // pages (`emp-agent-marketing`, `emp-agent-sales`, `emp-agent-database`, `emp-owner-meetings`,
  // `emp-agent-marketing-transcript`, `emp-agent-marketing-checklist`, `emp-agent-marketing-prompt`,
  // `emp-agent-laptop`, `emp-agent-mobile`), Sessions (`sessions-agent`, `sessions-owner-eastern`) and
  // Team Tier (`tier-agent`) are gone with their screens. The Team Hub (`team-owner`, `team-owner-invite`,
  // `team-owner-member`) and the vault (`vault-agent`, `vault-agent-exec`, `vault-owner-exec`) live on, the
  // same screens inside the learner portal's shell at /learn/team and /learn/vault, which no longer frames
  // them as the reference does, so their pixels can't match it. The learner portal is held to its own
  // mockup by the `learn-v2*` e2e specs.

  // Phase 06: admin console. Every admin scenario is retired: the R2 PRs rebuilt each admin screen on
  // the signed-off mockup, which `pnpm parity:admin-r2` compares them with instead (Connor, Nov 16,
  // 2026). R2-1b retired `shell-admin` and each admin scenario's `page` region; R2-2a `admin-curriculum`,
  // `admin-builder`, `admin-builder-marketing` and `admin-builder-locked`; R2-2b `admin-cohorts`,
  // `admin-cohorts-edit`, `admin-avault`, `admin-vault-upload` and `admin-announce`; and R2-3a the last
  // eight, `admin-overview`, `admin-overview-dark`, `admin-overview-laptop`, `admin-learners`,
  // `admin-learners-teams`, `admin-learner-drawer`, `admin-tiers` and `admin-staff` (D-160).
];
