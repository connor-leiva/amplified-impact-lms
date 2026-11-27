// The R2 parity snapshot (D-160 R2-2, BUILD-SPEC § 6.1): the mockup's Build data (`MODS0`, the
// Module Builder's steps and files, the cohort and its sessions) as the app's own snapshot, so the
// Curriculum and Module Builder screens draw the mockup's rows from the same view-models production
// uses. FIXTURE ONLY: `boot.ts` imports this file dynamically behind
// `import.meta.env.VITE_DATA_SOURCE === 'fixture'` and `?parity=r2`, so the http build has none of it
// (`console-build.test.ts`).
//
// Everything not drawn by the R2 screens is the ordinary fixture's (`seed('live')`). R2-3 adds the
// learners, teams, tiers, upgrade requests, staff and activity its screens read (`USERS`, `WS`, `T`,
// `req`, `STAFF`); every Deployed figure is the baseline plus those learners' builds, and the baseline
// is chosen so each prints the mockup's `dep` (66 of 100 is 66%).
//
// ONE SCREEN'S OWN FIGURES (R2-3). The mockup hard-codes each screen's numbers, and the Overview's
// disagree with Curriculum's (its funnel has Week 1 at 33 of 44, 75%; Curriculum has 74%) and with
// themselves (190 deployed, a funnel that adds to 200). So the Overview (`/admin`) gets its own
// baseline: `overviewDb` gives it the funnel's, the chart's and the "+6" aggregates, opens the
// Database AI Employee its funnel lists, and leaves the modelled learners' builds out of it. Every
// figure is still the production view-model's, printed from this snapshot.

import { EDITABLE_ROLES, createCohortFromShape, roleRowCeiling, roleRowOf, seed } from '@ai/core';
import type {
  AIEmployee,
  Announcement,
  AuditRow,
  Db,
  IconName,
  Learner,
  Progress,
  Resource,
  RoleGrant,
  Session,
  SkillFile,
  Staff,
  Step,
  StepKind,
  Team,
  TierDef,
  UpgradeRequest,
} from '@ai/core';
import {
  ANNOUNCEMENTS,
  AUDIT0,
  BUILDER_FILES,
  BUILDER_STEPS,
  DEC_WORDS,
  JAN_SLOTS,
  MODS0,
  OVERVIEW_ACTIVITY,
  OVERVIEW_FUNNEL,
  OVERVIEW_PTS,
  OVERVIEW_RECENT,
  P3_WEEKS,
  P6_COURSE,
  P6_GLOSS,
  P6_KIT_FILES,
  P6_KIT_SKILLS,
  P6_W0_STEPS,
  P6_WEEKS,
  P6_WK_STEPS,
  P6_WORDS,
  PERMS0,
  ROLES,
  STAFF,
  TIER_CARDS,
  UPGRADE_REQUESTS,
  USERS,
  UTAH_LIFE,
  VAULT,
  WS,
} from './parity-r2';

/** An instant written in MST (America/Phoenix, UTC−7 all year). */
const mst = (s: string): number => Date.parse(`${s}-07:00`);

const COHORT = 'dec26';

/** The cohort's six live builds (the mockup's Cohorts `S`), Wednesdays at 12:00 PM MST. */
const SESSIONS: readonly [title: string, day: string, zoom: boolean, attended: number | null][] = [
  ['Lead-Source ROI Live Build', '2026-12-02', true, 121],
  ['Morning Brief Live Build', '2026-12-09', true, 109],
  ['Database Live Build', '2026-12-16', true, null],
  ['Scorecard Live Build', '2026-12-23', true, null],
  ['Contract to Close', '2026-12-30', false, null],
  ['Handoff', '2027-01-06', false, null],
];

const ICON = (ic: string): IconName => `r2${ic[0]!.toUpperCase()}${ic.slice(1)}` as IconName;
const OPENS: Record<string, number> = {
  'Opens Dec 14': mst('2026-12-14T09:00:00'),
  'Opens Dec 21': mst('2026-12-21T09:00:00'),
};

