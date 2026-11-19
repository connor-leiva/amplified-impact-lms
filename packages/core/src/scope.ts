// Snapshot scoping — docs/phases/07-backend.md §7.4.
//
// `GET /api/snapshot` returns exactly what `scopeSnapshot` produces, so anything this function
// fails to strip is leaked to that viewer. It lives in core, as a pure total function, so the
// security boundary can be unit-tested without a server, a database or a session cookie.
//
// Three invariants the tests pin:
//   1. The input `db` is never mutated. Every call starts from a `structuredClone`, so the
//      returned snapshot shares no object with the caller's db either.
//   2. Blanking yields an empty value of the DECLARED type — `''` for a string, `[]` for an
//      array, `{}` for a record, an absent key for an optional — never `null` where the type
//      says string, so the web app's existing screens keep rendering.
//   3. Nothing reads the clock or a random source, so two calls on the same db are deep-equal.

import { isAcceleratorModule } from './accelerator';
import { canOpenModule, kitVisible } from './release';
import { can } from './can';
import { moduleForSession } from './sessions';
import { isOpen, visibleModules } from './status';
import { ZERO_BASE } from './types';
import type { Actor } from './mutations';
import type { AIEmployee, Announcement, Cohort, Db, Learner, ReplayVisibility, Resource, Session } from './types';

/** A storage key is a backend column (§7.2 `resources.storage_key`), never part of a snapshot. */
type StoredResource = Resource & { storageKey?: unknown };

/** A fresh baseline every call: the exported ZERO_BASE constant is never handed out by reference. */
const zeroBase = (): Db['base'] => structuredClone(ZERO_BASE);

/** `perms: {}` per §7.4. The learner UI never reads it; `can()` already optional-chains. */
const noPerms = (): Db['perms'] => ({}) as Db['perms'];

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

/** A module the viewer cannot access keeps its marketing copy and loses everything buildable. */
const redactModule = (m: AIEmployee): AIEmployee => {
  const { runDemo: _runDemo, ...rest } = m;
  return { ...rest, prompt: '', files: [], transcript: [] };
};

/**
 * D-187: what an unset replay visibility means. The Week Builder shows a new session's "Replay" as "Not
 * set", with no default named, so an unset session behaves as it always has: no replay in a week the
 * learner can't open yet, and the replay once the week is open (After the week opens). Staff choose
 * Published to show a replay before its week opens.
 */
export const DEFAULT_REPLAY_VISIBILITY: ReplayVisibility = 'after_open';

/** D-187: where a session's week stands for one learner. */
export interface ReplayWeek {
  /** Their plan and their tier open the week's module at all (a locked-by-date week still counts). */
  access: boolean;
  /** The week is open for them now (not locked by its date). */
  open: boolean;
}

/**
 * D-183, D-187: whether a session's replay is published to this learner. The replay is `ready` (Attach
 * replay and Publish Replay both set it), the week is in their plan or course access, and the session's
 * replay visibility (D-173, the Week Builder's "Replay") allows it:
 *   - `hidden`: never, to any learner;
 *   - `after_open`: once the session's week is open for them;
 *   - `published`: as soon as the replay is ready, even while its week is still locked by its date;
 *   - not set: `DEFAULT_REPLAY_VISIBILITY` (After the week opens).
 * Never outside the learner's plan, course or tier: `access` false is always no.
 */
export function replayVisibleTo(s: Pick<Session, 'replay' | 'replayVisibility'>, w: ReplayWeek): boolean {
  if (s.replay !== 'ready' || !w.access) return false;
  const v = s.replayVisibility ?? DEFAULT_REPLAY_VISIBILITY;
  if (v === 'hidden') return false;
  if (v === 'published') return true;
  return w.open;
}

/**
 * D-183: the recording staff attached to a session (D-172's Attach replay), when it is published to this
 * learner (`replayVisibleTo`), else null.
 */
export function learnerReplayUrl(s: Pick<Session, 'replay' | 'replayUrl' | 'replayVisibility'>, w: ReplayWeek): string | null {
  if (!s.replayUrl) return null;
  return replayVisibleTo(s, w) ? s.replayUrl : null;
}

