// Every state change in the product — docs/phases/02-core-domain.md §2.5.
//
// The prototype keeps these inside its screens' logic classes as `act.mutate(d => …)` calls.
// Each one is ported here as a pure function `(db, actor, args, ctx) => Outcome` that returns a
// NEW db through immer's `produce`. Both the FixtureRepository (phase 04) and the API (phase 07)
// execute these same functions, so the portal, the admin console and the backend cannot disagree.
//
// Conventions, from the spec:
//   - Validation the UI renders INLINE returns `{ db, error }` and leaves the db untouched.
//   - Authorization and programming failures THROW `MutationError`.
//   - Toast copy is exact, curly apostrophes included. The default tone is 'success', which is
//     what the prototype's shell uses when `act.mutate` is called without one.
//   - Activity ids are deterministic (a 32-bit string hash, never Math.random), so the oracle
//     tests can compare two runs of the same inputs.

import { produce } from 'immer';
import { requirePerm } from './can';
import { EXEC_CATEGORIES, PERMS, PROGRAM_TZ } from './constants';
import { buildOf, canAccess, isOpen, progressOf, runtimeOf } from './status';
import { fmt } from './time';
import { SUPPORT_EMAIL } from './offer';
import { seatCaps } from './seats';
import { downgradeUser, upgradeUser } from './tiers';
import type {
  AIEmployee,
  Announcement,
  Cohort,
  Db,
  Learner,
  LearnerRole,
  ModuleStatus,
  PermKey,
  Reminder,
  Resource,
  Runtime,
  Session,
  Staff,
  StaffRole,
  Team,
  Tier,
  TierDef,
  UpgradeRequest,
} from './types';

// ---------------------------------------------------------------------------
// Scaffolding (§2.5)
// ---------------------------------------------------------------------------

export interface Ctx {
  now: number;
  id: (prefix: string) => string;
}

export type Actor = { kind: 'learner'; userId: string } | { kind: 'staff'; staffId: string };

export type Effect =
  { type: 'confetti' } | { type: 'email'; template: string; to: string[]; data?: Record<string, unknown> };

export interface Outcome {
  db: Db;
  toast?: { msg: string; tone: 'success' | 'info' | 'warn' };
  effects?: Effect[];
  error?: string;
}

