// D-259: the learner portal's times with LMS v3 on (Connor, Nov 25): "Times everywhere in the learner portal use one
// line: '12:00 PM MT / 1:00 PM CT'". The router's root turns the style on (`lib/timeStyle.ts`); here it is set by hand,
// for viewers in zones other than Mountain and Central, and each v3 surface that prints a time reads the one line.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fmt, mountainWhen, setTimeStyle, setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import { timeStyleFor } from '../../../lib/timeStyle';
import { weekRows } from '../learn.vm';
import { scheduleVM } from '../Schedule.vm';
import { LEARNER_ID, learnState, prelaunchState } from '../test/fixture';
import type { LearnState } from '../test/fixture';
import { formInitial, savedLabel } from './form.vm';
import { scheduleProps } from './schedule.vm';
import { turnedInWhen } from './turnin.vm';
import { weekProps } from './week.vm';

const ONE_LINE = /^\d{1,2}:\d{2}\s[AP]M MT \/ \d{1,2}:\d{2}\s[AP]M CT$/;

beforeEach(() => {
  setTimeStyle('mtct');
  setViewerZone('America/New_York');
});
afterEach(() => {
  setTimeStyle('viewer');
  setViewerZone(null);
});

describe('which pages print the one line', () => {
  it('every page with LMS v3 on but the admin console’s; none with it off', () => {
    expect(timeStyleFor(false, true)).toBe('mtct');
    expect(timeStyleFor(true, true)).toBe('viewer');
    expect(timeStyleFor(false, false)).toBe('viewer');
    expect(timeStyleFor(true, false)).toBe('viewer');
  });
});

describe('the v3 surfaces, for an Eastern viewer', () => {
  function schedule(st: LearnState) {
    const me = learnerOf(st.db, LEARNER_ID);
    const rows = weekRows(st.payload, st.db, me);
    const vm = scheduleVM(st.payload, rows, st.db.cohorts[0], 'weeks', st.now);
    return scheduleProps({ vm, rows, sessions: st.payload.sessions, me, now: st.now, saveIcs: () => undefined })!;
  }

  it('the Schedule: the next session (its lede is the cohort’s cadence, words staff type, so it reads as typed)', () => {
    const p = schedule(prelaunchState());
    expect(p.next.when).toBe('Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT');
    expect(p.sub).toBe('Wed builds and Thu office hours · 1:00 PM CT');
  });

  it('the week page: the live build’s tag and the due tag', () => {
    const at = Date.parse('2026-12-02T19:10:00Z');
    const st = learnState(at, false, { 0: ['c1'] });
    const me = learnerOf(st.db, LEARNER_ID);
    const rows = weekRows(st.payload, st.db, me);
    const r = rows.find((x) => x.week === 1)!;
    const props = weekProps({ p: st.payload, rows, r, me, checks: me?.checks ?? [], build: null, fileUrl: () => null, download: () => undefined, onViewPrompt: () => undefined, now: at });
    expect(props.tags[0]).toEqual({ icon: 'radio', label: 'Live build Wed, Dec 2, 12:00 PM MT / 1:00 PM CT' });
    const due = props.tags.find((t) => t.label.startsWith('Due '));
    if (due) expect(due.label).toMatch(/^Due [A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2}\s[AP]M MT \/ \d{1,2}:\d{2}\s[AP]M CT$/);
  });

  it('the drawers’ stamps: saved, submitted and turned in', () => {
    const now = Date.parse('2026-11-20T21:18:00Z'); // Fri, Nov 20, 2:18 PM MT / 3:18 PM CT
    expect(savedLabel(Date.parse('2026-11-20T21:18:00Z'), now)).toBe('Saved 2:18 PM MT / 3:18 PM CT');
    expect(savedLabel(Date.parse('2026-11-19T22:02:00Z'), now)).toBe('Saved Thu 3:02 PM MT / 4:02 PM CT');
    expect(formInitial({ answers: { name: 'Alex' }, submittedAt: now } as never, now)).toMatchObject({ savedLabel: 'Submitted Nov 20, 2:18 PM MT / 3:18 PM CT' });
    expect(turnedInWhen(Date.parse('2026-11-19T22:02:00Z'))).toBe('Thu, Nov 19 · 3:02 PM MT / 4:02 PM CT');
  });

  it('the course’s own Mountain-time lines (D-175) gain Central', () => {
    expect(mountainWhen(Date.parse('2026-12-03T19:00:00Z'))).toBe('Thu, Dec 3 · 12:00 PM MT / 1:00 PM CT');
    expect(fmt.time(Date.parse('2026-12-02T19:00:00Z'))).toMatch(ONE_LINE);
  });
});
