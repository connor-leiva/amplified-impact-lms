// The Module Builder's course-week sections (D-174, learner build PR 2b): pure helpers for what the
// builder shows and edits on a module of kind `week`. No React, no hooks, no clock read. The words
// themselves are the draft's (the database's): nothing here holds course content, only labels.
//
// An AI Employee (no `kind`) never reaches these: the builder draws exactly what the R2 mockup draws
// for it, so the enforced `builder` cells (the demo's m1) keep their numbers.

import { COURSE_TZ, changedFields, checklistIssues, copyIssues, issueLine, kitVisible, moduleCopyFields, videoIssues, zonedInputs, zonedInstant } from '@ai/core';
import type { AIEmployee, Db, Resource, ResourceKind, ResourcePlatform, ResourceVisibility, ReplayVisibility, Session, SessionType } from '@ai/core';
import { acceleratorModuleId } from '@ai/core/accelerator';
import type { ContentBlock, CourseContent, MediaItem, PathBlock, VideoBlock } from '@ai/core/course-types';
import { courseFor, courseFromSnapshot, courseSessions } from '@ai/core/course';
import type { CourseKitItem } from '@ai/core/course';
import type { Load } from '../course/Course';

/** A course week's draft: a module of kind `week` that carries its words. */
export type WeekDraft = AIEmployee & { kind: 'week'; course: NonNullable<AIEmployee['course']> };
export const isWeekDraft = (d: AIEmployee): d is WeekDraft => d.kind === 'week' && !!d.course;

// --- labels the builder shows (chrome, not course words) -------------------------------------------

export const SESSION_KIND_LABELS: Readonly<Record<SessionType, string>> = {
  live_build: 'Live build',
  office_hours: 'Office hours',
  goal_planning: 'Goal planning',
  setup: 'Setup',
  other: 'Other',
};
export const REPLAY_LABELS: Readonly<Record<ReplayVisibility, string>> = {
  hidden: 'Hidden',
  after_open: 'After the week opens',
  published: 'Published',
};
export const RESOURCE_KIND_LABELS: Readonly<Record<ResourceKind, string>> = {
  file: 'File',
  prompt: 'Prompt',
  guide: 'Guide',
  replay: 'Replay',
  vault: 'Vault item',
};
export const VISIBILITY_LABELS: Readonly<Record<ResourceVisibility, string>> = {
  hidden_until_open: 'Hidden until the week opens',
  open_in_preview: 'Open in the preview',
  published: 'Published',
  hidden: 'Hidden',
};
export const PLATFORM_LABELS: Readonly<Record<ResourcePlatform, string>> = { claude: 'Claude', chatgpt: 'ChatGPT', both: 'Claude and ChatGPT' };

/** The learner mockup's tile tones ("one icon, one topic colour"). */
export const TONES = ['forest', 'blue', 'amber', 'terra', 'green', 'solid'] as const;
export const TONE_LABELS: Readonly<Record<(typeof TONES)[number], string>> = {
  forest: 'Forest',
  blue: 'Blue',
  amber: 'Amber',
  terra: 'Terra',
  green: 'Green',
  solid: 'Solid',
};

/** The block kinds a step's path or a sample output is made of, (D-188) a video, and (D-190) a checklist step. */
export const BLOCK_LABELS: Readonly<Record<PathBlock['type'], string>> = {
  text: 'Paragraph',
  copy: 'Copy box',
  list: 'List',
  table: 'Table',
  video: 'Video',
  check: 'Checklist item',
  callout: 'Callout',
  accordion: 'Accordion',
};

/** A sample output's kinds (no video); a step path's (D-188: with video, D-190: with checklist blocks); the week's Media videos. */
export const CONTENT_KINDS: readonly ContentBlock['type'][] = ['text', 'copy', 'list', 'table'];
export const PATH_KINDS: readonly PathBlock['type'][] = [...CONTENT_KINDS, 'video', 'check', 'callout', 'accordion'];
export const VIDEO_KINDS: readonly PathBlock['type'][] = ['video'];

