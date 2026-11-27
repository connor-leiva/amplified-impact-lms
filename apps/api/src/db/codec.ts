// Snapshot ⇄ rows, phase 07 § 7.3 — the pure half.
//
// `loadDb(tx)` and `persistDiff(tx, before, after)` are two thin wrappers over the three functions
// here, which touch no database and can therefore be tested exhaustively:
//
//   toRows(db)                 a `Db` as the rows that represent it
//   fromRows(rows)             those rows back as a `Db`
//   diffRows(before, after)    the upserts and deletes that turn one set of rows into the other
//
// `fromRows(toRows(db))` must equal `db` for every snapshot core can produce. That round trip is
// the whole guard against the failure § 7.3 exists to prevent: a field that every screen renders
// from the fixture and that silently never survives a write.
//
// Three columns are deliberately NOT produced by `toRows`, which is what keeps a snapshot write
// from clobbering them:
//   - `users.prefs`           the viewer's own timezone and theme. `Db` does not model it at all;
//                             § 7.5 reads and writes it through /api/me and /api/me/prefs.
//   - `resources.storage_key` the object-store key. § 7.4 strips it from every snapshot, so a
//                             snapshot is by definition not where it comes from.
//   - the auth tables         `auth_tokens` and `auth_sessions` are not in `Db` either.
// An upsert must therefore set only the keys a row from `toRows` actually carries. Nothing here
// can enforce that for the caller, so `COLUMNS_OWNED` states it and `codec.test.ts` pins it.
//
// `Db.v`, `Db.phase` and `Db.base` are snapshot metadata, not rows. `fromRows` returns `v: DB_V`
// and `base: ZERO_BASE`, and no `phase` at all — `phase` is the sales demo's time machine, and a
// real cohort moves through its dates on its own. `Dashboard.vm.ts` already reads an absent phase
// as `'live'`, which is the correct answer for production.

import { DB_V, ZERO_BASE } from '@ai/core';
import type {
  AIEmployee,
  ActivityEvent,
  Announcement,
  Cohort,
  ChecklistMark,
  CopyString,
  CoursePref,
  Db,
  VideoProgress,
  Learner,
  PermKey,
  Progress,
  Reminder,
  Resource,
  Session,
  Staff,
  StaffRole,
  Team,
  TierDef,
  UpgradeRequest,
} from '@ai/core';

/** One row, keyed by the Drizzle property names in `schema.ts` — not the database column names. */
export type Row = Record<string, unknown>;

export type TableName =
  | 'users'
  | 'teams'
  | 'cohorts'
  | 'sessions'
  | 'modules'
  | 'progress'
  | 'checklistState'
  | 'learnerPrefs'
  | 'videoProgress'
  | 'resources'
  | 'announcements'
  | 'dismissals'
  | 'reminders'
  | 'tiers'
  | 'requests'
  | 'permissions'
  | 'activity'
  | 'copyStrings';

export type Rows = Record<TableName, Row[]>;

/** The primary key of each table, as `schema.ts` declares it. `diffRows` matches rows by it. */
export const KEYS: Record<TableName, readonly string[]> = {
  users: ['id'],
  teams: ['id'],
  cohorts: ['id'],
  sessions: ['id'],
  modules: ['id'],
  progress: ['userId', 'moduleId'],
  checklistState: ['userId', 'moduleId', 'stepId', 'itemId'],
  learnerPrefs: ['userId', 'key'],
  videoProgress: ['userId', 'moduleId', 'videoId'],
  resources: ['id'],
  announcements: ['id'],
  dismissals: ['userId', 'announcementId'],
  reminders: ['id'],
  tiers: ['id'],
  requests: ['id'],
  permissions: ['role', 'perm'],
  activity: ['id'],
  copyStrings: ['key'],
};

/**
 * What `loadDb` must ORDER BY, per table.
 *
 * Array order reaches the screens: the Curriculum list is in `order`, the session rail is in `n`,
 * and the activity feed is newest first. Postgres returns rows in no particular order, so without
 * this the same database would render differently from one request to the next.
 */