const steps = (n: number): Step[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}`, text: `Step ${i + 1}`, ch: '', mins: 5, t: 0, hint: '' }));
const files = (n: number): SkillFile[] =>
  Array.from({ length: n }, (_, i) => ({
    name: `file-${i + 1}.json`,
    type: 'JSON',
    size: '1 KB',
    desc: '',
    steps: [],
  }));

function moduleOf(m: (typeof MODS0)[number], i: number): AIEmployee {
  const first = m.id === 'm1';
  return {
    id: m.id,
    name: m.n,
    short: m.n.replace(/ AI Employee$/, ''),
    tier: m.tier === 'both' ? 'agent' : 'team',
    icon: ICON(m.ic),
    forWho: '',
    headline: '',
    outcome: m.d,
    outputs: ['', '', ''],
    platform: 'Claude Project',
    runLabel: '',
    build: 0,
    session: m.ses ? Number(/^Session (\d+)/.exec(m.ses[0])![1]) : null,
    status: m.st === 'Published' ? 'published' : m.st === 'Scheduled' ? 'scheduled' : 'draft',
    opens: 'opens' in m ? OPENS[m.opens]! : null,
    order: i + 1,
    dur: 0,
    instructor: '',
    transcript: [],
    notes: '',
    prompt: '',
    files: first
      ? BUILDER_FILES.map(([name, desc, size]) => ({ name, type: 'JSON', size, desc, steps: [] }))
      : files(m.files),
    resources: [],
    checklist: first
      ? BUILDER_STEPS.map(([kind, text, len], j) => ({
          id: `c${j + 1}`,
          text,
          ch: '',
          mins: Number.parseInt(len, 10),
          t: 0,
          hint: '',
          kind: kind as StepKind,
        }))
      : steps(m.steps),
  };
}

const MONTHS: Record<string, string> = { Nov: '11', Dec: '12' };
/** "Dec 9, 3:10 PM" or "Dec 8" (9:00 AM), in 2026, MST. */
function stamp(s: string): number {
  const m = /^(\w{3}) (\d+)(?:, (\d+):(\d+) (AM|PM))?$/.exec(s)!;
  const h = m[3] ? (Number(m[3]) % 12) + (m[5] === 'PM' ? 12 : 0) : 9;
  const pad = (n: number | string) => String(n).padStart(2, '0');
  return mst(`2026-${MONTHS[m[1]!]}-${pad(m[2]!)}T${pad(h)}:${pad(m[4] ?? 0)}:00`);
}

/** The vault (`R`): each row attached to its AI Employee by name. */
const resourceOf = (
  [title, type, attached, tier, size, updated, opens]: (typeof VAULT)[number],
  i: number,
): Resource => ({
  id: `r${i + 1}`,
  title,
  desc: '',
  cat: 'Lead Generation Scripts',
  type,
  tier: tier === 'Team only' ? 'team' : 'agent',
  size,
  dl: opens,
  updated: stamp(updated),
  exec: false,
  status: 'published',
  module: MODS0.find((m) => m.n === attached)!.id,
});

const AUDIENCE: Record<string, Announcement['audience']> = {
  Everyone: 'all',
  'Team Tier': 'team',
  'Agent Tier': 'agent',
};
const CHANNELS: Record<string, Announcement['channels']> = {
  'In-app, email': ['inapp', 'email'],
  Email: ['email'],
  'In-app': ['inapp'],
};

/** Announcements (`rows`), newest first as `sendAnnouncement` keeps them. A draft has no send time. */
const announcementOf = (
  [title, audience, channels, status, at]: (typeof ANNOUNCEMENTS)[number],
  i: number,
): Announcement => ({
  id: `a${i + 1}`,
  title,
  body: '',
  severity: 'info',
  action: null,
  actionLabel: '',
  audience: AUDIENCE[audience]!,
  channels: CHANNELS[channels]!,
  status: status === 'Sent' ? 'sent' : status === 'Scheduled' ? 'scheduled' : 'draft',
  at: at === '—' ? stamp('Dec 10, 9:00 AM') : stamp(at),
  opens: null,
});

/** `STAFF`: the viewer (the fixture's admin persona, `st1`) is the Owner, Connor Leiva. */
const staffOf = (st: (typeof STAFF)[number], i: number): Staff => ({
  id: `st${i + 1}`,
  name: st.n,
  email: st.e,
  role: st.role,
  last: stamp(st.last),
});

/** Builds deployed, first to last, by each learner: the open builds of their tier, in curriculum order. */
const OPEN_TEAM = ['m1', 'm2', 'm3', 'm4', 'm5'] as const;
const OPEN_AGENT = ['m1', 'm4'] as const;

function learnerOf(u: (typeof USERS)[number]): Learner {
  const team = u.tier === 'Team';
  const open: readonly string[] = team ? OPEN_TEAM : OPEN_AGENT;
  const at = mst('2026-12-08T10:00:00');
  const progress: Record<string, Progress> = Object.fromEntries(
    open
      .slice(0, u.pr)
      .map((id) => [
        id,
        {
          steps: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
          builtAt: at,
          deployedAt: at,
          runtime: 'deployed',
        } satisfies Progress,
      ]),
  );
  return {
    id: u.id,
    name: u.n,
    email: u.e,
    tier: team ? 'team' : 'agent',
    role: u.role === 'Team owner' ? 'Team Owner' : 'Agent',
    teamId: u.ws,
    cohortId: COHORT,
    joined: mst('2026-11-20T09:00:00'),
    last: stamp(u.last),
    status: 'active',
    progress,
  };
}

const teamOf = ([id, name, ownerId, seats]: (typeof WS)[number]): Team => ({ id, name, ownerId, seats });

const tierOf = ([id, name, seats, price, blurb, features]: (typeof TIER_CARDS)[number]): TierDef => ({
  id,
  name,
  seats,
  price,
  blurb,
  features: [...features],
});

/** Tiers' requests (`req`): both pending ones new, the approved one converted. */
const requestOf = ([name, ask, , at, st]: (typeof UPGRADE_REQUESTS)[number], i: number): UpgradeRequest => ({
  id: `ur${i + 1}`,
  userId: USERS.find((u) => u.n === name)?.id ?? null,
  name,
  email: `${name.split(' ')[0]!.toLowerCase()}@example.com`,
  source: 'Team tier page',
  at: stamp(at),
  status: st === 'Pending' ? 'new' : 'converted',
  ask,
});

/**
 * The curriculum's baseline: each published AI Employee's `dep` of 100, the modelled learners' builds
 * included (every learner may open m1 and m4; the five on Team Tier m2, m3 and m5 too).
 */
const CURRICULUM_BASE: Db['base']['mod'] = {
  m1: [59, 34, 0],
  m2: [87, 8, 0],
  m3: [71, 24, 0],
  m4: [32, 61, 0],
  m5: [37, 58, 0],
};

/** The Overview's own figures (see above). */
function overviewDb(db: Db): Db {
  const pool = (id: string) =>
    db.users.filter((u) => db.modules.find((m) => m.id === id)!.tier === 'agent' || u.tier === 'team').length;
  for (const u of db.users) u.progress = {};
  const m6 = db.modules.find((m) => m.id === 'm6')!;
  Object.assign(m6, { status: 'published', opens: null });
  db.base = {
    ...db.base,
    mod: {
      ...Object.fromEntries(OVERVIEW_FUNNEL.map(([id, d, p, n]) => [id, [d, p, n - d - p - pool(id)]])),
      // Week 0 is open, and counts toward the builds available, but nobody has started it.
      m2: [0, 0, 44 - pool('m2')],
    },
    daily: [...OVERVIEW_PTS],
    recent: OVERVIEW_RECENT,
  };
  return db;
}

/**
 * The parity snapshot: the ordinary fixture with the mockup's data in place. `path` is the address the
 * tab opened on: the Overview (`/admin`) gets its own figures (see above).
 */
export function parityDb(path = '/admin/curriculum'): Db {
  const db = seed('live');
  const cohort = db.cohorts.find((c) => c.id === COHORT)!;
  Object.assign(cohort, {
    name: 'December 2026',
    start: mst('2026-12-02T12:00:00'),
    end: mst('2027-01-06T13:00:00'),
    weeks: 6,
    // R-5 Phase 5 (D-262): taking sales, as the mockup's December is (its Enrollment card reads Open): `enrolling`.
    status: 'enrolling',
    enrolled: 148,
    cadence: 'Wednesdays, weekly',
    // D-255 (R-5 Phase 3): the mockup's December words (`DEC_WORDS`, read once) and its host, for the Cohort page.
    words: { ...DEC_WORDS, how: [...DEC_WORDS.how] },
    wordsCheckedAt: mst('2026-11-25T09:00:00'),
    hosts: 'Connor Leiva',
    // R-5 Phase 5 (D-262): the two Payment Links it sells through, as its record holds them once its data step has run
    // (sample addresses: the fixture has no Stripe).
    linkFull: 'https://buy.stripe.com/test_dec26_full',
    linkTwoPay: 'https://buy.stripe.com/test_dec26_two',
  });
  db.cohorts = [cohort];
  db.sessions = SESSIONS.map(([title, day, zoom, attended], i): Session => ({
    id: `${COHORT}-s${i + 1}`,
    cohortId: COHORT,
    n: i + 1,
    title,
    start: mst(`${day}T12:00:00`),
    mins: 60,
    zoom: zoom ? `https://zoom.us/j/88412${String(i + 1).padStart(5, '0')}` : '',
    live: false,
    attended,
    replay: attended !== null ? 'ready' : null,
    views: 0,
  }));
  db.modules = MODS0.map(moduleOf);
  db.resources = VAULT.map(resourceOf);
  db.announcements = ANNOUNCEMENTS.map(announcementOf);
  db.users = USERS.map(learnerOf);
  db.teams = WS.map(teamOf);
  db.tiers = TIER_CARDS.map(tierOf);
  db.requests = UPGRADE_REQUESTS.map(requestOf);
  db.staff = STAFF.map(staffOf);
  const now = mst('2026-12-10T09:30:00');
  db.activity = OVERVIEW_ACTIVITY.map(([who, what, mins, tone], i) => ({
    id: `ev${i + 1}`,
    t: now - mins * 60e3,
    who,
    what,
    tone,
  }));
  db.base = {
    ...db.base,
    // 148 enrolled: these 141 and the seven modelled learners, 104 on Agent Tier and 44 Team seats.
    learners: 141,
    agent: 102,
    teamSeats: 39,
    teams: 0,
    mod: { ...CURRICULUM_BASE },
  };
  // R-5 audit (D-267): staff's snapshot names its access groups (People › Utah Life), as the API's does.
  db.groups = [
    {
      id: UTAH_LIFE.id,
      name: UTAH_LIFE.name,
      emailDomain: UTAH_LIFE.emailDomain,
      plan: UTAH_LIFE.plan,
      members: UTAH_LIFE.members.map(([email, last], i) => ({ userId: `u_ul${i + 1}`, name: '', email, last: last ? stamp(last) : null, invited: last === null })),
    },
  ];
  const at = path.replace(/\/+$/, '');
  if (COHORT_PAGE.test(at)) cohortPageDb(db, at);
  // D-269 (R-5 Phase 8): Revenue › Summary names every cohort (a By Product row each), January created as a draft, as the
  // reference's `P3_COH` holds it.
  else if (at === '/admin/revenue') cohortPageDb(db, `/admin/cohort/${JANUARY}`);
  // D-268 (R-5 Phase 7): Utah Life's "What They Can Open" quotes the line a locked skill shows its members, a copy
  // string (Words): the reference's own Words, as Program › Course Settings holds them.
  if (/^\/admin\/people\/groups\//.test(at)) db.copy = P6_WORDS.map(([key, value, audience]) => ({ key, value, audience }));
  if (PROGRAM_PAGE.test(at)) programPageDb(db);
  return at === '/admin' ? overviewDb(db) : db;
}

