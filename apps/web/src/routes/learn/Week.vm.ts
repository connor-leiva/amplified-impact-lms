// /learn/week/:week, a week's overview (D-177): artboards 06/07 of the learner mockup, and its locked
// preview, artboards 14/15.
//
// PURE. An open week renders from `GET /api/course` (its title, outcome, steps, skills and kit) and the
// snapshot (the learner's progress, the week's due date). A locked week renders from its stub ALONE:
// title, question, outcome, when it opens (its own locked copy, else the `locked.opens` copy string) and
// the sessions the course lists for it. Nothing of a locked week's content is fetched or drawn.

import { fmt } from '@ai/core';
import type { IconName, IcsEvent } from '@ai/core';
import { countWord, duration, minutesInAll, minutesLeft, upcomingSessions } from '@ai/core/learner';
import { COPY, opensText, skillVM } from '../course/Course.vm';
import type { CoursePayload } from '../course/Course.vm';
import { LABELS, addLabel, icsEvents, kitRow, segments, sessionRow, skillRow, stepMeta, stepRowMeta, stepTitle } from './learn.vm';
import type { KitRowVM, Seg, SessionRowVM, Tone, WeekRow } from './learn.vm';
import { learnHome, learnSkills, learnStep } from './routes';

export const WEEK = {
  stepsDone: 'Steps done',
  doneWhen: 'Done when:',
  continueStep: 'Continue step',
  steps: 'steps',
  step: 'step',
  inAll: 'in all',
  left: 'left',
  about: 'About',
  due: 'Due',
  at: 'at',
  kit: 'kit',
  buildLive: 'Build it live',
  leaveWith: 'You’ll leave with',
  notFound: 'There’s no such week.',
} as const;

export type Pill = { tone: 'ip' | 'done' | 'open'; label: string };

export interface StepRowVM {
  n: number;
  title: string;
  meta: string;
  state: 'done' | 'current' | 'todo';
  pill: Pill | null;
  href: string;
  aria: string;
}

export interface OpenWeekVM {
  kind: 'open';
  week: number;
  title: string;
  tile: { icon: IconName; tone: Tone };
  lede: string;
  pill: Pill;
  pk: string;
  hero:
    | { kind: 'step'; eyebrow: string; title: string; meta: string; doneWhen: string | null; cta: { label: string; href: string } }
    | { kind: 'built'; eyebrow: string; title: string };
  right: { label: string; done: number; total: number; ofTotal: string; segs: Seg[]; aria: string; foot: string | null };
  steps: { heading: string; meta: string; rows: StepRowVM[] };
  /** D-184: the week's skills (each with its role and Free, as the course page tags them) and its kit items, and the Library's link. */
  kit: { heading: string; rows: KitRowVM[]; library: { label: string; href: string } | null } | null;
}

export interface LockedWeekVM {
  kind: 'locked';
  week: number;
  title: string;
  tile: { icon: IconName; tone: Tone };
  lede: string;
  /** "Opens Wed, Dec 9 · 12:00 PM MT · Week 2" */
  pk: string;
  headline: string;
  line: string | null;
  question: string | null;
  sessions: { heading: string; rows: SessionRowVM[]; add: { label: string; ics: IcsEvent[] } | null } | null;
}

export type WeekVM = OpenWeekVM | LockedWeekVM | { kind: 'missing'; text: string; href: string };

/** A week's pill: only three ever show (the mockup's rule): Open, In progress, Done. */
const pillOf = (r: WeekRow): Pill =>
  r.state === 'built' ? { tone: 'done', label: LABELS.done } : r.state === 'in_progress' ? { tone: 'ip', label: LABELS.inProgress } : { tone: 'open', label: LABELS.open };

/** "Due Mon, Nov 30 at 12:00 PM MT", in the viewer's zone first. */
const dueLine = (t: number): string => `${WEEK.due} ${fmt.day(t)} ${WEEK.at} ${fmt.time(t)}`;