export const ORDER: Record<TableName, readonly { by: string; dir: 'asc' | 'desc' }[]> = {
  // `seq`, not `id`. These are ORDERED arrays whose order reaches a screen, and nothing already in
  // the row reproduces it — measured against id, `joined`, name and the owner's join date, none of
  // which match the fixture. `id` second so a tie is still deterministic: the users table holds
  // learners AND staff, which `fromRows` separates afterwards, so the two kinds can share a `seq`.
  users: [
    { by: 'seq', dir: 'asc' },
    { by: 'id', dir: 'asc' },
  ],
  teams: [{ by: 'seq', dir: 'asc' }],
  cohorts: [{ by: 'start', dir: 'asc' }],
  // `start`, not `n`: `n` is the number WITHIN a cohort, so the live seed's 18 sessions across three
  // cohorts share only six values of it and every one is a three-way tie. Postgres then chooses the
  // interleaving, two identical requests can disagree, and the Gate 7 oracle's `toEqual` fails
  // intermittently. `start` is NOT NULL and distinct for all 18, and ordering by it reproduces the
  // fixture's own order exactly — cohort by cohort, chronologically — because a cohort's sessions
  // all precede the next cohort's.
  sessions: [{ by: 'start', dir: 'asc' }],
  modules: [{ by: 'order', dir: 'asc' }],
  progress: [
    { by: 'userId', dir: 'asc' },
    { by: 'moduleId', dir: 'asc' },
  ],
  checklistState: [
    { by: 'userId', dir: 'asc' },
    { by: 'moduleId', dir: 'asc' },
    { by: 'stepId', dir: 'asc' },
    { by: 'itemId', dir: 'asc' },
  ],
  learnerPrefs: [
    { by: 'userId', dir: 'asc' },
    { by: 'key', dir: 'asc' },
  ],
  videoProgress: [
    { by: 'userId', dir: 'asc' },
    { by: 'moduleId', dir: 'asc' },
    { by: 'videoId', dir: 'asc' },
  ],
  resources: [{ by: 'seq', dir: 'asc' }],
  announcements: [{ by: 'at', dir: 'desc' }],
  dismissals: [
    { by: 'userId', dir: 'asc' },
    { by: 'announcementId', dir: 'asc' },
  ],
  reminders: [{ by: 'id', dir: 'asc' }],
  tiers: [{ by: 'id', dir: 'asc' }],
  requests: [{ by: 'at', dir: 'desc' }],
  permissions: [
    { by: 'role', dir: 'asc' },
    { by: 'perm', dir: 'asc' },
  ],
  activity: [{ by: 't', dir: 'desc' }],
  copyStrings: [{ by: 'key', dir: 'asc' }],
};

/**
 * The columns a snapshot owns, per table. An upsert built from `toRows` must set exactly these and
 * nothing else; any column of the table not listed here holds data a snapshot never carries.
 */