// ------------------------------------------------------------------------------------------------
// D-255 (R-5 Phase 3): the Cohort page's Overview, Schedule and Settings, and New cohort
// ------------------------------------------------------------------------------------------------

/** The addresses that read the program's weeks: a cohort's Overview, Schedule and Settings, and New cohort. */
const COHORT_PAGE = /^\/admin\/cohort\/(new|[^/]+(\/schedule|\/settings)?)$/;

/** A course week of the mockup's program (`P3_WEEKS`), published, with its steps. */
function courseWeekOf([id, week, title, outcome, n]: (typeof P3_WEEKS)[number], i: number): AIEmployee {
  return {
    id,
    kind: 'week',
    name: title,
    short: title,
    tier: 'team',
    icon: 'r2Program' as IconName,
    forWho: '',
    headline: '',
    outcome,
    outputs: ['', '', ''],
    platform: 'Claude Project',
    runLabel: '',
    build: 0,
    session: null,
    status: 'published',
    opens: null,
    order: MODS0.length + i + 1,
    dur: 0,
    instructor: '',
    transcript: [],
    notes: '',
    prompt: '',
    files: [],
    resources: [],
    checklist: steps(n),
    course: {
      week,
      title,
      question: '',
      why: [],
      owner: '',
      operator: '',
      time: { owner: '', operator: '' },
      skills: [],
      liveBuild: null,
      officeHours: null,
      homework: { byWeekEnd: [], assignment: [], acceptance: [], useEvidence: '' },
      media: [],
      materials: [],
    },
  };
}

