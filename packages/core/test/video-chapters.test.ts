// D-191: chapter lines, caption cues, which chapter is playing, and the 90% rule.
import { describe, expect, it } from 'vitest';
import { seed } from '../src';
import * as M from '../src/mutations';
import type { Ctx } from '../src/mutations';
import { WATCHED_TOAST } from '../src/mutations';
import type { CheckBlock, VideoBlock } from '../src/course-types';
import {
  activeChapterIndex,
  activeCueIndex,
  chapterText,
  crossesWatch,
  mergeSpans,
  parseCaptionCues,
  parseChapters,
  resumeAt,
  watchedFraction,
  watchThreshold,
} from '../src';

const VTT = [
  'WEBVTT',
  '',
  '00:00:00.000 --> 00:00:01.500 align:start line:0',
  'Welcome',
  'in.',
  '',
  '1',
  '00:00:01.500 --> 00:00:03.000',
  '<v Connor>The starting line',
  '',
].join('\n');

describe('captions (D-191)', () => {
  it('reads cues, joins a second line, and ignores settings and tags', () => {
    const { cues, error } = parseCaptionCues(VTT);
    expect(error).toBeNull();
    expect(cues).toEqual([
      { start: 0, end: 1.5, text: 'Welcome\nin.' },
      { start: 1.5, end: 3, text: 'The starting line' },
    ]);
    expect(activeCueIndex(cues, 0)).toBe(0);
    expect(activeCueIndex(cues, 1.5)).toBe(1);
    expect(activeCueIndex(cues, 3)).toBe(-1);
  });

  it('accepts a short timestamp and a header note, and refuses a file that is not WebVTT', () => {
    const ok = parseCaptionCues('WEBVTT\n\n00:01.500 --> 00:02.000 position:50%\nNext\n');
    expect(ok.error).toBeNull();
    expect(ok.cues).toEqual([{ start: 1.5, end: 2, text: 'Next' }]);
    expect(parseCaptionCues('NOTE only\n').error).toBe('Not a WebVTT document.');
    expect(parseCaptionCues('WEBVTT\n\nnot a cue\n').error).toMatch(/no timing/);
    expect(parseCaptionCues('WEBVTT\n\n00:00:01.000 --> nope\nHi\n').error).toMatch(/cannot be read/);
    expect(parseCaptionCues('WEBVTT\n').cues).toEqual([]);
  });
});

describe('chapters (D-191)', () => {
  it('parses a line of time, label and checklist id, and writes it back', () => {
    const parsed = parseChapters('0:47.1 | Map Your Spend self-test | s4c-mys\n1:12 | Lead Source Review self-test\n');
    expect(parsed.error).toBeNull();
    expect(parsed.chapters).toEqual([
      { t: 47.1, label: 'Map Your Spend self-test', item: 's4c-mys' },
      { t: 72, label: 'Lead Source Review self-test' },
    ]);
    expect(parseChapters(chapterText(parsed.chapters)).chapters).toEqual(parsed.chapters);
  });

  it('refuses a bad time, a missing label and a chapter that runs backward', () => {
    expect(parseChapters('soon | Hello').error).toMatch(/not a time/);
    expect(parseChapters('0:10').error).toMatch(/time \| label/);
    expect(parseChapters('1:00 | Later\n0:10 | Earlier').error).toMatch(/time order/);
  });

  it('highlights the chapter that has started, and keeps it until the next one', () => {
    const chapters = [{ t: 0 }, { t: 15.27 }, { t: 55.2 }];
    expect(activeChapterIndex(chapters, 0)).toBe(0);
    expect(activeChapterIndex(chapters, 15)).toBe(0);
    expect(activeChapterIndex(chapters, 15.27)).toBe(1);
    expect(activeChapterIndex(chapters, 400)).toBe(2);
    expect(activeChapterIndex([], 0)).toBe(-1);
  });
});

describe('watched seconds and the 90% rule (D-191)', () => {
  it('merges overlapping stretches and ignores a seek that was not played', () => {
    let spans = mergeSpans([], { start: 0, end: 10 });
    spans = mergeSpans(spans, { start: 8, end: 22 });
    spans = mergeSpans(spans, { start: 40, end: 50 });
    expect(spans).toEqual([
      { start: 0, end: 22 },
      { start: 40, end: 50 },
    ]);
    // 32 seconds of a 100 second video. Jumping the playhead to the end adds nothing.
    expect(watchedFraction(spans, 100)).toBeCloseTo(0.32);
    expect(watchedFraction(spans, 0)).toBe(0);
  });

  it('treats 0.9 and 90 as the same line, and crosses it once', () => {
    expect(watchThreshold(0.9)).toBeCloseTo(0.9);
    expect(watchThreshold(90)).toBeCloseTo(0.9);
    expect(crossesWatch(0.89, 0.9, 0.9)).toBe(true);
    expect(crossesWatch(0.9, 0.95, 0.9)).toBe(false);
    expect(crossesWatch(0, 0.5, 0.9)).toBe(false);
  });

  it('resumes before the end and not within five seconds of it', () => {
    expect(resumeAt(12, 100)).toBe(12);
    expect(resumeAt(96, 100)).toBeNull();
    expect(resumeAt(0, 100)).toBeNull();
  });
});

