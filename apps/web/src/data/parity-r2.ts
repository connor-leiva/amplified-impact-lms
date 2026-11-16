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

/** The Resource Vault's rows (its `R`, R2-2b): title, type, attached to, tier access, size, updated, opens. */
export const VAULT = [
  ['Listing appointment checklist', 'PDF', 'Listing AI Employee', 'Agent + Team', '412 KB', 'Dec 8', 86],
  ['Standard chart of accounts', 'Sheet', 'Finance AI Employee', 'Team only', '88 KB', 'Dec 6', 31],
  ['Fair Housing review checklist', 'PDF', 'Marketing AI Employee', 'Agent + Team', '240 KB', 'Dec 2', 128],
  ['Session 1 replay', 'Video', 'Week 1 · Know the Business', 'Team only', '214 MB', 'Dec 2', 97],
  ['Session 2 replay', 'Video', 'Week 2 · Own the Day', 'Team only', '198 MB', 'Dec 9', 64],
  ['Skill install walkthrough', 'Video', 'Week 0 · Get Ready', 'Agent + Team', '96 MB', 'Nov 24', 141],
  ['Morning brief prompt pack', 'Prompt', 'Week 2 · Own the Day', 'Team only', '9 KB', 'Dec 9', 52],
] as const;

/** Announcements' rows (its `rows`, R2-2b): title, audience, channels, status, send time. */
export const ANNOUNCEMENTS = [
  ['Session 2 replay is ready', 'Team Tier', 'In-app, email', 'Sent', 'Dec 9, 3:10 PM'],
  ['New in the vault: listing appointment checklist', 'Everyone', 'In-app, email', 'Sent', 'Dec 8, 3:00 PM'],
  ['Session 3 is Wednesday at 12:00 PM MST', 'Team Tier', 'Email', 'Scheduled', 'Dec 15, 12:00 PM'],
  ['Database AI Employee opens Monday', 'Everyone', 'In-app', 'Draft', '—'],
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

/**
 * `USERS` (R2-3): the learners Learners & Teams lists, verbatim but for Priya Raman, whose workspace
 * is canceled (the mockup's table leaves her out, and the app has no canceled learner). `pr` of `of`
 * is builds deployed of the builds open to that learner's tier.
 */
export const USERS = [
  { id: 'u_1042', n: 'Elena Vargas', e: 'elena@northshoregroup.example', ws: 'ws_northshore', role: 'Team owner', tier: 'Team', last: 'Dec 10, 8:52 AM', pr: 4 },
  { id: 'u_1043', n: 'Marcus Oyelaran', e: 'marcus@northshoregroup.example', ws: 'ws_northshore', role: 'Agent', tier: 'Team', last: 'Dec 9, 4:31 PM', pr: 3 },
  { id: 'u_1061', n: 'Jordan Hale', e: 'jordan@halemarlowe.example', ws: 'ws_halemarlowe', role: 'Team owner', tier: 'Team', last: 'Dec 9, 6:10 PM', pr: 5 },
  { id: 'u_1077', n: 'Noor Haddad', e: 'noor@redcliffcollective.example', ws: 'ws_redcliff', role: 'Team owner', tier: 'Agent', last: 'Dec 10, 12:41 AM', pr: 2 },
  { id: 'u_1090', n: 'Devon Achterberg', e: 'devon@copperbasin.example', ws: 'ws_copperbasin', role: 'Team owner', tier: 'Team', last: 'Dec 9, 2:15 PM', pr: 2 },
  { id: 'u_1104', n: 'Sam Whitlock', e: 'sam@tidewaterproperty.example', ws: 'ws_tidewater', role: 'Agent', tier: 'Agent', last: 'Dec 4, 9:03 AM', pr: 1 },
  { id: 'u_1118', n: 'Tessa Lindqvist', e: 'tessa@lanternstreet.example', ws: 'ws_lantern', role: 'Team owner', tier: 'Team', last: 'Dec 9, 11:27 AM', pr: 1 },
] as const;

/**
 * `WS` (R2-3), as teams: id, name, owner. The mockup's figures disagree (its Tiers screen counts five
 * 16-seat teams and two 41-seat ones; `WS` lists seven workspaces on four plans), so the seats are
 * the ones that print every figure it draws: 41 for Northshore and Red Cliff, 16 for the rest.
 */
export const WS = [
  ['ws_northshore', 'Northshore Group', 'u_1042', 41],
  ['ws_halemarlowe', 'Hale & Marlowe Realty', 'u_1061', 16],
  ['ws_redcliff', 'Red Cliff Collective', 'u_1077', 41],
  ['ws_copperbasin', 'Copper Basin Realty', 'u_1090', 16],
  ['ws_tidewater', 'Tidewater Property Co.', 'u_1104', 16],
  ['ws_lantern', 'Lantern Street Partners', 'u_1118', 16],
  ['ws_fourthmeridian', 'Fourth Meridian', 'u_1125', 16],
] as const;

/** Tiers' cards (`T` in its `Tiers` screen): name, seats, price, blurb, features. */
export const TIER_CARDS = [
  ['agent', 'Agent', 1, 995, 'For individual agents building their own AI Employees.', ['Marketing, Sales and Database AI Employees', 'System prompts, skill files and checklists', 'Resource Vault']],
  ['team', 'Team', 16, 4995, 'For teams that want every seat building, plus the leadership modules.', ['All 15 AI Employees and weekly live builds', '16 seats', 'Team progress tracking']],
  ['team', 'Team', 41, 9995, 'The same Team Tier, sized for larger teams.', ['All 15 AI Employees and weekly live builds', '41 seats', 'Team progress tracking']],
] as const;

/** The Overview's chart (`pts`): AI Employees deployed, cumulative, Dec 2 to Dec 8. */
export const OVERVIEW_PTS = [22, 58, 96, 121, 150, 178, 190] as const;

/** The Overview's funnel (`funnel`): module id, deployed, in progress, eligible. */
export const OVERVIEW_FUNNEL = [
  ['m1', 98, 22, 148],
  ['m4', 52, 31, 148],
  ['m3', 33, 6, 44],
  ['m5', 17, 12, 44],
  ['m6', 0, 0, 148],
] as const;

/** The Overview's Live activity: who, what, minutes before "now", tone. */
export const OVERVIEW_ACTIVITY = [
  ['Sarah Collins', 'deployed Database AI Employee', 38, 'success'],
  ['Rosa Delgado', 'deployed Sales AI Employee', 125, 'success'],
  ['Natasha Reed', 'deployed Marketing AI Employee', 160, 'success'],
  ['Devon Price', 'deployed Sales AI Employee', 850, 'success'],
  ['Kenji Watanabe', 'requested a Team tier upgrade', 1108, 'warn'],
] as const;

/** The Overview's "+6 in the last 24 hours". */
export const OVERVIEW_RECENT = 6;

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
