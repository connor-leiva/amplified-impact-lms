// The open week's content in the learner portal v2 (D-184): every field the curriculum builder edits for a
// week, the week's build kit from the Module Builder, its CSV downloads, the pager between weeks and the
// breadcrumb trail. The current course page (`routes/course/Course.tsx`) shows each of these today; this
// reuses its view-model (`Course.vm.ts` `weekVM`, its labels and its downloads) and hands the new week
// page and step player the same words in sections.
//
// PURE. No React, no clock, no fetch. The words are the course's (`GET /api/course`) and the module's (the
// snapshot: its system prompt, files, instructor and notes); the only words here are generic labels, the
// course page's own (`COPY`) and the build kit's (`KIT`), which the copy guard holds apart from the
// course's. An empty field renders nothing: a row with no text, a list with no items and a section with
// nothing left in it are dropped here, so the page never draws an empty heading.

import { fmt } from '@ai/core';
import type { AIEmployee, SkillFile } from '@ai/core';
import type { LearnerCourseWeek, OpenCourseWeek } from '@ai/core/course';
import type { PlaybookCard, SampleOutput, SeatCard, VideoBlock } from '@ai/core/course-types';
import { skillPreview } from '@ai/core/files';
import { COPY, weekVM as courseWeekVM } from '../course/Course.vm';
import type { CoursePayload, DownloadVM, Row } from '../course/Course.vm';
import { LABELS } from './learn.vm';
import { learnHome, learnSchedule, learnWeek } from './routes';
import type { StoredFileRef } from '../../data/repository';

/** The build kit's labels (the current portal's Build Kit, `EmployeeDetail.tsx`), and the content's few more. */
export const KIT = {
  buildKit: 'Build Kit',
  systemPrompt: 'System Prompt',
  view: 'View',
  copy: 'Copy',
  copied: 'Copied',
  fillIn: 'Fill In',
  download: 'Download',
  preview: 'Preview',
  close: 'Close',
  instructorNotes: 'Instructor Notes',
  lines: 'lines',
  aboutTokens: 'about',
  tokens: 'tokens',
  downloads: 'Downloads',
  seatCard: 'Seat Card',
  playbookCard: 'Playbook Card',
  signedOff: 'Signed Off',
  weeks: 'Weeks',
  // The current portal's AI Employee header (E-18).
  fromSession: 'From Session',
  selfPaced: 'Self-Paced',
  minBuild: 'Min Build',
  for: 'For',
  // The tab's title, as the course page names it (X-2).
  program: 'Amplified AI Accelerator',
} as const;

const SEAT_LABEL: Record<keyof SeatCard, string> = {
  seat: 'Seat',
  reportsTo: 'Reports To',
  runs: 'Runs',
  pulls: 'Pulls',
  applies: 'Applies',
  produces: 'Produces',
  tookOver: 'Took Over',
  cantDo: 'Can’t Do',
  firstRun: 'First Run',
};
const PLAYBOOK_LABEL: Record<'name' | 'number' | 'question' | 'play' | 'source', string> = {
  name: 'Name',
  number: 'Number',
  question: 'Question',
  play: 'Play',
  source: 'Source',
};

// --- the week's content ----------------------------------------------------------------------------

/** One piece of a section: label and text rows, a list (with its own heading), or a line of text. */
export type PartVM =
  | { kind: 'rows'; heading: string | null; rows: Row[] }
  | { kind: 'list'; heading: string | null; items: string[] }
  /** D-188: a week's Media videos, each played inline (or a link to watch it). */
  | { kind: 'videos'; videos: VideoBlock[] }
  /** D-217: a table from the week's sample output, drawn as the step page draws one (`.rt-table`). */
  | { kind: 'table'; head: string[] | null; rows: string[][] }
  | { kind: 'text'; text: string; note: boolean };

export interface SectionVM {
  /** The section's heading id (`lv-c-<id>`), unique on the page. */
  id: string;
  title: string;
  /** A line under the heading: a session's when and length. */
  meta: string | null;
  parts: PartVM[];
}

export interface PagerLinkVM {
  label: string;
  title: string;
  href: string;
}

/** The current portal's AI Employee header line (E-18): its session or Self-Paced, its build minutes, who it's for. */
export interface WeekMetaVM {
  /** "From Session 2" and the session's title, to the Schedule; null for a week with no live build. */
  session: { label: string; title: string; href: string } | null;
  selfPaced: string | null;
  build: string | null;
  forWho: string | null;
}

