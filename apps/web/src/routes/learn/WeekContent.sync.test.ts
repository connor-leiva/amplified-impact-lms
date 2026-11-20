// D-213: the curriculum builder and the learner's week page are one source (D-212 is the step). Every word the
// builder writes into a week's course page (`module.course`, WeekBuilder's cards) is filled with a marker, and
// each marker must reach the week page's view-models, except the few fields named below with the reason the
// learner portal does not draw them. A new course field therefore either reaches learners or is listed here.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import { weekRows } from './learn.vm';
import { weekVM } from './Week.vm';
import { weekContentVM } from './WeekContent.vm';
import { LEARNER_ID, LIVE_NOW, learnState } from './test/fixture';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

/** Keys that hold ids, links, files or enums, not words. */
const NOT_WORDS = new Set(['id', 'kind', 'href', 'url', 'upload', 'type', 'sessionId', 'icon', 'tone', 'role', 'sets', 'skill', 'slug', 'name', 'size', 'format', 'state', 'audience', 'platform', 'video', 'poster', 'transcript', 'item', 'by', 'key']);

/** Course words the learner portal does not draw, and why. */
const NOT_DRAWN: readonly [RegExp, string][] = [
  [/^course\.(promise|flagship|tools(\[\d+\])?)$/, 'AI Employee portal fields: courseWeekOf strips them from the learner answer (D-173)'],
  [/^course\.setup\[\d+\]\.(text|route)$/, 'the old Setup Order: the week’s steps replace it (parity K-5)'],
  [/^course\.skills\[\d+\]\.use$/, 'a kit row shows the skill, its role and Free; the skill page carries its use (parity K-5)'],
  [/^course\.officeHours\.title$/, 'the week names office hours by the session’s own title (Sessions in the builder)'],
];

describe('the builder and the week page are one source (D-213)', () => {
  it('every word the builder writes into a week reaches the week page, or is named as not drawn', () => {
    const marks = new Map<string, string>();
    let n = 0;
    const mark = (o: unknown, path: string): unknown => {
      if (typeof o === 'string') {
        const m = `ZQ${++n}Q`;
        marks.set(m, path);
        return m;
      }
      if (Array.isArray(o)) return o.map((x, i) => mark(x, `${path}[${i}]`));
      if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, NOT_WORDS.has(k) ? v : mark(v, `${path}.${k}`)]));
      return o;
    };
    const st = learnState(LIVE_NOW, false, { 0: ['c1'] }, 15, (d) => {
      const m = d.modules.find((x) => x.id === 'accelerator-week-1')!;
      m.course = mark(m.course, 'course') as typeof m.course;
    });
    const me = learnerOf(st.db, LEARNER_ID);
    const rows = weekRows(st.payload, st.db, me);
    const page = JSON.stringify({ vm: weekVM(st.payload, rows, 1, LIVE_NOW, () => null, []), content: weekContentVM(st.payload, 1) });
    expect(marks.size).toBeGreaterThan(40);
    const missing = [...marks].filter(([m]) => !page.includes(m)).map(([, path]) => path);
    const unexplained = missing.filter((path) => !NOT_DRAWN.some(([re]) => re.test(path)));
    expect(unexplained).toEqual([]);
  });
});