// The spec writes this with a `public code` parameter property. That is TypeScript syntax node's
// strip-only type stripping (`node --experimental-strip-types`) refuses, and the repo's own
// verification path imports these modules that way, so the field is declared and assigned
// explicitly instead. The public shape is identical.
export class MutationError extends Error {
  code: 'forbidden' | 'invalid' | 'not_found';
  constructor(code: 'forbidden' | 'invalid' | 'not_found', msg: string) {
    super(msg);
    this.name = 'MutationError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Private helpers — nothing below this line is exported.
// `apps/web` does `import * as M from '@ai/core/mutations'` and derives
// `MutationName = keyof typeof M`, so the module exports only mutations plus the types above.
// ---------------------------------------------------------------------------

/**
 * Deterministic 32-bit string hash (the classic `h = (h << 5) - h + ch | 0`).
 * The spec's `log` helper calls `hash(who + what)` without defining it; this is it. It replaces
 * the reference's `Math.random().toString(36).slice(2, 6)` so activity ids are reproducible.
 */
const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
};

/** Append to the activity feed, newest first, capped at 40 — the reference's `lib.log`. */
const log = (d: Db, t: number, who: string, what: string, tone: 'success' | 'warn' | 'info' = 'info'): void => {
  d.activity.unshift({
    id: `ev${t}${Math.abs(hash(who + what))
      .toString(36)
      .slice(0, 4)}`,
    t,
    who,
    what,
    tone,
  });
  d.activity = d.activity.slice(0, 40);
};

const learnerOf = (db: Db, a: Actor): Learner => {
  if (a.kind !== 'learner') throw new MutationError('forbidden', 'That action is for learners.');
  const u = db.users.find((x) => x.id === a.userId);
  if (!u) throw new MutationError('not_found', `No learner ${a.userId}`);
  return u;
};

const staffOf = (db: Db, a: Actor): Staff => {
  if (a.kind !== 'staff') throw new MutationError('forbidden', 'That action is for staff.');
  const s = db.staff.find((x) => x.id === a.staffId);
  if (!s) throw new MutationError('not_found', `No staff ${a.staffId}`);
  return s;
};

const moduleOf = (db: Db, id: string): AIEmployee => {
  const m = db.modules.find((x) => x.id === id);
  if (!m) throw new MutationError('not_found', `No AI Employee ${id}`);
  return m;
};

const sessionOf = (db: Db, id: string): Session => {
  const s = db.sessions.find((x) => x.id === id);
  if (!s) throw new MutationError('not_found', `No session ${id}`);
  return s;
};

const cohortOf = (db: Db, id: string): Cohort => {
  const co = db.cohorts.find((x) => x.id === id);
  if (!co) throw new MutationError('not_found', `No cohort ${id}`);
  return co;
};

const resourceOf = (db: Db, id: string): Resource => {
  const r = db.resources.find((x) => x.id === id);
  if (!r) throw new MutationError('not_found', `No resource ${id}`);
  return r;
};

const reminderOf = (db: Db, id: string): Reminder => {
  const r = db.reminders.find((x) => x.id === id);
  if (!r) throw new MutationError('not_found', `No reminder ${id}`);
  return r;
};

const tierDefOf = (db: Db, id: string): TierDef => {
  const t = db.tiers.find((x) => x.id === id);
  if (!t) throw new MutationError('not_found', `No tier ${id}`);
  return t;
};

const requestOf = (db: Db, id: string): UpgradeRequest => {
  const q = db.requests.find((x) => x.id === id);
  if (!q) throw new MutationError('not_found', `No upgrade request ${id}`);
  return q;
};

const staffMemberOf = (db: Db, id: string): Staff => {
  const s = db.staff.find((x) => x.id === id);
  if (!s) throw new MutationError('not_found', `No staff ${id}`);
  return s;
};

const userOf = (db: Db, id: string): Learner => {
  const u = db.users.find((x) => x.id === id);
  if (!u) throw new MutationError('not_found', `No learner ${id}`);
  return u;
};

const teamOf = (db: Db, owner: Learner): Team => {
  const t = owner.teamId ? db.teams.find((x) => x.id === owner.teamId) : undefined;
  if (!t) throw new MutationError('forbidden', 'You are not on a team.');
  return t;
};

const memberOf = (db: Db, team: Team, userId: string): Learner => {
  const u = userOf(db, userId);
  if (u.teamId !== team.id) throw new MutationError('forbidden', 'That person is not on your team.');
  return u;
};

/** Learner population behind the attendance and audience numbers: baseline + modeled, minus invites. */
const learnerCount = (db: Db): number => db.base.learners + db.users.filter((u) => u.status !== 'invited').length;

const permLabel = (perm: PermKey): string => PERMS.find(([k]) => k === perm)?.[1] ?? perm;

/** The reference's `name from email`: `jo.hale@x.com` → `Jo Hale`. */
const nameFromEmail = (email: string): string =>
  email
    .split('@')[0]!
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// 1-7 · Learner portal: dashboard, workspace, upgrade, vault
// ---------------------------------------------------------------------------

/** 1 · Portal Dashboard: hide an announcement banner for this learner only. */
export function dismissAnnouncement(db: Db, a: Actor, args: { id: string }, _c: Ctx): Outcome {
  const u = learnerOf(db, a);
  return {
    db: produce(db, (d) => {
      if (!d.dismissed) d.dismissed = {};
      d.dismissed[`${u.id}:${args.id}`] = 1;
    }),
  };
}

/** 2 · Portal Workspace: check or un-check a build step. The 6th one builds the AI Employee. */
export function toggleStep(db: Db, a: Actor, args: { moduleId: string; stepId: string }, c: Ctx): Outcome {
  const u = learnerOf(db, a);
  const m = moduleOf(db, args.moduleId);
  if (!canAccess(u, m)) throw new MutationError('forbidden', 'Team tier required');
  if (!isOpen(m, c.now)) return { db, toast: { msg: `${m.name} opens ${fmt.day(m.opens!)}.`, tone: 'info' } };
  const p = progressOf(u, m);
  if (p.deployedAt && p.steps.includes(args.stepId))
    return {
      db,
      toast: { msg: 'This AI Employee is deployed, so its checklist is locked.', tone: 'info' },
    };
  let becameBuilt = false;
  const next = produce(db, (d) => {
    const du = d.users.find((x) => x.id === u.id)!;
    if (!du.progress) du.progress = {};
    const pr = (du.progress[m.id] ??= {
      steps: [],
      builtAt: null,
      deployedAt: null,
      runtime: null,
    });
    pr.steps = pr.steps.includes(args.stepId) ? pr.steps.filter((x) => x !== args.stepId) : [...pr.steps, args.stepId];
    if (pr.steps.length >= m.checklist.length) {
      if (!pr.builtAt) {
        pr.builtAt = c.now;
        becameBuilt = true;
        log(d, c.now, du.name, `built ${m.name}`, 'success');
      }
    } else pr.builtAt = null;
    du.last = c.now;
  });
  return becameBuilt
    ? {
        db: next,
        toast: {
          msg: `${m.name} is built. Deploy it from the card on the right.`,
          tone: 'success',
        },
        effects: [{ type: 'confetti' }],
      }
    : { db: next };
}

/** 3 · Portal Workspace: "Mark as Deployed", available once all 6 steps are verified. */
export function markDeployed(db: Db, a: Actor, args: { moduleId: string }, c: Ctx): Outcome {
  const u = learnerOf(db, a);
  const m = moduleOf(db, args.moduleId);
  if (buildOf(u, m).state !== 'verified') throw new MutationError('invalid', 'Finish all 6 steps to deploy.');
  return {
    db: produce(db, (d) => {
      const du = d.users.find((x) => x.id === u.id)!;
      const pr = du.progress[m.id]!;
      pr.deployedAt = c.now;
      pr.runtime = 'deployed';
      du.last = c.now;
      log(d, c.now, u.name, `deployed ${m.name}`, 'success');
    }),
    toast: { msg: `${m.name} deployed`, tone: 'success' },
  };
}

/**
 * 4 · Portal Workspace: Pause, Resume or Reconnect a deployed AI Employee.
 * Resuming from `needs_attention` is the "Reconnect" path and clears the stored issue.
 */
export function setRuntime(db: Db, a: Actor, args: { moduleId: string; runtime: Runtime }, c: Ctx): Outcome {
  const u = learnerOf(db, a);
  const m = moduleOf(db, args.moduleId);
  const prev = runtimeOf(u, m);
  if (prev === 'not_deployed') throw new MutationError('invalid', 'Mark it deployed before changing its runtime.');
  const msg =
    args.runtime === 'paused'
      ? `${m.name} paused`
      : prev === 'needs_attention'
        ? 'Reconnected. Test run passed.'
        : `${m.name} resumed`;
  return {
    db: produce(db, (d) => {
      const du = d.users.find((x) => x.id === u.id)!;
      const pr = du.progress[m.id]!;
      pr.runtime = args.runtime;
      if (args.runtime === 'deployed') delete pr.issue;
      du.last = c.now;
    }),
    toast: { msg, tone: 'success' },
  };
}

/** 5 · Portal Workspace: the run drawer records its last output on the deployment card. */
export function recordRun(
  db: Db,
  a: Actor,
  args: { moduleId: string; title: string; preview: string },
  c: Ctx,
): Outcome {
  const u = learnerOf(db, a);
  const m = moduleOf(db, args.moduleId);
  return {
    db: produce(db, (d) => {
      const du = d.users.find((x) => x.id === u.id)!;
      if (!du.progress) du.progress = {};
      const pr = (du.progress[m.id] ??= {
        steps: [],
        builtAt: null,
        deployedAt: null,
        runtime: null,
      });
      pr.lastRun = { at: c.now, title: args.title, preview: args.preview };
      du.last = c.now;
    }),
  };
}

/** 6 · Portal Upgrade and Portal Vault: ask for a Team tier consultation. One open request each. */
export function requestUpgrade(db: Db, a: Actor, args: { source: string }, c: Ctx): Outcome {
  const u = learnerOf(db, a);
  if (u.tier === 'team') throw new MutationError('forbidden', 'Team tier learners have nothing to upgrade.');
  if (db.requests.some((q) => q.userId === u.id && (q.status === 'new' || q.status === 'contacted')))
    return {
      db,
      toast: {
        msg: 'Your consultation request is in. We’ll reach out within 1 business day.',
        tone: 'info',
      },
    };
  return {
    db: produce(db, (d) => {
      d.requests.unshift({
        id: c.id('ur'),
        userId: u.id,
        name: u.name,
        email: u.email,
        source: args.source,
        at: c.now,
        status: 'new',
      });
      log(d, c.now, u.name, 'requested a Team tier upgrade', 'warn');
    }),
    toast: {
      msg: 'Consultation requested. We’ll reach out within 1 business day.',
      tone: 'success',
    },
  };
}

/** 7 · Portal Vault: count a download. Team-only resources need the Team tier. */
export function downloadResource(db: Db, a: Actor, args: { id: string }, _c: Ctx): Outcome {
  const u = learnerOf(db, a);
  const r = resourceOf(db, args.id);
  if (r.tier === 'team' && u.tier !== 'team') throw new MutationError('forbidden', 'Team tier required');
  return {
    db: produce(db, (d) => {
      const x = d.resources.find((y) => y.id === r.id)!;
      x.dl++;
    }),
    toast: { msg: `Downloaded ${r.title}`, tone: 'success' },
  };
}

// ---------------------------------------------------------------------------
// 8-11 · Portal Team Hub
// ---------------------------------------------------------------------------

/** 8 · Portal Team Hub: invite a seat. Four inline errors before anything is written. */
/**
 * D-141: an invite to an address that already has an account, on another team or on staff. One
 * address is one account (`users.email` is unique, and sign-in matches it in any case), and moving
 * someone between teams is a decision for support, not for the invite form.
 */
export const ALREADY_HAS_ACCOUNT = `That email already has an Amplified Impact account. Invite them with a different email, or write to ${SUPPORT_EMAIL}.`;

export function inviteMember(
  db: Db,
  a: Actor,
  args: { email: string; name?: string; role: 'Operations Lead' | 'Sales Agent' | 'Team Owner' },
  c: Ctx,
): Outcome {
  const owner = learnerOf(db, a);
  const team = db.teams.find((t) => t.id === owner.teamId);
  if (!team || !['Team Owner', 'Operations Lead'].includes(owner.role))
    throw new MutationError('forbidden', 'Only the team owner or operations lead can invite.');
  const email = args.email.trim(),
    mem = db.users.filter((u) => u.teamId === team.id);
  if (!EMAIL_RE.test(email)) return { db, error: 'Enter a valid email address.' };
  if (mem.some((u) => u.email.toLowerCase() === email.toLowerCase()))
    return { db, error: 'That person is already on your team.' };
  // Anyone else with this address, in any case: a learner on another team, or staff. Without this
  // the database's unique email answered 500, and a different case made a second account.
  const lower = email.toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === lower) || db.staff.some((x) => x.email.toLowerCase() === lower))
    return { db, error: ALREADY_HAS_ACCOUNT };
  if (mem.length >= team.seats)
    return { db, error: 'All seats are assigned. Remove a seat or contact us to add more.' };
  // The plan's seats, shared (D-081, D-120): 15 or 40 agents on the Team Plan, five in the prototype.
  const cap = seatCaps(db, team)[args.role];
  if (mem.filter((u) => u.role === args.role).length >= cap)
    return { db, error: `Your plan includes ${cap} ${args.role}${cap > 1 ? 's' : ''}.` };
  const name = args.name?.trim() || nameFromEmail(email);
  return {
    db: produce(db, (d) => {
      d.users.push({
        id: c.id('u'),
        name,
        email,
        tier: 'team',
        role: args.role,
        teamId: team.id,
        cohortId: owner.cohortId,
        joined: c.now,
        last: null,
        status: 'invited',
        progress: {},
      });
      log(d, c.now, owner.name, `invited ${name} to ${team.name}`, 'info');
    }),
    toast: { msg: `Invite sent to ${email}`, tone: 'success' },
    effects: [
      {
        type: 'email',
        template: 'team-invite',
        to: [email],
        data: { team: team.name, inviter: owner.name },
      },
    ],
  };
}

