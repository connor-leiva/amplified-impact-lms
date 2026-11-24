// The learner portal v2's Account page (D-178), artboard 8 of the signed-off mockup: the plan, its seats,
// the profile and what the plan includes.
//
// PURE. No React, no clock, no fetch. Built only from reads that already exist:
//
//   GET /api/skills         the account's bought plans (kind, status, paid through), the access groups the
//                           viewer's verified address holds, and each published skill's state for them
//   GET /api/auth/password  whether the viewer has a password, and when it was last set
//   GET /api/snapshot       the viewer's own row (name, email, role), their team (its seats) and its roster
//                           (who is still invited, and since when)
//   GET /api/course         the course's sessions, for the cohort's live dates and what the plan includes
//
// No Stripe read and no Stripe write: amounts, receipts and the card stay in Stripe's billing portal,
// which "Manage billing" opens (`GET /api/billing/portal`, the account owner's). A date about the plan is
// said in billing's zone (`BILLING_TZ`), as the offer pages and Stripe say it. The only words here are
// generic chrome from the mockup (`ACCOUNT`) and templates around numbers and dates the data holds; the
// plan's name is billing's own (`PLAN_NAMES`). No time-zone picker (the brief: Mountain only).

import { fmt } from '@ai/core';
import type { Db, Learner } from '@ai/core';
import { ACCELERATOR_COHORT_ID } from '@ai/core/accelerator';
import { dateYear, dayYear, monthYear } from '@ai/core/learner';
import { BILLING_TZ, PLAN_KINDS, PLAN_NAMES } from '@ai/core/offer';
import type { PlanKind } from '@ai/core/offer';
import type { CourseSession } from '../course/Course.vm';
import type { CourseLoad } from './data';

/** Generic chrome, from the mockup (artboard 8). */
export const ACCOUNT = {
  title: 'Account',
  lede: 'Your plan, your profile and your receipts.',
  /** The lede without receipts, for a viewer who has no billing to open (it is where the receipts are). */
  ledeNoBilling: 'Your plan and your profile.',
  yourPlan: 'Your plan',
  manageBilling: 'Manage billing',
  seats: 'Seats',
  resend: 'Resend invite',
  profile: 'Profile',
  fullName: 'Full name',
  email: 'Email',
  emailHint: 'You sign in with this.',
  role: 'Role',
  roleHint: 'Your AI Implementer gets the second seat.',
  password: 'Password',
  changePassword: 'Change password',
  included: 'What’s included',
  loading: 'Loading your account',
} as const;

export const BILLING_PORTAL = '/api/billing/portal';
/** The current password page (D-132): it sets a first password or changes one, and stays the one place to. */
export const PASSWORD_PAGE = '/account';

/** A plan as `GET /api/skills` reports it: bought plans only (an access group's grant is not billed). */
export interface BillingPlan {
  kind: string;
  status: string;
  paidThrough: number | null;
}

export interface BillingSkill {
  sets: 'owner_ops' | 'agent' | 'both';
  state: 'open' | 'locked' | 'upcoming';
}

/** What the Account page reads from `GET /api/skills`. */
export interface BillingRead {
  plans: BillingPlan[];
  accessGroups: { id: string; name: string }[];
  skills: BillingSkill[];
}

/** What it reads from `GET /api/auth/password`. */
export interface PasswordRead {
  hasPassword: boolean;
  changedAt: number | null;
}

/** Both reads; either is null when it didn't answer (signed out, the fixture build, a failure). */
export interface AccountRead {
  billing: BillingRead | null;
  password: PasswordRead | null;
}

export interface PlanVM {
  eyebrow: string;
  name: string;
  /** "December 2026 cohort · Live Dec 2 to Feb 4 · Included through Tue, May 4, 2027", or null. */
  line: string | null;
  billing: { label: string; href: string } | null;
}

export interface SeatsVM {
  label: string;
  used: number;
  /** "of 2 in use". */
  of: string;
  /** One per seat: true while it is taken by someone who has joined. */
  segments: boolean[];
  /** "AI Implementer invite sent Nov 16, not accepted yet", or null when nobody is waiting. */
  note: string | null;
  /** Resend, for the one invite waiting, when the viewer may invite. */
  resend: { label: string; email: string } | null;
}

export interface ProfileVM {
  heading: string;
  name: { label: string; value: string };
  email: { label: string; value: string; hint: string };
  role: { label: string; value: string; hint: string | null } | null;
  password: { label: string; changed: string | null; action: { label: string; href: string } } | null;
}