/** January, as the mockup has it once created (`P3_COH.jan27`): New cohort's own action, on the mockup's choices. */
const JANUARY = 'jan27';
function januaryOf(db: Db): Db {
  const ids: Record<string, number> = {};
  const out = createCohortFromShape(
    db,
    { kind: 'staff', staffId: 'st1' },
    {
      name: 'January 2027 Cohort',
      start: '2027-01-03',
      sourceCohortId: COHORT,
      picks: P3_WEEKS.filter(([, w]) => w > 0)
        .slice(0, 6)
        .map(([id]) => id),
      shape: { setupWeek: true, slots: JAN_SLOTS.map((x) => ({ ...x })), hosts: 'Connor Leiva and Spring' },
    },
    {
      now: mst('2026-12-10T09:30:00'),
      id: (prefix) => (prefix === 'c' ? JANUARY : `${JANUARY}-${prefix}${(ids[prefix] = (ids[prefix] ?? 0) + 1)}`),
    },
  );
  return out.db;
}

/**
 * The mockup's program weeks, and December as the mockup draws it: six Wednesday builds and no course weeks of its own
 * (`DEC_SES`), so a run with none. On January's addresses, January too.
 */
function cohortPageDb(db: Db, at: string): void {
  db.modules = [...db.modules, ...P3_WEEKS.map(courseWeekOf)];
  db.cohorts[0]!.run = [];
  if (at.startsWith(`/admin/cohort/${JANUARY}`)) {
    const next = januaryOf(db);
    db.cohorts = next.cohorts;
    db.sessions = next.sessions;
  }
}

