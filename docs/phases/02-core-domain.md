# Phase 02: Core Domain (`packages/core`)

**Goal.** One TypeScript package holds every rule the prototype encodes:
- types and the seed data
- the status model and time-zone formatting
- the session-card and employee-card view-models
- calendar and CSV output
- **every mutation**

The web app and the API both import it, so the portal, the admin console and the backend cannot disagree.

**Ships when:** `pnpm gate 2` is green. The differential tests prove the port behaves exactly like `design-reference/lms-data.js`, and the mutation tests pass.

---

## 2.1 Port, don't reinvent

`design-reference/lms-data.js` is plain ES-module JavaScript with 64 exports. Port it **function by function, keeping names and signatures**, into:

```
packages/core/src/
  index.ts        re-exports everything below
  types.ts        domain types (§2.2)
  constants.ts    DB_V, DEMO_NOW, PHASES, phaseNow, STEPS, CATEGORIES, EXEC_CATEGORIES, TYPES, STAFF_ROLES, PERMS, MODULE_ICONS
  icons.ts        (from phase 01)
  time.ts         setViewerZone, autoZone, viewerZone, ZONES, zoneAbbr, zoneLabel, fmt
  status.ts       TONES, STATUS, avatarColor, progressOf, buildOf, runtimeOf, statusOf, canAccess, isOpen,
                  sortedModules, visibleModules, nextIncluded
  sessions.ts     sessionFor, moduleForSession, sessionEnd, sessionState, accessibleSessions, nextSession,
                  joinMode, cohortWeek, cohortLine, VARIANTS, cardSession, variantNow, sessionVM, sessionEvent
  cards.ts        cardVM
  files.ts        skillPreview, ics, csv
  tiers.ts        upgradeUser, downgradeUser
  seed.ts         baseSeed (private), seed(phase), blankModule, ZERO_BASE
  mutations.ts    every state change (§2.5); NOT in lms-data.js, ported from the screens
  can.ts          permission checks (§2.6)
```

Rules:
- Pure functions only. No `window`, `document` or `localStorage` in `packages/core`. The prototype's `loadPrefs`, `applyPrefs`, `savePrefs`, `loadDb`, `saveDb` and `standalone` belong in `apps/web`, not here.
- Time is always passed in as an epoch-ms `now` argument. Nothing in core calls `Date.now()` except `blankModule` and the id generator, and those take an injectable `Ctx`.
- Keep the prototype's internal field names (`dur`, `short`, `dl`, `opens`, `last`). The goldens and differential tests rely on the shape.

## 2.2 Types (`types.ts`)

