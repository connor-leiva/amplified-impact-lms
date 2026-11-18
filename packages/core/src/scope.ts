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
import { can } from './can';
import { moduleForSession } from './sessions';
import { canAccess, visibleModules } from './status';
import { ZERO_BASE } from './types';
import type { Actor } from './mutations';
import type { AIEmployee, Announcement, Cohort, Db, Learner, Resource, Session } from './types';

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

/** Phase 08 reveals the join URL through a route that checks the join window. */
// D-172: a replay link is staff's record of where a recording is; nothing learner-facing reads it, so it
// stays out of a learner's snapshot (with the join URL).
const redactSession = ({ replayUrl: _replay, ...s }: Session): Session => ({ ...s, zoom: '' });

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
const redactTeammate = (u: Learner, showEmail: boolean): Learner => ({
  ...u,
  email: showEmail ? u.email : '',
  // Build state yes, run output no. Team Hub reads `steps`, `builtAt`, `deployedAt` and `runtime`
  // through buildOf/statusOf/runtimeOf; nothing on that screen shows `lastRun`, which is the text an
  // AI Employee produced from this person's own data. It stays with them.
  progress: Object.fromEntries(
    Object.entries(u.progress).map(([id, p]) => {
      const { lastRun: _lastRun, ...rest } = p;
      return [id, rest];
    }),
  ),
});

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

  // Their own cohort's sessions only, with the join URL withheld.
  let sessions = db.sessions.filter((s) => s.cohortId === me.cohortId).map(redactSession);
  // Published and scheduled modules; a draft never appears. Blanked where `canAccess` is false.
  let modules = visibleModules(db)
    .map((m) => (canAccess(me, m) ? m : redactModule(m)))
    .map(moduleForLearner);
  // The AI Accelerator, only for a plan that opens it (D-110). Dropped, not redacted: a redacted
  // module keeps its notes and checklist, which here are the course itself.
  if (access && !access.accelerator) ({ modules, sessions } = withoutAccelerator(db, modules, sessions));

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
    resources: db.resources.filter((r) => r.status === 'published').map(redactResource),
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