/** "Eight steps", "One step". */
export const stepsHeading = (n: number): string => {
  const w = countWord(n);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)} ${n === 1 ? WEEK.step : WEEK.steps}`;
};

function openWeek(p: CoursePayload, r: WeekRow, fileUrl: (id: string) => string | null): OpenWeekVM {
  const w = r.open!;
  const platform = w.module.platform || null;
  const step = r.steps.find((s) => s.current) ?? null;
  const due = r.module?.dueAt;
  const left = minutesLeft(r.steps);
  const footParts = [left > 0 ? `${WEEK.about} ${duration(left)} ${WEEK.left}` : null, due ? `${WEEK.due.toLowerCase()} ${fmt.date(due)}` : null].filter((x): x is string => !!x);
  const skillRows = w.skills.map((k): KitRowVM => {
    const v = skillVM(k, p.copy);
    return { ...skillRow(k, p.copy, { week: r.week, steps: r.steps }), tags: [{ label: v.role }, ...(v.free ? [{ label: COPY.free, tone: 'done' as const }] : [])] };
  });
  const kitRows = (w.kit ?? []).map((k) => kitRow(k, r.steps, fileUrl));
  const rows = [...skillRows, ...kitRows];
  return {
    kind: 'open',
    week: r.week,
    title: r.title,
    tile: { icon: r.icon, tone: r.tone },
    lede: r.outcome,
    pill: pillOf(r),
    pk: [`${LABELS.week} ${r.week}`, due ? dueLine(due) : null].filter((x): x is string => !!x).join(' · '),
    hero: step
      ? {
          kind: 'step',
          eyebrow: `${LABELS.upNext} · ${LABELS.step} ${step.n} of ${r.total}`,
          title: stepTitle(step),
          meta: stepMeta(step, platform),
          doneWhen: step.step.doneWhen ? `${WEEK.doneWhen} ${step.step.doneWhen}` : null,
          cta: { label: `${WEEK.continueStep} ${step.n}`, href: learnStep(r.week, step.n) },
        }
      : { kind: 'built', eyebrow: LABELS.built, title: r.title },
    right: {
      label: WEEK.stepsDone,
      done: r.done,
      total: r.total,
      ofTotal: `of ${r.total}`,
      segs: segments(r.steps),
      aria: `${r.done} of ${r.total} steps done`,
      foot: footParts.length ? `${footParts.join(', ')}` : null,
    },
    steps: {
      heading: stepsHeading(r.total),
      meta: `${WEEK.about} ${duration(minutesInAll(r.steps))} ${WEEK.inAll}`,
      rows: r.steps.map((s): StepRowVM => {
        const state = s.done ? 'done' : s.current ? 'current' : 'todo';
        const said = s.done ? LABELS.done.toLowerCase() : s.current ? `${LABELS.upNext.toLowerCase()}` : LABELS.notStarted.toLowerCase();
        return {
          n: s.n,
          title: stepTitle(s),
          meta: stepRowMeta(s),
          state,
          pill: s.done ? { tone: 'done', label: LABELS.done } : s.current && r.done > 0 ? { tone: 'ip', label: LABELS.inProgress } : null,
          href: learnStep(r.week, s.n),
          aria: `${LABELS.step} ${s.n}, ${stepTitle(s)}, ${said}`,
        };
      }),
    },
    kit: rows.length ? { heading: `${LABELS.week} ${r.week} ${WEEK.kit}`, rows, library: skillRows.length ? { label: COPY.download, href: learnSkills() } : null } : null,
  };
}

function lockedWeek(p: CoursePayload, r: WeekRow, now: number): LockedWeekVM {
  const w = r.locked!;
  const opens = opensText(w, p.copy);
  const sessions = p.sessions.filter((s) => s.week === r.week).sort((a, b) => a.start - b.start);
  const ahead = upcomingSessions(sessions, now);
  const headline = w.lockedCopy?.headline || w.question;
  return {
    kind: 'locked',
    week: r.week,
    title: r.title,
    tile: { icon: r.icon, tone: r.tone },
    lede: w.outcome,
    pk: [opens, `${LABELS.week} ${r.week}`].filter((x): x is string => !!x).join(' · '),
    headline,
    line: w.lockedCopy?.line || null,
    question: headline === w.question ? null : w.question,
    sessions: sessions.length
      ? { heading: WEEK.buildLive, rows: sessions.map(sessionRow), add: ahead.length ? { label: addLabel(ahead.length), ics: icsEvents(ahead) } : null }
      : null,
  };
}

/** The week in `/learn/week/3`, or null for anything that is not a week number. */
export function weekParam(param: string | undefined): number | null {
  return /^\d{1,2}$/.test(param ?? '') ? Number(param) : null;
}

export function weekVM(p: CoursePayload, rows: readonly WeekRow[], week: number | null, now: number, fileUrl: (id: string) => string | null): WeekVM {
  const r = week === null ? undefined : rows.find((x) => x.week === week);
  if (!r) return { kind: 'missing', text: WEEK.notFound, href: learnHome() };
  return r.state === 'locked' ? lockedWeek(p, r, now) : openWeek(p, r, fileUrl);
}
