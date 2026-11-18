// The Module Builder's course-week sections (D-174, learner build PR 2b): pure helpers for what the
// builder shows and edits on a module of kind `week`. No React, no hooks, no clock read. The words
// themselves are the draft's (the database's): nothing here holds course content, only labels.
//
// An AI Employee (no `kind`) never reaches these: the builder draws exactly what the R2 mockup draws
// for it, so the enforced `builder` cells (the demo's m1) keep their numbers.

import { COURSE_TZ, changedFields, copyIssues, issueLine, moduleCopyFields, zonedInputs, zonedInstant } from '@ai/core';
import type { AIEmployee, Db, Resource, ResourceKind, ResourcePlatform, ResourceVisibility, ReplayVisibility, Session, SessionType } from '@ai/core';
import type { ContentBlock } from '@ai/core/course-types';
import { courseFor, courseFromSnapshot, courseSessions } from '@ai/core/course';
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

/** The block kinds a step's path or a sample output is made of. */
export const BLOCK_LABELS: Readonly<Record<ContentBlock['type'], string>> = { text: 'Paragraph', copy: 'Copy box', list: 'List', table: 'Table' };

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
  return copyIssues(changedFields(stored ? moduleCopyFields(stored) : [], moduleCopyFields(draft))).map(issueLine);
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

/** A new block of a kind, empty. */
export function newBlock(type: ContentBlock['type']): ContentBlock {
  if (type === 'text') return { type, text: '' };
  if (type === 'copy') return { type, label: '', text: '' };
  if (type === 'list') return { type, items: [''] };
  return { type, rows: [] };
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
  return { kind: 'ready', payload: { open: true, preview: false, course, sessions: courseSessions(next), copy } };
}

/** The course page's address for the draft's week. */
export const previewWeek = (draft: WeekDraft): string => `week-${draft.course.week}`;