/** D-188: a video block's fields in the builder. */
export const VIDEO_LABELS = {
  source: 'Source',
  link: 'Link',
  upload: 'Upload an mp4',
  linkHint: 'https://',
  choose: 'Choose an mp4',
  chooseAnother: 'Choose another mp4',
  noFile: 'No file yet.',
  title: 'Title',
  titleHint: 'Optional, shown with the video',
  mediaVideos: 'Media videos',
  id: 'Id',
  idHint: 'Stable on this week, like w0-04a. Used to resume and to check items.',
  poster: 'Upload poster (jpg)',
  posterAnother: 'Choose another poster',
  transcript: 'Upload transcript (vtt)',
  transcriptAnother: 'Choose another transcript',
  removeFile: 'Remove',
  draft: 'Draft video · narration coming',
  chapters: 'Chapters',
  chaptersHint: 'One per line: 0:47 | Open Settings | item-1',
} as const;

/** A week's Media split as the builder edits it: its lines, then its videos (D-188). */
export const mediaLines = (media: readonly MediaItem[]): string[] => media.filter((m): m is string => typeof m === 'string');
export const mediaVideos = (media: readonly MediaItem[]): VideoBlock[] => media.filter((m): m is VideoBlock => typeof m !== 'string');

// --- Mountain Time ---------------------------------------------------------------------------------

const mt = new Intl.DateTimeFormat('en-US', { timeZone: COURSE_TZ, weekday: 'short', month: 'short', day: 'numeric' });
const mtClock = new Intl.DateTimeFormat('en-US', { timeZone: COURSE_TZ, hour: 'numeric', minute: '2-digit' });

/** "Wed, Dec 9 · 12:00 PM MT": an instant as the course shows it. */
export const mtWhen = (t: number): string => `${mt.format(new Date(t))} · ${mtClock.format(new Date(t))} MT`;

/** The date and time inputs for an instant (or blank), in Mountain Time. */
export const mtInputs = (t: number | null | undefined): { date: string; time: string } => (t ? zonedInputs(t, COURSE_TZ) : { date: '', time: '' });

/** A date and a time typed in Mountain Time; a blank time is noon (the brief's default); a blank date is none. */
export function mtFrom(date: string, time: string): number | null {
  if (!date) return null;
  const t = zonedInstant(date, time || '12:00', COURSE_TZ);
  return Number.isNaN(t) ? null : t;
}

// --- the week's sessions and kit -------------------------------------------------------------------

/** The week's live-build and office-hours pages name these sessions. */
export function namedSessionIds(d: WeekDraft): string[] {
  return [d.course.liveBuild?.sessionId, d.course.officeHours?.sessionId].filter((x): x is string => !!x);
}

export interface WeekSessionRow {
  id: string;
  title: string;
  when: string;
  mins: number;
  kind: string;
  /** A week page names it, so it can't be deleted here. */
  named: boolean;
  session: Session;
}

/** The week's sessions: those that belong to it, and those its pages name; by start. */
export function weekSessions(db: Pick<Db, 'sessions'>, d: WeekDraft): WeekSessionRow[] {
  const named = new Set(namedSessionIds(d));
  return db.sessions
    .filter((s) => s.moduleId === d.id || named.has(s.id))
    .sort((a, b) => a.start - b.start)
    .map((s) => ({ id: s.id, title: s.title, when: mtWhen(s.start), mins: s.mins, kind: s.kind ? SESSION_KIND_LABELS[s.kind] : 'Session', named: named.has(s.id), session: s }));
}

export interface KitRow {
  id: string;
  title: string;
  kind: string;
  visibility: string;
  platform: string;
  step: string;
  resource: Resource;
}