export const COLUMNS_OWNED: Record<TableName, readonly string[]> = {
  users: [
    'id',
    'email',
    'name',
    'kind',
    'tier',
    'role',
    'teamId',
    'cohortId',
    'joined',
    'last',
    'status',
    'reminded',
    'nudged',
    'staffRole',
    'seq',
  ],
  teams: ['id', 'name', 'ownerId', 'seats', 'seq'],
  cohorts: ['id', 'name', 'start', 'end', 'weeks', 'status', 'capacity', 'cadence', 'previewOpensAt', 'timezone', 'defaultOpenTime', 'course', 'welcomeSendsAt', 'run', 'shape', 'programId', 'archivedAt', 'includedUntil', 'wordsCheckedAt', 'overlapOkAt', 'words', 'hosts', 'founding', 'foundingClosesAt', 'lookupKeyFull', 'lookupKeyRollover', 'lookupKeyTwoPay', 'twoPay', 'linkFull', 'linkTwoPay', 'ghlValue'],
  sessions: ['id', 'cohortId', 'n', 'title', 'start', 'mins', 'zoom', 'live', 'attended', 'replay', 'views', 'movedFrom', 'replayUrl', 'kind', 'moduleId', 'replayVisibility', 'slot'],
  modules: [
    'id',
    'name',
    'short',
    'tier',
    'icon',
    'forWho',
    'headline',
    'outcome',
    'outputs',
    'platform',
    'runLabel',
    'build',
    'session',
    'status',
    'opens',
    'order',
    'dur',
    'instructor',
    'transcript',
    'notes',
    'prompt',
    'files',
    'resources',
    'checklist',
    'runDemo',
    'kind',
    'dueAt',
    'tone',
    'course',
  ],
  progress: ['userId', 'moduleId', 'steps', 'builtAt', 'deployedAt', 'runtime', 'issue', 'lastRun'],
  checklistState: ['userId', 'moduleId', 'stepId', 'itemId', 'checked', 'checkedAt', 'auto'],
  learnerPrefs: ['userId', 'key', 'value', 'updatedAt'],
  videoProgress: ['userId', 'moduleId', 'videoId', 'maxPct', 'lastPositionS', 'updatedAt'],
  resources: ['id', 'title', 'desc', 'cat', 'type', 'tier', 'size', 'dl', 'updated', 'exec', 'status', 'seq', 'moduleId', 'kind', 'stepId', 'visibility', 'platform'],
  announcements: [
    'id',
    'sessionId',
    'title',
    'body',
    'severity',
    'action',
    'actionLabel',
    'audience',
    'channels',
    'status',
    'at',
    'opens',
  ],
  dismissals: ['userId', 'announcementId'],
  reminders: ['id', 'label', 'channel', 'on'],
  tiers: ['id', 'name', 'price', 'seats', 'blurb', 'features'],
  requests: ['id', 'userId', 'name', 'email', 'source', 'at', 'status'],
  permissions: ['role', 'perm', 'allowed'],
  activity: ['id', 't', 'who', 'what', 'tone'],
  copyStrings: ['key', 'value', 'audience'],
};

// ---------------------------------------------------------------------------
// Optionality
// ---------------------------------------------------------------------------

/** An absent optional field becomes an explicit null column. */
const col = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

/**
 * A null column becomes an ABSENT key, never a key holding `undefined`.
 *
 * The distinction is real: `Learner.reminded` is `reminded?: number`, and the fixture snapshots
 * carry no such key until something sets one. Writing `reminded: undefined` instead would differ
 * from the fixture under `JSON.stringify`, which is how the repository broadcasts and how the
 * oracle tests compare.
 */
function withOptional<T>(base: T, optional: Record<string, unknown>): T {
  const out = base as Record<string, unknown>;
  for (const [k, v] of Object.entries(optional)) if (v !== null && v !== undefined) out[k] = v;
  return out as T;
}

/** `Db.dismissed` is keyed `"userId:announcementId"`; ids never contain a colon. */
const splitDismissal = (key: string): [string, string] | null => {
  const at = key.indexOf(':');
  return at <= 0 || at === key.length - 1 ? null : [key.slice(0, at), key.slice(at + 1)];
};

// ---------------------------------------------------------------------------
// Db → rows
// ---------------------------------------------------------------------------

const learnerRow = (u: Learner, seq: number): Row => ({
  id: u.id,
  email: u.email,
  name: u.name,
  kind: 'learner',
  tier: u.tier,
  role: u.role,
  teamId: u.teamId,
  cohortId: u.cohortId,
  joined: u.joined,
  last: u.last,
  status: u.status,
  reminded: col(u.reminded),
  nudged: col(u.nudged),
  staffRole: null,
  seq,
});