export interface AccountVM {
  title: string;
  lede: string;
  plan: PlanVM | null;
  seats: SeatsVM | null;
  profile: ProfileVM;
  included: { heading: string; items: string[] } | null;
}

/** A role as the mockup writes it: sentence case, and the second seat's holder is the AI Implementer (D-242). */
const ROLE_LABEL: Record<Learner['role'], string> = {
  'Team Owner': 'Team owner',
  'Operations Lead': 'AI Implementer',
  'Sales Agent': 'Sales agent',
  Agent: 'Agent',
};

/** Who an invite is for, as the seats note names them. */
const INVITEE: Record<Learner['role'], string> = {
  'Team Owner': 'Owner',
  'Operations Lead': 'AI Implementer',
  'Sales Agent': 'Agent',
  Agent: 'Agent',
};


const isPlanKind = (k: string): k is PlanKind => (PLAN_KINDS as readonly string[]).includes(k);

/** The plan the page leads with: the AI Accelerator first, then any other that hasn't ended. */
export function leadPlan(plans: readonly BillingPlan[]): (BillingPlan & { kind: PlanKind }) | null {
  const known = plans.filter((p): p is BillingPlan & { kind: PlanKind } => isPlanKind(p.kind));
  const live = known.filter((p) => p.status !== 'ended');
  return live.find((p) => p.kind === 'cohort') ?? live[0] ?? known[0] ?? null;
}

/** "Live Dec 2 to Feb 4": the course's first and last session, in the viewer's zone. */
export function liveRange(sessions: readonly CourseSession[]): string | null {
  if (!sessions.length) return null;
  const starts = sessions.map((s) => s.start);
  return `Live ${fmt.date(Math.min(...starts))} to ${fmt.date(Math.max(...starts))}`;
}

/** The one value every item shares, or null when they differ (or there are none). */
const same = <T>(xs: readonly T[]): T | null => (xs.length && xs.every((x) => x === xs[0]) ? xs[0]! : null);

/** "8 live builds, 90 minutes each", from the course's build sessions. */
export function buildsLine(sessions: readonly CourseSession[]): string | null {
  const builds = sessions.filter((s) => s.kind === 'build');
  if (!builds.length) return null;
  const mins = same(builds.map((s) => s.mins));
  const n = `${builds.length} live build${builds.length === 1 ? '' : 's'}`;
  return mins ? `${n}, ${mins} minutes each` : n;
}

/**
 * Office hours, from the course's office-hours sessions: "Office hours every Thursday, 60 minutes" when
 * they all fall on one weekday, else "10 office hours, 60 minutes each".
 */
export function officeHoursLine(sessions: readonly CourseSession[]): string | null {
  const oh = sessions.filter((s) => s.kind === 'office_hours');
  if (!oh.length) return null;
  const mins = same(oh.map((s) => s.mins));
  const day = same(oh.map((s) => fmt.weekday(s.start)));
  if (day && oh.length > 1) return mins ? `Office hours every ${day}, ${mins} minutes` : `Office hours every ${day}`;
  const n = `${oh.length} office hour${oh.length === 1 ? '' : 's'}`;
  return mins ? `${n}, ${mins} minutes each` : n;
}

/** "All 53 skills, owner and agent": the skills the viewer's plan opens now or will, and for whom. */
export function skillsLine(skills: readonly BillingSkill[]): string | null {
  const mine = skills.filter((s) => s.state !== 'locked');
  if (!mine.length) return null;
  const owner = mine.some((s) => s.sets === 'owner_ops');
  const agent = mine.some((s) => s.sets === 'agent');
  const who = owner && agent ? 'owner and agent' : owner ? 'owner' : agent ? 'agent' : null;
  const n = `${mine.length} skill${mine.length === 1 ? '' : 's'}`;
  const count = mine.length === skills.length ? `All ${n}` : n;
  return who ? `${count}, ${who}` : count;
}

