// R-5 Phase 7 (D-268): Cohort › Submissions (the mockup's `CohortSubs`, handoff/admin-mockup/p3-cohort.jsx, with
// `FormsIntake`, `IntakeTab`, `FormsTurnedIn` and `TurnedInTab` from new-screens.jsx). PURE.
//
// Four views over what exists: the Week 0 intake of every team in the cohort's roster (`team_intake`, through
// `GET /api/admin/cohorts/:id/intake`), added up and team by team; and what teams turned in (`submissions`, the
// `ADMIN_SUBMISSIONS_PATH` route, one week at a time), by step and every file. A turn-in's status is staff's alone and is
// set where it always was (`SubmissionsCard`, D-237), whose files-deleted line keeps its rule. Every time prints MT / CT.

import { cohortRun, adminStamp } from '@ai/core';
import type { CohortIntakeRow, Db } from '@ai/core';
import type { CourseIntake, IntakeQuestion } from '@ai/core/course-types';
import { SUBMISSION_KIND_LABEL, asksOf, isSubmissionKind } from '@ai/core/submissions';
import type { SubmissionStatus } from '@ai/core/submissions';

export type SubsView = 'intake' | 'teams' | 'asks' | 'files';
export const SUBS_VIEWS: readonly SubsView[] = ['intake', 'teams', 'asks', 'files'];
export const isSubsView = (v: string | null): v is SubsView => !!v && (SUBS_VIEWS as readonly string[]).includes(v);

export const SUBS_COPY = {
  views: { intake: 'Intake, added up', teams: 'Intake, team by team', asks: 'Turned in, by step', files: 'Turned in, every file' },
  section: 'View',
  export: 'Export CSV',
  exported: 'Exported as CSV',
  quiet: 'Intake answers and turned-in files show up here once teams are enrolled.',
  facts: { form: 'Form', submitted: 'Submitted', draft: 'In draft', notStarted: 'Not started', ghl: 'GHL' },
  form: (n: number) => `Week 0 Intake · ${n} questions`,
  ofTeams: (n: number, of: number) => `${n} of ${of} teams`,
  ghl: (synced: number, failed: number) => `${synced} synced · ${failed} failed`,
  notAnswered: 'Not answered',
  read: 'Read One Question Across the Cohort',
  readSub: 'Pick a question. Every team’s answer is beside it.',
  question: 'Question',
  answered: (n: number, of: number) => `${n} of ${of} teams answered`,
  required: 'Required',
  status: 'Status',
  allStatuses: 'All statuses',
  statusLabel: { submitted: 'Submitted', draft: 'Draft', not_started: 'Not started' },
  columns: { team: 'Team', status: 'Status', answered: 'Answered', ghl: 'GHL', ask: 'Ask', teamsIn: 'Teams turned in', notLooked: 'Not looked at', picked: 'Picked', reviewed: 'Reviewed', notYet: 'Not turned in yet' },
  saved: (when: string) => `Saved ${when}`,
  of: (n: number, of: number) => `${n} of ${of}`,
  ghlLabel: { synced: 'Synced', pending: 'Pending', failed: 'Failed', none: 'Not sent' } as Record<string, string>,
  open: 'Open team',
  noTeam: 'No team matches',
  noTeamBody: 'Change the filters.',
  asksTitle: 'What Each Week Asks For',
  noAsks: 'No week asks for a file yet.',
  week: 'Week',
  noWeeks: 'This cohort has no weeks yet.',
  onlyStaff: 'Only staff see a status. Teams see what they sent.',
  none: 'None',
} as const;

/** One turn-in as `GET /api/admin/submissions` sends it (the fields this page reads). */
export interface SubRow {
  id: number;
  kind: string;
  team: string;
  status: SubmissionStatus;
}

export interface IntakeFormVM {
  questions: (IntakeQuestion & { section: string })[];
  /** Where the form is edited: its week's Forms section (D-265), or the program's weeks when no week holds one. */
  to: string;
}

export function formOf(db: Pick<Db, 'modules'>): IntakeFormVM {
  const mod = db.modules.find((m) => m.course?.intake);
  const form: CourseIntake | undefined = mod?.course?.intake;
  return {
    questions: (form?.sections ?? []).flatMap((s) => s.questions.map((q) => ({ ...q, section: s.title }))),
    to: mod ? `/admin/program/weeks/${encodeURIComponent(mod.id)}?section=forms` : '/admin/program',
  };
}

const answered = (v: string | string[] | undefined): boolean => (Array.isArray(v) ? v.length > 0 : v !== undefined && v.trim() !== '');

export interface TallyVM {
  id: string;
  title: string;
  rows: { label: string; n: number }[];
  total: number;
}

