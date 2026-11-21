// D-228: the v3 week overview's and locked week's props (`WeekPage`'s `week`, `LockedWeekPage`'s `week`), from the
// course (`GET /api/course`), the learner's rows and checks, and the snapshot (IMPLEMENTATION-SPEC.md §7.3, §7.7).
// Pure. Every title, step, sentence and time comes from the course; the words below are the mockup's chrome.
import { fmt } from '@ai/core';
import type { ChecklistMark, Learner } from '@ai/core';
import { ACCELERATOR_SUPPORT_EMAIL } from '@ai/core/accelerator';
import { progressOn, stepRoles } from '@ai/core/learner';
import type { LearnerStep, StepRole } from '@ai/core/learner';
import type { CourseKitItem, OpenCourseWeek } from '@ai/core/course';
import type { CourseSkill } from '@ai/core/course-types';
import type { CoursePayload, CourseSession } from '../../course/Course.vm';
import { inLibrary } from '../../course/Course.vm';
import { dateTile, linkedRoutes, skillRow as todaySkillRow, stepTitle } from '../learn.vm';
import type { WeekRow } from '../learn.vm';
import { learnSkills, learnStep, learnWeek } from '../routes';
import { weekStepStatuses } from '../Week.vm';
import type { LockedWeekVM } from '../Week.vm';
import { crumbsVM } from '../WeekContent.vm';
import type { BuildKitVM } from '../WeekContent.vm';
import { hrs } from './Hero';
import { nextSessionOf } from './shell.vm';
import { SCHEDULE_V3 } from './schedule.vm';
import type { KitAct, KitRow, LockedWeekProps, RefBlock, WeekLabels, WeekProps, WeekStep } from './types';

/** The mockup's chrome words for the week page (handoff/lms-v3/src/sample-data.js › sampleLabels). */
export const WEEK_LABELS: WeekLabels = {
  open: 'Open',
  upNext: 'Up next',
  doneWhen: 'Done when',
  deployedWhen: 'Deployed when',
  start: 'Start',
  continue: 'Continue',
  markDeployed: 'Mark as deployed',
  undo: 'Undo',
  deployed: 'Deployed',
  deployedTitle: 'Your office is ready for its first hire.',
  stepsDone: 'Steps done',
  allDone: 'All steps done',
  stepsTitle: 'Eight steps',
  showStepsFor: 'Show steps for',
  done: 'Done',
  inProgress: 'In progress',
  waitingOn: 'Waiting on step',
  ready: 'Ready',
  forThisWeek: 'For this week',
  inStepOrder: 'In step order',
  openLibrary: 'Open your Skill Library',
  copied: 'Copied',
  instructorNote: 'Instructor note',
  whyThisWeek: 'Why this week matters',
  questions: 'Questions?',
  reference: 'Reference',
  nextWeek: 'Next week',
};

/** The rest of the mockup's words: tags, roles, kit groups, Reference accordions and their terms. */
export const WEEK_V3 = {
  selfPaced: 'Self-paced',
  owners: 'Owners',
  operators: 'Operators',
  ownersAndOperators: 'Owners and operators',
  due: 'Due',
  all: 'All',
  owner: 'Owner',
  operator: 'Operator',
  skills: 'Skills',
  files: 'Files',
  forYourAi: 'For your AI',
  flagship: 'Flagship',
  supporting: 'Supporting',
  free: 'Free',
  openNow: 'Open now',
  step: 'Step',
  systemPrompt: 'System prompt',
  view: 'View',
  copy: 'Copy',
  zip: 'Zip',
  excel: 'Excel',
  csv: 'CSV',
  refHow: 'How the program works',
  refWho: 'Owner and operator',
  refDone: 'What done looks like',
  refEvidence: 'Evidence packet',
  refRubric: 'Rubric',
  refReadiness: 'Readiness',
  refTools: 'Tools this week',
  thisWeek: 'This week:',
  about: 'About',
  acceptance: 'Acceptance test',
  adopted: 'Adopted means',
  beforeNext: 'Before the next session',
  flagshipTerm: 'Flagship',
  youllUse: 'You’ll use',
  and: 'and',
  backToWeek: (n: number): string => `Back to Week ${n}`,
} as const;