/**
 * Phase 08 reveals the join URL through a route that checks the join window. D-172's replay link is staff's
 * record of where a recording is; it stays out of a learner's snapshot (with the join URL) unless D-183's
 * rule above says that learner may watch it.
 */
const redactSession = (session: Session, w: ReplayWeek = { access: false, open: false }): Session => {
  const { replayUrl: _replay, ...s } = session;
  const url = learnerReplayUrl(session, w);
  return { ...s, zoom: '', ...(url ? { replayUrl: url } : {}) };
};

/**
 * D-173: the course's words (a cohort's `course`, a week module's `course`) reach a learner only
 * through `GET /api/course`, which applies the course gate (D-110, D-143, D-153). A learner's
 * snapshot never carries them, so moving the words from code into the database opens no second door:
 * a buyer before the first live build, a Utah Life member or any other plan reads none of them here,
 * and a buyer reads them where they always have. Staff (the curriculum builder) see every word.
 */
const cohortForLearner = ({ course: _course, ...c }: Cohort): Cohort => c;
const moduleForLearner = ({ course: _course, ...m }: AIEmployee): AIEmployee => m;

const redactResource = (r: Resource): Resource => {
  const copy: StoredResource = { ...r };
  delete copy.storageKey;
  return copy;
};

/**
 * Another member of the viewer's own team.
 *
 * Their build progress IS included. Team Hub (SCREENS § 3.4) exists to show it — "AI Employees
 * Built", "Deployment Status", "Team Deployments" and the "who hasn't finished earlier builds" card
 * are all derived from teammates' progress, and Gate 7 requires those parity scenarios to pass in
 * http mode against the same goldens. Sharing build progress inside a team is the product, not a
 * leak: the boundary § 7.4 draws is that learners from OTHER teams never appear at all.
 *
 * Email is the one field role-gated within the team, per § 7.4.
 */
const redactTeammate = (u: Learner, showEmail: boolean): Learner => {
  // D-190: checklist boxes and accordion memory are the viewer's own. D-191: so is how far they
  // watched a video. Teammates keep build progress (Team Hub) and lose these. The keys stay absent,
  // as they are on every learner who has none.
  const { checks: _checks, coursePrefs: _prefs, videoProgress: _video, ...rest } = u;
  return {
    ...rest,
    email: showEmail ? u.email : '',
  // Build state yes, run output no. Team Hub reads `steps`, `builtAt`, `deployedAt` and `runtime`
  // through buildOf/statusOf/runtimeOf; nothing on that screen shows `lastRun`, which is the text an
  // AI Employee produced from this person's own data. It stays with them.
  progress: Object.fromEntries(
    Object.entries(u.progress).map(([id, p]) => {
      const { lastRun: _lastRun, ...kept } = p;
      return [id, kept];
    }),
  ),
  };
};

/** Only a Team Owner or an Operations Lead sees the rest of the roster's email addresses. */
const seesTeamEmails = (me: Learner): boolean => me.role === 'Team Owner' || me.role === 'Operations Lead';

const forAudience = (a: Announcement, me: Learner): boolean =>
  a.status === 'sent' &&
  (a.audience === 'all' || a.audience === me.tier || (a.audience === 'owners' && me.role === 'Team Owner'));

// ---------------------------------------------------------------------------
// The three viewers
// ---------------------------------------------------------------------------

/**
 * An actor with no record behind it. Not reachable through a real session, but `scopeSnapshot`
 * is total, and the safe total answer for an unidentified viewer is "nothing".
 */
const denyAll = (db: Db): Db => ({
  v: db.v,
  phase: db.phase,
  cohorts: [],
  sessions: [],
  modules: [],
  users: [],
  teams: [],
  resources: [],
  announcements: [],
  dismissed: {},
  reminders: [],
  tiers: [],
  requests: [],
  staff: [],
  perms: noPerms(),
  base: zeroBase(),
  activity: [],
});