/** 9 · Portal Team Hub: nudge teammates who are behind, or one from the member drawer. */
export function remindMembers(db: Db, a: Actor, args: { userIds: string[] }, c: Ctx): Outcome {
  const owner = learnerOf(db, a);
  const team = teamOf(db, owner);
  if (!['Team Owner', 'Operations Lead'].includes(owner.role))
    throw new MutationError('forbidden', 'Only the team owner or operations lead can remind.');
  const people = args.userIds.map((id) => memberOf(db, team, id));
  const n = people.length;
  return {
    db: produce(db, (d) => {
      for (const p of people) {
        const u = d.users.find((x) => x.id === p.id);
        if (u) u.reminded = c.now;
      }
      log(d, c.now, owner.name, `sent build reminders to ${n} team member${n === 1 ? '' : 's'}`, 'info');
    }),
    toast: {
      msg: `Reminder sent to ${n} member${n === 1 ? '' : 's'} by email and in-app`,
      tone: 'success',
    },
  };
}

/** 10 · Portal Team Hub: change a seat's role. The Team Owner's own role is fixed. */
export function setMemberRole(db: Db, a: Actor, args: { userId: string; role: LearnerRole }, _c: Ctx): Outcome {
  const owner = learnerOf(db, a);
  const team = teamOf(db, owner);
  if (owner.role !== 'Team Owner') throw new MutationError('forbidden', 'Only the team owner can change roles.');
  const target = memberOf(db, team, args.userId);
  if (target.role === 'Team Owner') throw new MutationError('forbidden', 'The team owner’s role can’t be changed.');
  return {
    db: produce(db, (d) => {
      const u = d.users.find((x) => x.id === target.id);
      if (u) u.role = args.role;
    }),
    toast: { msg: `${target.name} is now ${args.role}`, tone: 'success' },
  };
}