/** The step-heading word for a count, as the mockup's "Eight steps" (the package's own label, by count). */
const COUNT = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
export const stepsTitle = (n: number): string => `${COUNT[n] ?? String(n)} ${n === 1 ? 'step' : 'steps'}`;

/** "Fill in your intake…" → "fill in your intake…", after "This week:". */
const lead = (s: string): string => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
/** "A, B, C and D." */
const listOf = (xs: readonly string[]): string =>
  xs.length <= 1 ? `${xs[0] ?? ''}.` : `${xs.slice(0, -1).join(', ')} ${WEEK_V3.and} ${xs[xs.length - 1]}.`;
const isRole = (s: WeekStep, r: StepRole): boolean => s.who.includes(r);

/**
 * The gap rule for a week (IMPLEMENTATION-SPEC.md §4.D, C-12): v3 draws a week only when it needs nothing the
 * mockup doesn't draw. Week 0's `why` is the instructor note, its pager the Next week card, and its media
 * placeholders are left out (UX-AUDIT); any other week with media, a sample output, a seat card or a playbook card,
 * or with live sessions (the mockup's only week is self-paced, and its tags have no words for a session), keeps
 * today's page whole.
 */
export function v3WeekDraws(r: WeekRow | undefined, sessions: readonly CourseSession[]): boolean {
  const w = r?.open;
  if (!r || !w) return false;
  if (r.week === 0) return !w.sampleOutput && !w.seatCard && !w.playbookCard;
  return (
    !w.media.length && !w.sampleOutput && !w.seatCard && !w.playbookCard && !sessions.some((s) => s.week === r.week)
  );
}

/** A file type as its kit button says it. */
const actLabel = (type: string | undefined): string => {
  const t = (type ?? '').trim().toLowerCase();
  if (t === 'xlsx' || t === 'xls' || t === 'excel') return WEEK_V3.excel;
  if (t === 'csv') return WEEK_V3.csv;
  if (t === 'zip') return WEEK_V3.zip;
  return type ?? '';
};

export interface KitInput {
  w: OpenCourseWeek;
  steps: readonly LearnerStep[];
  week: number;
  copy?: Record<string, string>;
  build: BuildKitVM | null;
  fileUrl: (id: string) => string | null;
  download: (href: string) => void;
  onViewPrompt: () => void;
  /** B-14 (Phase 6): the intake's kit row as a form row; until then the intake is an ordinary file row. */
  formRow?: (item: CourseKitItem, row: KitRow) => KitRow;
}

/**
 * B-13: the kit in three groups, in step order: Skills (each with its zip on the same row: a kit file titled as the
 * skill), Files (the week's kit files; files that share a title are one row with a button each, Excel and CSV), and
 * For your AI (the system prompt: View, Copy).
 */