/**
 * The Roles & Permissions matrix's stored changes for `?parity=r2` (D-160 R2-3b): `PERMS0` within the
 * ceiling. A box `PERMS0` leaves off that the ceiling allows is a removal; a box past the ceiling
 * stores nothing, since the ceiling decides it anyway; the `build` row is the `PermKey` matrix's
 * (`db.perms`). On the mockup's own data that is no change at all: `PERMS0` is the ceiling but for
 * Support's export, which the ceiling refuses.
 */
export function parityRoleGrants(): RoleGrant[] {
  const out: RoleGrant[] = [];
  for (const [key, , cells] of PERMS0) {
    const row = roleRowOf(key);
    if (!row.caps?.length) continue;
    for (const role of EDITABLE_ROLES) {
      const on = cells[ROLES.indexOf(role)] === 1;
      if (!on && roleRowCeiling(row, role)) out.push({ role, capability: key, allowed: false });
    }
  }
  return out;
}

const AUDIT_TARGET: Record<string, string> = {
  job: 'job',
  masquerade: 'user',
  audit: 'audit_log',
  module: 'module',
  permission: 'role',
  tier: 'module',
  email_log: 'email_log',
  billing: 'invoice',
};

/**
 * The Audit Log's rows (`AUDIT0`, R2-3b), as the console fixture serves them for `?parity=r2`. Each
 * detail is the row's reason, but the export's, which the screen words from what was exported (its
 * rows and its seven days), as it does for every export.
 */