/** The week's kit: the vault items attached to it, with where each sits. */
export function weekKit(db: Pick<Db, 'resources'>, d: WeekDraft): KitRow[] {
  return db.resources
    .filter((r) => r.module === d.id)
    .map((r) => {
      const i = r.stepId ? d.checklist.findIndex((s) => s.id === r.stepId) : -1;
      return {
        id: r.id,
        title: r.title,
        kind: r.kind ? RESOURCE_KIND_LABELS[r.kind] : 'Not set',
        visibility: r.visibility ? VISIBILITY_LABELS[r.visibility] : 'Not set',
        platform: r.platform ? PLATFORM_LABELS[r.platform] : 'Not set',
        step: i >= 0 ? `Step ${i + 1}` : 'The week',
        resource: r,
      };
    });
}

/** Vault items not attached to any module, for "Attach from the vault". */
export const unattached = (db: Pick<Db, 'resources'>): Resource[] => db.resources.filter((r) => !r.module);

// --- the copy rules, while staff type --------------------------------------------------------------

/** What this draft would be refused for on Save: the copy rules on every string it changed. */
export function draftIssues(stored: AIEmployee | null, draft: AIEmployee): string[] {
  // D-188: and a video whose source isn't an uploaded mp4 or an http(s) link, as the save refuses it.
  return [...copyIssues(changedFields(stored ? moduleCopyFields(stored) : [], moduleCopyFields(draft))).map(issueLine), ...videoIssues(draft), ...checklistIssues(draft)];
}

// --- small list edits ------------------------------------------------------------------------------

export const setAt = <T>(list: readonly T[], i: number, v: T): T[] => list.map((x, j) => (j === i ? v : x));
export const removeAt = <T>(list: readonly T[], i: number): T[] => list.filter((_, j) => j !== i);
export function moveBy<T>(list: readonly T[], i: number, by: -1 | 1): T[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return [...list];
  const out = [...list];
  [out[i], out[j]] = [out[j]!, out[i]!];
  return out;
}

/** D-190: the next checklist id that is not already on this step. Staff can edit it. Don’t reuse one you removed. */
/** D-191: a suggested video id that is not already used in this list. Staff can edit it. */
export function nextVideoId(taken: readonly string[]): string {
  const used = new Set(taken);
  let n = 1;
  while (used.has(`v${n}`)) n += 1;
  return `v${n}`;
}

export function nextCheckId(taken: readonly string[]): string {
  const used = new Set(taken);
  let n = 1;
  while (used.has(`item-${n}`)) n += 1;
  return `item-${n}`;
}

export const CHECK_ROLES = [
  ['', 'No role tag'],
  ['owner', 'Owner'],
  ['operator', 'Operator'],
  ['each', 'Each of you'],
] as const;

export const CALLOUT_KINDS = [
  ['tip', 'Tip'],
  ['heads_up', 'Heads up'],
  ['diy', 'Doing it yourself?'],
] as const;

export const ACTION_KINDS = [
  ['', 'No button'],
  ['download', 'Download'],
  ['copy', 'Copy'],
  ['invite', 'Invite'],
  ['calendar', 'Add to calendar'],
  ['link', 'Link'],
  ['form', 'Form'],
  ['card', 'Card'],
  // D-230: Turn in. The step's button opens the upload drawer for the kind below; its words are the drawer's.
  ['upload', 'Turn in'],
] as const;

/** D-230: what an Upload action collects, as the drawer heads it (`SUBMISSION_KIND_LABEL`). */
export const UPLOAD_KINDS = [
  ['live_read', 'Report for a live read'],
  ['checkpoint', 'Checkpoint'],
] as const;

/** A new block of a kind, empty. */
export function newBlock(type: PathBlock['type']): PathBlock {
  if (type === 'video') return { type, source: { url: '' } };
  if (type === 'text') return { type, text: '' };
  if (type === 'copy') return { type, label: '', text: '' };
  if (type === 'list') return { type, items: [''] };
  if (type === 'table') return { type, rows: [] };
  if (type === 'check') return { type, id: '', title: '' };
  if (type === 'callout') return { type, kind: 'tip', text: '' };
  return { type: 'accordion', title: '', body: [''] };
}