describe('saveVideoProgress (D-191)', () => {
  const NOW = Date.parse('2026-12-07T10:42:00-06:00');
  const ctx = (): Ctx => ({ now: NOW, id: (p) => `${p}_1` });
  const video: VideoBlock = { type: 'video', id: 'w0-02', source: { url: 'https://cdn.example.test/w.mp4' } };
  const watch: CheckBlock = { type: 'check', id: 's2-watch', title: 'Watch the video', auto: { video: true, at: 0.9 } };

  function world() {
    const db = structuredClone(seed('live'));
    const sales = db.modules.find((m) => m.id === 'sales')!;
    sales.checklist[0]!.paths = { claude: { blocks: [video, watch] } };
    return db;
  }

  it('never lowers maxPct, checks the item once at 90%, and does not check it again after an untick', () => {
    const jamie = { kind: 'learner' as const, userId: 'u_jamie' };
    let db = world();
    let out = M.saveVideoProgress(db, jamie, { moduleId: 'sales', videoId: 'w0-02', maxPct: 0.4, lastPositionS: 12 }, ctx());
    db = out.db;
    expect(out.toast).toBeUndefined();
    expect(db.users.find((u) => u.id === 'u_jamie')!.videoProgress).toEqual([
      { moduleId: 'sales', videoId: 'w0-02', maxPct: 0.4, lastPositionS: 12, updatedAt: NOW },
    ]);

    out = M.saveVideoProgress(db, jamie, { moduleId: 'sales', videoId: 'w0-02', maxPct: 0.2, lastPositionS: 30 }, ctx());
    db = out.db;
    expect(db.users.find((u) => u.id === 'u_jamie')!.videoProgress![0]).toMatchObject({ maxPct: 0.4, lastPositionS: 30 });
    expect(db.users.find((u) => u.id === 'u_jamie')!.checks).toBeUndefined();

    out = M.saveVideoProgress(db, jamie, { moduleId: 'sales', videoId: 'w0-02', maxPct: 0.91, lastPositionS: 40 }, ctx());
    db = out.db;
    expect(out.toast).toEqual({ msg: WATCHED_TOAST, tone: 'success' });
    expect(db.users.find((u) => u.id === 'u_jamie')!.checks).toEqual([
      expect.objectContaining({ stepId: db.modules.find((m) => m.id === 'sales')!.checklist[0]!.id, itemId: 's2-watch', checked: true, auto: true }),
    ]);

    db = M.toggleChecklistItem(db, jamie, { moduleId: 'sales', stepId: db.modules.find((m) => m.id === 'sales')!.checklist[0]!.id, itemId: 's2-watch' }, ctx()).db;
    expect(db.users.find((u) => u.id === 'u_jamie')!.checks![0]!.checked).toBe(false);

    out = M.saveVideoProgress(db, jamie, { moduleId: 'sales', videoId: 'w0-02', maxPct: 0.99, lastPositionS: 50 }, ctx());
    expect(out.toast).toBeUndefined();
    expect(out.db.users.find((u) => u.id === 'u_jamie')!.checks![0]!.checked).toBe(false);
    expect(out.db.users.find((u) => u.id === 'u_jamie')!.videoProgress![0]!.maxPct).toBeCloseTo(0.99);
  });

  it('checks the item again only after the saved progress is gone', () => {
    const jamie = { kind: 'learner' as const, userId: 'u_jamie' };
    let db = world();
    const stepId = db.modules.find((m) => m.id === 'sales')!.checklist[0]!.id;
    db = M.saveVideoProgress(db, jamie, { moduleId: 'sales', videoId: 'w0-02', maxPct: 0.95, lastPositionS: 40 }, ctx()).db;
    db = M.toggleChecklistItem(db, jamie, { moduleId: 'sales', stepId, itemId: 's2-watch' }, ctx()).db;
    const cleared = structuredClone(db);
    delete cleared.users.find((u) => u.id === 'u_jamie')!.videoProgress;
    const out = M.saveVideoProgress(cleared, jamie, { moduleId: 'sales', videoId: 'w0-02', maxPct: 0.95, lastPositionS: 10 }, ctx());
    expect(out.toast?.msg).toBe(WATCHED_TOAST);
    expect(out.db.users.find((u) => u.id === 'u_jamie')!.checks![0]).toMatchObject({ checked: true, auto: true });
  });

  it('refuses staff', () => {
    expect(() => M.saveVideoProgress(world(), { kind: 'staff', staffId: 'st1' }, { moduleId: 'sales', videoId: 'w0-02', maxPct: 0.1, lastPositionS: 1 }, ctx())).toThrow(/learners/);
  });
});