export function parityAuditRows(): AuditRow[] {
  return AUDIT0.map(([at, actor, action, target, detail], i): AuditRow => {
    const t = stamp(at);
    const st = STAFF.findIndex((s) => s.n === actor);
    const group = action.split('.')[0]!;
    const exp = action === 'audit.export';
    return {
      id: String(2000 - i),
      at: t,
      actor: { userId: `st${st + 1}`, name: actor, role: STAFF[st]!.role, source: 'staff' },
      masqueradeSessionId: group === 'masquerade' ? 'msq_0412' : null,
      action: action as AuditRow['action'],
      target: { type: AUDIT_TARGET[group] ?? null, id: null, label: target },
      reason: exp ? null : detail,
      before: null,
      after: exp ? { rows: 212, format: 'csv', filters: { from: t - 7 * 864e5 } } : null,
      outcome: action === 'masquerade.blocked_action' ? 'blocked' : 'ok',
      ip: '203.0.113.24',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      requestId: `req-${(9000 - i * 37).toString(36)}`,
    };
  });
}

// ------------------------------------------------------------------------------------------------
// D-265 (R-5 Phase 6): Program's pages
// ------------------------------------------------------------------------------------------------

/** December's weeks on the Program pages: each opens at 12:00 PM MT on its day. */
const P6_DEC_OPENS = [
  '2026-11-29',
  '2026-11-29',
  '2026-12-06',
  '2026-12-13',
  '2027-01-03',
  '2027-01-10',
  '2027-01-17',
  '2027-01-24',
  '2027-01-31',
];

/** December's sessions on the Program pages: a Wednesday build and Thursday office hours for Weeks 1 to 4. */
const P6_DEC_SES: readonly (readonly [title: string, week: number, day: string])[] = [
  ['Map Your Spend', 1, '2026-12-02'],
  ['Lead Source Review', 2, '2026-12-09'],
  ['Numbers on the 5th', 3, '2026-12-16'],
  ['Protect the Pipeline', 4, '2027-01-06'],
];

/** Program's addresses: Curriculum, Course Settings, the Resource Vault and a week. */
const PROGRAM_PAGE = /^\/admin\/program(\/|$)/;

/** A week's steps as the mockup lists them, with the minutes its time adds up from. */
function weekSteps(week: number, mins: readonly number[]): Step[] {
  const words = week === 0 ? P6_W0_STEPS : P6_WK_STEPS;
  return mins.map((m, i) => {
    const [title, who, time, done] = words[i % words.length]!;
    return { id: `c${i + 1}`, text: title, ch: title, mins: m, t: 0, hint: '', who, timeLabel: time, doneWhen: done };
  });
}

/**
 * The program as its pages draw it (the R2 reference's `P6_LIB`): the nine course weeks with the mockup's statuses, steps,
 * time and kit, and December running all nine on the mockup's dates with its first four weeks' sessions. The AI Employees
 * stay, published, for the Vault's "Attached to"; Curriculum lists the course weeks (D-265). The program's shared words
 * and its copy strings are `CourseSet`'s.
 */
