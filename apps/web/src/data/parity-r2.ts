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
 * `PERMS0` (R2-3b, editable Roles): the matrix, verbatim, one value per `ROLES` column. The parity
 * fixture stores it as the Owner's changes (`parityRoleGrants`) within the ceiling, which `CONSOLE_CAPS`
 * keeps in code: where `PERMS0` shows a box the ceiling forbids (Support's "Export audit and email
 * logs"), the ceiling wins and the box is drawn locked, as production draws it.
 */
export const PERMS0 = [
  ['build', 'Edit curriculum, vault, sessions, announcements, tiers', [1, 1, 0]],
  ['masq', 'Start and extend masquerade', [1, 1, 0]],
  ['account', 'Send password reset or change email', [1, 1, 1]],
  ['billview', 'View billing', [1, 1, 1]],
  ['refund', 'Refund or void an invoice', [1, 1, 0]],
  ['jobs', 'Run a job now, retry a webhook, update incidents', [1, 1, 0]],
  ['export', 'Export audit and email logs', [1, 1, 1]],
  ['ops', 'View integrations, deploys, DB health, flags, roles', [1, 1, 0]],
  ['staff', 'Edit staff roles and this matrix', [1, 0, 0]],
] as const;

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
    ses: ['Session 1 · Lead-Source ROI Live Build', 'Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT · Replay ready'],
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
    ses: ['Session 2 · Morning Brief Live Build', 'Wed, Dec 9 · 12:00 PM MT / 1:00 PM CT · Replay ready'],
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
    ses: ['Session 3 · Database Live Build', 'Wed, Dec 16 · 12:00 PM MT / 1:00 PM CT'],
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
    ses: ['Session 4 · Scorecard Live Build', 'Wed, Dec 23 · 12:00 PM MT / 1:00 PM CT'],
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
    ses: ['Session 5 · Contract to Close', 'Wed, Dec 30 · 12:00 PM MT / 1:00 PM CT'],
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
    ses: ['Session 6 · Handoff', 'Wed, Jan 6 · 12:00 PM MT / 1:00 PM CT'],
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
  ['Session 3 is Wednesday at 12:00 PM MT / 1:00 PM CT', 'Team Tier', 'Email', 'Scheduled', 'Dec 15, 12:00 PM'],
  ['Database AI Employee opens Monday', 'Everyone', 'In-app', 'Draft', '—'],
] as const;

/**
 * `INCIDENTS` (D-167), verbatim: Incidents' "1" counts the open ones. `links` are the "Linked" card's
 * rows (the screen they open, and their words); `tl` the timeline, oldest first.
 */