/** 11 · Portal Team Hub: remove a seat. The owner cannot remove themselves. */
export function removeMember(db: Db, a: Actor, args: { userId: string }, c: Ctx): Outcome {
  const owner = learnerOf(db, a);
  const team = teamOf(db, owner);
  if (owner.role !== 'Team Owner') throw new MutationError('forbidden', 'Only the team owner can remove a member.');
  const target = memberOf(db, team, args.userId);
  if (target.id === owner.id) throw new MutationError('forbidden', 'You can’t remove your own seat.');
  return {
    db: produce(db, (d) => {
      d.users = d.users.filter((x) => x.id !== target.id);
      log(d, c.now, owner.name, `removed ${target.name} from ${team.name}`, 'info');
    }),
    toast: { msg: `${target.name} removed. 1 seat freed.`, tone: 'success' },
  };
}

// ---------------------------------------------------------------------------
// 12 · Admin Overview
// ---------------------------------------------------------------------------

/** 12 · Admin Overview: "Send nudge" on one row, or "Nudge All" on the Needs Attention list. */
export function nudgeLearners(db: Db, a: Actor, args: { userIds: string[] }, c: Ctx): Outcome {
  requirePerm(db, a, 'viewLearners');
  const s = staffOf(db, a);
  const people = args.userIds.map((id) => userOf(db, id));
  const n = people.length;
  return {
    db: produce(db, (d) => {
      for (const p of people) {
        const u = d.users.find((x) => x.id === p.id);
        if (u) u.nudged = c.now;
      }
      if (n > 1) log(d, c.now, s.name, `nudged ${n} inactive learners`, 'info');
    }),
    toast: {
      msg: n === 1 ? `Nudge sent to ${people[0]!.name}` : `Nudge sent to ${n} learners`,
      tone: 'success',
    },
  };
}

// ---------------------------------------------------------------------------
// 13-18 · Admin Curriculum and Module Builder
// ---------------------------------------------------------------------------

/** 13 · Admin Curriculum: swap with a neighbour, then renumber `order` 1..n. No toast. */
export function moveModule(db: Db, a: Actor, args: { id: string; dir: number }, _c: Ctx): Outcome {
  requirePerm(db, a, 'curriculum');
  moduleOf(db, args.id);
  return {
    db: produce(db, (d) => {
      const list = d.modules.slice().sort((x, y) => x.order - y.order);
      const i = list.findIndex((m) => m.id === args.id),
        j = i + args.dir;
      if (j < 0 || j >= list.length) return;
      const mi = list[i]!,
        mj = list[j]!;
      list[i] = mj;
      list[j] = mi;
      list.forEach((m, k) => {
        m.order = k + 1;
      });
    }),
  };
}

/** 14 · Admin Curriculum and Admin Tiers: gate an AI Employee to Team tier, or include it. */
export function setModuleTier(db: Db, a: Actor, args: { id: string; tier: Tier }, _c: Ctx): Outcome {
  requirePerm(db, a, 'curriculum');
  const m = moduleOf(db, args.id);
  return {
    db: produce(db, (d) => {
      const x = d.modules.find((y) => y.id === m.id)!;
      x.tier = args.tier;
    }),
    toast: {
      msg: args.tier === 'agent' ? `${m.name} now included in Agent Tier` : `${m.name} is now Team Tier only`,
      tone: 'success',
    },
  };
}

/** 15 · Admin Curriculum: publish. Publishing clears `opens`, so a scheduled module goes live now. */
export function publishModule(db: Db, a: Actor, args: { id: string }, c: Ctx): Outcome {
  requirePerm(db, a, 'publish');
  const s = staffOf(db, a);
  const m = moduleOf(db, args.id);
  return {
    db: produce(db, (d) => {
      const x = d.modules.find((y) => y.id === m.id)!;
      x.status = 'published';
      x.opens = null;
      log(d, c.now, s.name, `published ${m.name}`, 'info');
    }),
    toast: { msg: `${m.name} is live in the learner portal`, tone: 'success' },
  };
}