export function kitGroups(x: KitInput): WeekProps['kit'] {
  const stepOf = (id: string | null): LearnerStep | undefined => (id ? x.steps.find((s) => s.id === id) : undefined);
  const items = x.w.kit ?? [];
  const skillTitles = new Set(x.w.skills.map((k) => k.title.trim().toLowerCase()));
  const act = (it: CourseKitItem): KitAct => {
    const href = x.fileUrl(it.id);
    return { icon: 'down', label: actLabel(it.type), onClick: () => href && x.download(href) };
  };
  const skillRow = (k: CourseSkill): KitRow => {
    const route = k.route.startsWith('/') ? k.route : `/${k.route}`;
    const linked = x.steps.find((s) => linkedRoutes(s.step.linkedSkill).includes(route));
    const zips = items.filter((it) => it.title.trim().toLowerCase() === k.title.trim().toLowerCase());
    const flagship = k.role === 'flagship';
    const where = inLibrary(route)
      ? WEEK_V3.openNow
      : linked
        ? `${WEEK_V3.step} ${linked.n}`
        : (x.copy?.['skill.coming'] ?? '');
    // Where it goes is today's rule (D-189): its Library page, else the step that links it.
    const href =
      todaySkillRow(k, x.copy, { week: x.week, steps: x.steps }).href ?? (linked ? learnStep(x.week, linked.n) : null);
    return {
      icon: 'book',
      title: k.title,
      meta: flagship ? where : [where, WEEK_V3.supporting].filter(Boolean).join(' · '),
      ...(href ? { href } : {}),
      ...(flagship
        ? { tags: [{ label: WEEK_V3.flagship, hi: true }, ...(k.free ? [{ label: WEEK_V3.free }] : [])] }
        : {}),
      ...(zips.length ? { acts: zips.map(act) } : {}),
    };
  };
  const files: KitRow[] = [];
  const seen = new Set<string>();
  const ordered = [...items].sort((a, b) => (stepOf(a.stepId)?.n ?? 99) - (stepOf(b.stepId)?.n ?? 99));
  for (const it of ordered) {
    const key = it.title.trim().toLowerCase();
    if (skillTitles.has(key) || seen.has(key)) continue;
    seen.add(key);
    const same = ordered.filter((o) => o.title.trim().toLowerCase() === key);
    const step = stepOf(it.stepId);
    const row: KitRow = {
      icon: 'file',
      title: it.title,
      meta: step ? `${WEEK_V3.step} ${step.n}` : '',
      ...(same.length > 1 ? { acts: same.map(act) } : { href: x.fileUrl(it.id) ?? undefined }),
    };
    files.push(x.formRow ? x.formRow(it, row) : row);
  }
  const prompt = x.build?.prompt;
  return [
    ...(x.w.skills.length ? [{ label: WEEK_V3.skills, rows: x.w.skills.map(skillRow) }] : []),
    ...(files.length ? [{ label: WEEK_V3.files, rows: files }] : []),
    ...(prompt
      ? [
          {
            label: WEEK_V3.forYourAi,
            rows: [
              {
                icon: 'key',
                title: WEEK_V3.systemPrompt,
                meta: prompt.stats,
                acts: [
                  { icon: 'eye', label: WEEK_V3.view, onClick: x.onViewPrompt },
                  { icon: 'copy', label: WEEK_V3.copy, copyText: prompt.text },
                ],
              },
            ],
          },
        ]
      : []),
  ];
}

/** The seven Reference accordions (§7.3), from the course's shared words and the week's own. */
export function referenceOf(
  p: CoursePayload,
  w: OpenCourseWeek,
  ownerMins: number,
  operatorMins: number,
): WeekProps['reference'] {
  const { intro, shared } = p.course;
  const ref: WeekProps['reference'] = [];
  ref.push({
    title: WEEK_V3.refHow,
    blocks: [{ type: 'ul', items: intro.how }, ...(intro.scope ? [{ type: 'fine' as const, text: intro.scope }] : [])],
  });
  ref.push({
    title: WEEK_V3.refWho,
    blocks: [
      {
        type: 'dl',
        rows: [
          {
            dt: WEEK_V3.owner,
            dd: [intro.roles.owner, `${WEEK_V3.thisWeek} ${lead(w.owner)}`],
            small: `${WEEK_V3.about} ${hrs(ownerMins)}`,
          },
          {
            dt: WEEK_V3.operator,
            dd: [intro.roles.operator, `${WEEK_V3.thisWeek} ${lead(w.operator)}`],
            small: `${WEEK_V3.about} ${hrs(operatorMins)}`,
          },
        ],
      },
      ...(shared.estimateNote ? [{ type: 'fine' as const, text: shared.estimateNote }] : []),
    ],
  });
  const hw = w.homework;
  const one = (xs: readonly string[]): string | string[] => (xs.length === 1 ? xs[0]! : [...xs]);
  ref.push({
    title: WEEK_V3.refDone,
    blocks: [
      {
        type: 'dl',
        rows: [
          ...(hw.acceptance.length ? [{ dt: WEEK_V3.acceptance, dd: one(hw.acceptance) }] : []),
          ...(hw.useEvidence ? [{ dt: WEEK_V3.adopted, dd: hw.useEvidence }] : []),
          ...(hw.assignment.length ? [{ dt: WEEK_V3.beforeNext, dd: one(hw.assignment) }] : []),
        ],
      },
      ...(shared.missedAWeek ? [{ type: 'fine' as const, text: shared.missedAWeek }] : []),
    ],
  });
  ref.push({
    title: WEEK_V3.refEvidence,
    blocks: [{ type: 'dl', rows: shared.evidence.map((e) => ({ dt: e.label, dd: e.hint })) }],
  });
  ref.push({
    title: WEEK_V3.refRubric,
    blocks: [
      { type: 'scale', items: shared.rubricScale.map((x): [number, string] => [x.score, x.label]) },
      { type: 'dl', rows: shared.rubric.map((d) => ({ dt: d.label, dd: d.meets })) },
      ...(shared.rubricRules.length ? [{ type: 'ul' as const, items: shared.rubricRules }] : []),
    ],
  });
  ref.push({
    title: WEEK_V3.refReadiness,
    blocks: [{ type: 'dl', rows: shared.readiness.map((x) => ({ dt: x.gate, dd: x.text })) }],
  });
  const tools = w.tools ?? [];
  if (w.flagship || tools.length)
    ref.push({
      title: WEEK_V3.refTools,
      blocks: [
        {
          type: 'dl',
          rows: [
            ...(w.flagship ? [{ dt: WEEK_V3.flagshipTerm, dd: w.flagship }] : []),
            ...(tools.length ? [{ dt: WEEK_V3.youllUse, dd: listOf(tools) }] : []),
          ],
        },
      ],
    });
  return ref.filter((a) => a.blocks.some((b: RefBlock) => (b.type === 'dl' ? b.rows.length > 0 : true)));
}