function planVM(read: AccountRead, me: Learner | null, db: Pick<Db, 'cohorts'>, course: CourseLoad): PlanVM | null {
  const billing = read.billing;
  if (!billing) return null;
  const plan = leadPlan(billing.plans);
  const owner = me?.role === 'Team Owner';
  if (plan) {
    const line: string[] = [];
    if (plan.kind === 'cohort') {
      const cohort = db.cohorts.find((c) => c.id === (me?.cohortId ?? ACCELERATOR_COHORT_ID));
      if (cohort) line.push(`${monthYear(cohort.start)} cohort`);
      const range = course.kind === 'ready' ? liveRange(course.payload.sessions) : null;
      if (range) line.push(range);
      if (plan.paidThrough !== null) line.push(`Included through ${dayYear(plan.paidThrough, BILLING_TZ)}`);
    }
    return {
      eyebrow: ACCOUNT.yourPlan,
      name: PLAN_NAMES[plan.kind],
      line: line.length ? line.join(' · ') : null,
      // The account owner's alone: the portal route turns anyone else away (D-077).
      billing: owner ? { label: ACCOUNT.manageBilling, href: BILLING_PORTAL } : null,
    };
  }
  // D-148: access through a group (Utah Life), not a plan to bill. The Skill Library's own words.
  const group = billing.accessGroups[0];
  if (group) return { eyebrow: ACCOUNT.yourPlan, name: `Included with your ${group.name} team`, line: null, billing: null };
  return null;
}

function seatsVM(db: Pick<Db, 'teams' | 'users'>, me: Learner | null): SeatsVM | null {
  if (!me?.teamId) return null;
  const team = db.teams.find((t) => t.id === me.teamId);
  if (!team || team.seats < 2) return null;
  const roster = db.users.filter((u) => u.teamId === team.id);
  const used = roster.filter((u) => u.status !== 'invited').length;
  const waiting = roster.filter((u) => u.status === 'invited');
  const one = waiting.length === 1 ? waiting[0]! : null;
  const note = one
    ? `${INVITEE[one.role]} invite sent ${fmt.date(one.joined)}, not accepted yet`
    : waiting.length > 1
      ? `${waiting.length} invites sent, not accepted yet`
      : null;
  return {
    label: ACCOUNT.seats,
    used,
    of: `of ${team.seats} in use`,
    segments: Array.from({ length: team.seats }, (_, i) => i < used),
    note,
    // No Resend invite yet: the API has no route that resends a team invite (Team Hub's button only
    // confirms), and a page that says "resent" when nothing was sent misleads the owner. Hidden until the
    // PM picks a real resend or none (D-178).
    resend: null,
  };
}

function profileVM(read: AccountRead, db: Pick<Db, 'teams'>, me: Learner | null): ProfileVM {
  const team = me?.teamId ? db.teams.find((t) => t.id === me.teamId) : undefined;
  return {
    heading: ACCOUNT.profile,
    name: { label: ACCOUNT.fullName, value: me?.name ?? '' },
    email: { label: ACCOUNT.email, value: me?.email ?? '', hint: ACCOUNT.emailHint },
    role: me
      ? {
          label: ACCOUNT.role,
          value: ROLE_LABEL[me.role],
          // A team of two is the owner and their AI Implementer (the AI Accelerator's seats).
          hint: me.role === 'Team Owner' && team?.seats === 2 ? ACCOUNT.roleHint : null,
        }
      : null,
    password: read.password
      ? {
          label: ACCOUNT.password,
          changed: read.password.changedAt !== null ? `Last changed ${dateYear(read.password.changedAt)}` : null,
          action: { label: ACCOUNT.changePassword, href: PASSWORD_PAGE },
        }
      : null,
  };
}

function includedVM(read: AccountRead, course: CourseLoad): AccountVM['included'] {
  const billing = read.billing;
  if (!billing) return null;
  const plan = leadPlan(billing.plans);
  const items: (string | null)[] = [];
  if (plan?.kind === 'cohort' && course.kind === 'ready') {
    items.push(buildsLine(course.payload.sessions), officeHoursLine(course.payload.sessions));
  }
  items.push(skillsLine(billing.skills));
  if (plan?.kind === 'cohort' && plan.paidThrough !== null) items.push(`New skills and office hours through ${dateYear(plan.paidThrough, BILLING_TZ)}`);
  const list = items.filter((x): x is string => !!x);
  return list.length ? { heading: ACCOUNT.included, items: list } : null;
}

export function accountVM(read: AccountRead, db: Pick<Db, 'cohorts' | 'teams' | 'users'>, me: Learner | null, course: CourseLoad): AccountVM {
  const plan = planVM(read, me, db, course);
  return {
    title: ACCOUNT.title,
    lede: plan?.billing ? ACCOUNT.lede : ACCOUNT.ledeNoBilling,
    plan,
    seats: seatsVM(db, me),
    profile: profileVM(read, db, me),
    included: includedVM(read, course),
  };
}