export const INCIDENTS = [
  {
    id: 'INC-0007',
    t: 'GHL order sync failing with 401',
    sev: 'Sev 2',
    st: 'Open',
    o: 'Dec 9, 9:14 PM',
    own: 'Imani Brooks',
    links: [
      ['jobs', 'Job ghl-orders'],
      ['api', '3 webhook deliveries'],
    ],
    tl: [
      ['Dec 9, 9:14 PM', 'Opened automatically after 3 failed runs of ghl-orders.'],
      ['Dec 9, 9:20 PM', 'Imani Brooks confirmed orders are saved locally. Only the GHL copy is behind.'],
      ['Dec 9, 10:42 PM', 'Deploy a3f91c2 went live. No change in error rate.'],
    ],
  },
  {
    id: 'INC-0006',
    t: 'Stripe subscription.updated handler timeout',
    sev: 'Sev 3',
    st: 'Acknowledged',
    o: 'Dec 8, 7:31 PM',
    own: 'Avery Stone',
    links: [['api', '1 webhook delivery']],
    tl: [
      ['Dec 8, 7:31 PM', 'Opened after a delivery used all 5 attempts.'],
      ['Dec 8, 7:40 PM', 'Acknowledged by Avery Stone.'],
    ],
  },
  {
    id: 'INC-0005',
    t: 'Weekly digest bounces above 2%',
    sev: 'Sev 3',
    st: 'Resolved',
    o: 'Dec 7, 7:12 AM',
    own: 'Connor Leiva',
    links: [['email', 'Email log, weekly-digest']],
    tl: [
      ['Dec 7, 7:12 AM', 'Opened by Connor Leiva.'],
      ['Dec 7, 2:05 PM', 'Canceled workspaces removed from the digest audience.'],
      ['Dec 7, 2:10 PM', 'Resolved by Connor Leiva.'],
    ],
  },
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

/**
 * `AUDIT0` (R2-3b): the Audit Log's rows, newest first: time, actor, action, target, detail. Four of
 * its actions (`masquerade.stop`, `module.publish`, `permission.change`, `tier.access_change`) are the
 * mockup's and not yet in the app's closed `AUDIT_ACTIONS`; the console fixture serves them as written.
 */
export const AUDIT0 = [
  ['Dec 10, 8:58 AM', 'Connor Leiva', 'job.run_now', 'ghl-orders', 'Manual run. Failed with 401.'],
  ['Dec 9, 9:31 PM', 'Avery Stone', 'masquerade.stop', 'Sam Whitlock', 'Exited by staff after 6 min.'],
  ['Dec 9, 9:27 PM', 'Avery Stone', 'masquerade.blocked_action', 'Sam Whitlock', 'Tried: Refund in_1QxP7tTw0283.'],
  ['Dec 9, 9:25 PM', 'Avery Stone', 'masquerade.start', 'Sam Whitlock', 'Reason: Customer cannot see the Session 2 replay.'],
  ['Dec 9, 5:02 PM', 'Imani Brooks', 'audit.export', 'Audit log', 'CSV, last 7 days, 212 rows.'],
  ['Dec 9, 3:20 PM', 'Avery Stone', 'module.publish', 'Sales AI Employee', 'Draft to Published.'],
  ['Dec 9, 2:10 PM', 'Connor Leiva', 'permission.change', 'Support', 'Refund or void an invoice: allowed to not allowed.'],
  ['Dec 8, 4:44 PM', 'Connor Leiva', 'tier.access_change', 'Database AI Employee', 'Team only to Agent + Team.'],
  ['Dec 8, 9:05 AM', 'Imani Brooks', 'email_log.export', 'Email log', 'CSV, template weekly-digest, 388 rows.'],
  ['Nov 1, 4:44 PM', 'Connor Leiva', 'billing.refund', 'in_1QxK5fFm0270', '$695.00. Reason: canceled inside trial window.'],
] as const;

// ---- R2-1c: the Support screens' records (Workspaces, Workspace, Users, User), verbatim --------------
// The Console fixture (`console-fixture-records.ts`) turns these into the API's shapes, in the
// mockup's own order (the API's is by name), so the screens' view-models print exactly these words.
// The mockup calls them `WS` and `USERS`; here they are `SUPPORT_WS` and `SUPPORT_USERS`, because R2-3's
// `WS` and `USERS` above are the same people shaped for Learners & Teams and Tiers.

/** `WS`, verbatim. */
export const SUPPORT_WS = [
  { id: 'ws_northshore', n: 'Northshore Group', plan: 'Team Plan · 41 seats', used: 33, cap: 41, st: 'Active', last: 'Dec 10, 8:52 AM', owner: 'Elena Vargas', mrr: '$1,495', cus: 'cus_Rk3NshoreA1', sub: 'sub_1Qn7NshoreT41' },
  { id: 'ws_halemarlowe', n: 'Hale & Marlowe Realty', plan: 'Team Plan · 16 seats', used: 15, cap: 16, st: 'Active', last: 'Dec 9, 6:10 PM', owner: 'Jordan Hale', mrr: '$695', cus: 'cus_Rm8HaleMrl02', sub: 'sub_1Qp2HaleT16' },
  { id: 'ws_redcliff', n: 'Red Cliff Collective', plan: 'Agent Plan', used: 46, cap: 50, st: 'Active', last: 'Dec 10, 12:41 AM', owner: 'Noor Haddad', mrr: '$1,450', cus: 'cus_Rj1RedClf03', sub: 'sub_1Qk9RedClfA50' },
  { id: 'ws_copperbasin', n: 'Copper Basin Realty', plan: 'AI Accelerator', used: 2, cap: 2, st: 'Active', last: 'Dec 9, 2:15 PM', owner: 'Devon Achterberg', mrr: 'One-time', cus: 'cus_Rp4CoprBsn04', sub: '—' },
  { id: 'ws_tidewater', n: 'Tidewater Property Co.', plan: 'Insiders', used: 1, cap: 1, st: 'Past due', last: 'Dec 4, 9:03 AM', owner: 'Sam Whitlock', mrr: '$97', cus: 'cus_Rg6Tidewtr05', sub: 'sub_1Qh3TidewI1' },
  { id: 'ws_lantern', n: 'Lantern Street Partners', plan: 'Team Plan · 16 seats', used: 6, cap: 16, st: 'Trialing', last: 'Dec 9, 11:27 AM', owner: 'Tessa Lindqvist', mrr: '$0', cus: 'cus_Rt2Lantern06', sub: 'sub_1Qv5LanternT16' },
  { id: 'ws_fourthmeridian', n: 'Fourth Meridian', plan: 'Team Plan · 16 seats', used: 0, cap: 16, st: 'Canceled', last: 'Nov 2, 4:40 PM', owner: 'Priya Raman', mrr: '$0', cus: 'cus_Rb9FourthM07', sub: 'sub_1Qc1FourthT16' },
] as const;

/** `USERS`, verbatim. */
export const SUPPORT_USERS = [
  { id: 'u_1042', n: 'Elena Vargas', e: 'elena@northshoregroup.example', ws: 'Northshore Group', role: 'Team owner', tier: 'Team', last: 'Dec 10, 8:52 AM', st: 'Active', pr: 4, of: 5 },
  { id: 'u_1043', n: 'Marcus Oyelaran', e: 'marcus@northshoregroup.example', ws: 'Northshore Group', role: 'Agent', tier: 'Team', last: 'Dec 9, 4:31 PM', st: 'Active', pr: 3, of: 5 },
  { id: 'u_1061', n: 'Jordan Hale', e: 'jordan@halemarlowe.example', ws: 'Hale & Marlowe Realty', role: 'Team owner', tier: 'Team', last: 'Dec 9, 6:10 PM', st: 'Active', pr: 5, of: 5 },
  { id: 'u_1077', n: 'Noor Haddad', e: 'noor@redcliffcollective.example', ws: 'Red Cliff Collective', role: 'Team owner', tier: 'Agent', last: 'Dec 10, 12:41 AM', st: 'Active', pr: 2, of: 2 },
  { id: 'u_1090', n: 'Devon Achterberg', e: 'devon@copperbasin.example', ws: 'Copper Basin Realty', role: 'Team owner', tier: 'Team', last: 'Dec 9, 2:15 PM', st: 'Active', pr: 2, of: 5 },
  { id: 'u_1104', n: 'Sam Whitlock', e: 'sam@tidewaterproperty.example', ws: 'Tidewater Property Co.', role: 'Agent', tier: 'Agent', last: 'Dec 4, 9:03 AM', st: 'Past due', pr: 1, of: 2 },
  { id: 'u_1118', n: 'Tessa Lindqvist', e: 'tessa@lanternstreet.example', ws: 'Lantern Street Partners', role: 'Team owner', tier: 'Team', last: 'Dec 9, 11:27 AM', st: 'Trialing', pr: 1, of: 5 },
  { id: 'u_1125', n: 'Priya Raman', e: 'priya@fourthmeridian.example', ws: 'Fourth Meridian', role: 'Team owner', tier: 'Team', last: 'Nov 2, 4:40 PM', st: 'Canceled', pr: 0, of: 5 },
] as const;

/**
 * D-162 3b: the Masquerade screen's "Recent sessions", verbatim (`Masquerade()`): staff, user, reason,
 * started, length, ended. The console fixture turns each into the API's history row.
 */
export const MASQ_SESSIONS = [
  ['Avery Stone', 'Sam Whitlock', 'Customer cannot see the Session 2 replay.', 'Dec 9, 9:25 PM', '6 min', 'Exited by staff'],
  ['Avery Stone', 'Jordan Hale', 'Checking seat invite flow after upgrade request.', 'Dec 8, 2:02 PM', '15 min', 'Expired'],
  ['Connor Leiva', 'Elena Vargas', 'Verifying Week 2 step order on her account.', 'Dec 6, 4:18 PM', '11 min', 'Exited by staff'],
] as const;

/** `INV`: the invoices, as the workspaces' orders. */
export const INV = [
  { id: 'in_1QxT4mNs0291', c: 'Northshore Group', amt: '$1,495.00', st: 'Paid', d: 'Dec 8, 2026', card: 'Visa ending 4242' },
  { id: 'in_1QxR9aRc0288', c: 'Red Cliff Collective', amt: '$1,450.00', st: 'Paid', d: 'Dec 6, 2026', card: 'Amex ending 1007' },
  { id: 'in_1QxQ2cCb0285', c: 'Copper Basin Realty', amt: '$3,750.00', st: 'Paid', d: 'Dec 5, 2026', card: 'Visa ending 1881' },
  { id: 'in_1QxP7tTw0283', c: 'Tidewater Property Co.', amt: '$97.00', st: 'Failed', d: 'Dec 4, 2026', card: 'Mastercard ending 5521' },
  { id: 'in_1QxN1hHm0279', c: 'Hale & Marlowe Realty', amt: '$695.00', st: 'Open', d: 'Dec 3, 2026', card: 'Visa ending 3310' },
  { id: 'in_1QxK5fFm0270', c: 'Fourth Meridian', amt: '$695.00', st: 'Refunded', d: 'Nov 1, 2026', card: 'Visa ending 9034' },
] as const;

// ---- D-163: Billing's Summary and lists, verbatim (`Billing()` in AdminRedesign.jsx) ------------------
// The Console fixture (`console-fixture-billing.ts`) turns these into the API's shapes. Every figure is
// the mockup's own sample, so the fixture also carries its "· sample" qualifiers (BUILD-SPEC § 6.1);
// production (http) prints neither.

/** The four stats, the plan lines' title and their qualifiers. */
export const BILLING_SAMPLE = {
  mrrLabel: 'MRR · sample',
  mrr: '$18,516',
  mrrSub: '+$695 this week',
  subscriptions: 77,
  failed: 3,
  refunds30d: '$0',
  plansTitle: 'Plan economics · sample figures',
} as const;

/** "Plan economics · sample figures": plan, price, active, MRR. */
export const BILLING_PLANS = [
  ['Team Plan · 16 seats', '$695 monthly', '5 teams', '$3,475'],
  ['Team Plan · 41 seats', '$1,495 monthly', '2 teams', '$2,990'],
  ['Agent Plan', '$29 per agent, monthly', '212 agents', '$6,148'],
  ['Insiders', '$97 monthly', '61 members', '$5,917'],
  ['AI Accelerator', '$7,500 or 2 × $3,750', '11 of 15 seats', 'One-time'],
] as const;

/** The AI Accelerator card: 11 of 15 sold, $67,500 collected, 4 × $3,750 = $15,000 still due. */
export const BILLING_ACCELERATOR = { sold: 11, paidInFull: 7, twoPay: 4, collected: '$67,500', scheduled: '$15,000' } as const;

/** The Failed payments tab: customer, amount, decline reason, attempts, next retry. */
export const BILLING_FAILED = [
  ['Tidewater Property Co.', '$97.00', 'card_declined: insufficient_funds', '2 of 4', 'Dec 11, 9:00 AM'],
  ['Hale & Marlowe Realty', '$695.00', 'authentication_required', '1 of 4', 'Dec 11, 8:00 AM'],
  ['Copper Basin Realty', '$3,750.00', 'card_declined: do_not_honor', '1 of 4', 'Dec 12, 12:00 PM'],
] as const;

/** The Refunds tab: refund, invoice, amount, reason, by, when. */
export const BILLING_REFUNDS = [['re_3QxK5fFm70', 'in_1QxK5fFm0270', '$695.00', 'Canceled inside trial window', 'Connor Leiva', 'Nov 1, 4:44 PM']] as const;

/** The Workspace screen's staff notes (on Northshore Group), newest first. */
export const WORKSPACE_NOTES = [
  ['Imani Brooks', 'Dec 7, 3:40 PM', 'Owner asked how seats work when an agent leaves. Sent the seat reassignment guide.'],
  ['Connor Leiva', 'Nov 24, 10:05 AM', 'Onboarding call done. They want the leadership modules first.'],
] as const;

/** The User screen's note (on Elena Vargas). */
/**
 * R-5 audit (D-267): Utah Life, the access group People › Utah Life shows (the mockup's `ULA`, handoff/admin-mockup/
 * ia-screens.jsx): its eight agents by the mockup's own masked addresses, each last active at that stamp, or still
 * invited. None has given a name, so each reads as the group's agent.
 */
export const UTAH_LIFE = {
  id: 'utah-life',
  name: 'Utah Life',
  emailDomain: 'liveutah.com',
  plan: 'agent_plan',
  members: [
    ['a•••••@liveutah.com', 'Dec 10, 8:02 AM'],
    ['c•••@liveutah.com', 'Dec 9, 5:47 PM'],
    ['j••••••@liveutah.com', 'Dec 8, 11:20 AM'],
    ['k••••@liveutah.com', null],
    ['m••••@liveutah.com', 'Dec 7, 2:36 PM'],
    ['r•••••••@liveutah.com', 'Dec 6, 9:11 AM'],
    ['s•••@liveutah.com', 'Dec 4, 4:05 PM'],
    ['t••••••@liveutah.com', 'Dec 3, 10:30 AM'],
  ],
} as const;

export const USER_NOTES = [['Imani Brooks', 'Dec 7, 3:40 PM', 'Prefers email over calls. Mornings MT.']] as const;

/** The User screen's identity card: "Yes, Nov 24, 2026", "Password, Google", and the access groups. */
export const IDENTITY = { verified: 'Nov 24, 2026', password: true, google: true, groups: ['library', 'agent', 'team'] } as const;

/** "Account created at checkout": the User screen's Activity, Nov 24, 9:30 AM. */
export const JOINED = 'Nov 24, 9:30 AM';

// ---- D-165: API & Webhooks and Scheduled Jobs, verbatim (`Api()` and `Jobs()` in AdminRedesign.jsx) -------
// The Console fixture (`console-fixture-ops.ts`) turns these into the API's shapes, so the screens'
// view-models print the mockup's words from what the API answers.

/** `ENDPOINTS`: the last 24 hours by endpoint. */
export const ENDPOINTS = [
  { p: 'GET /api/events', req: '41,208', p50: 'stream', p95: 'stream', er: 0.1 },
  { p: 'GET /api/snapshot', req: '18,940', p50: '48 ms', p95: '212 ms', er: 0.2 },
  { p: 'POST /api/mutate', req: '6,312', p50: '61 ms', p95: '240 ms', er: 0.4 },
  { p: 'GET /api/skills', req: '5,926', p50: '35 ms', p95: '118 ms', er: 0.0 },
  { p: 'GET /api/course', req: '3,410', p50: '42 ms', p95: '160 ms', er: 0.1 },
  { p: 'GET /api/sessions/:id/join', req: '286', p50: '90 ms', p95: '410 ms', er: 0.7 },
  { p: 'POST /api/billing/webhook', req: '142', p50: '120 ms', p95: '880 ms', er: 2.1 },
  { p: 'POST /api/crm-sync', req: '96', p50: '310 ms', p95: '1,940 ms', er: 6.3 },
] as const;

/** The API screen's stats: p95 latency and error rate (the mockup's own figures, not computed). */
export const ENDPOINT_STATS = { p95: '212 ms', errorRate: 0.4 } as const;

/** `HOOKS`: every webhook delivery in and out. */
export const HOOKS = [
  { src: 'GoHighLevel', ev: 'order.sync', id: 'ord_2291', st: 'Failed', att: '3 of 5', next: 'Dec 10, 9:30 AM', err: '401 Unauthorized from GHL API' },
  { src: 'GoHighLevel', ev: 'order.sync', id: 'ord_2288', st: 'Failed', att: '3 of 5', next: 'Dec 10, 9:30 AM', err: '401 Unauthorized from GHL API' },
  { src: 'GoHighLevel', ev: 'login.sync', id: 'u_1077', st: 'Retrying', att: '2 of 5', next: 'Dec 10, 9:30 AM', err: '401 Unauthorized from GHL API' },
  { src: 'Stripe', ev: 'invoice.payment_failed', id: 'evt_1QxP7tTw83', st: 'Delivered', att: '1 of 5', next: '—', err: '—' },
  { src: 'Stripe', ev: 'checkout.session.completed', id: 'evt_1QxQ2cCb85', st: 'Delivered', att: '1 of 5', next: '—', err: '—' },
  { src: 'Stripe', ev: 'customer.subscription.updated', id: 'evt_1QxN1hHm79', st: 'Failed', att: '5 of 5', next: 'None, attempts used', err: 'Handler timeout after 10 s' },
  { src: 'Zoom', ev: 'recording.completed', id: '—', st: 'Not configured', att: '—', next: '—', err: 'Recording webhook is not live' },
] as const;

/** `JOBS`: the scheduled jobs. */
export const JOBS = [
  { j: 'session-24h', sch: 'Every 5 min', last: 'Dec 10, 9:20 AM', dur: '0.4 s', st: 'Succeeded', next: '9:25 AM' },
  { j: 'session-1h', sch: 'Every 5 min', last: 'Dec 10, 9:20 AM', dur: '0.3 s', st: 'Succeeded', next: '9:25 AM' },
  { j: 'replay-ready', sch: 'Every 15 min', last: 'Dec 10, 9:15 AM', dur: '0.9 s', st: 'Succeeded', next: '9:30 AM' },
  { j: 'build-48h', sch: 'Hourly', last: 'Dec 10, 9:00 AM', dur: '0.5 s', st: 'Succeeded', next: '10:00 AM' },
  { j: 'weekly-digest', sch: 'Mon 7:00 AM', last: 'Dec 7, 7:00 AM', dur: '48 s', st: 'Succeeded', next: 'Dec 14, 7:00 AM' },
  { j: 'announcement', sch: 'Every 5 min', last: 'Dec 10, 9:20 AM', dur: '0.2 s', st: 'Succeeded', next: '9:25 AM' },
  { j: 'billing', sch: 'Hourly', last: 'Dec 10, 9:00 AM', dur: '2.1 s', st: 'Succeeded', next: '10:00 AM' },
  { j: 'accelerator-reminders', sch: 'Daily 9:00 AM', last: 'Dec 10, 9:00 AM', dur: '1.4 s', st: 'Succeeded', next: 'Dec 11, 9:00 AM' },
  { j: 'ghl-sync', sch: 'Every 10 min', last: 'Dec 10, 9:20 AM', dur: '3.8 s', st: 'Running', next: '9:30 AM' },
  { j: 'ghl-logins', sch: 'Every 10 min', last: 'Dec 10, 9:10 AM', dur: '1.1 s', st: 'Succeeded', next: '9:30 AM' },
  { j: 'ghl-orders', sch: 'Every 10 min', last: 'Dec 10, 9:10 AM', dur: '0.6 s', st: 'Failed', next: '9:30 AM' },
  { j: 'ghl-extras', sch: 'Hourly', last: 'Dec 10, 9:00 AM', dur: '0.8 s', st: 'Waiting', next: '10:00 AM' },
] as const;
// ---- PR 7 (D-166): the Email Log's and Usage's figures, verbatim ----------------------------------------

/**
 * One of `EMAILS`: recipient, template, subject, status, sent; and D-263's delivery from Resend's webhook: when
 * it was delivered (`dl`), its opens (`op`, first `fo`, last `lo`), its clicks (`cl`, first `fc`, last `lc`), the
 * last link clicked (`ln`) and a bounce's type, subtype and message (`br`).
 */
export interface MockEmail {
  to: string;
  tpl: string;
  sub: string;
  st: 'Sent' | 'Delivered' | 'Delayed' | 'Bounced' | 'Complained';
  t: string;
  dl?: string;
  op: number;
  fo?: string;
  lo?: string;
  cl: number;
  fc?: string;
  lc?: string;
  ln?: string;
  br?: string;
}

/** `EMAILS`, verbatim. */
export const EMAILS: readonly MockEmail[] = [
  { to: 'elena@northshoregroup.example', tpl: 'session-24h', sub: 'Tomorrow at 12:00 PM MT / 1:00 PM CT: Session 2 live build', st: 'Delivered', t: 'Dec 8, 12:00 PM', dl: 'Dec 8, 12:00 PM', op: 2, fo: 'Dec 8, 12:41 PM', lo: 'Dec 8, 6:40 PM', cl: 1, fc: 'Dec 8, 12:42 PM', lc: 'Dec 8, 12:42 PM', ln: 'https://learn.example.com/sessions/2' },
  { to: 'sam@tidewaterproperty.example', tpl: 'payment-failed', sub: 'Your Insiders payment did not go through', st: 'Delivered', t: 'Dec 4, 9:04 AM', dl: 'Dec 4, 9:04 AM', op: 1, fo: 'Dec 4, 9:30 AM', lo: 'Dec 4, 9:30 AM', cl: 0 },
  { to: 'devon@copperbasin.example', tpl: 'replay-ready', sub: 'The Session 2 replay is ready', st: 'Delivered', t: 'Dec 9, 3:10 PM', dl: 'Dec 9, 3:10 PM', op: 3, fo: 'Dec 9, 3:12 PM', lo: 'Dec 9, 8:12 PM', cl: 2, fc: 'Dec 9, 3:13 PM', lc: 'Dec 9, 8:13 PM', ln: 'https://learn.example.com/replays/2' },
  { to: 'tessa@lanternstreet.example', tpl: 'magic-link', sub: 'Your sign-in link', st: 'Delivered', t: 'Dec 9, 11:26 AM', dl: 'Dec 9, 11:26 AM', op: 1, fo: 'Dec 9, 11:27 AM', lo: 'Dec 9, 11:27 AM', cl: 1, fc: 'Dec 9, 11:27 AM', lc: 'Dec 9, 11:27 AM', ln: 'https://learn.example.com/sign-in' },
  { to: 'priya@fourthmeridian.example', tpl: 'weekly-digest', sub: 'This week: 2 new AI Employees', st: 'Bounced', t: 'Dec 7, 7:00 AM', op: 0, cl: 0, br: 'Permanent · General · The mailbox does not exist.' },
  { to: 'jordan@halemarlowe.example', tpl: 'receipt', sub: 'Receipt for Team Plan, 16 seats', st: 'Sent', t: 'Dec 10, 9:18 AM', op: 0, cl: 0 },
  { to: 'noor@redcliffcollective.example', tpl: 'announcement', sub: 'New in the vault: listing appointment checklist', st: 'Delivered', t: 'Dec 8, 3:00 PM', dl: 'Dec 8, 3:00 PM', op: 0, cl: 0 },
];

/** The Email Log's Status options (`Sel` in `Email`), after "Any status" (D-263). */
export const EMAIL_STATUS_OPTIONS = ['Sent', 'Delivered', 'Delayed', 'Bounced', 'Complained', 'Failed', 'Skipped'] as const;

/** `Usage`'s chart (`bars`), verbatim: each day's height in percent, Nov 27 to Dec 10. */
export const USAGE_BARS = [62, 71, 68, 80, 77, 31, 28, 74, 85, 88, 92, 81, 36, 30] as const;

/** `Usage`'s figures, per seat in use (`k`): sign-ins, lesson plays, skill-guide views and emails sent. */
export const USAGE_PER_SEAT = { signIns: 16, lessonPlays: 43, guideViews: 74, emails: 29 } as const;

/** The workspace's Usage tab, per seat in use, over 7 days, and its storage in GB per seat. */
export const USAGE_TAB_PER_SEAT = { signIns: 6, lessonPlays: 4, guideViews: 9, storageGb: 0.2 } as const;

/** `Usage`'s Storage tile: "41.2 GB", "of 100 GB bucket". */
export const USAGE_STORAGE = { bytes: 41.2e9, capBytes: 100e9 } as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A mockup stamp ("Dec 10, 8:52 AM", or a day, "Dec 8, 2026", read as 9:00 AM) as epoch ms, in the
 * mockup's zone, MST (UTC−7 all year). The year is 2026 unless the stamp names one.
 */
export function mockStamp(s: string): number {
  const m = /^([A-Z][a-z]{2}) (\d{1,2}), (?:(\d{4})|(\d{1,2}):(\d{2}) (AM|PM))$/.exec(s);
  if (!m) throw new Error(`not a mockup stamp: ${s}`);
  const [, mon, day, year, h, min, ap] = m;
  const hour = year ? 9 : (Number(h) % 12) + (ap === 'PM' ? 12 : 0);
  return Date.UTC(year ? Number(year) : 2026, MONTHS.indexOf(mon!), Number(day), hour + 7, year ? 0 : Number(min));
}

/** A mockup amount ("$1,495.00") as cents. */
/**
 * D-255 (R-5 Phase 3): `P3_WEEKS`, the program's weeks as the Cohort page and New cohort list them: id, week, title,
 * outcome, steps. Week 0 is the setup week; all are published.
 */
export const P3_WEEKS: readonly (readonly [id: string, week: number, title: string, outcome: string, steps: number])[] = [
  ['accelerator-week-0', 0, 'Foundations', 'The office is ready for its first hire.', 8],
  ['accelerator-week-1', 1, 'Where the Money Goes', 'A year of spend on one standard chart.', 7],
  ['accelerator-week-2', 2, 'Leads That Pay', 'Every lead source ranked by what it returns.', 7],
  ['accelerator-week-3', 3, 'Numbers on the 5th', 'A monthly report that builds itself.', 6],
  ['accelerator-week-4', 4, 'Protect the Pipeline', 'No file goes quiet without someone knowing.', 5],
  ['accelerator-week-5', 5, 'Coach from Evidence', 'One-on-ones that start from the numbers.', 4],
  ['accelerator-week-6', 6, 'Delegate an Outcome', 'A hire that owns a result, not a task.', 3],
  ['accelerator-week-7', 7, 'Make the Workflow Repeatable', 'What worked, written down so it runs again.', 2],
  ['accelerator-week-8', 8, 'Sustain and Expand', 'The next three hires, in order.', 2],
];

/** `DEC_WORDS`: December's words, as its course holds them in the mockup. */
export const DEC_WORDS = {
  promise: 'Nine weeks. One hire a week. Built live, on your own numbers.',
  how: [
    'A week opens on Sunday.',
    'We build its hire together on Wednesday.',
    'You run it on your own data and turn in what it made.',
    'Office hours are Thursday.',
  ],
  holiday: 'No sessions the weeks of Dec 21 and Dec 28. Week 4 opens Sun, Jan 3.',
};

/** `JAN_SLOTS`: January's meetings, a Tuesday build and Thursday office hours, both at 12:00 PM MT. */
export const JAN_SLOTS = [
  { day: 2, time: '12:00', kind: 'live_build', mins: 90 },
  { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
] as const;

export const mockCents = (s: string): number => Math.round(Number(s.replace(/[$,]/g, '')) * 100);

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