/** 16 · Admin Curriculum: back to draft. `opens` is left alone, as the reference leaves it. */
export function unpublishModule(db: Db, a: Actor, args: { id: string }, _c: Ctx): Outcome {
  requirePerm(db, a, 'publish');
  const m = moduleOf(db, args.id);
  return {
    db: produce(db, (d) => {
      const x = d.modules.find((y) => y.id === m.id)!;
      x.status = 'draft';
    }),
    toast: { msg: `${m.name} unpublished. Learners no longer see it.`, tone: 'success' },
  };
}

/**
 * 17 · Admin Module Builder: validate, normalize and upsert a draft (SCREENS §4.3).
 * Step ids are renumbered `c1…c6`, `build` becomes the sum of the step minutes and `short`
 * defaults to the name minus ` AI Employee`. Validation errors are joined with a newline, because
 * the builder renders them as a list but `Outcome.error` carries one string.
 */
export function saveModule(db: Db, a: Actor, args: { draft: AIEmployee; status?: ModuleStatus }, c: Ctx): Outcome {
  requirePerm(db, a, 'curriculum');
  // A deep copy, exactly as the builder's `JSON.parse(JSON.stringify(this.state.d))` does, so the
  // caller's draft object is never touched and the stored module shares no references with it.
  const m = JSON.parse(JSON.stringify(args.draft)) as AIEmployee;
  const publishing = args.status === 'published' || (args.status === undefined && m.status !== 'draft');
  if (publishing) requirePerm(db, a, 'publish');

  const errors: string[] = [];
  if (!(m.name || '').trim()) errors.push('Give the AI Employee a name.');
  if (publishing) {
    if (!(m.outcome || '').trim()) errors.push('Add the outcome line. Learners see it under the title.');
    if ((m.outputs || []).filter((o) => (o || '').trim()).length < 3) errors.push('Add all three outputs.');
    if ((m.prompt || '').trim().length < 40) errors.push('The system prompt is too short to publish.');
    if ((m.checklist || []).filter((s) => (s.text || '').trim()).length < 6)
      errors.push('Give all six build steps a title.');
  }
  if (errors.length) return { db, error: errors.join('\n') };

  if (args.status) m.status = args.status;
  if (m.status === 'published') m.opens = null;
  m.checklist = (m.checklist || []).map((s, i) => ({ ...s, id: 'c' + (i + 1) }));
  m.build = m.checklist.reduce((acc, s) => acc + (+s.mins || 0), 0);
  m.short = (m.short || '').trim() || m.name.replace(/ AI Employee$/, '');

  const s = staffOf(db, a);
  return {
    db: produce(db, (d) => {
      const i = d.modules.findIndex((x) => x.id === m.id);
      if (i >= 0) d.modules[i] = m;
      else d.modules.push(m);
      if (args.status === 'published') log(d, c.now, s.name, `published ${m.name}`, 'info');
    }),
    toast: {
      msg: args.status === 'published' ? `${m.name} is live in the learner portal` : `${m.name} saved`,
      tone: 'success',
    },
  };
}

/** 18 · Admin Module Builder: "Delete Draft". Only drafts can be deleted. */
export function deleteModule(db: Db, a: Actor, args: { id: string }, _c: Ctx): Outcome {
  requirePerm(db, a, 'curriculum');
  const m = moduleOf(db, args.id);
  if (m.status !== 'draft') throw new MutationError('invalid', 'Only drafts can be deleted. Unpublish it first.');
  return {
    db: produce(db, (d) => {
      d.modules = d.modules.filter((x) => x.id !== m.id);
    }),
    toast: { msg: `${m.name} deleted`, tone: 'success' },
  };
}

// ---------------------------------------------------------------------------
// 19-24 · Admin Cohorts & Sessions
// ---------------------------------------------------------------------------

const COHORT_SESSION_OFFSETS = [0, 2, 7, 9, 14, 16] as const;
const COHORT_SESSION_TITLES = [
  'The Autonomous Agent',
  'Speed to Lead',
  'The Living Database',
  'The Meeting That Runs Itself',
  'Numbers on Autopilot',
  'Contract to Close',
] as const;

/**
 * 19 · Admin Cohorts: the dashed "New Cohort" card (SCREENS §4.4).
 * Start = the first Tuesday at least 63 days after the latest cohort's start; 6 sessions at day
 * offsets [0, 2, 7, 9, 14, 16], 13:00 CT, 75 minutes.
 */
export function createCohort(db: Db, a: Actor, _args: Record<string, never>, c: Ctx): Outcome {
  requirePerm(db, a, 'cohorts');
  const last = db.cohorts.slice().sort((x, y) => y.start - x.start)[0];
  if (!last) throw new MutationError('invalid', 'There is no cohort to schedule from.');
  let t0 = last.start + 63 * 86400000;
  while (new Date(t0 - 6 * 3600e3).getUTCDay() !== 2) t0 += 86400000;
  const id = c.id('c');
  const name = new Date(t0).toLocaleDateString('en-US', {
    timeZone: PROGRAM_TZ,
    month: 'long',
    year: 'numeric',
  });
  return {
    db: produce(db, (d) => {
      d.cohorts.push({
        id,
        name,
        start: t0,
        end: t0 + 16 * 86400000 + 75 * 60000,
        status: 'draft',
        capacity: 200,
        enrolled: 0,
        cadence: 'Tue & Thu · 1:00 PM CT',
      });
      COHORT_SESSION_OFFSETS.forEach((o, i) =>
        d.sessions.push({
          id: `${id}-s${i + 1}`,
          cohortId: id,
          n: i + 1,
          title: COHORT_SESSION_TITLES[i]!,
          start: t0 + o * 86400000,
          mins: 75,
          // The reference reads `d.cohorts.length` after the push, so the new cohort counts.
          zoom: `https://zoom.us/j/${8841200610 + i * 1371 + d.cohorts.length * 97}`,
          live: false,
          attended: null,
          replay: null,
          views: 0,
        }),
      );
    }),
    toast: { msg: 'Draft cohort created with 6 sessions', tone: 'success' },
  };
}

