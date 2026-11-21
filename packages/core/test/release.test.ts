// D-175: when the course, and each week, opens to a learner. Logic here, every date from data.
import { describe, expect, it } from 'vitest';
import { COURSE_OPENS_AT } from '../src/accelerator';
import type { AcceleratorPlan } from '../src/accelerator';
import { courseFor, isLockedWeek } from '../src/course';
import { CLOSED, courseEntry, courseUpcoming, kitVisible, mountainWhen, weekOpenFor } from '../src/release';
import { scopeSnapshot } from '../src/scope';
import type { Db } from '../src/types';
import { ACCELERATOR_MODULE_IDS } from '../src/accelerator';
import { seedProduction } from '../seed/curriculum';
import { WEEK0_DUE_V1, WEEK_OPENS_V1, planReleaseV1 } from '../seed/release-plan-v1';

const MT = (iso: string): number => Date.parse(`${iso}-07:00`);
const PREVIEW = MT('2026-11-18T12:00:00');
const plan = (over: Partial<AcceleratorPlan> = {}): AcceleratorPlan => ({ kind: 'cohort', option: 'full', status: 'active', startsAt: COURSE_OPENS_AT, ...over });

describe('entering the course (D-175)', () => {
  it('is D-153 exactly while the cohort has no preview date', () => {
    expect(courseEntry([plan()], MT('2026-11-20T10:00:00'), {})).toEqual(CLOSED);
    expect(courseEntry([plan()], COURSE_OPENS_AT, {})).toEqual({ open: true, preview: false });
    expect(courseUpcoming([plan()], MT('2026-11-20T10:00:00'), {})).toBe(COURSE_OPENS_AT);
  });

  it('opens the preview at the cohort’s date to a live plan, ignoring the plan’s start, until the course itself opens', () => {
    const release = { previewOpensAt: PREVIEW };
    expect(courseEntry([plan()], PREVIEW - 1, release)).toEqual(CLOSED);
    expect(courseUpcoming([plan()], PREVIEW - 1, release)).toBe(PREVIEW);
    expect(courseEntry([plan()], PREVIEW, release)).toEqual({ open: true, preview: true });
    expect(courseEntry([plan({ option: 'two_pay' })], PREVIEW, release)).toEqual({ open: true, preview: true });
    expect(courseEntry([plan()], COURSE_OPENS_AT, release)).toEqual({ open: true, preview: false });
    expect(courseUpcoming([plan()], PREVIEW, release)).toBe(COURSE_OPENS_AT);
  });

  it('never opens to a plan that isn’t live, or isn’t the course: paused (D-143), ended, or another plan', () => {
    const release = { previewOpensAt: PREVIEW };
    for (const p of [plan({ option: 'two_pay', status: 'past_due' }), plan({ status: 'ended' }), plan({ kind: 'insiders', option: 'year' }), plan({ kind: 'team', option: 'month' })]) {
      expect(courseEntry([p], PREVIEW + 1, release), JSON.stringify(p)).toEqual(CLOSED);
      expect(courseUpcoming([p], PREVIEW - 1, release), JSON.stringify(p)).toBeNull();
    }
    expect(courseEntry([], PREVIEW + 1, release)).toEqual(CLOSED);
  });

  it('opens a week as the builder says: published now, scheduled at its opening, only with entry', () => {
    const preview = { open: true, preview: true };
    expect(weekOpenFor({ status: 'published', opens: null }, PREVIEW, preview)).toBe(true);
    expect(weekOpenFor({ status: 'scheduled', opens: WEEK_OPENS_V1[1]! }, WEEK_OPENS_V1[1]! - 1, preview)).toBe(false);
    expect(weekOpenFor({ status: 'scheduled', opens: WEEK_OPENS_V1[1]! }, WEEK_OPENS_V1[1]!, preview)).toBe(true);
    expect(weekOpenFor({ status: 'published', opens: null }, PREVIEW, CLOSED)).toBe(false);
    // D-202: early access opens a scheduled week before its date, and still leaves a draft out.
    expect(weekOpenFor({ status: 'scheduled', opens: WEEK_OPENS_V1[1]! }, WEEK_OPENS_V1[1]! - 1, { open: true, preview: false, early: true })).toBe(true);
    expect(weekOpenFor({ status: 'draft', opens: null }, PREVIEW, { open: true, preview: false, early: true })).toBe(false);
    expect(weekOpenFor({ status: 'scheduled', opens: WEEK_OPENS_V1[1]! }, WEEK_OPENS_V1[1]! - 1, { open: false, preview: false, early: true })).toBe(false);
  });

  it('shows a kit item by its week and its visibility; a vault item on no course week is the vault’s', () => {
    const on = (visibility?: 'hidden_until_open' | 'open_in_preview' | 'published' | 'hidden') => ({ module: ACCELERATOR_MODULE_IDS[1], ...(visibility ? { visibility } : {}) });
    expect([kitVisible(on(), false, true), kitVisible(on(), true, false)]).toEqual([false, true]);
    expect([kitVisible(on('hidden_until_open'), false, true), kitVisible(on('hidden_until_open'), true, true)]).toEqual([false, true]);
    expect([kitVisible(on('open_in_preview'), false, true), kitVisible(on('open_in_preview'), false, false)]).toEqual([true, false]);
    expect([kitVisible(on('published'), false, false), kitVisible(on('hidden'), true, true)]).toEqual([true, false]);
    expect(kitVisible({ module: 'sales' }, false, false)).toBe(true);
    expect(kitVisible({}, false, false)).toBe(true);
  });

  it('writes a time in Mountain Time, with MT', () => {
    expect(mountainWhen(WEEK_OPENS_V1[2]!)).toBe('Wed, Dec 9 · 12:00 PM MT');
    expect(mountainWhen(WEEK0_DUE_V1)).toBe('Mon, Nov 30 · 12:00 PM MT');
  });
});