```ts
import type { IconName } from './icons';

export type Tier = 'agent' | 'team';
export type Phase = 'week0' | 'live' | 'post';
export type ModuleStatus = 'draft' | 'scheduled' | 'published';
export type Runtime = 'deployed' | 'paused' | 'needs_attention';
export type RuntimeState = Runtime | 'not_deployed';
export type BuildState = 'not_started' | 'in_progress' | 'verified';
export type LearnerRole = 'Agent' | 'Team Owner' | 'Operations Lead' | 'Sales Agent';
export type StaffRole = 'Owner' | 'Admin' | 'Instructor' | 'Content Editor' | 'Support';
export type PermKey = 'curriculum' | 'publish' | 'cohorts' | 'viewLearners' | 'seats' | 'announce' | 'billing' | 'staff';

export interface Step { id: string; text: string; ch: string; mins: number; t: number; hint: string } // t = replay seconds
export interface SkillFile { name: string; type: 'JSON' | 'YAML' | 'Notion'; size: string; desc: string; steps: string[] }
export interface ModuleResource { name: string; type: string; size: string }

export interface AIEmployee {
  id: string; name: string; short: string; tier: Tier; icon: IconName; forWho: string;
  headline: string; outcome: string; outputs: string[];            // exactly 3 outputs
  platform: string; runLabel: string; build: number;               // build = Σ step minutes
  session: number | null; status: ModuleStatus; opens: number | null; order: number;
  dur: number; instructor: string; transcript: [number, string][]; notes: string; prompt: string;
  files: SkillFile[]; resources: ModuleResource[]; checklist: Step[];   // checklist.length === 6
  runDemo?: { input: string; sections: [string, string][] };
}

export interface Progress {
  steps: string[]; builtAt: number | null; deployedAt: number | null; runtime: Runtime | null;
  issue?: string; lastRun?: { at: number; title: string; preview: string };
}

export interface Learner {
  id: string; name: string; email: string; tier: Tier; role: LearnerRole; teamId: string | null;
  cohortId: string; joined: number; last: number | null; status: 'active' | 'invited';
  progress: Record<string, Progress>; reminded?: number; nudged?: number;
}

export interface Team { id: string; name: string; ownerId: string; seats: number }
export interface Cohort { id: string; name: string; start: number; end: number; weeks?: number; status: 'draft' | 'enrolling' | 'live' | 'completed'; capacity: number; enrolled: number; cadence: string }
export interface Session { id: string; cohortId: string; n: number; title: string; start: number; mins: number; zoom: string; live: boolean; attended: number | null; replay: null | 'processing' | 'ready'; views: number; movedFrom?: number }
export interface Resource { id: string; title: string; desc: string; cat: string; type: string; tier: Tier; size: string; dl: number; updated: number; exec: boolean; status: 'published' | 'hidden' }
export interface Announcement { id: string; sessionId?: string; title: string; body: string; severity: 'info' | 'warning'; action: 'calendar' | 'sessions' | null; actionLabel: string; audience: 'all' | 'agent' | 'team' | 'owners'; channels: ('inapp' | 'email')[]; status: 'sent' | 'scheduled'; at: number; opens: number | null }
export interface Reminder { id: string; label: string; channel: string; on: boolean }
export interface TierDef { id: Tier; name: string; price: number; seats: number; blurb: string; features: string[] }
export interface UpgradeRequest { id: string; userId: string | null; name: string; email: string; source: string; at: number; status: 'new' | 'contacted' | 'converted' | 'closed' }
export interface Staff { id: string; name: string; email: string; role: StaffRole; last: number | null }
export interface ActivityEvent { id: string; t: number; who: string; what: string; tone: 'success' | 'warn' | 'info' }
/** Aggregates for learners not modeled individually. Fixture/demo only; the API always returns ZERO_BASE. */
export interface Baseline { learners: number; agent: number; teamSeats: number; teams: number; mod: Record<string, [number, number, number]>; daily: number[] }

export interface Db {
  v: number; phase?: Phase;
  cohorts: Cohort[]; sessions: Session[]; modules: AIEmployee[]; users: Learner[]; teams: Team[];
  resources: Resource[]; announcements: Announcement[]; dismissed: Record<string, 1>; reminders: Reminder[];
  tiers: TierDef[]; requests: UpgradeRequest[]; staff: Staff[]; perms: Record<StaffRole, Record<PermKey, 0 | 1>>;
  base: Baseline; activity: ActivityEvent[];
}
export const ZERO_BASE: Baseline = { learners: 0, agent: 0, teamSeats: 0, teams: 0, mod: {}, daily: [0] };
```

## 2.3 Seed

Port `baseSeed()` and `seed(phase)` verbatim, keeping every id, string and timestamp. The three outputs must deep-equal `handoff-starter/fixtures/seed-{week0,live,post}.json`. Copy those JSON files to `packages/core/test/fixtures/`.

Add a production variant used by the API seed:
```ts
export const seedForDatabase = (phase: Phase = 'live'): Db => ({ ...seed(phase), base: ZERO_BASE });
```

## 2.4 Behaviors you must preserve (examples)

These values are produced by the reference today. The differential tests check them automatically, and they are written out here so you understand them.

- **Times.** For Session 3 (`2026-12-09T13:00 CT`):
  - Chicago viewer: `fmt.time` returns `1:00 PM CT`
  - New York viewer: `2:00 PM ET (1:00 PM CT)`
  - Los Angeles viewer: `11:00 AM PT (1:00 PM CT)`
  - `fmt.when` for a Chicago viewer: `Wed, Dec 9 · 1:00 PM CT`