/** 20 · Admin Cohorts: a draft cohort becomes visible on the sales page. */
export function openEnrollment(db: Db, a: Actor, args: { cohortId: string }, _c: Ctx): Outcome {
  requirePerm(db, a, 'cohorts');
  const co = cohortOf(db, args.cohortId);
  if (co.status !== 'draft') throw new MutationError('invalid', 'Only a draft cohort can open for enrollment.');
  return {
    db: produce(db, (d) => {
      const x = d.cohorts.find((y) => y.id === co.id)!;
      x.status = 'enrolling';
    }),
    toast: { msg: `${co.name} is open for enrollment`, tone: 'success' },
  };
}

/** 21 · Admin Cohorts: "Go Live". The portal's Join button turns on for everyone in the cohort. */
export function goLive(db: Db, a: Actor, args: { sessionId: string }, c: Ctx): Outcome {
  requirePerm(db, a, 'cohorts');
  const s = staffOf(db, a);
  const sess = sessionOf(db, args.sessionId);
  return {
    db: produce(db, (d) => {
      const x = d.sessions.find((y) => y.id === sess.id)!;
      x.live = true;
      log(d, c.now, s.name, `started Session ${x.n} · ${x.title}`, 'success');
    }),
    // The reference wrote “Join now.”; the spec's corrected copy matches the button.
    toast: { msg: `Session ${sess.n} is live. Learners see “Join Now.”`, tone: 'success' },
  };
}

/**
 * 22 · Admin Cohorts: "End Session". `start` is clamped back so the session reads as ended even if
 * it was started early, and attendance lands at 78% of the non-invited learner population.
 */
export function endSession(db: Db, a: Actor, args: { sessionId: string }, c: Ctx): Outcome {
  requirePerm(db, a, 'cohorts');
  const s = staffOf(db, a);
  const sess = sessionOf(db, args.sessionId);
  const learners = learnerCount(db);
  return {
    db: produce(db, (d) => {
      const x = d.sessions.find((y) => y.id === sess.id)!;
      x.live = false;
      x.start = Math.min(x.start, c.now - x.mins * 60000);
      x.attended = Math.round(learners * 0.78);
      x.replay = 'processing';
      log(d, c.now, s.name, `ended Session ${x.n} · ${x.title}`, 'info');
    }),
    toast: { msg: `Session ${sess.n} ended. Replay is processing.`, tone: 'success' },
  };
}

/**
 * 23 · Admin Cohorts: "Publish Replay". The linked AI Employee picks up a `dur` if it has none,
 * which is what turns its workspace into a replay player.
 */
export function publishReplay(db: Db, a: Actor, args: { sessionId: string; durationSec?: number }, c: Ctx): Outcome {
  requirePerm(db, a, 'cohorts');
  const s = staffOf(db, a);
  const sess = sessionOf(db, args.sessionId);
  return {
    db: produce(db, (d) => {
      const x = d.sessions.find((y) => y.id === sess.id)!;
      x.replay = 'ready';
      x.views = 0;
      const mm = d.modules.find((y) => y.session === x.n);
      if (mm && !mm.dur) mm.dur = args.durationSec ?? x.mins * 60 - 300;
      log(d, c.now, s.name, `published the Session ${x.n} replay`, 'info');
    }),
    toast: { msg: `Session ${sess.n} replay published to learners`, tone: 'success' },
  };
}

/** 24 · Admin Cohorts: the edit drawer. `date` and `time` are read as Central Time. */
export function updateSession(
  db: Db,
  a: Actor,
  args: { id: string; title: string; date: string; time: string; mins: number | string; zoom: string },
  c: Ctx,
): Outcome {
  requirePerm(db, a, 'cohorts');
  const s = staffOf(db, a);
  const sess = sessionOf(db, args.id);
  const start = fmt.fromCT(args.date, args.time);
  return {
    db: produce(db, (d) => {
      const x = d.sessions.find((y) => y.id === sess.id)!;
      x.title = args.title;
      x.start = isNaN(start) ? x.start : start;
      x.mins = parseInt(String(args.mins), 10) || x.mins;
      x.zoom = args.zoom;
      // The reference logs the NEW title, after the assignment above.
      log(d, c.now, s.name, `updated Session ${x.n} · ${x.title}`, 'info');
    }),
    toast: { msg: `Session ${sess.n} updated. Learners will be notified.`, tone: 'success' },
  };
}

// ---------------------------------------------------------------------------
// 25 · Admin Learners
// ---------------------------------------------------------------------------

/**
 * 25 · Admin Learners: the drawer's tier button. `upgradeUser` / `downgradeUser` mutate the db
 * they are handed, which is correct on an immer draft.
 */
export function setLearnerTier(db: Db, a: Actor, args: { userId: string; tier: Tier }, c: Ctx): Outcome {
  requirePerm(db, a, 'seats');
  const s = staffOf(db, a);
  const u = userOf(db, args.userId);
  const down = args.tier === 'agent';
  return {
    db: produce(db, (d) => {
      if (down) downgradeUser(d, u.id);
      else upgradeUser(d, u.id);
      log(
        d,
        c.now,
        s.name,
        `${down ? 'moved' : 'upgraded'} ${u.name} to ${down ? 'Agent' : 'Team'} Tier`,
        down ? 'info' : 'success',
      );
    }),
    toast: {
      msg: down ? `${u.name} moved to Agent Tier` : `${u.name} upgraded. Team modules unlocked in their portal.`,
      tone: 'success',
    },
  };
}