export interface WeekContentVM {
  /** The week's question, under its title (the course page's), or null when it has none. */
  question: string | null;
  meta: WeekMetaVM;
  sections: SectionVM[];
  downloads: DownloadVM[];
  pager: { prev: PagerLinkVM | null; next: PagerLinkVM | null } | null;
}

const has = (s: string | null | undefined): s is string => !!s && s.trim() !== '';

/** D-217: the week page's words for the builder's flagship, tools and sample output. */
export const WEEK_WORDS = { tools: 'Tools', flagship: 'Flagship', sampleOutput: 'Sample Output' } as const;

/** D-217: the week's flagship and tools, as the builder's Course page card sets them. */
function toolsSection(w: OpenCourseWeek): SectionVM | null {
  return section('tools', WEEK_WORDS.tools, [rowsPart(null, [{ label: WEEK_WORDS.flagship, text: w.flagship ?? '' }]), listPart(null, w.tools)]);
}

/** D-217: the week's sample output (the builder's Hire cards), its blocks in order, with its made-up label. */
export function sampleSection(so: SampleOutput | undefined): SectionVM | null {
  if (!so) return null;
  const parts = so.blocks.map((b): PartVM | null => {
    if (b.type === 'text') return textPart(b.text);
    if (b.type === 'list') return listPart(null, b.items);
    if (b.type === 'copy') return rowsPart(null, [{ label: b.label ?? '', text: b.text }]);
    if (b.type === 'table') return b.rows.length ? { kind: 'table', head: b.head?.length ? b.head : null, rows: b.rows } : null;
    return null;
  });
  return section('sample', has(so.title) ? so.title : WEEK_WORDS.sampleOutput, parts, has(so.madeUpLabel) ? so.madeUpLabel : null);
}
const rowsOf = (rows: readonly Row[]): Row[] => rows.filter((r) => has(r.text));
const itemsOf = (items: readonly string[] | undefined): string[] => (items ?? []).filter(has);

const rowsPart = (heading: string | null, rows: readonly Row[]): PartVM | null => {
  const r = rowsOf(rows);
  return r.length ? { kind: 'rows', heading, rows: r } : null;
};
const listPart = (heading: string | null, items: readonly string[] | undefined): PartVM | null => {
  const i = itemsOf(items);
  return i.length ? { kind: 'list', heading, items: i } : null;
};
const textPart = (text: string | null | undefined, note = false): PartVM | null => (has(text) ? { kind: 'text', text, note } : null);
const videosPart = (videos: VideoBlock[]): PartVM | null => (videos.length ? { kind: 'videos', videos } : null);

function section(id: string, title: string, parts: (PartVM | null)[], meta: string | null = null): SectionVM | null {
  const kept = parts.filter((p): p is PartVM => p !== null);
  // A note alone (the time estimate's, the missed-a-week line) says nothing without what it notes.
  if (!kept.some((p) => p.kind !== 'text' || !p.note)) return null;
  return { id, title, meta, parts: kept };
}


export function seatSection(card: SeatCard | undefined): SectionVM | null {
  if (!card) return null;
  const keys = Object.keys(SEAT_LABEL) as (keyof SeatCard)[];
  return section('seat', KIT.seatCard, [rowsPart(null, keys.map((k) => ({ label: SEAT_LABEL[k], text: card[k] ?? '' })))]);
}

export function playbookSection(card: PlaybookCard | undefined): SectionVM | null {
  if (!card) return null;
  const keys = Object.keys(PLAYBOOK_LABEL) as (keyof typeof PLAYBOOK_LABEL)[];
  return section('playbook', KIT.playbookCard, [rowsPart(null, keys.map((k) => ({ label: PLAYBOOK_LABEL[k], text: card[k] ?? '' })))], card.signedOff ? KIT.signedOff : null);
}

/**
 * The open week's content, in the course page's order: why it matters, who does what and the time it
 * takes, the live build and office hours, the homework, the evidence packet, rubric and readiness, the
 * media and materials, then the seat and playbook cards. The course's first week also carries How It
 * Works (the course page's intro), and its last week the graduation and the after-the-course paths.
 * Null for a week that is locked or not in the course.
 */