/** A table's cells as staff type them: a line per row, cells split by "|". */
export const tableText = (rows: readonly (readonly string[])[]): string => rows.map((r) => r.join(' | ')).join('\n');
export const tableRows = (text: string): string[][] =>
  text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => l.split('|').map((c) => c.trim()));

/** A list as staff type it: one item per line. */
export const listText = (items: readonly string[]): string => items.join('\n');
export const listItems = (text: string): string[] => text.split('\n').map((l) => l.trim()).filter(Boolean);

// --- the live preview of the learner pages, from the unsaved draft (PR 2c) ---------------------------

/** Who the preview shows the course to. */
export type PreviewAs = 'owner' | 'operator' | 'utah' | 'prelaunch';
export const PREVIEW_AS_LABELS: Readonly<Record<PreviewAs, string>> = {
  owner: 'Owner',
  operator: 'Operator',
  utah: 'Utah Life',
  prelaunch: 'Before launch',
};

/** The snapshot as it would be if the draft were saved (a draft week shown as it would be published). */
export function withDraft(db: Db, draft: WeekDraft): Db {
  const shown: AIEmployee = draft.status === 'draft' ? { ...draft, status: 'published' } : draft;
  return { ...db, modules: db.modules.map((m) => (m.id === draft.id ? shown : m)) };
}

/**
 * Kit on a week the preview shows whole. `courseFromSnapshot` is the ungated course (staff can read a
 * week that has not opened yet) and it never carried kit. A learner who can open the week gets the
 * items `kitVisible` allows then, including "Open in the preview". The preview uses that same rule,
 * so the step player’s "For this step" matches the live portal (D-192). The one-step layout reads the same rows.
 */
function withOpenWeekKit(db: Db, course: CourseContent): CourseContent {
  return {
    ...course,
    weeks: course.weeks.map((w) => {
      const id = acceleratorModuleId(w.week);
      const kit: CourseKitItem[] = db.resources
        .filter((r) => r.module === id && r.status === 'published' && kitVisible(r, true, false))
        .map((r) => ({ id: r.id, title: r.title, kind: r.kind ?? null, platform: r.platform ?? null, stepId: r.stepId ?? null }));
      return kit.length ? { ...w, kit } : w;
    }),
  };
}

/**
 * What the course page would answer this viewer, from the draft. An owner and an operator get the
 * course (the same page today; PR 5's learner pages show each their own work). A Utah Life member's
 * plan doesn't include the course. Before launch, a buyer gets the welcome with the opening date.
 */
export function previewLoad(db: Db, draft: WeekDraft, as: PreviewAs, opensAt: number): Load {
  if (as === 'utah') return { kind: 'locked' };
  const next = withDraft(db, draft);
  const copy = Object.fromEntries((next.copy ?? []).filter((c) => c.audience === 'learner').map((c) => [c.key, c.value]));
  if (as === 'prelaunch') {
    // D-175: once the cohort has a preview date, a buyer before launch is in the preview, as of that
    // moment: Week 0 open, every week scheduled later locked with its date. With none, the welcome.
    const at = next.cohorts.find((c) => c.id === 'dec26')?.previewOpensAt;
    if (at === undefined) return { kind: 'upcoming', opensAt };
    const preview = courseFor(next, at, { open: true, preview: true });
    if (!preview) return { kind: 'failed' };
    return { kind: 'ready', payload: { open: true, preview: false, prelaunch: true, course: preview, sessions: courseSessions(next), copy } };
  }
  const course = courseFromSnapshot(next);
  if (!course) return { kind: 'failed' };
  return { kind: 'ready', payload: { open: true, preview: false, course: withOpenWeekKit(next, course), sessions: courseSessions(next), copy } };
}

/** The course page's address for the draft's week. */
export const previewWeek = (draft: WeekDraft): string => `week-${draft.course.week}`;