export interface WeekInput {
  p: CoursePayload;
  rows: readonly WeekRow[];
  r: WeekRow;
  me: Learner | null;
  checks: readonly ChecklistMark[];
  build: BuildKitVM | null;
  fileUrl: (id: string) => string | null;
  download: (href: string) => void;
  onViewPrompt: () => void;
  formRow?: KitInput['formRow'];
}

/** `WeekPage`'s `week` (§7.3). */
export function weekProps(x: WeekInput): WeekProps {
  const { p, r } = x;
  const w = r.open!;
  const statuses = weekStepStatuses(r, x.checks);
  const steps: WeekStep[] = r.steps.map((s, i) => {
    const st = statuses[i]!;
    return {
      n: s.n,
      title: stepTitle(s),
      href: learnStep(r.week, s.n),
      role: s.step.who ?? '',
      who: stepRoles(s.step.who),
      time: s.step.timeLabel || hrs(s.step.mins || 0),
      minutes: s.step.mins || 0,
      doneWhen: s.step.doneWhen ?? '',
      status: st.status,
      ...(st.waitsOn !== null ? { waitsOn: st.waitsOn } : {}),
    };
  });
  const mins = (role?: StepRole) => steps.filter((s) => !role || isRole(s, role)).reduce((a, s) => a + s.minutes, 0);
  const owners = steps.filter((s) => isRole(s, 'owner')).length;
  const operators = steps.filter((s) => isRole(s, 'operator')).length;
  // B-10: each role's time is the sum of its steps' minutes. "Steps 3 and 5 can run alongside the others." is the
  // Start Here card's hint after its first sentence (the card itself is retired on v3 weeks, C-07).
  const alongside = (w.startHere?.hint ?? '')
    .split(/(?<=\.)\s+/)
    .slice(1)
    .join(' ');
  const due = r.module?.dueAt;
  const next = x.rows.find((o) => o.week === r.week + 1);
  const instructor = p.course.intro.instructor;
  return {
    n: r.week,
    title: r.title,
    open: true,
    question: w.question,
    purpose: r.outcome,
    crumbs: crumbsVM(r.title, r.week).map((c) => (c.href ? { label: c.label, href: c.href } : { label: c.label })),
    tags: [
      { icon: 'clock', label: WEEK_V3.selfPaced },
      {
        icon: 'users',
        label: owners && operators ? WEEK_V3.ownersAndOperators : owners ? WEEK_V3.owners : WEEK_V3.operators,
      },
      ...(due ? [{ icon: 'cal', label: `${WEEK_V3.due} ${fmt.day(due)}, ${fmt.time(due)}` }] : []),
    ],
    steps,
    roles: [
      {
        id: 'all',
        label: WEEK_V3.all,
        count: steps.length,
        summary: [`${WEEK_V3.about} ${hrs(mins())} in all.`, alongside].filter(Boolean).join(' '),
      },
      {
        id: 'owner',
        label: WEEK_V3.owner,
        count: owners,
        summary: `${owners} ${owners === 1 ? 'step' : 'steps'} for the owner, about ${hrs(mins('owner'))}.`,
      },
      {
        id: 'operator',
        label: WEEK_V3.operator,
        count: operators,
        summary: `${operators} ${operators === 1 ? 'step' : 'steps'} for the operator, about ${hrs(mins('operator'))}.`,
      },
    ],
    deployed: !!progressOn(x.me, r.week)?.deployedAt,
    deployedWhen: w.homework.acceptance.join(' '),
    platform: w.module.platform,
    next: next
      ? { n: next.week, title: next.title, href: next.href }
      : { n: r.week + 1, title: '', href: learnWeek(r.week + 1) },
    libraryHref: learnSkills(),
    supportEmail: ACCELERATOR_SUPPORT_EMAIL,
    note:
      w.why.length && instructor
        ? { initials: fmt.initials(instructor), name: instructor, text: w.why.join(' ') }
        : null,
    kit: kitGroups({
      w,
      steps: r.steps,
      week: r.week,
      copy: p.copy,
      build: x.build,
      fileUrl: x.fileUrl,
      download: x.download,
      onViewPrompt: x.onViewPrompt,
      formRow: x.formRow,
    }),
    reference: referenceOf(p, w, mins('owner'), mins('operator')),
  };
}