/**
 * What the snapshot route knows about a learner that the `Db` does not: their account's plans.
 *
 * `accelerator` is `acceleratorOpen(plans, now)` (D-110). The course's nine AI Employees and the
 * sessions that belong to them are the AI Accelerator's, and every paid buyer sits in cohort `dec26`,
 * so cohort membership cannot be the gate: the plan is. Absent, nothing is filtered, which is how
 * every caller behaved before the course existed and how the demo (which has no course) still runs.
 */
export interface ViewerAccess {
  accelerator: boolean;
  /**
   * D-175: the moment the route answers for. With it, a learner who may enter the course (accelerator)
   * sees each week open or locked by its own opening (the builder's Status and Opens); without it, every
   * week the learner may see is open, as before.
   */
  at?: number;
  /** D-175: the entry is the pre-launch preview (a kit item marked open in the preview shows). */
  preview?: boolean;
  /**
   * D-201: a test account with early access. Course weeks are open before their dates. The
   * database row stays scheduled; only this viewer's snapshot is open.
   */
  early?: boolean;
}

/**
 * D-175: a week a learner can't open yet, as their snapshot carries it: what the outline and its card
 * show (name, icon, outcome, its place), Scheduled at its opening, and none of its content: no steps but
 * those marked open in the preview (without their hints), no prompt, notes, transcript, files, outputs
 * or demo. Every blanked field keeps its declared type (invariant 2).
 */
const lockedWeekModule = (m: AIEmployee): AIEmployee => {
  const { runDemo: _runDemo, ...rest } = m;
  return {
    ...rest,
    status: 'scheduled',
    headline: '',
    forWho: '',
    outputs: [],
    platform: '',
    runLabel: '',
    dur: 0,
    instructor: '',
    transcript: [],
    notes: '',
    prompt: '',
    files: [],
    resources: [],
    checklist: m.checklist.filter((st) => st.openInPreview).map((st) => ({ ...st, hint: '' })),
  };
};

/**
 * D-175: the course for a learner who may enter it, at `at`: each course week open (whole) or locked
 * (a stub), the sessions of a locked week without a replay, and the vault items attached to a week only
 * as their visibility allows. D-187: a locked week's session keeps its replay when staff published it
 * (`replayVisibleTo` with the week not open: Published only); `inPlan` says whether the learner's tier
 * opens the session's week at all.
 */
function withReleases(db: Db, modules: AIEmployee[], sessions: Session[], resources: Resource[], at: number, preview: boolean, inPlan: (s: Session) => boolean) {
  const locked = new Set(db.modules.filter((m) => isAcceleratorModule(m.id) && !isOpen(m, at)).map((m) => m.id));
  return {
    modules: modules.map((m) => (locked.has(m.id) ? lockedWeekModule(m) : m)),
    sessions: sessions.map((s) => {
      const m = moduleForSession(db, s);
      if (!(m && locked.has(m.id))) return s;
      if (replayVisibleTo(s, { access: inPlan(s), open: false })) return s;
      // A locked week's session: no replay, and so (D-183) never its link.
      const { replayUrl: _url, ...rest } = s;
      return { ...rest, replay: null, views: 0 };
    }),
    resources: resources.filter((r) => kitVisible(r, !!r.module && !locked.has(r.module), preview)),
  };
}

/** Drop the course for a learner whose plan does not open it: its modules and the sessions behind them. */
function withoutAccelerator(db: Db, modules: AIEmployee[], sessions: Session[]): { modules: AIEmployee[]; sessions: Session[] } {
  return {
    modules: modules.filter((m) => !isAcceleratorModule(m.id)),
    sessions: sessions.filter((s) => {
      const m = moduleForSession(db, s);
      return !m || !isAcceleratorModule(m.id);
    }),
  };
}