- **Clock and money.** `fmt.clock(3504)` returns `58:24` and `fmt.clock(3725)` returns `1:02:05`. `fmt.money(4995)` returns `$4,995`.
- **Relative time.** `fmt.ago(t, now)` returns `Just now`, `12 min ago`, `3 hours ago`, `Yesterday`, `4 days ago`, `2 weeks ago`, then falls back to `Dec 2`. `fmt.agoInline` lowercases the first letter (`yesterday`) and prefixes `on` for dates (`on Dec 2`).
- **Cohort line.** For the December cohort, `cohortLine` gives:
  - Week 0: `December 2026 Cohort · Starts Dec 1`
  - Week 2: `December 2026 Cohort · Week 2 of 6`
  - After the cohort: `December 2026 Cohort · Completed`
- **Join window.** `joinMode(s, start − 16 min)` is `disabled`. At `start − 15 min` it is `ready`. At `start + 1 min` it is `live`.
- **Session card, scheduled.** `sessionVM(db, s3, 'scheduled', variantNow(s3, 'scheduled', 0))`:
  - countdown `[{v:'02',l:'Days'},{v:'02',l:'Hours'},{v:'18',l:'Min'}]` (no seconds, because more than an hour remains)
  - aria `Starts in 2 days 2 hours`
  - `primary: 'calendar'`, `join: 'disabled'`
- **Session card, starting soon.** The same call with `'starting_soon'` gives the countdown `[{v:'11',l:'Min'},{v:'40',l:'Sec'}]`, aria `Starts within 20 minutes` and `primary: 'join'`.
- **Employee cards** for Jamie at Week 2:

| Employee | Result |
|---|---|
| Sales | `state: 'in_progress', n: 3, cta: 'Continue Build', primary: true, sessLine: 'Session 2 · Replay Ready'` |
| Marketing | `state: 'verified', cta: 'Open', primary: false` |
| Meetings | `locked: true, cta: 'Preview'` |

- **Scheduled employees.** For Alex (Team tier), Operations at Week 2 gives `soon: true, opensLabel: 'Opens Dec 14', cta: 'View Details'`.

## 2.5 Mutations (`mutations.ts`)

The prototype's state changes live inside its screens' logic classes, as `act.mutate(d => …)` calls. Port **each** of them into a pure function. Both the `FixtureRepository` (phase 04) and the API (phase 07) execute these same functions, and the API tests use them as the oracle.

```ts
import { produce } from 'immer';
import type { Db } from './types';

export interface Ctx { now: number; id: (prefix: string) => string }
export type Actor = { kind: 'learner'; userId: string } | { kind: 'staff'; staffId: string };
export type Effect = { type: 'confetti' } | { type: 'email'; template: string; to: string[]; data?: Record<string, unknown> };
export interface Outcome { db: Db; toast?: { msg: string; tone: 'success' | 'info' | 'warn' }; effects?: Effect[]; error?: string }

export class MutationError extends Error { constructor(public code: 'forbidden' | 'invalid' | 'not_found', msg: string) { super(msg); } }

const log = (d: Db, t: number, who: string, what: string, tone: 'success' | 'warn' | 'info' = 'info') => {
  d.activity.unshift({ id: `ev${t}${Math.abs(hash(who + what)).toString(36).slice(0, 4)}`, t, who, what, tone });
  d.activity = d.activity.slice(0, 40);
};
```
Activity ids must be deterministic (no `Math.random`) so the oracle tests can compare.

### Example ports (implement exactly)