/** Staff share the `users` table, discriminated by `kind`; every learner-only column is null. */
const staffRow = (s: Staff, seq: number): Row => ({
  id: s.id,
  email: s.email,
  name: s.name,
  kind: 'staff',
  tier: null,
  role: null,
  teamId: null,
  cohortId: null,
  joined: null,
  last: s.last,
  status: null,
  reminded: null,
  nudged: null,
  staffRole: s.role,
  seq,
});

const progressRow = (userId: string, moduleId: string, p: Progress): Row => ({
  userId,
  moduleId,
  steps: p.steps,
  builtAt: p.builtAt,
  deployedAt: p.deployedAt,
  runtime: p.runtime,
  issue: col(p.issue),
  lastRun: col(p.lastRun),
});

/** `enrolled` is derived, never stored: a stored copy could only ever disagree with the seat math. */
const cohortRow = (c: Cohort): Row => ({
  id: c.id,
  name: c.name,
  start: c.start,
  end: c.end,
  weeks: col(c.weeks),
  status: c.status,
  capacity: c.capacity,
  cadence: c.cadence,
  previewOpensAt: col(c.previewOpensAt),
  timezone: col(c.timezone),
  defaultOpenTime: col(c.defaultOpenTime),
  course: col(c.course),
  welcomeSendsAt: col(c.welcomeSendsAt),
  run: col(c.run),
  shape: col(c.shape),
  programId: col(c.programId),
  archivedAt: col(c.archivedAt),
  includedUntil: col(c.includedUntil),
  wordsCheckedAt: col(c.wordsCheckedAt),
  overlapOkAt: col(c.overlapOkAt),
  words: col(c.words),
  hosts: col(c.hosts),
  // R-5 Phase 5 (D-262, migration 0046).
  founding: col(c.founding),
  foundingClosesAt: col(c.foundingClosesAt),
  lookupKeyFull: col(c.lookupKeyFull),
  lookupKeyRollover: col(c.lookupKeyRollover),
  lookupKeyTwoPay: col(c.lookupKeyTwoPay),
  twoPay: col(c.twoPay),
  linkFull: col(c.linkFull),
  linkTwoPay: col(c.linkTwoPay),
  ghlValue: col(c.ghlValue),
});

const sessionRow = (s: Session): Row => ({
  id: s.id,
  cohortId: s.cohortId,
  n: s.n,
  title: s.title,
  start: s.start,
  mins: s.mins,
  zoom: s.zoom,
  live: s.live,
  attended: s.attended,
  replay: s.replay,
  views: s.views,
  movedFrom: col(s.movedFrom),
  replayUrl: col(s.replayUrl),
  kind: col(s.kind),
  moduleId: col(s.moduleId),
  replayVisibility: col(s.replayVisibility),
  slot: col(s.slot),
});

const moduleRow = (m: AIEmployee): Row => ({
  id: m.id,
  name: m.name,
  short: m.short,
  tier: m.tier,
  icon: m.icon,
  forWho: m.forWho,
  headline: m.headline,
  outcome: m.outcome,
  outputs: m.outputs,
  platform: m.platform,
  runLabel: m.runLabel,
  build: m.build,
  session: m.session,
  status: m.status,
  opens: m.opens,
  order: m.order,
  dur: m.dur,
  instructor: m.instructor,
  transcript: m.transcript,
  notes: m.notes,
  prompt: m.prompt,
  files: m.files,
  resources: m.resources,
  checklist: m.checklist,
  runDemo: col(m.runDemo),
  kind: col(m.kind),
  dueAt: col(m.dueAt),
  tone: col(m.tone),
  course: col(m.course),
});

/** `storageKey` is absent on purpose — see the header. */
const resourceRow = (r: Resource, seq: number): Row => ({
  id: r.id,
  title: r.title,
  desc: r.desc,
  cat: r.cat,
  type: r.type,
  tier: r.tier,
  size: r.size,
  dl: r.dl,
  updated: r.updated,
  exec: r.exec,
  status: r.status,
  seq,
  moduleId: col(r.module),
  kind: col(r.kind),
  stepId: col(r.stepId),
  visibility: col(r.visibility),
  platform: col(r.platform),
});