// ---------------------------------------------------------------------------
// 26-29 · Admin Resource Vault
// ---------------------------------------------------------------------------

/** 26 · Admin Vault: the upload drawer. Executive categories force Team access. */
export function uploadResource(
  db: Db,
  a: Actor,
  args: { title: string; desc?: string; cat: string; type: string; tier: Tier; file?: string | null },
  c: Ctx,
): Outcome {
  requirePerm(db, a, 'curriculum');
  const s = staffOf(db, a);
  const title = (args.title || '').trim();
  if (!title) return { db, error: 'Add a title.' };
  if (!args.file) return { db, error: 'Attach a file first.' };
  const exec = EXEC_CATEGORIES.includes(args.cat);
  const tier: Tier = exec ? 'team' : args.tier;
  return {
    db: produce(db, (d) => {
      d.resources.unshift({
        id: c.id('r'),
        title,
        desc: (args.desc || '').trim() || 'New resource',
        cat: args.cat,
        type: args.type,
        tier,
        size: args.type === 'PDF guide' ? '1.1 MB' : '12 KB',
        dl: 0,
        updated: c.now,
        exec,
        status: 'published',
      });
      log(d, c.now, s.name, `added “${title}” to the Resource Vault`, 'info');
    }),
    toast: { msg: `${title} published to the vault`, tone: 'success' },
  };
}

/** 27 · Admin Vault: the access pill toggles. Executive Vault items are always Team only. */
export function setResourceTier(db: Db, a: Actor, args: { id: string }, _c: Ctx): Outcome {
  requirePerm(db, a, 'curriculum');
  const r = resourceOf(db, args.id);
  if (r.exec) return { db, toast: { msg: 'Executive Vault items are Team only', tone: 'info' } };
  const team = r.tier === 'team';
  return {
    db: produce(db, (d) => {
      const x = d.resources.find((y) => y.id === r.id)!;
      x.tier = team ? 'agent' : 'team';
    }),
    toast: { msg: `${r.title}: ${team ? 'Agent + Team' : 'Team only'}`, tone: 'success' },
  };
}

/** 28 · Admin Vault: the published/hidden switch. */
export function setResourceStatus(db: Db, a: Actor, args: { id: string }, _c: Ctx): Outcome {
  requirePerm(db, a, 'curriculum');
  const r = resourceOf(db, args.id);
  const pub = r.status === 'published';
  return {
    db: produce(db, (d) => {
      const x = d.resources.find((y) => y.id === r.id)!;
      x.status = pub ? 'hidden' : 'published';
    }),
    toast: {
      msg: pub ? `${r.title} hidden from learners` : `${r.title} published`,
      tone: 'success',
    },
  };
}

/** 29 · Admin Vault: the row delete icon. */
export function deleteResource(db: Db, a: Actor, args: { id: string }, _c: Ctx): Outcome {
  requirePerm(db, a, 'curriculum');
  const r = resourceOf(db, args.id);
  return {
    db: produce(db, (d) => {
      d.resources = d.resources.filter((x) => x.id !== r.id);
    }),
    toast: { msg: `${r.title} deleted`, tone: 'success' },
  };
}

// ---------------------------------------------------------------------------
// 30-31 · Admin Announcements
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  '': '',
  calendar: 'Update Calendar',
  sessions: 'Open Sessions',
};

/** 30 · Admin Announcements: the composer. Send now, or schedule for a Central Time instant. */
export function sendAnnouncement(
  db: Db,
  a: Actor,
  args: {
    title: string;
    body: string;
    audience: Announcement['audience'];
    inapp: boolean;
    email: boolean;
    when: 'now' | 'later';
    at?: string;
    severity?: Announcement['severity'];
    action?: Announcement['action'] | '';
  },
  c: Ctx,
): Outcome {
  requirePerm(db, a, 'announce');
  const s = staffOf(db, a);
  const title = (args.title || '').trim(),
    body = (args.body || '').trim();
  if (!title || !body) return { db, error: 'Add a title and a message.' };
  if (!args.inapp && !args.email) return { db, error: 'Pick at least one channel.' };
  const sched = args.when === 'later';
  const parsed = Date.parse(`${args.at}:00-06:00`);
  // `at` is the composer's datetime-local value, read as Central Time. An unusable value falls
  // back to `now` rather than writing NaN into the row.
  const at = sched ? (isNaN(parsed) ? c.now : parsed) : c.now;
  const B = db.base,
    users = db.users.filter((u) => u.status !== 'invited');
  const counts: Record<Announcement['audience'], number> = {
    all: B.learners + users.length,
    agent: B.agent + users.filter((u) => u.tier === 'agent').length,
    team: B.teamSeats + users.filter((u) => u.tier === 'team').length,
    owners: B.teams + db.teams.length,
  };
  const action = args.action || null;
  const channels: ('inapp' | 'email')[] = [];
  if (args.inapp) channels.push('inapp');
  if (args.email) channels.push('email');
  return {
    db: produce(db, (d) => {
      d.announcements.unshift({
        id: c.id('a'),
        title,
        body,
        audience: args.audience,
        channels,
        severity: args.severity || 'info',
        action,
        actionLabel: ACTION_LABELS[action || ''] ?? '',
        status: sched ? 'scheduled' : 'sent',
        at,
        opens: sched ? null : 0,
      });
      log(d, c.now, s.name, `${sched ? 'scheduled' : 'sent'} “${title}”`, 'info');
    }),
    toast: {
      msg: sched
        ? `Scheduled for ${fmt.day(at)}`
        : `Sent to ${fmt.num(counts[args.audience])} ${
            args.audience === 'owners' ? 'team owners' : 'learners'
          }${args.inapp ? '. The banner is live on their dashboards.' : ''}`,
      tone: 'success',
    },
  };
}

