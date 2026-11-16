// The Admin redesign R2 parity fixture (D-160, BUILD-SPEC § 6.1): the mockup's own data, so the app
// can be captured and compared with design-reference/admin-redesign-r2/ref/ pixel for pixel.
//
// FIXTURE ONLY. `admin-shell.ts` loads this file with a dynamic import behind
// `import.meta.env.VITE_DATA_SOURCE === 'fixture'`, which Vite replaces with a constant, so the http
// build never contains it (`admin-shell-build.test.ts` builds both ways and checks). Even in the
// fixture build it is used only when the address asks for it: `?parity=r2`, with `?as=admin`.
//
// Every value below is copied from AdminRedesign.jsx (its constants keep their names), and every
// person, workspace and ID in it is fictional, as the mockup's are. "Today" is the mockup's: Thu,
// Dec 10, 2026, about 9:30 AM MST, which the harness freezes with Playwright's clock API; the cohort
// is started (the mockup's "Cohort: Week 2"). R2-1b uses the shell's slice: the viewer, the cohort
// switcher's tile, the environment and the badge counts. Each later R2 PR adds the constants its
// screens read (`WS`, `USERS`, `PERMS0`, `AUDIT0`, `EMAILS`, `INV`, `JOBS`, …) beside these.

/** The parity fixture's switch, read in fixture builds only. */
export const PARITY_PARAM = 'parity';
export const PARITY_VALUE = 'r2';

/** `STAFF`. The viewer is the Owner, Connor Leiva. */
export const STAFF = [
  { n: 'Connor Leiva', role: 'Owner', e: 'connor@amplifiedimpact.io', last: 'Dec 10, 9:22 AM' },
  { n: 'Avery Stone', role: 'Admin', e: 'avery@amplifiedimpact.example', last: 'Dec 9, 5:48 PM' },
  { n: 'Imani Brooks', role: 'Support', e: 'imani@amplifiedimpact.example', last: 'Dec 9, 9:30 PM' },
] as const;

/** `ROLES`. */
export const ROLES = ['Owner', 'Admin', 'Support'] as const;

/**
 * `MODS0` (R2-2): the curriculum, verbatim. `ses` is the live session's two lines as the mockup writes
 * them; the parity snapshot (`parity-r2-db.ts`) turns each row into the app's own AI Employee, session
 * and baseline, and the Curriculum and Module Builder screens print them back from those.
 */
export const MODS0 = [
  {
    id: 'm1',
    n: 'Marketing AI Employee',
    d: 'Paste an MLS listing → Fair-Housing-checked copy',
    ic: 'announce',
    tier: 'both',
    ses: null,
    st: 'Published',
    steps: 6,
    files: 3,
    dep: 66,
  },
  {
    id: 'm2',
    n: 'Week 0 · Get Ready',
    d: 'Your accounts, operator, and baseline',
    ic: 'audit',
    tier: 'team',
    ses: null,
    st: 'Published',
    steps: 6,
    files: 2,
    dep: 91,
  },
  {
    id: 'm3',
    n: 'Week 1 · Know the Business',
    d: 'A checked view of what your business earns and spends',
    ic: 'tiers',
    tier: 'team',
    ses: ['Session 1 · Lead-Source ROI Live Build', 'Wed, Dec 2 · 12:00 PM MST · Replay ready'],
    st: 'Published',
    steps: 6,
    files: 4,
    dep: 74,
  },
  {
    id: 'm4',
    n: 'Sales AI Employee',
    d: 'Paste a new lead → a first reply in your voice',
    ic: 'bolt',
    tier: 'both',
    ses: null,
    st: 'Published',
    steps: 6,
    files: 3,
    dep: 35,
  },
  {
    id: 'm5',
    n: 'Week 2 · Own the Day',
    d: 'A ten-minute morning brief from your own data',
    ic: 'jobs',
    tier: 'team',
    ses: ['Session 2 · Morning Brief Live Build', 'Wed, Dec 9 · 12:00 PM MST · Replay ready'],
    st: 'Published',
    steps: 6,
    files: 3,
    dep: 38,
  },
  {
    id: 'm6',
    n: 'Database AI Employee',
    d: 'Upload your contact export → ten warm conversations',
    ic: 'db',
    tier: 'both',
    ses: null,
    st: 'Scheduled',
    steps: 6,
    files: 3,
    opens: 'Opens Dec 14',
  },
  {
    id: 'm7',
    n: 'Week 3 · Work the Database',
    d: 'Sort your sphere and plan the week of calls',
    ic: 'learners',
    tier: 'team',
    ses: ['Session 3 · Database Live Build', 'Wed, Dec 16 · 12:00 PM MST'],
    st: 'Scheduled',
    steps: 6,
    files: 2,
    opens: 'Opens Dec 14',
  },
  {
    id: 'm8',
    n: 'Meetings AI Employee',
    d: 'Paste a meeting transcript → decisions and owners',
    ic: 'email',
    tier: 'team',
    ses: null,
    st: 'Scheduled',
    steps: 5,
    files: 2,
    opens: 'Opens Dec 21',
  },
  {
    id: 'm9',
    n: 'Week 4 · Run the Meeting',
    d: 'A weekly meeting that runs from your scorecard',
    ic: 'cohorts',
    tier: 'team',
    ses: ['Session 4 · Scorecard Live Build', 'Wed, Dec 23 · 12:00 PM MST'],
    st: 'Scheduled',
    steps: 6,
    files: 2,
    opens: 'Opens Dec 21',
  },
  {
    id: 'm10',
    n: 'Finance AI Employee',
    d: 'Upload a ledger export → spend mapped to a standard chart',
    ic: 'billing',
    tier: 'team',
    ses: null,
    st: 'Draft',
    steps: 4,
    files: 1,
  },
  {
    id: 'm11',
    n: 'Week 5 · Close Clean',
    d: 'Contract-to-close checklist with dates and owners',
    ic: 'check',
    tier: 'team',
    ses: ['Session 5 · Contract to Close', 'Wed, Dec 30 · 12:00 PM MST'],
    st: 'Draft',
    steps: 3,
    files: 0,
  },
  {
    id: 'm12',
    n: 'Operations AI Employee',
    d: 'Upload an executed contract → a dated task list',
    ic: 'jobs',
    tier: 'team',
    ses: null,
    st: 'Draft',
    steps: 2,
    files: 0,
  },
  {
    id: 'm13',
    n: 'Week 6 · Hand It Off',
    d: 'Document each AI Employee so a teammate can run it',
    ic: 'file',
    tier: 'team',
    ses: ['Session 6 · Handoff', 'Wed, Jan 6 · 12:00 PM MST'],
    st: 'Draft',
    steps: 2,
    files: 0,
  },
  {
    id: 'm14',
    n: 'Recruiting AI Employee',
    d: 'Paste a candidate profile → call prep and questions',
    ic: 'users',
    tier: 'team',
    ses: null,
    st: 'Draft',
    steps: 1,
    files: 0,
  },
  {
    id: 'm15',
    n: 'Listing AI Employee',
    d: 'Paste seller notes → a listing appointment follow-up',
    ic: 'vault',
    tier: 'team',
    ses: null,
    st: 'Draft',
    steps: 1,
    files: 0,
  },
] as const;