```ts
export function toggleStep(db: Db, a: Actor, args: { moduleId: string; stepId: string }, c: Ctx): Outcome {
  const u = learnerOf(db, a); const m = moduleOf(db, args.moduleId);
  if (!canAccess(u, m)) throw new MutationError('forbidden', 'Team tier required');
  if (!isOpen(m, c.now)) return { db, toast: { msg: `${m.name} opens ${fmt.day(m.opens!)}.`, tone: 'info' } };
  const p = progressOf(u, m);
  if (p.deployedAt && p.steps.includes(args.stepId))
    return { db, toast: { msg: 'This AI Employee is deployed, so its checklist is locked.', tone: 'info' } };
  let becameBuilt = false;
  const next = produce(db, (d) => {
    const du = d.users.find((x) => x.id === u.id)!;
    const pr = (du.progress[m.id] ??= { steps: [], builtAt: null, deployedAt: null, runtime: null });
    pr.steps = pr.steps.includes(args.stepId) ? pr.steps.filter((x) => x !== args.stepId) : [...pr.steps, args.stepId];
    if (pr.steps.length >= m.checklist.length) {
      if (!pr.builtAt) { pr.builtAt = c.now; becameBuilt = true; log(d, c.now, du.name, `built ${m.name}`, 'success'); }
    } else pr.builtAt = null;
    du.last = c.now;
  });
  return becameBuilt
    ? { db: next, toast: { msg: `${m.name} is built. Deploy it from the card on the right.`, tone: 'success' }, effects: [{ type: 'confetti' }] }
    : { db: next };
}

export function markDeployed(db: Db, a: Actor, args: { moduleId: string }, c: Ctx): Outcome {
  const u = learnerOf(db, a); const m = moduleOf(db, args.moduleId);
  if (buildOf(u, m).state !== 'verified') throw new MutationError('invalid', 'Finish all 6 steps to deploy.');
  return { db: produce(db, (d) => {
    const pr = d.users.find((x) => x.id === u.id)!.progress[m.id]!;
    pr.deployedAt = c.now; pr.runtime = 'deployed';
    log(d, c.now, u.name, `deployed ${m.name}`, 'success');
  }), toast: { msg: `${m.name} deployed`, tone: 'success' } };
}

export function inviteMember(db: Db, a: Actor, args: { email: string; name?: string; role: 'Operations Lead' | 'Sales Agent' | 'Team Owner' }, c: Ctx): Outcome {
  const owner = learnerOf(db, a); const team = db.teams.find((t) => t.id === owner.teamId);
  if (!team || !['Team Owner', 'Operations Lead'].includes(owner.role)) throw new MutationError('forbidden', 'Only the team owner or operations lead can invite.');
  const email = args.email.trim(), mem = db.users.filter((u) => u.teamId === team.id);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { db, error: 'Enter a valid email address.' };
  if (mem.some((u) => u.email.toLowerCase() === email.toLowerCase())) return { db, error: 'That person is already on your team.' };
  if (mem.length >= team.seats) return { db, error: 'All seats are assigned. Remove a seat or contact us to add more.' };
  const caps = { 'Operations Lead': 1, 'Sales Agent': 5, 'Team Owner': 1 } as const, cap = caps[args.role];
  if (mem.filter((u) => u.role === args.role).length >= cap) return { db, error: `Your plan includes ${cap} ${args.role}${cap > 1 ? 's' : ''}.` };
  const name = args.name?.trim() || email.split('@')[0]!.replace(/[._-]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
  return {
    db: produce(db, (d) => {
      d.users.push({ id: c.id('u'), name, email, tier: 'team', role: args.role, teamId: team.id, cohortId: owner.cohortId, joined: c.now, last: null, status: 'invited', progress: {} });
      log(d, c.now, owner.name, `invited ${name} to ${team.name}`, 'info');
    }),
    toast: { msg: `Invite sent to ${email}`, tone: 'success' },
    effects: [{ type: 'email', template: 'team-invite', to: [email], data: { team: team.name, inviter: owner.name } }],
  };
}
```

### Full mutation catalog

Port every row. The reference column names the file whose logic class contains the original `act.mutate`.