export function weekContentVM(p: CoursePayload, week: number, m?: Pick<AIEmployee, 'forWho'>): WeekContentVM | null {
  const v = courseWeekVM(p, week);
  if (!v) return null;
  const { course } = p;
  const weeks = course.weeks;
  const i = weeks.findIndex((w) => w.week === week);
  // An open week: the course page's view-model answered for it.
  const w = weeks[i] as OpenCourseWeek;
  const first = i === 0;
  const last = i === weeks.length - 1;
  const intro = course.intro;
  const after = course.after;

  const sections = [
    first
      ? section('how', COPY.howItWorks, [
          listPart(null, intro.how),
          rowsPart(null, [
            { label: COPY.roles.owner, text: intro.roles.owner },
            { label: COPY.roles.operator, text: intro.roles.operator },
          ]),
          textPart(intro.scope, true),
          textPart(intro.instructor, true),
          textPart(intro.support, true),
        ])
      : null,
    section('why', COPY.why, [listPart(null, v.why)]),
    section('who', COPY.whoDoesWhat, [rowsPart(null, v.roles), rowsPart(COPY.time, v.time), rowsOf(v.time).length ? textPart(v.timeNote, true) : null]),
    toolsSection(w),
    v.live
      ? section(
          'live',
          COPY.liveBuild,
          [
            rowsPart(COPY.agenda, v.live.agenda),
            rowsPart(null, [
              { label: COPY.lesson, text: v.live.lesson },
              { label: COPY.exercise, text: v.live.exercise },
              { label: COPY.required, text: v.live.required },
              { label: COPY.advanced, text: v.live.advanced },
              { label: COPY.ownerApproval, text: v.live.ownerApproval },
            ]),
            listPart(COPY.workingAtEnd, v.live.workingAtEnd),
            rowsPart(COPY.inClass, v.live.paths),
          ],
          `${v.live.when} · ${v.live.mins}`,
        )
      : null,
    v.officeHours
      ? section(
          'office-hours',
          COPY.officeHours,
          [
            textPart(v.officeHours.note),
            rowsPart(null, v.officeHours.format),
            listPart(COPY.youLeaveWith, v.officeHours.outputs),
            listPart(null, v.officeHours.rules),
            rowsPart(COPY.issueForm, v.officeHours.issueForm),
          ],
          [v.officeHours.title, v.officeHours.when, v.officeHours.mins].filter(has).join(' · '),
        )
      : null,
    section('homework', COPY.homework, [
      listPart(COPY.byWeekEnd, v.homework.byWeekEnd),
      listPart(COPY.assignment, v.homework.assignment),
      listPart(COPY.acceptance, v.homework.acceptance),
      rowsPart(null, [{ label: COPY.useEvidence, text: v.homework.useEvidence }]),
      textPart(v.missedAWeek, true),
    ]),
    section('evidence', COPY.evidence, [rowsPart(null, v.evidence)]),
    section('rubric', COPY.rubric, [rowsOf(v.rubric.dimensions).length ? textPart(v.rubric.scale, true) : null, rowsPart(null, v.rubric.dimensions), listPart(null, v.rubric.rules)]),
    section('readiness', COPY.readiness, [rowsPart(null, v.readiness)]),
    section('media', COPY.media, [
      listPart(null, v.media.filter((m): m is string => typeof m === 'string')),
      videosPart(v.media.filter((m): m is VideoBlock => typeof m !== 'string')),
      listPart(COPY.materials, v.materials),
    ]),
    sampleSection(w.sampleOutput),
    seatSection(w.seatCard),
    playbookSection(w.playbookCard),
    last ? section('graduation', COPY.graduation, [listPart(null, after.graduation), textPart(after.graduationNote, true)]) : null,
    last ? section('after', COPY.afterWeek8, [rowsPart(null, after.paths), textPart(after.noPaywall, true), rowsPart(COPY.pilot, after.pilotQuestions)]) : null,
  ].filter((x): x is SectionVM => x !== null);

  const link = (x: LearnerCourseWeek | undefined, label: string): PagerLinkVM | null =>
    x ? { label, title: `${LABELS.week} ${x.week} · ${x.title}`, href: learnWeek(x.week) } : null;
  const prev = link(weeks[i - 1], COPY.previous);
  const next = link(weeks[i + 1], COPY.next);

  const build = p.sessions.filter((s) => s.week === week && s.kind === 'build').sort((a, b) => a.start - b.start)[0];
  const mins = w.module.checklist.reduce((n, s) => n + (s.mins || 0), 0);
  const meta: WeekMetaVM = {
    session: build ? { label: `${KIT.fromSession} ${build.n}`, title: build.title, href: learnSchedule() } : null,
    selfPaced: build ? null : KIT.selfPaced,
    build: mins > 0 ? `${mins} ${KIT.minBuild}` : null,
    forWho: has(m?.forWho) ? `${KIT.for} ${m!.forWho}` : null,
  };

  return { question: has(v.question) ? v.question : null, meta, sections, downloads: v.downloads, pager: prev || next ? { prev, next } : null };
}

// --- the build kit: the Module Builder's system prompt, files and instructor notes ------------------