/**
 * `opens_pct` holds whole percent; `Announcement.opens` holds the fraction `fmt.pct` renders.
 * D-017. The conversion lives here, in both directions, and nowhere else.
 */
const announcementRow = (a: Announcement): Row => ({
  id: a.id,
  sessionId: col(a.sessionId),
  title: a.title,
  body: a.body,
  severity: a.severity,
  action: a.action,
  actionLabel: a.actionLabel,
  audience: a.audience,
  channels: a.channels,
  status: a.status,
  at: a.at,
  opens: a.opens === null ? null : Math.round(a.opens * 100),
});

const checklistRow = (userId: string, c: ChecklistMark): Row => ({
  userId,
  moduleId: c.moduleId,
  stepId: c.stepId,
  itemId: c.itemId,
  checked: c.checked,
  checkedAt: col(c.checkedAt),
  auto: c.auto,
});

const prefRow = (userId: string, p: CoursePref): Row => ({
  userId,
  key: p.key,
  value: p.value,
  updatedAt: p.updatedAt,
});

const videoRow = (userId: string, p: VideoProgress): Row => ({
  userId,
  moduleId: p.moduleId,
  videoId: p.videoId,
  maxPct: p.maxPct,
  lastPositionS: p.lastPositionS,
  updatedAt: p.updatedAt,
});

export function toRows(db: Db): Rows {
  const progress: Row[] = [];
  const checklistState: Row[] = [];
  const learnerPrefs: Row[] = [];
  const videoProgress: Row[] = [];
  for (const u of db.users) {
    for (const [moduleId, p] of Object.entries(u.progress)) progress.push(progressRow(u.id, moduleId, p));
    for (const c of u.checks ?? []) checklistState.push(checklistRow(u.id, c));
    for (const p of u.coursePrefs ?? []) learnerPrefs.push(prefRow(u.id, p));
    for (const p of u.videoProgress ?? []) videoProgress.push(videoRow(u.id, p));
  }

  const dismissals: Row[] = [];
  for (const key of Object.keys(db.dismissed ?? {})) {
    const pair = splitDismissal(key);
    if (pair) dismissals.push({ userId: pair[0], announcementId: pair[1] });
  }

  const permissions: Row[] = [];
  for (const [role, byPerm] of Object.entries(db.perms ?? {})) {
    for (const [perm, allowed] of Object.entries(byPerm ?? {})) {
      permissions.push({ role, perm, allowed: allowed === 1 });
    }
  }

  return {
    users: [...db.users.map(learnerRow), ...db.staff.map(staffRow)],
    teams: db.teams.map((t, seq) => ({ id: t.id, name: t.name, ownerId: t.ownerId, seats: t.seats, seq })),
    cohorts: db.cohorts.map(cohortRow),
    sessions: db.sessions.map(sessionRow),
    modules: db.modules.map(moduleRow),
    progress,
    checklistState,
    learnerPrefs,
    videoProgress,
    resources: db.resources.map(resourceRow),
    announcements: db.announcements.map(announcementRow),
    dismissals,
    reminders: db.reminders.map((r) => ({ id: r.id, label: r.label, channel: r.channel, on: r.on })),
    tiers: db.tiers.map((t) => ({
      id: t.id,
      name: t.name,
      price: t.price,
      seats: t.seats,
      blurb: t.blurb,
      features: t.features,
    })),
    requests: db.requests.map((q) => ({
      id: q.id,
      userId: q.userId,
      name: q.name,
      email: q.email,
      source: q.source,
      at: q.at,
      status: q.status,
    })),
    permissions,
    activity: db.activity.map((e) => ({ id: e.id, t: e.t, who: e.who, what: e.what, tone: e.tone })),
    copyStrings: (db.copy ?? []).map((c) => ({ key: c.key, value: c.value, audience: c.audience })),
  };
}

// ---------------------------------------------------------------------------
// rows → Db
// ---------------------------------------------------------------------------