| # | Function | Actor and permission | Effect | Toast / error copy | Reference |
|---|---|---|---|---|---|
| 1 | `dismissAnnouncement({id})` | learner self | `dismissed[`${userId}:${id}`] = 1` | — | Portal Dashboard |
| 2 | `toggleStep({moduleId, stepId})` | learner self, access | see code | see code | Portal Workspace |
| 3 | `markDeployed({moduleId})` | learner self | `deployedAt = now`, `runtime = 'deployed'`, log | `{name} deployed` | Portal Workspace |
| 4 | `setRuntime({moduleId, runtime})` | learner self | `paused`; `deployed` (resume/reconnect, deletes `issue`) | `{name} paused`, `{name} resumed`, `Reconnected. Test run passed.` | Portal Workspace |
| 5 | `recordRun({moduleId, title, preview})` | learner self | `lastRun = {at: now, title, preview}` | — | Portal Workspace |
| 6 | `requestUpgrade({source})` | learner self, Agent tier | `requests.unshift({id, userId, name, email, source, at: now, status:'new'})`, log `requested a Team tier upgrade` (warn). If a `new`/`contacted` request exists, no-op. | `Consultation requested. We’ll reach out within 1 business day.`; existing: `Your consultation request is in. We’ll reach out within 1 business day.` (info) | Portal Upgrade, Portal Vault |
| 7 | `downloadResource({id})` | learner, access to tier | `dl += 1` | `Downloaded {title}` | Portal Vault |
| 8 | `inviteMember` | team owner / ops lead | see code | see code | Portal Team Hub |
| 9 | `remindMembers({userIds})` | team owner / ops lead | `reminded = now` on each, log `sent build reminders to {n} team member(s)` | `Reminder sent to {n} member(s) by email and in-app` | Portal Team Hub |
| 10 | `setMemberRole({userId, role})` | team owner | role change (not for the owner) | `{name} is now {role}` | Portal Team Hub |
| 11 | `removeMember({userId})` | team owner | remove the user from the team, log `removed {name} from {team}` | `{name} removed. 1 seat freed.` | Portal Team Hub |
| 12 | `nudgeLearners({userIds})` | staff `viewLearners` | `nudged = now`; log `nudged {n} inactive learners` when > 1 | `Nudge sent to {name}` / `Nudge sent to {n} learners` | Admin Overview |
| 13 | `moveModule({id, dir})` | staff `curriculum` | swap with neighbor, renumber `order` 1..n | — | Admin Curriculum |
| 14 | `setModuleTier({id, tier})` | staff `curriculum` | `tier` | `{name} now included in Agent Tier` / `{name} is now Team Tier only` | Admin Curriculum, Admin Tiers |
| 15 | `publishModule({id})` | staff `publish` | `status='published'`, `opens=null`, log `published {name}` | `{name} is live in the learner portal` | Admin Curriculum |
| 16 | `unpublishModule({id})` | staff `publish` | `status='draft'` | `{name} unpublished. Learners no longer see it.` | Admin Curriculum |
| 17 | `saveModule({draft, status?})` | `curriculum` (and `publish` if publishing) | validate (SCREENS §4.3), renumber steps `c1..c6`, `build = Σ mins`, default `short`, upsert | `{name} saved` / `{name} is live in the learner portal` | Admin Module Builder |
| 18 | `deleteModule({id})` | `curriculum`, drafts only | remove | `{name} deleted` | Admin Module Builder |
| 19 | `createCohort()` | `cohorts` | new draft cohort + 6 sessions (SCREENS §4.4) | `Draft cohort created with 6 sessions` | Admin Cohorts |
| 20 | `openEnrollment({cohortId})` | `cohorts` | `status='enrolling'` | `{name} is open for enrollment` | Admin Cohorts |
| 21 | `goLive({sessionId})` | `cohorts` | `live=true`, log `started Session {n} · {title}` (success) | `Session {n} is live. Learners see “Join Now.”` | Admin Cohorts |
| 22 | `endSession({sessionId})` | `cohorts` | `live=false`, `start=min(start, now−mins·60000)`, `attended=round(learners·0.78)`, `replay='processing'`, log | `Session {n} ended. Replay is processing.` | Admin Cohorts |
| 23 | `publishReplay({sessionId, durationSec?})` | `cohorts` | `replay='ready'`, `views=0`; module `dur` set if 0; log `published the Session {n} replay` | `Session {n} replay published to learners` | Admin Cohorts |
| 24 | `updateSession({id, title, date, time, mins, zoom})` | `cohorts` | `start = fmt.fromCT(date, time)`, log `updated Session {n} · {title}` | `Session {n} updated. Learners will be notified.` | Admin Cohorts |
| 25 | `setLearnerTier({userId, tier})` | staff `seats` | `upgradeUser` / `downgradeUser`, log | `{name} upgraded. Team modules unlocked in their portal.` / `{name} moved to Agent Tier` | Admin Learners |
| 26 | `uploadResource({...})` | `curriculum` | executive categories force Team; size; unshift; log `added “{title}” to the Resource Vault` | errors `Add a title.`, `Attach a file first.`; `{title} published to the vault` | Admin Vault |
| 27 | `setResourceTier({id})` | `curriculum` | toggle (executive items cannot be changed) | `{title}: Agent + Team` / `{title}: Team only`; exec → `Executive Vault items are Team only` (info) | Admin Vault |
| 28 | `setResourceStatus({id})` | `curriculum` | toggle published/hidden | `{title} published` / `{title} hidden from learners` | Admin Vault |
| 29 | `deleteResource({id})` | `curriculum` | remove | `{title} deleted` | Admin Vault |
| 30 | `sendAnnouncement({...})` | `announce` | validate; unshift with severity, action, actionLabel; log `sent|scheduled “{title}”` | errors `Add a title and a message.`, `Pick at least one channel.`; `Sent to {n} learners. The banner is live on their dashboards.` / `Scheduled for {day}` | Admin Announcements |
| 31 | `toggleReminder({id})` | `announce` | flip `on` | `{label}: on|off` (info) | Admin Announcements |
| 32 | `setTierPrice({tierId, price})` | `billing` | price > 0 | — | Admin Tiers |
| 33 | `setRequestStatus({id, status})` | `billing` | `converted` also runs `upgradeUser` and logs `upgraded {name} to Team Tier` | `{name} marked as contacted`, `{name} is on Team Tier. All six AI Employees are unlocked in their portal.`, `Request closed` | Admin Tiers |
| 34 | `inviteStaff({email, role})` | `staff` | validate; push `{id, name from email, email, role, last: null}` | `Enter a valid email address.`, `That person is already on staff.`; `Invite sent to {email}` | Admin Staff |
| 35 | `setStaffRole({id, role})` | `staff`, not the Owner | role | `{name} is now {role}` | Admin Staff |
| 36 | `removeStaff({id})` | `staff`, not the Owner | remove | `{name} removed`; owner → `The owner can’t be removed` (info) | Admin Staff |
| 37 | `togglePermission({role, perm})` | `staff`, not the Owner column | flip | `{role}: {label} on|off` (info) | Admin Staff |