export type CodePartKind = 'text' | 'head' | 'var' | 'blank';
export interface CodeLineVM {
  n: number;
  parts: { t: string; kind: CodePartKind }[];
}

/** The current portal's prompt view (`EmployeeDetail.vm.ts` `highlight`): `#` headings and `{{VARS}}` marked. */
export function codeLines(txt: string): CodeLineVM[] {
  return txt.split('\n').map((ln, i) => {
    const head = /^#/.test(ln);
    const parts = ln
      .split(/(\{\{[A-Z_]+\}\})/)
      .filter(Boolean)
      .map((x): { t: string; kind: CodePartKind } => ({ t: x, kind: /^\{\{/.test(x) ? 'var' : head ? 'head' : 'text' }));
    return { n: i + 1, parts: parts.length ? parts : [{ t: ' ', kind: 'blank' }] };
  });
}

export interface KitFileVM {
  key: string;
  name: string;
  type: SkillFile['type'];
  meta: string;
  /** What Preview shows (the current portal's preview of a skill file), and its lines. */
  preview: string;
  lines: CodeLineVM[];
  /** The gated files route, or null: a Notion template has nothing to download. */
  href: string | null;
  downloadLabel: string;
}

export interface BuildKitVM {
  prompt: null | {
    title: string;
    stats: string;
    text: string;
    vars: string[];
    lines: CodeLineVM[];
    /** The name a downloaded copy is saved under. */
    fileName: string;
    desc: string;
  };
  files: KitFileVM[];
  notes: null | { title: string; who: string; initials: string; body: string };
}

/**
 * The week's build kit from its module in the snapshot: the system prompt (view, copy and its `{{VARS}}`),
 * the module's uploaded files (each downloaded through `GET /api/files/module/:moduleId/:file`), and the
 * instructor notes. A piece that is empty in data is left out; null when nothing is left.
 */
export function buildKitVM(m: AIEmployee | undefined, fileUrl: (ref: StoredFileRef) => string | null): BuildKitVM | null {
  if (!m) return null;
  const text = m.prompt ?? '';
  const prompt = has(text)
    ? {
        title: KIT.systemPrompt,
        stats: `${text.split('\n').length} ${KIT.lines} · ${KIT.aboutTokens} ${Math.round(text.length / 4)} ${KIT.tokens}`,
        text,
        vars: [...new Set((text.match(/\{\{[A-Z_]+\}\}/g) ?? []).map((x) => x.replace(/[{}]/g, '')))],
        lines: codeLines(text),
        fileName: `${(m.short || m.id).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-system-prompt.md`,
        desc: m.name,
      }
    : null;
  const files = (m.files ?? [])
    .filter((f) => has(f.name))
    .map(
      (f, i): KitFileVM => {
        const preview = skillPreview(f, m);
        return {
        key: `${i}:${f.name}`,
        name: f.name,
        type: f.type,
        meta: [f.type, f.desc, f.size].filter(has).join(' · '),
        preview,
        lines: codeLines(preview),
        href: f.type === 'Notion' ? null : fileUrl({ kind: 'moduleFile', moduleId: m.id, fileName: f.name }),
        downloadLabel: `${KIT.download} ${f.name}`,
        };
      },
    );
  const notes = has(m.notes) ? { title: KIT.instructorNotes, who: m.instructor ?? '', initials: fmt.initials(m.instructor ?? ''), body: m.notes } : null;
  return prompt || files.length || notes ? { prompt, files, notes } : null;
}

// --- the breadcrumb trail ---------------------------------------------------------------------------

export interface CrumbVM {
  label: string;
  /** Null for the page itself (the last crumb). */
  href: string | null;
}

/** Home / the week, or Home / the week / Step 3: the trail a week page and a step show above their title. */
export function crumbsVM(weekTitle: string, week: number, step?: { n: number; title: string }): CrumbVM[] {
  return [
    { label: LABELS.home, href: learnHome() },
    { label: weekTitle, href: step ? learnWeek(week) : null },
    ...(step ? [{ label: `${LABELS.step} ${step.n} · ${step.title}`, href: null }] : []),
  ];
}

// --- the tab's title (X-2) --------------------------------------------------------------------------

/** "Week 1 · Where the Money Goes · Amplified AI Accelerator", as the course page names its tab; a step's adds itself first. */
export function tabTitle(week: number, weekTitle: string, step?: { n: number; title: string }): string {
  return [step ? `${LABELS.step} ${step.n} · ${step.title}` : null, `${LABELS.week} ${week} · ${weekTitle}`, KIT.program].filter((x): x is string => !!x).join(' · ');
}