/** `db` is already this call's private clone, so these reads and spreads cannot reach the caller. */
function scopeForLearner(db: Db, userId: string, access?: ViewerAccess): Db {
  const me = db.users.find((u) => u.id === userId);
  if (!me) return denyAll(db);

  const teamId = me.teamId;
  const showEmail = seesTeamEmails(me);
  const mine = `${me.id}:`;

  // Their own cohort's sessions only, with the join URL withheld, and a replay's link only when it is
  // published to them (D-183, D-187): its week module (if any) is in their tier and their plan, and is
  // open now, unless staff published the replay ahead of the week.
  const inPlan = (s: Session): boolean => {
    const m = moduleForSession(db, s);
    if (!m) return true;
    // The tier decides, except for a course week, which follows course access (D-186, `canOpenModule`,
    // which also shuts a course week to a plan without the course).
    return canOpenModule(me, m, access?.accelerator);
  };
  const replayWeek = (s: Session): ReplayWeek => {
    const m = moduleForSession(db, s);
    const open = !m || access?.early === true || access?.at === undefined || !isAcceleratorModule(m.id) || isOpen(m, access.at);
    return { access: inPlan(s), open };
  };
  let sessions = db.sessions.filter((s) => s.cohortId === me.cohortId).map((s) => redactSession(s, replayWeek(s)));
  // Published and scheduled modules; a draft never appears. Blanked where the learner may not open it:
  // the tier decides, except for a course week, which follows course access (D-186, `canOpenModule`).
  let modules = visibleModules(db)
    .map((m) => (canOpenModule(me, m, access?.accelerator) ? m : redactModule(m)))
    .map(moduleForLearner);
  let resources = db.resources.filter((r) => r.status === 'published').map(redactResource);
  // The AI Accelerator, only for a plan that opens it (D-110). Dropped, not redacted: a redacted
  // module keeps its notes and checklist, which here are the course itself. A vault item attached to
  // one of its weeks goes with it unless it is published to everyone (D-175).
  if (access && !access.accelerator) {
    ({ modules, sessions } = withoutAccelerator(db, modules, sessions));
    resources = resources.filter((r) => kitVisible(r, false, false));
  } else if (access?.early) {
    // D-201: the dates stay on the row. This viewer's copy of a scheduled week reads as open,
    // which is what the screens ask (`isOpen`) before they draw Mark step done.
    modules = modules.map((m) => (isAcceleratorModule(m.id) && m.status === 'scheduled' ? { ...m, status: 'published' } : m));
  } else if (access && access.at !== undefined) {
    // D-175: in the course, each week opens on its own date (the builder's Status and Opens).
    ({ modules, sessions, resources } = withReleases(db, modules, sessions, resources, access.at, !!access.preview, inPlan));
  }

  return {
    v: db.v,
    phase: db.phase,
    cohorts: db.cohorts.map(cohortForLearner),
    sessions,
    modules,
    // Themselves, plus their team's roster. An Agent-tier learner with no team sees only themselves.
    users: db.users
      .filter((u) => u.id === me.id || (teamId !== null && u.teamId === teamId))
      .map((u) => (u.id === me.id ? u : redactTeammate(u, showEmail))),
    teams: db.teams.filter((t) => teamId !== null && t.id === teamId),
    resources,
    announcements: db.announcements.filter((a) => forAudience(a, me)),
    dismissed: Object.fromEntries(Object.entries(db.dismissed ?? {}).filter(([k]) => k.startsWith(mine))),
    reminders: db.reminders,
    tiers: db.tiers,
    requests: db.requests.filter((q) => q.userId === me.id),
    staff: [],
    perms: noPerms(),
    base: zeroBase(),
    activity: [],
  };
}

function scopeForStaff(db: Db, staffId: string): Db {
  if (!db.staff.some((s) => s.id === staffId)) return denyAll(db);
  // Everything except the auth tables, which `Db` does not model in the first place.
  const out: Db = { ...db, base: zeroBase() };
  // No `viewLearners` means no learner rows at all, and therefore no learner progress.
  if (!can(db, { kind: 'staff', staffId }, 'viewLearners')) out.users = [];
  return out;
}

// ---------------------------------------------------------------------------

/**
 * The security boundary for `GET /api/snapshot`: the subset of `db` this actor may see.
 *
 * Pure and total. The input is never mutated and the result shares no object with it.
 * `base` is always `ZERO_BASE`: the demo aggregates are fixture-only.
 */
export function scopeSnapshot(db: Db, actor: Actor, access?: ViewerAccess): Db {
  const copy = structuredClone(db);
  return actor.kind === 'staff' ? scopeForStaff(copy, actor.staffId) : scopeForLearner(copy, actor.userId, access);
}