When a reference toast has a known wording slip, the corrected copy above wins: the lowercase month in the scheduled-employee toast, and `“Join Now.”` capitalized to match the button. Toasts are not part of the pixel or fingerprint comparison.

## 2.6 Permissions (`can.ts`)

```ts
export function can(db: Db, a: Actor, perm: PermKey): boolean {
  if (a.kind !== 'staff') return false;
  const s = db.staff.find((x) => x.id === a.staffId);
  return !!s && (s.role === 'Owner' || db.perms[s.role]?.[perm] === 1);
}
export const requirePerm = (db: Db, a: Actor, perm: PermKey) => { if (!can(db, a, perm)) throw new MutationError('forbidden', 'You don’t have permission to do that.'); };
```

---

## Gate 2: Ship Checklist

**Differential tests** (`packages/core/test/differential.test.ts`). These import the reference module directly. It is browser-free at import time.
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import * as ref from '../../../design-reference/lms-data.js';
import * as core from '../src';

const ZONES = ['America/Chicago', 'America/New_York', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'];
const PHASES = ['week0', 'live', 'post'] as const;

describe('seed @g2', () => {
  for (const p of PHASES) it(`seed(${p}) is identical`, () => expect(core.seed(p)).toEqual(ref.seed(p)));
});

describe('time formatting @g2', () => {
  const times = [Date.parse('2026-12-09T13:00:00-06:00'), Date.parse('2027-03-15T09:30:00-05:00'), Date.parse('2026-12-31T23:59:00-06:00')];
  for (const z of ZONES) it(`fmt in ${z}`, () => {
    ref.setViewerZone(z); core.setViewerZone(z);
    for (const t of times) for (const k of ['date', 'day', 'dayPlain', 'weekday', 'time', 'timeOnly', 'when', 'abs'] as const)
      expect(core.fmt[k](t), `${k} ${t}`).toBe(ref.fmt[k](t));
  });
  it('relative + numeric helpers', () => {
    const now = Date.parse('2026-12-07T10:42:00-06:00');
    for (const d of [0, 30e3, 5 * 60e3, 3 * 3600e3, 26 * 3600e3, 4 * 864e5, 15 * 864e5, 40 * 864e5])
      expect(core.fmt.ago(now - d, now)).toBe(ref.fmt.ago(now - d, now));
    for (const s of [0, 59, 65, 3504, 3725]) expect(core.fmt.clock(s)).toBe(ref.fmt.clock(s));
  });
});

describe('view models @g2', () => {
  for (const p of PHASES) it(`cards + sessions in ${p}`, () => {
    const db = ref.seed(p), now = ref.phaseNow(p);
    ref.setViewerZone('America/Chicago'); core.setViewerZone('America/Chicago');
    for (const u of db.users) for (const m of db.modules) {
      expect(core.cardVM(db, u, m, now)).toEqual(ref.cardVM(db, u, m, now));
      expect(core.buildOf(u, m)).toEqual(ref.buildOf(u, m));
      expect(core.runtimeOf(u, m)).toBe(ref.runtimeOf(u, m));
      expect(core.nextIncluded(db, u, m.id, now)?.id).toBe(ref.nextIncluded(db, u, m.id, now)?.id);
    }
    for (const u of db.users) expect(core.cardSession(db, u, now)).toEqual(ref.cardSession(db, u, now));
    for (const s of db.sessions) for (const [v] of ref.VARIANTS) for (const tick of [0, 1000, 61_000])
      expect(core.sessionVM(db, s, v, core.variantNow(s, v, tick))).toEqual(ref.sessionVM(db, s, v, ref.variantNow(s, v, tick)));
    for (const c of db.cohorts) expect(core.cohortLine(c, now)).toBe(ref.cohortLine(c, now));
  });
  it('join window', () => {
    const s = ref.seed('live').sessions[2]!;
    for (const off of [-16, -15, -1, 0, 1, 80]) { const t = s.start + off * 60e3; expect(core.joinMode(s, t)).toBe(ref.joinMode(s, t)); }
  });
  it('ics / csv / skill files / tiers', () => {
    const db = ref.seed('live');
    expect(core.csv([['a', 'b"c'], [1, null]])).toBe(ref.csv([['a', 'b"c'], [1, null]]));
    for (const m of db.modules) for (const f of m.files) expect(core.skillPreview(f, m)).toBe(ref.skillPreview(f, m));
    const ev = core.sessionEvent(db.sessions[0]!);
    expect(core.ics([ev]).replace(/DTSTAMP:\d+T\d+Z/, '')).toBe(ref.ics([ev]).replace(/DTSTAMP:\d+T\d+Z/, ''));
  });
});
```

**Explicit expectation tests** (`packages/core/test/behaviors.test.ts`). Encode every bullet in §2.4 as an `expect`. These document intent even if the reference changes.

**Mutation tests** (`packages/core/test/mutations.test.ts`). At least one test per catalog row. Required cases:
- Toggling all 6 Sales steps for Jamie returns `effects: [{type:'confetti'}]`, sets `builtAt`, and makes `activity[0].what === 'built Sales AI Employee'`.
- `markDeployed` before the employee is built throws `MutationError('invalid')`.
- `toggleStep` on a Team-tier employee as Jamie throws `forbidden`.
- `inviteMember` returns each of the 4 error strings under its condition, and on success adds a user with `status: 'invited'`.
- `setRequestStatus(converted)` for Kenji makes him `tier: 'team'`, `role: 'Team Owner'`, with a new team `t_u_kenji`.
- Every staff mutation throws `forbidden` for a role without the permission. For example, `Support` cannot `publishModule`.
- The same inputs plus the same `Ctx` produce deep-equal output (determinism).

Coverage for `packages/core` is at least 95% lines (`vitest --coverage`).