/** The week's own chrome word for its step count ("Eight steps"), by its number of steps. */
export const weekLabels = (steps: number): WeekLabels => ({ ...WEEK_LABELS, stepsTitle: stepsTitle(steps) });

/**
 * The locked week's page (§7.7, B-39), from today's `LockedWeekVM`, or null when it holds something the mockup has no
 * place for: a builder's line, or a second question (`vm.line`, `vm.question`): then today's page draws.
 */
/** Whether v3 draws this locked week (B-39): its words fit the mockup's slots, and it has an opening time. */
export const v3LockedDraws = (vm: LockedWeekVM, r: WeekRow): boolean =>
  !vm.line && !vm.question && (r.locked?.opensAt ?? null) !== null;

export function lockedWeekProps(
  vm: LockedWeekVM,
  r: WeekRow,
  sessions: readonly CourseSession[],
  rows: readonly WeekRow[],
  now: number,
  calendarHref: string,
): LockedWeekProps | null {
  const opensAt = r.locked?.opensAt ?? null;
  if (!v3LockedDraws(vm, r) || opensAt === null) return null;
  const own = sessions.filter((s) => s.week === r.week).sort((a, b) => a.start - b.start);
  const heroId = nextSessionOf(sessions, now)?.s.id ?? null;
  const current = [...rows].reverse().find((o) => o.state !== 'locked');
  return {
    n: r.week,
    title: r.title,
    outcome: vm.lede,
    question: vm.headline,
    opens: fmt.when(opensAt),
    opensAt: new Date(opensAt).toISOString(),
    sessions: own.map((s) => {
      const t = dateTile(s.start);
      return {
        title: s.title,
        kind: s.kind === 'build' ? SCHEDULE_V3.liveBuild : SCHEDULE_V3.officeHours,
        when: s.id === heroId ? fmt.when(s.start) : fmt.day(s.start),
        tile: [t.dw, t.dd],
      };
    }),
    calendarHref,
    back: current
      ? { label: WEEK_V3.backToWeek(current.week), href: current.href }
      : { label: WEEK_V3.backToWeek(0), href: learnWeek(0) },
    crumbs: crumbsVM(r.title, r.week).map((c) => (c.href ? { label: c.label, href: c.href } : { label: c.label })),
  };
}