export interface IntakeVM {
  teams: number;
  submitted: number;
  draft: number;
  notStarted: number;
  synced: number;
  failed: number;
  questions: number;
  tallies: TallyVM[];
  rows: {
    id: string;
    name: string;
    owner: string;
    status: CohortIntakeRow['status'];
    statusLabel: string;
    tone: 'ok' | 'warn' | 'neutral';
    when: string | null;
    answered: number;
    ghl: { label: string; tone: 'ok' | 'bad' | 'warn' | 'off' } | null;
    answers: CohortIntakeRow['answers'];
  }[];
}

export function intakeVM(form: IntakeFormVM, rows: readonly CohortIntakeRow[]): IntakeVM {
  const C = SUBS_COPY;
  const qs = form.questions;
  const count = (st: CohortIntakeRow['status']) => rows.filter((r) => r.status === st).length;
  const tallies = qs
    .filter((q) => (q.kind === 'choice' || q.kind === 'multi') && (q.options ?? []).length)
    .map((q): TallyVM => {
      const has = (r: CohortIntakeRow, o: string) => {
        const v = r.answers[q.id];
        return Array.isArray(v) ? v.includes(o) : v === o;
      };
      return {
        id: q.id,
        title: q.label,
        total: rows.length,
        rows: [
          ...(q.options ?? []).map((o) => ({ label: o, n: rows.filter((r) => has(r, o)).length })).filter((x) => x.n > 0),
          { label: C.notAnswered, n: rows.filter((r) => !answered(r.answers[q.id])).length },
        ],
      };
    });
  return {
    teams: rows.length,
    submitted: count('submitted'),
    draft: count('draft'),
    notStarted: count('not_started'),
    synced: rows.filter((r) => r.ghl === 'synced').length,
    failed: rows.filter((r) => r.ghl === 'failed').length,
    questions: qs.length,
    tallies,
    rows: rows.map((r) => ({
      id: r.teamId,
      name: r.name,
      owner: r.owner,
      status: r.status,
      statusLabel: C.statusLabel[r.status],
      tone: r.status === 'submitted' ? 'ok' : r.status === 'draft' ? 'warn' : 'neutral',
      when:
        r.status === 'submitted' && r.submittedAt !== null
          ? adminStamp(r.submittedAt)
          : r.status === 'draft' && r.updatedAt !== null
            ? C.saved(adminStamp(r.updatedAt))
            : null,
      answered: qs.filter((q) => answered(r.answers[q.id])).length,
      ghl:
        r.status === 'not_started' || r.ghl === 'none'
          ? null
          : { label: C.ghlLabel[r.ghl] ?? r.ghl, tone: r.ghl === 'synced' ? 'ok' : r.ghl === 'failed' ? 'bad' : 'warn' },
      answers: r.answers,
    })),
  };
}

/** The answer a team gave to one question, as words. */
export const answerText = (v: string | string[] | undefined): string => (Array.isArray(v) ? v.join(', ') : (v ?? ''));

export interface AskVM {
  key: string;
  moduleId: string;
  week: number;
  label: string;
  where: string;
  teamsIn: number;
  received: number;
  picked: number;
  reviewed: number;
  notYet: string;
}

/** The cohort's weeks, in its run's order, as the week picker lists them. */
export function weeksOf(db: Pick<Db, 'cohorts' | 'modules' | 'sessions'>, cohortId: string) {
  return cohortRun(db, cohortId).map((w) => ({ n: w.n, module: w.module }));
}

/** Each step of the cohort's weeks that asks for a file, and how many of its teams turned one in. */
export function asksVM(db: Pick<Db, 'cohorts' | 'modules' | 'sessions'>, cohortId: string, teams: readonly string[], subs: Readonly<Record<string, readonly SubRow[]>>): AskVM[] {
  return weeksOf(db, cohortId).flatMap(({ n, module }) =>
    asksOf(module, n).map((a): AskVM => {
      const of = (subs[module.id] ?? []).filter((s) => isSubmissionKind(s.kind) && s.kind === a.kind);
      const inTeams = [...new Set(of.map((s) => s.team))];
      return {
        key: `${module.id}:${a.kind}`,
        moduleId: module.id,
        week: n,
        label: SUBMISSION_KIND_LABEL[a.kind],
        where: a.kicker,
        teamsIn: inTeams.length,
        received: of.filter((s) => s.status === 'received').length,
        picked: of.filter((s) => s.status === 'picked').length,
        reviewed: of.filter((s) => s.status === 'reviewed').length,
        notYet: teams.filter((t) => !inTeams.includes(t)).join(', ') || SUBS_COPY.none,
      };
    }),
  );
}
