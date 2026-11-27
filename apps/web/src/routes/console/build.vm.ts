// /admin/build on R2 (D-169, spec § 7.2): the Build hub. The mockup draws no frame for it, so it is
// built from R2's parts (Card, list rows, KV, Table, Status): links to the five existing builder
// screens, the cohort's card (its cap shown locked: D-154's 15 seats, view only) and the skill
// library, read-only. Pure: the screen renders what this returns.
//
// REAL DATA, NO "SIX WEEKS". The R1 mock's hub said "Six weeks. Each week builds one AI Employee."; here
// the weeks are the cohort's own (`cohorts.weeks`, else the number of its live sessions), and every
// count is the snapshot's. Each builder row says what the mockup's own page head says about it.

import { COHORT_SEATS } from '@ai/core/offer';
import {
  SKILL_SET_SHORT,
  SKILL_STATUS_LABELS,
  adminDate,
  adminWhen,
  courseOpensAt,
  curriculumWeekAt,
  curriculumWeeks,
} from '@ai/core';
import type { AdminStatus, ConsoleSkillRow, Db, IconName } from '@ai/core';

export const BUILD_COPY = {
  title: 'Build',
  description: 'The builder screens, the skill library and the cohort, in one place.',
  screens: 'Builder screens',
  skills: 'Skills',
  skillsEmpty: 'No skills yet',
  more: 'Load more',
  columns: { skill: 'Skill', set: 'Set', access: 'Access', status: 'Status', released: 'Released' },
  free: 'Free',
  plan: 'Plan',
  cohort: {
    opens: 'Opens',
    weeks: 'Weeks',
    week: 'Week',
    enrolled: 'Enrolled',
    cadence: 'Cadence',
    cap: 'Seat cap',
    notStarted: 'Not started',
  },
  noCohort: 'No cohort yet',
} as const;

const C = BUILD_COPY;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export interface BuildLinkVM {
  key: string;
  label: string;
  icon: IconName;
  to: string;
  description: string;
  meta: string | null;
}

export interface BuildCohortVM {
  name: string;
  status: AdminStatus;
  rows: { label: string; value: string }[];
  /** "15 seats. Product rule, view only." (Billing's words, D-163), drawn with the lock. */
  cap: string;
}

export interface BuildHubVM {
  links: BuildLinkVM[];
  cohort: BuildCohortVM | null;
}

const WEEK = 7 * 864e5;

export function buildHubVM(db: Db, now: number, cohortId: string): BuildHubVM {
  const co = db.cohorts.find((c) => c.id === cohortId) ?? db.cohorts[0] ?? null;
  const sessions = co ? db.sessions.filter((s) => s.cohortId === co.id) : [];
  const drafts = db.modules.filter((m) => m.status === 'draft').length;
  const links: BuildLinkVM[] = [
    {
      key: 'curriculum',
      label: 'Curriculum',
      icon: 'r2Curriculum',
      to: '/admin/curriculum',
      description: 'Every AI Employee, in order, with its tier access and status.',
      meta: `${plural(db.modules.length, 'AI Employee')} · ${drafts} draft`,
    },
    {
      key: 'builder',
      label: 'Module Builder',
      icon: 'r2Builder',
      to: '/admin/curriculum/new',
      description: 'Edit one AI Employee: its steps, files, tier access, and live session.',
      meta: null,
    },
    {
      key: 'vault',
      label: 'Resource Vault',
      icon: 'r2Vault',
      to: '/admin/vault',
      description: 'Files, replays, prompts, and checklists learners can open from the portal.',
      meta: plural(db.resources.length, 'resource'),
    },
    {
      key: 'cohorts',
      label: 'Cohorts & Sessions',
      icon: 'r2Cohorts',
      to: '/admin/cohorts',
      description: 'The cohort calendar and each live build on Zoom.',
      meta: plural(sessions.length, 'session'),
    },
    {
      key: 'announce',
      label: 'Announcements',
      icon: 'r2Announce',
      to: '/admin/announcements',
      description: 'Messages to learners in the portal and by email.',
      meta: plural(db.announcements.length, 'announcement'),
    },
  ];
  if (!co) return { links, cohort: null };
  // The cohort's own length: its `weeks`, else one week per live session. Never a number typed here.
  const weeks = co.weeks ?? sessions.length;
  const started = now >= co.start;
  // Same rule as Cohorts & Sessions: a course week is the curriculum's, and Opens is the earliest
  // week's Opens. With no course (the prototype), both stay the cohort start and the day count.
  const courseWeeks = curriculumWeeks(db.modules);
  const dated = courseWeeks.some((w) => w.week > 0 && w.opens != null);
  const counted = Math.max(1, Math.floor((now - co.start) / WEEK) + 1);
  const current = dated ? curriculumWeekAt(courseWeeks, now) : started ? Math.min(weeks, counted) : 0;
  return {
    links,
    cohort: {
      name: co.name,
      status:
        co.status === 'completed'
          ? { label: 'Completed', tone: 'off' }
          : started && co.status === 'live'
            ? { label: 'Active', tone: 'ok' }
            : { label: 'Scheduled', tone: 'info' },
      rows: [
        { label: C.cohort.opens, value: adminWhen(courseOpensAt(courseWeeks) ?? co.start) },
        { label: C.cohort.weeks, value: plural(weeks, 'weekly live build') },
        { label: C.cohort.week, value: current < 1 ? C.cohort.notStarted : `${Math.min(weeks, current)} of ${weeks}` },
        { label: C.cohort.enrolled, value: plural(co.enrolled, 'learner') },
        { label: C.cohort.cadence, value: co.cadence },
      ],
      cap: `${COHORT_SEATS} seats. Product rule, view only.`,
    },
  };
}

export interface SkillVM {
  id: string;
  title: string;
  set: string;
  access: string;
  status: AdminStatus;
  released: string;
}

const SKILL_TONE: Record<ConsoleSkillRow['status'], AdminStatus['tone']> = {
  published: 'ok',
  draft: 'off',
  hidden: 'off',
};

export const skillVM = (r: ConsoleSkillRow): SkillVM => ({
  id: r.id,
  title: r.title,
  set: SKILL_SET_SHORT[r.sets],
  access: r.free ? C.free : C.plan,
  status: { label: SKILL_STATUS_LABELS[r.status], tone: SKILL_TONE[r.status] },
  released: adminDate(r.releasedAt),
});