/** 31 · Admin Announcements: an automated reminder switch. */
export function toggleReminder(db: Db, a: Actor, args: { id: string }, _c: Ctx): Outcome {
  requirePerm(db, a, 'announce');
  const r = reminderOf(db, args.id);
  return {
    db: produce(db, (d) => {
      const x = d.reminders.find((y) => y.id === r.id)!;
      x.on = !x.on;
    }),
    toast: { msg: `${r.label}: ${r.on ? 'off' : 'on'}`, tone: 'info' },
  };
}

// ---------------------------------------------------------------------------
// 32-33 · Admin Tiers & Upgrades
// ---------------------------------------------------------------------------

/** 32 · Admin Tiers: the inline price input. A non-positive price is ignored, as in the reference. */
export function setTierPrice(db: Db, a: Actor, args: { tierId: string; price: number }, _c: Ctx): Outcome {
  requirePerm(db, a, 'billing');
  const t = tierDefOf(db, args.tierId);
  if (!(args.price > 0)) return { db };
  return {
    db: produce(db, (d) => {
      const x = d.tiers.find((y) => y.id === t.id)!;
      x.price = args.price;
    }),
  };
}

/** 33 · Admin Tiers: an upgrade request's row actions. 'converted' also runs `upgradeUser`. */
export function setRequestStatus(
  db: Db,
  a: Actor,
  args: { id: string; status: UpgradeRequest['status'] },
  c: Ctx,
): Outcome {
  requirePerm(db, a, 'billing');
  const s = staffOf(db, a);
  const q = requestOf(db, args.id);
  if (args.status === 'converted' && !q.userId)
    throw new MutationError('invalid', 'This request has no learner account to upgrade.');
  const next = produce(db, (d) => {
    const x = d.requests.find((y) => y.id === q.id)!;
    x.status = args.status;
    if (args.status === 'converted') {
      upgradeUser(d, q.userId!);
      log(d, c.now, s.name, `upgraded ${q.name} to Team Tier`, 'success');
    }
  });
  if (args.status === 'contacted')
    return { db: next, toast: { msg: `${q.name} marked as contacted`, tone: 'success' } };
  if (args.status === 'converted')
    return {
      db: next,
      toast: {
        msg: `${q.name} is on Team Tier. All six AI Employees are unlocked in their portal.`,
        tone: 'success',
      },
    };
  if (args.status === 'closed') return { db: next, toast: { msg: 'Request closed', tone: 'info' } };
  return { db: next };
}

// ---------------------------------------------------------------------------
// 34-37 · Admin Staff & Roles
// ---------------------------------------------------------------------------

/** 34 · Admin Staff: invite a staff member. The name is derived from the email. */
export function inviteStaff(db: Db, a: Actor, args: { email: string; role: StaffRole }, c: Ctx): Outcome {
  requirePerm(db, a, 'staff');
  const email = (args.email || '').trim();
  if (!EMAIL_RE.test(email)) return { db, error: 'Enter a valid email address.' };
  if (db.staff.some((s) => s.email.toLowerCase() === email.toLowerCase()))
    return { db, error: 'That person is already on staff.' };
  const name = nameFromEmail(email);
  return {
    db: produce(db, (d) => {
      d.staff.push({ id: c.id('st'), name, email, role: args.role, last: null });
    }),
    toast: { msg: `Invite sent to ${email}`, tone: 'success' },
  };
}

/** 35 · Admin Staff: the row's role select. The Owner's role is fixed. */
export function setStaffRole(db: Db, a: Actor, args: { id: string; role: StaffRole }, _c: Ctx): Outcome {
  requirePerm(db, a, 'staff');
  const s = staffMemberOf(db, args.id);
  if (s.role === 'Owner') throw new MutationError('forbidden', 'The owner’s role is fixed.');
  return {
    db: produce(db, (d) => {
      const x = d.staff.find((y) => y.id === s.id)!;
      x.role = args.role;
    }),
    toast: { msg: `${s.name} is now ${args.role}`, tone: 'success' },
  };
}

/** 36 · Admin Staff: remove a staff member. The Owner cannot be removed — an info toast, no throw. */
export function removeStaff(db: Db, a: Actor, args: { id: string }, _c: Ctx): Outcome {
  requirePerm(db, a, 'staff');
  const s = staffMemberOf(db, args.id);
  if (s.role === 'Owner') return { db, toast: { msg: 'The owner can’t be removed', tone: 'info' } };
  return {
    db: produce(db, (d) => {
      d.staff = d.staff.filter((x) => x.id !== s.id);
    }),
    toast: { msg: `${s.name} removed`, tone: 'success' },
  };
}

/** 37 · Admin Staff: a cell in the permissions matrix. The Owner column is fixed. */
export function togglePermission(db: Db, a: Actor, args: { role: StaffRole; perm: PermKey }, _c: Ctx): Outcome {
  requirePerm(db, a, 'staff');
  if (args.role === 'Owner') throw new MutationError('forbidden', 'Owner permissions are fixed.');
  const on = !!db.perms[args.role]?.[args.perm];
  return {
    db: produce(db, (d) => {
      if (!d.perms[args.role]) d.perms[args.role] = {} as Record<PermKey, 0 | 1>;
      d.perms[args.role][args.perm] = on ? 0 : 1;
    }),
    toast: { msg: `${args.role}: ${permLabel(args.perm)} ${on ? 'off' : 'on'}`, tone: 'info' },
  };
}