function programPageDb(db: Db): void {
  const weeks = P3_WEEKS.map((w, i): AIEmployee => {
    const [status, mins, nFiles] = P6_WEEKS[i]!;
    const base = courseWeekOf(w, i);
    const week = w[1];
    return {
      ...base,
      status,
      // What a published week's save checks (`saveModule`): three outputs and a system prompt (sample words).
      outputs: ['The report', 'The rubric, filled in', 'The next step'],
      prompt: '# Role\nYou run this week’s hire for the team, on its own numbers.',
      checklist: weekSteps(week, mins),
      files: P6_KIT_FILES.slice(0, nFiles).map((name) => ({
        name,
        type: 'JSON' as const,
        size: '1 KB',
        desc: '',
        steps: [],
      })),
      course: {
        ...base.course!,
        skills:
          week <= 5
            ? P6_KIT_SKILLS.map((title) => ({
                title,
                route: title.toLowerCase().replace(/\s+/g, '-'),
                role: 'flagship' as const,
              }))
            : [],
      },
    };
  });
  db.modules = [...db.modules.map((m) => ({ ...m, status: 'published' as const, opens: null })), ...weeks];
  const dec = db.cohorts[0]!;
  dec.run = P3_WEEKS.map(([moduleId, n], i) => ({
    moduleId,
    n,
    opensAt: mst(`${P6_DEC_OPENS[i]}T12:00:00`),
    dueAt: null,
  }));
  db.sessions = P6_DEC_SES.flatMap(([title, week, day], i): Session[] =>
    (['live_build', 'office_hours'] as const).map((kind, j) => ({
      id: `${COHORT}-p${i * 2 + j + 1}`,
      cohortId: COHORT,
      n: i * 2 + j + 1,
      title: `${title} ${kind === 'live_build' ? 'Live Build' : 'Office Hours'}`,
      start: mst(`${day}T12:00:00`) + j * 864e5,
      mins: kind === 'live_build' ? 90 : 60,
      zoom: i === 0 ? `https://zoom.us/j/88413${String(i * 2 + j + 1).padStart(5, '0')}` : '',
      live: false,
      attended: null,
      replay: null,
      views: 0,
      kind,
      moduleId: P3_WEEKS[week]![0],
    })),
  );
  const intro = P6_COURSE;
  db.programs = [
    {
      id: 'accelerator',
      name: intro.title,
      course: {
        intro: {
          title: intro.title,
          sub: DEC_WORDS.promise,
          how: [...DEC_WORDS.how],
          roles: { owner: intro.owner, operator: intro.operator },
          scope: intro.scope,
          support: intro.support,
          instructor: intro.instructor,
          holiday: DEC_WORDS.holiday,
          join: { label: intro.joinLabel, note: intro.joinNote, path: '/join' },
        },
        shared: {
          liveBuildMins: 90,
          officeHoursMins: 60,
          officeHoursRules: [...intro.officeHoursRules],
          issueForm: [],
          evidence: intro.evidence.map((label) => ({ label, hint: '' })),
          rubric: [],
          rubricScale: [],
          rubricRules: [],
          readiness: [],
          paths: [],
          missedAWeek: intro.missedAWeek,
          estimateNote: '',
        },
        before: {
          intake: [...intro.intake],
          orientation: { minutes: 30, topics: [], media: '' },
          dataPack: [],
          practiceSetNote: intro.practiceSetNote,
          safeSharing: [...intro.safeSharing],
          lanes: [],
        },
        after: {
          graduation: [...intro.graduation],
          graduationNote: intro.graduationNote,
          paths: intro.paths.map((label) => ({ label, text: '' })),
          noPaywall: intro.noPaywall,
          pilotQuestions: [],
        },
        glossary: P6_GLOSS.map(([term, short, aliases, first], i) => ({
          id: `g${i + 1}`,
          term,
          short,
          long: '',
          aliases: aliases ? aliases.split(', ') : [],
          firstStep: Number(/Step (\d+)/.exec(first)![1]),
        })),
      },
    },
  ];
  db.copy = P6_WORDS.map(([key, value, audience]) => ({ key, value, audience }));
}