/** `MODS0`'s statuses, in its order (m1 … m15): Curriculum's "6 draft" counts its drafts. */
export const MODS0_STATUS = MODS0.map((m) => m.st);

/** The Module Builder's steps (its `steps` state): type, title, length. They are m1's. */
export const BUILDER_STEPS = [
  ['Watch', 'What this AI Employee does', '4 min'],
  ['Read', 'Before you start: what to have open', '3 min'],
  ['Build', 'Install the skill file', '6 min'],
  ['Build', 'Run it on your first real input', '8 min'],
  ['Check', 'Review the output against the checklist', '5 min'],
  ['Ship', 'Mark as deployed', '1 min'],
] as const;

/** The Module Builder's files: name, kind, size. They are m1's. */
export const BUILDER_FILES = [
  ['skill-file.zip', 'Skill file', '184 KB'],
  ['system-prompt.md', 'System prompt', '6 KB'],
  ['review-checklist.pdf', 'Checklist', '412 KB'],
] as const;

/** `INCIDENTS`' ids and statuses: Incidents' "1" counts the open ones. */
export const INCIDENTS = [
  { id: 'INC-0007', st: 'Open' },
  { id: 'INC-0006', st: 'Acknowledged' },
  { id: 'INC-0005', st: 'Resolved' },
] as const;

/** Tiers' upgrade requests (`req` in its `Tiers` screen): "2" counts the pending ones. */
export const UPGRADE_REQUESTS = [
  ['Kenji Watanabe', 'Agent → Team · 16 seats', '$4,000', 'Dec 9, 3:02 PM', 'Pending'],
  ['Jordan Hale', 'Team · 16 seats → 41 seats', '$4,000', 'Dec 9, 6:12 PM', 'Pending'],
  ['Rosa Delgado', 'Agent → Team · 16 seats', '$4,000', 'Dec 4, 1:30 PM', 'Approved'],
] as const;

/** The parity fixture, as the shell reads it. */
export interface ParityR2 {
  viewer: { name: string; role: string };
  /** The cohort switcher: program and cohort. */
  program: string;
  cohort: string;
  environment: string;
  /** "Cohort: Week 2" (Week 2 of 6), not "before start". */
  started: boolean;
  counts: { drafts: number; requests: number; incidents: number };
  /** Show the mockup's whole `NAV`, built or not. */
  fullNav: true;
}

export const PARITY_R2: ParityR2 = {
  viewer: { name: STAFF[0].n, role: STAFF[0].role },
  program: 'Amplified AI Accelerator',
  cohort: 'December 2026 Cohort',
  environment: 'Production',
  started: true,
  counts: {
    drafts: MODS0_STATUS.filter((s) => s === 'Draft').length,
    requests: UPGRADE_REQUESTS.filter((r) => r[4] === 'Pending').length,
    incidents: INCIDENTS.filter((i) => i.st === 'Open').length,
  },
  fullNav: true,
};

/** The fixture when the address asks for it, or null. */
export function readParityR2(search: string = typeof location === 'undefined' ? '' : location.search): ParityR2 | null {
  return new URLSearchParams(search).get(PARITY_PARAM) === PARITY_VALUE ? PARITY_R2 : null;
}
