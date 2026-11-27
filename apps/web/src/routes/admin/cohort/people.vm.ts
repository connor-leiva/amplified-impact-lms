// R-5 Phase 7 (D-268): Cohort › People (the mockup's `CohortPeople`, handoff/admin-mockup/p3-cohort.jsx). PURE.
//
// The cohort's roster by the one rule (D-267: `rosterTeams`, `rosterLearners`), its Teams first and its Learners: each
// team's people signed in of its seats, Paid and Intake (the cohort facts' `teamRows`), its progress on the week the
// cohort is on (the run's: the last week that has opened, else its first, Week 0 before Week 1 opens) and when it was
// last active. The learner list reads the run, not a module's dates. Every time prints MT / CT (`adminStamp`).

import { buildOf, cohortRun, csv, enrollmentOpen, rosterLearners, rosterTeams, adminStamp } from '@ai/core';
import type { CohortFacts, Db, Learner } from '@ai/core';

export const COHORT_PEOPLE_COPY = {
  teams: 'Teams',
  learners: 'Learners',
  section: 'Section',
  findTeam: 'Find a team',
  findPerson: 'Find a person',
  export: 'Export',
  exported: 'Exported as CSV',
  columns: { team: 'Team', people: 'People', paid: 'Paid', intake: 'Intake', last: 'Last active', learner: 'Learner', seat: 'Seat' },
  signedIn: (n: number, of: number) => `${n} of ${of} signed in`,
  paid: 'Paid',
  twoOf: (n: number) => `${n} of 2 payments`,
  comped: 'Comped',
  none: 'None',
  intake: { submitted: 'Submitted', draft: 'Draft', not_started: 'Not started' },
  neverSignedIn: 'Never signed in',
  never: 'Never',
  invited: 'Invited, not signed in',
  of: (n: number, total: number) => `${n} of ${total}`,
  menu: { open: 'Open team', intake: 'Read their intake', turnedIn: 'What they turned in', details: 'Open learner details', person: 'Open person' },
  roster: 'This is the cohort’s roster: who is in it and how far along they are. For a sign-in, a plan or a seat, open the person or the team.',
  showing: (n: number, of: number) => `Showing ${n} of ${of}.`,
  empty: {
    title: 'No one is enrolled yet',
    open: 'Enrollment is open. The first team to buy a seat shows up here.',
    closed: 'Enrollment is closed. Open it from Overview, and a team that buys a seat is placed here.',
  },
} as const;

export type StatusTone = 'ok' | 'info' | 'warn' | 'bad' | 'off' | 'neutral';

export interface CohortWeekVM {
  n: number;
  label: string;
  moduleId: string;
}

export interface CohortTeamRowVM {
  id: string;
  name: string;
  owner: string;
  people: string;
  pay: { label: string; tone: StatusTone; pill: boolean } | null;
  intake: { label: string; tone: StatusTone };
  done: number;
  total: number;
  last: string;
  lastAt: number;
}

export interface CohortLearnerRowVM {
  id: string;
  name: string;
  email: string;
  team: string;
  teamId: string | null;
  seat: string;
  done: number;
  total: number;
  last: string;
  lastAt: number;
  invited: boolean;
}

export interface CohortPeopleVM {
  week: CohortWeekVM | null;
  cap: number;
  teamsCount: number;
  learnersCount: number;
  teams: CohortTeamRowVM[];
  learners: CohortLearnerRowVM[];
  enrolling: boolean;
  csv: { name: string; text: string };
}

/** The week the cohort is on, by its run: the last that has opened, else its first. Null for a run with no week. */
export function currentWeekOf(db: Db, cohortId: string, now: number): CohortWeekVM | null {
  const run = cohortRun(db, cohortId);
  if (!run.length) return null;
  const opened = run.filter((w) => w.opensAt !== null && w.opensAt <= now);
  const w = opened[opened.length - 1] ?? run[0]!;
  return { n: w.n, label: `Week ${w.n}`, moduleId: w.module.id };
}

export function cohortPeopleVM(db: Db, cohortId: string, now: number, facts: CohortFacts | null, q = ''): CohortPeopleVM {
  const C = COHORT_PEOPLE_COPY;
  const co = db.cohorts.find((c) => c.id === cohortId) ?? null;
  const week = currentWeekOf(db, cohortId, now);
  const mod = week ? cohortRun(db, cohortId).find((w) => w.module.id === week.moduleId)?.module : undefined;
  const progress = (u: Pick<Learner, 'progress'>) => (mod ? buildOf(u as Learner, mod) : { n: 0, total: 0 });
  const total = progress({ progress: {} }).total;
  const people = rosterLearners(db, cohortId);
  const teams = rosterTeams(db, cohortId);
  const ql = q.trim().toLowerCase();
  const teamRows = teams.map((t): CohortTeamRowVM => {
    const members = db.users.filter((u) => u.teamId === t.id);
    const signed = members.filter((u) => u.status !== 'invited' && !!u.last);
    const row = facts?.teamRows?.[t.id];
    const lastAt = Math.max(0, ...members.map((u) => u.last ?? 0));
    const intake = row?.intake ?? 'not_started';
    return {
      id: t.id,
      name: t.name,
      owner: db.users.find((u) => u.id === t.ownerId)?.name ?? C.none,
      people: C.signedIn(signed.length, t.seats),
      pay: !row?.pay
        ? null
        : row.pay === 'comp'
          ? { label: C.comped, tone: 'info', pill: true }
          : row.pay === 'two_pay' && row.paymentsMade < 2
            ? { label: C.twoOf(row.paymentsMade), tone: 'info', pill: true }
            : { label: C.paid, tone: 'ok', pill: false },
      intake: { label: C.intake[intake], tone: intake === 'submitted' ? 'ok' : intake === 'draft' ? 'warn' : 'off' },
      done: members.reduce((a, u) => Math.max(a, progress(u).n), 0),
      total,
      last: lastAt ? adminStamp(lastAt) : C.neverSignedIn,
      lastAt,
    };
  });
  const learnerRows = people.map((u): CohortLearnerRowVM => {
    const team = u.teamId ? db.teams.find((t) => t.id === u.teamId) : undefined;
    const invited = u.status === 'invited';
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      team: team?.name ?? C.none,
      teamId: team?.id ?? null,
      seat: u.role || C.none,
      done: progress(u).n,
      total,
      last: invited ? C.invited : u.last ? adminStamp(u.last) : C.never,
      lastAt: u.last ?? 0,
      invited,
    };
  });
  return {
    week,
    cap: co?.capacity ?? 0,
    teamsCount: db.base.teams + teams.length,
    learnersCount: people.filter((u) => u.test !== true).length,
    teams: teamRows.filter((t) => !ql || `${t.name} ${t.owner}`.toLowerCase().includes(ql)),
    learners: learnerRows.filter((u) => !ql || `${u.name} ${u.email} ${u.team}`.toLowerCase().includes(ql)),
    enrolling: co ? enrollmentOpen(co) : false,
    csv: {
      name: `cohort-roster-${cohortId}.csv`,
      text: csv([
        ['Team', 'Learner', 'Email', 'Seat', week ? week.label : 'Progress', 'Last active'],
        ...learnerRows.map((u) => [u.team, u.name, u.email, u.seat, C.of(u.done, u.total), u.lastAt ? new Date(u.lastAt).toISOString() : '']),
      ]),
    },
  };
}