/** Rows arrive from the driver as `unknown`; every read below is one of these three casts. */
const str = (v: unknown): string => v as string;
const num = (v: unknown): number => v as number;

export function fromRows(rows: Rows): Db {
  const progressByUser = new Map<string, Record<string, Progress>>();
  for (const r of rows.progress) {
    const forUser = progressByUser.get(str(r.userId)) ?? {};
    forUser[str(r.moduleId)] = withOptional<Progress>(
      {
        steps: r.steps as string[],
        builtAt: r.builtAt as number | null,
        deployedAt: r.deployedAt as number | null,
        runtime: r.runtime as Progress['runtime'],
      },
      { issue: r.issue, lastRun: r.lastRun },
    );
    progressByUser.set(str(r.userId), forUser);
  }

  const checksByUser = new Map<string, ChecklistMark[]>();
  for (const r of rows.checklistState) {
    const id = str(r.userId);
    const list = checksByUser.get(id) ?? [];
    list.push(
      withOptional<ChecklistMark>(
        {
          moduleId: str(r.moduleId),
          stepId: str(r.stepId),
          itemId: str(r.itemId),
          checked: r.checked as boolean,
          auto: r.auto as boolean,
        },
        { checkedAt: r.checkedAt },
      ),
    );
    checksByUser.set(id, list);
  }
  const prefsByUser = new Map<string, CoursePref[]>();
  for (const r of rows.learnerPrefs) {
    const id = str(r.userId);
    const list = prefsByUser.get(id) ?? [];
    list.push({ key: str(r.key), value: str(r.value), updatedAt: num(r.updatedAt) });
    prefsByUser.set(id, list);
  }
  const videoByUser = new Map<string, VideoProgress[]>();
  for (const r of rows.videoProgress) {
    const id = str(r.userId);
    const list = videoByUser.get(id) ?? [];
    list.push({
      moduleId: str(r.moduleId),
      videoId: str(r.videoId),
      maxPct: num(r.maxPct),
      lastPositionS: num(r.lastPositionS),
      updatedAt: num(r.updatedAt),
    });
    videoByUser.set(id, list);
  }

  const users: Learner[] = rows.users
    .filter((r) => r.kind === 'learner')
    .map((r) =>
      withOptional<Learner>(
        {
          id: str(r.id),
          name: str(r.name),
          email: str(r.email),
          tier: r.tier as Learner['tier'],
          role: r.role as Learner['role'],
          teamId: r.teamId as string | null,
          cohortId: str(r.cohortId),
          joined: num(r.joined),
          last: r.last as number | null,
          status: r.status as Learner['status'],
          progress: progressByUser.get(str(r.id)) ?? {},
        },
        {
          reminded: r.reminded,
          nudged: r.nudged,
          checks: checksByUser.get(str(r.id)),
          coursePrefs: prefsByUser.get(str(r.id)),
          videoProgress: videoByUser.get(str(r.id)),
          // D-202: only a seeded test account carries it, so every other snapshot stays as it was.
          test: r.isTest === true ? true : undefined,
        },
      ),
    );

  const staff: Staff[] = rows.users
    .filter((r) => r.kind === 'staff')
    .map((r) => ({
      id: str(r.id),
      name: str(r.name),
      email: str(r.email),
      role: r.staffRole as StaffRole,
      last: r.last as number | null,
    }));

  // Derived, per § 7.2: the number of learners whose cohort it is. A seeded test account is enrolled
  // for real and is left out of the number (D-202).
  const enrolled = new Map<string, number>();
  for (const u of users) if (!u.test) enrolled.set(u.cohortId, (enrolled.get(u.cohortId) ?? 0) + 1);

  const dismissed: Record<string, 1> = {};
  for (const r of rows.dismissals) dismissed[`${str(r.userId)}:${str(r.announcementId)}`] = 1;

  const perms = {} as Db['perms'];
  for (const r of rows.permissions) {
    const role = r.role as StaffRole;
    const byPerm = (perms[role] ?? {}) as Record<PermKey, 0 | 1>;
    byPerm[r.perm as PermKey] = r.allowed ? 1 : 0;
    perms[role] = byPerm;
  }

  return {
    v: DB_V,
    cohorts: rows.cohorts.map((r) =>
      withOptional<Cohort>(
        {
          id: str(r.id),
          name: str(r.name),
          start: num(r.start),
          end: num(r.end),
          status: r.status as Cohort['status'],
          capacity: num(r.capacity),
          enrolled: enrolled.get(str(r.id)) ?? 0,
          cadence: str(r.cadence),
        },
        {
          weeks: r.weeks,
          previewOpensAt: r.previewOpensAt,
          timezone: r.timezone,
          defaultOpenTime: r.defaultOpenTime,
          course: r.course,
          welcomeSendsAt: r.welcomeSendsAt,
          run: r.run,
          shape: r.shape,
          programId: r.programId,
          archivedAt: r.archivedAt,
          includedUntil: r.includedUntil,
          wordsCheckedAt: r.wordsCheckedAt,
          overlapOkAt: r.overlapOkAt,
          words: r.words,
          hosts: r.hosts,
          founding: r.founding,
          foundingClosesAt: r.foundingClosesAt,
          lookupKeyFull: r.lookupKeyFull,
          lookupKeyRollover: r.lookupKeyRollover,
          lookupKeyTwoPay: r.lookupKeyTwoPay,
          twoPay: r.twoPay,
          linkFull: r.linkFull,
          linkTwoPay: r.linkTwoPay,
          ghlValue: r.ghlValue,
        },
      ),
    ),
    sessions: rows.sessions.map((r) =>
      withOptional<Session>(
        {
          id: str(r.id),
          cohortId: str(r.cohortId),
          n: num(r.n),
          title: str(r.title),
          start: num(r.start),
          mins: num(r.mins),
          zoom: str(r.zoom),
          live: r.live as boolean,
          attended: r.attended as number | null,
          replay: r.replay as Session['replay'],
          views: num(r.views),
        },
        { movedFrom: r.movedFrom, replayUrl: r.replayUrl, kind: r.kind, moduleId: r.moduleId, replayVisibility: r.replayVisibility, slot: r.slot },
      ),
    ),
    modules: rows.modules.map((r) =>
      withOptional<AIEmployee>(
        {
          id: str(r.id),
          name: str(r.name),
          short: str(r.short),
          tier: r.tier as AIEmployee['tier'],
          icon: r.icon as AIEmployee['icon'],
          forWho: str(r.forWho),
          headline: str(r.headline),
          outcome: str(r.outcome),
          outputs: r.outputs as string[],
          platform: str(r.platform),
          runLabel: str(r.runLabel),
          build: num(r.build),
          session: r.session as number | null,
          status: r.status as AIEmployee['status'],
          opens: r.opens as number | null,
          order: num(r.order),
          dur: num(r.dur),
          instructor: str(r.instructor),
          transcript: r.transcript as AIEmployee['transcript'],
          notes: str(r.notes),
          prompt: str(r.prompt),
          files: r.files as AIEmployee['files'],
          resources: r.resources as AIEmployee['resources'],
          checklist: r.checklist as AIEmployee['checklist'],
        },
        { runDemo: r.runDemo, kind: r.kind, dueAt: r.dueAt, tone: r.tone, course: r.course },
      ),
    ),
    users,
    teams: rows.teams.map(
      (r): Team => ({ id: str(r.id), name: str(r.name), ownerId: str(r.ownerId), seats: num(r.seats) }),
    ),
    resources: rows.resources.map((r) =>
      withOptional<Resource>(
        {
          id: str(r.id),
          title: str(r.title),
          desc: str(r.desc),
          cat: str(r.cat),
          type: str(r.type),
          tier: r.tier as Resource['tier'],
          size: str(r.size),
          dl: num(r.dl),
          updated: num(r.updated),
          exec: r.exec as boolean,
          status: r.status as Resource['status'],
        },
        { module: r.moduleId, kind: r.kind, stepId: r.stepId, visibility: r.visibility, platform: r.platform },
      ),
    ),
    announcements: rows.announcements.map((r) =>
      withOptional<Announcement>(
        {
          id: str(r.id),
          title: str(r.title),
          body: str(r.body),
          severity: r.severity as Announcement['severity'],
          action: r.action as Announcement['action'],
          actionLabel: str(r.actionLabel),
          audience: r.audience as Announcement['audience'],
          channels: r.channels as Announcement['channels'],
          status: r.status as Announcement['status'],
          at: num(r.at),
          opens: r.opens === null || r.opens === undefined ? null : num(r.opens) / 100,
        },
        { sessionId: r.sessionId },
      ),
    ),
    dismissed,
    reminders: rows.reminders.map(
      (r): Reminder => ({ id: str(r.id), label: str(r.label), channel: str(r.channel), on: r.on as boolean }),
    ),
    tiers: rows.tiers.map(
      (r): TierDef => ({
        id: r.id as TierDef['id'],
        name: str(r.name),
        price: num(r.price),
        seats: num(r.seats),
        blurb: str(r.blurb),
        features: r.features as string[],
      }),
    ),
    requests: rows.requests.map(
      (r): UpgradeRequest => ({
        id: str(r.id),
        userId: r.userId as string | null,
        name: str(r.name),
        email: str(r.email),
        source: str(r.source),
        at: num(r.at),
        status: r.status as UpgradeRequest['status'],
      }),
    ),
    staff,
    perms,
    base: structuredClone(ZERO_BASE),
    activity: rows.activity.map(
      (r): ActivityEvent => ({
        id: str(r.id),
        t: num(r.t),
        who: str(r.who),
        what: str(r.what),
        tone: r.tone as ActivityEvent['tone'],
      }),
    ),
    // D-173: absent when there are none, so every fixture (which has no copy strings) round-trips.
    ...(rows.copyStrings.length ? { copy: rows.copyStrings.map((r): CopyString => ({ key: str(r.key), value: str(r.value), audience: str(r.audience) })) } : {}),
  };
}

