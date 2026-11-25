// D-252: the LMS tour. Which video it is (`tourVideoOf`), the rules a save of a flagged video is held to
// (`tourIssues`, in `saveBuilderModule`), and the seen flag (`setPref` with `lms-tour-seen`).
import { describe, expect, it } from 'vitest';
import { LMS_TOUR_MODULE_ID, LMS_TOUR_PREF, MutationError, TOUR_RULE, saveBuilderModule, seed, tourIssues, tourSeen, tourVideoOf } from '../src';
import { NOT_IN_PLAN } from '../src/accelerator';
import type { Actor, AIEmployee, Ctx, Db } from '../src';
import { courseFor } from '../src/course';
import type { LearnerCourse } from '../src/course';
import type { VideoBlock } from '../src/course-types';
import { setPref } from '../src/mutations';
import { curriculumSeed } from '../seed/curriculum';

const NOW = Date.parse('2026-12-07T10:42:00-07:00');
const mkCtx = (over: Partial<Ctx> = {}): Ctx => {
  let n = 1;
  return { now: NOW, id: (p: string) => `${p}_test_${n++}`, ...over };
};
const OWNER: Actor = { kind: 'staff', staffId: 'st1' };
const JAMIE: Actor = { kind: 'learner', userId: 'u_jamie' };

const key = (n: number, ext: string) => `uploads/2026/12/aaaaaaaa-bbbb-4ccc-8ddd-${String(n).padStart(12, '0')}.${ext}`;
const tour = (over: Partial<VideoBlock> = {}): VideoBlock => ({
  type: 'video',
  id: 'lms-tour',
  title: 'How the LMS Works',
  source: { upload: key(1, 'mp4'), name: 'tour.mp4', size: 1000, type: 'video/mp4' },
  poster: { upload: key(2, 'jpg'), name: 'tour.jpg', size: 10, type: 'image/jpeg' },
  transcript: { upload: key(3, 'vtt'), name: 'tour.vtt', size: 10, type: 'text/vtt' },
  chapters: [{ t: 0, label: 'Welcome to the Accelerator' }],
  durationS: 389.1,
  tour: true,
  ...over,
});

/** The demo db with the course's nine weeks and its cohort, as the builder saves them. */
function withCourse(): Db {
  const db = seed('live');
  const c = curriculumSeed();
  db.modules.push(...c.modules);
  db.cohorts = [c.cohort, ...db.cohorts.filter((x) => x.id !== c.cohort.id)];
  return db;
}
const weekOf = (db: Db, n: number): AIEmployee => structuredClone(db.modules.find((m) => m.id === `accelerator-week-${n}`)!);
const courseOf = (db: Db): LearnerCourse => courseFor(db, NOW, 'staff')!;

describe('tourVideoOf: which video is the tour', () => {
  it('is null for no course, and for a course with no flagged video (the feature does nothing)', () => {
    expect(tourVideoOf(null)).toBeNull();
    expect(tourVideoOf(undefined)).toBeNull();
    const db = withCourse();
    db.modules.find((m) => m.id === LMS_TOUR_MODULE_ID)!.course!.media.push(tour({ tour: undefined }));
    expect(tourVideoOf(courseOf(db))).toBeNull();
  });

  it('is the one flagged upload in Week 0’s Media, with its transcript', () => {
    const db = withCourse();
    const block = tour();
    db.modules.find((m) => m.id === LMS_TOUR_MODULE_ID)!.course!.media.push('A placeholder line', tour({ id: 'other', tour: undefined }), block);
    expect(tourVideoOf(courseOf(db))).toEqual(block);
  });

  it('ignores a flag outside Week 0’s Media: another week, or a step’s path', () => {
    const db = withCourse();
    db.modules.find((m) => m.id === 'accelerator-week-1')!.course!.media.push(tour());
    expect(tourVideoOf(courseOf(db))).toBeNull();
    const w0 = db.modules.find((m) => m.id === LMS_TOUR_MODULE_ID)!;
    w0.checklist[0]!.paths = { claude: { blocks: [tour()] } };
    expect(tourVideoOf(courseOf(db))).toBeNull();
  });

  it('ignores a flagged link, or an upload with no transcript', () => {
    const db = withCourse();
    const media = db.modules.find((m) => m.id === LMS_TOUR_MODULE_ID)!.course!.media;
    media.push(tour({ source: { url: 'https://example.test/tour.mp4' } }), tour({ transcript: undefined }));
    expect(tourVideoOf(courseOf(db))).toBeNull();
  });

  it('is null while Week 0 is a locked stub', () => {
    expect(tourVideoOf({ weeks: [{ week: 0, locked: true }] })).toBeNull();
    expect(tourVideoOf({ weeks: [{ week: 0, media: [tour()] }] })).toEqual(tour());
  });

  it('reads seen off the learner’s own prefs: only lms-tour-seen = 1', () => {
    expect(tourSeen(undefined)).toBe(false);
    expect(tourSeen([{ key: 'week0-done', value: '1', updatedAt: 1 }])).toBe(false);
    expect(tourSeen([{ key: LMS_TOUR_PREF, value: '0', updatedAt: 1 }])).toBe(false);
    expect(tourSeen([{ key: 'path', value: 'claude', updatedAt: 1 }, { key: LMS_TOUR_PREF, value: '1', updatedAt: 1 }])).toBe(true);
  });
});