describe('what a learner gets of the course (D-175)', () => {
  /** Production after the release plan, with a preview date: Week 0 published, Weeks 1 to 8 scheduled. */
  const released = (): Db => {
    const db = planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db;
    db.cohorts[0]!.previewOpensAt = PREVIEW;
    return db;
  };

  it('gives a preview learner Week 0 whole and every other week as the outline shows it, with its opening', () => {
    const db = released();
    const course = courseFor(db, PREVIEW, { open: true, preview: true })!;
    expect(course.weeks.map((w) => [w.week, isLockedWeek(w)])).toEqual([[0, false], ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => [n, true])]);
    const w2 = course.weeks[2]!;
    expect(w2).toEqual({ week: 2, title: db.modules[2]!.course!.title, question: db.modules[2]!.course!.question, outcome: db.modules[2]!.outcome, opensAt: WEEK_OPENS_V1[2], locked: true });
    // None of a locked week's content is in the answer.
    const json = JSON.stringify(course);
    for (const n of [1, 2, 3]) {
      const c = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[n])!.course!;
      for (const said of [c.liveBuild!.lesson, c.homework.useEvidence, c.why[0]!]) expect(json).not.toContain(said);
    }
  });

  it('opens each week at its live build: locked at 11:59 AM MT, open at noon, Jan 6 after the holiday too', () => {
    const db = released();
    const entry = { open: true, preview: false };
    const at = (t: number) => courseFor(db, t, entry)!.weeks.filter((w) => !isLockedWeek(w)).map((w) => w.week);
    expect(at(WEEK_OPENS_V1[1]! - 60_000)).toEqual([0]);
    expect(at(WEEK_OPENS_V1[1]!)).toEqual([0, 1]);
    expect(at(WEEK_OPENS_V1[3]!)).toEqual([0, 1, 2, 3]);
    expect(at(WEEK_OPENS_V1[4]! - 1)).toEqual([0, 1, 2, 3]);
    expect(at(WEEK_OPENS_V1[4]!)).toEqual([0, 1, 2, 3, 4]);
    expect(at(WEEK_OPENS_V1[8]!)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('moves a week’s opening when the builder moves it, with no deploy', () => {
    const db = released();
    const w1 = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[1])!;
    w1.opens = PREVIEW + 3_600_000; // staff open Week 1 an hour into the preview
    const weeks = courseFor(db, PREVIEW + 3_600_000, { open: true, preview: true })!.weeks;
    expect(isLockedWeek(weeks[1]!)).toBe(false);
  });

  it('shows staff every week whole, whatever the dates', () => {
    expect(courseFor(released(), PREVIEW, 'staff')!.weeks.every((w) => !isLockedWeek(w))).toBe(true);
  });

  it('lists an open week’s kit by its visibility, and none of a locked week’s', () => {
    const db = released();
    const kit = (id: string, module: string, visibility: 'hidden_until_open' | 'open_in_preview' | 'published' | 'hidden') =>
      db.resources.push({ id, title: id, desc: '', cat: 'Prompts', type: 'TXT', tier: 'agent', size: '1 KB', dl: 0, updated: 0, exec: false, status: 'published', module, visibility, kind: 'prompt', platform: 'claude' });
    kit('r_w0', ACCELERATOR_MODULE_IDS[0]!, 'hidden_until_open');
    kit('r_w0_hidden', ACCELERATOR_MODULE_IDS[0]!, 'hidden');
    kit('r_w1', ACCELERATOR_MODULE_IDS[1]!, 'hidden_until_open');
    const course = courseFor(db, PREVIEW, { open: true, preview: true })!;
    const w0 = course.weeks[0]!;
    expect(isLockedWeek(w0) ? null : w0.kit).toEqual([{ id: 'r_w0', title: 'r_w0', kind: 'prompt', platform: 'claude', stepId: null, type: 'TXT' }]);
    expect(JSON.stringify(course)).not.toContain('r_w1');
  });

  it('gives a preview learner’s snapshot each locked week as a stub: Scheduled at its opening, none of its content', () => {
    const db = released();
    db.users.push({ id: 'u_buyer', name: 'Buyer', email: 'b@example.test', tier: 'team', role: 'Team Owner', teamId: 't1', cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} });
    const snap = scopeSnapshot(db, { kind: 'learner', userId: 'u_buyer' }, { accelerator: true, at: PREVIEW, preview: true });
    const w0 = snap.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!;
    const w2 = snap.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[2])!;
    expect(w0.notes.length).toBeGreaterThan(0);
    expect(w0.checklist.length).toBeGreaterThan(0);
    expect(w2).toMatchObject({ status: 'scheduled', opens: WEEK_OPENS_V1[2], notes: '', prompt: '', checklist: [], files: [], transcript: [], outputs: [] });
    expect(w2.name).toBe(db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[2])!.name);
    // Its live build is on the calendar, with no replay.
    expect(snap.sessions.find((s) => s.id === 'dec26-s2')).toMatchObject({ replay: null, zoom: '' });
    // Without `at`, as every caller before D-175: every week open.
    const legacy = scopeSnapshot(db, { kind: 'learner', userId: 'u_buyer' }, { accelerator: true });
    expect(legacy.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[2])!.notes.length).toBeGreaterThan(0);
  });
});