// ---------------------------------------------------------------------------
// The diff
// ---------------------------------------------------------------------------

export interface Change {
  table: TableName;
  op: 'upsert' | 'delete';
  /** The primary key, always. For a delete this is the whole instruction. */
  key: Row;
  /** The full row to write. Present on an upsert only. */
  row?: Row;
}

const keyOf = (table: TableName, row: Row): Row =>
  Object.fromEntries(KEYS[table].map((k) => [k, row[k]])) as Row;

/** Stable regardless of key order, so a re-encoded identical row never reads as a change. */
const identity = (row: Row): string =>
  JSON.stringify(Object.keys(row).sort().map((k) => [k, row[k]]));

/**
 * Only what changed. Order is stable and deletes come last per table, so applying the result is
 * deterministic and a row re-created under the same key is an upsert, not a delete-then-insert.
 */
export function diffRows(before: Rows, after: Rows): Change[] {
  const out: Change[] = [];
  for (const table of Object.keys(KEYS) as TableName[]) {
    const old = new Map<string, Row>();
    for (const row of before[table]) old.set(identity(keyOf(table, row)), row);

    const seen = new Set<string>();
    for (const row of after[table]) {
      const k = identity(keyOf(table, row));
      seen.add(k);
      const was = old.get(k);
      if (!was || identity(was) !== identity(row)) out.push({ table, op: 'upsert', key: keyOf(table, row), row });
    }
    for (const [k, row] of old) {
      if (!seen.has(k)) out.push({ table, op: 'delete', key: keyOf(table, row) });
    }
  }
  return out;
}

/** What `persistDiff` does, minus the transaction: the changes between two snapshots. */
export const diffSnapshot = (before: Db, after: Db): Change[] => diffRows(toRows(before), toRows(after));