describe('tourIssues: the rules for a flagged video, on save', () => {
  it('passes one uploaded video with a transcript in Week 0’s Media, and a week with none', () => {
    const db = withCourse();
    const w0 = weekOf(db, 0);
    expect(tourIssues(w0, db.modules)).toEqual([]);
    w0.course!.media.push(tour());
    expect(tourIssues(w0, db.modules)).toEqual([]);
  });

  it('refuses it anywhere but Week 0’s Media', () => {
    const db = withCourse();
    const w1 = weekOf(db, 1);
    w1.course!.media = [tour()];
    expect(tourIssues(w1, db.modules)).toEqual([`Media 1: ${TOUR_RULE.where}`]);
    const w0 = weekOf(db, 0);
    w0.checklist[1]!.paths = { claude: { blocks: [tour()] } };
    expect(tourIssues(w0, db.modules)).toEqual([`Step 2, Claude path, block 1: ${TOUR_RULE.where}`]);
  });

  it('refuses a link, and an upload with no transcript', () => {
    const db = withCourse();
    const w0 = weekOf(db, 0);
    const n = w0.course!.media.length;
    w0.course!.media.push(tour({ source: { url: 'https://example.test/a.mp4' } }));
    expect(tourIssues(w0, db.modules)).toEqual([`Media ${n + 1}: ${TOUR_RULE.upload}`]);
    w0.course!.media[n] = tour({ transcript: undefined });
    expect(tourIssues(w0, db.modules)).toEqual([`Media ${n + 1}: ${TOUR_RULE.transcript}`]);
  });

  it('refuses a second one, in the same week or anywhere else in the course', () => {
    const db = withCourse();
    const w0 = weekOf(db, 0);
    w0.course!.media.push(tour(), tour({ id: 'second' }));
    expect(tourIssues(w0, db.modules)).toEqual([TOUR_RULE.one]);
    const stored = db.modules.find((m) => m.id === 'accelerator-week-3')!;
    stored.course!.media.push(tour({ id: 'stray' }));
    const one = weekOf(db, 0);
    one.course!.media.push(tour());
    expect(tourIssues(one, db.modules)).toEqual([TOUR_RULE.elsewhere('Week 3')]);
  });

  it('holds the builder’s save to them: refused inline with nothing written, then saved once it passes', () => {
    const db = withCourse();
    const bad = weekOf(db, 0);
    bad.course!.media.push(tour({ transcript: undefined }));
    const refused = saveBuilderModule(db, OWNER, { draft: bad }, mkCtx());
    expect(refused.error).toContain(TOUR_RULE.transcript);
    expect(refused.db).toBe(db);
    expect(refused.audit).toBeUndefined();

    const good = weekOf(db, 0);
    good.course!.media.push(tour());
    const saved = saveBuilderModule(db, OWNER, { draft: good }, mkCtx());
    expect(saved.error).toBeUndefined();
    expect(tourVideoOf(courseOf(saved.db))).toEqual(tour());
  });
});

describe('setPref with lms-tour-seen', () => {
  const prefsOf = (db: Db) => db.users.find((u) => u.id === 'u_jamie')!.coursePrefs ?? [];

  it('stores 1 for a learner whose plan opens the course, beside their other prefs', () => {
    const db = seed('live');
    const first = setPref(db, JAMIE, { key: 'week0-done', value: '1' }, mkCtx({ course: true }));
    const out = setPref(first.db, JAMIE, { key: LMS_TOUR_PREF, value: '1' }, mkCtx({ course: true }));
    expect(out.error).toBeUndefined();
    expect(prefsOf(out.db)).toEqual([
      { key: LMS_TOUR_PREF, value: '1', updatedAt: NOW },
      { key: 'week0-done', value: '1', updatedAt: NOW },
    ]);
    expect(tourSeen(prefsOf(out.db))).toBe(true);
    // The fixture build and the oracle pass no course answer: open, as for every course week.
    expect(prefsOf(setPref(db, JAMIE, { key: LMS_TOUR_PREF, value: '1' }, mkCtx()).db).length).toBe(1);
  });

  it('accepts only 1', () => {
    const db = seed('live');
    for (const value of ['0', 'yes', '', '11']) {
      expect(() => setPref(db, JAMIE, { key: LMS_TOUR_PREF, value }, mkCtx({ course: true })), value).toThrow('That preference is not one this page stores.');
    }
  });

  it('refuses a learner whose plan doesn’t open the course, with the course’s own refusal', () => {
    const db = seed('live');
    let thrown: unknown = null;
    try {
      setPref(db, JAMIE, { key: LMS_TOUR_PREF, value: '1' }, mkCtx({ course: false }));
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(MutationError);
    expect(thrown).toMatchObject({ code: 'forbidden', message: NOT_IN_PLAN });
  });

  it('refuses staff: it is a learner’s own flag', () => {
    expect(() => setPref(seed('live'), OWNER, { key: LMS_TOUR_PREF, value: '1' }, mkCtx({ course: true }))).toThrow('That action is for learners.');
  });
});
