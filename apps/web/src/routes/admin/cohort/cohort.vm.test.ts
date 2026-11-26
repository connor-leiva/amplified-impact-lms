// D-255 (R-5 Phase 3): the Cohort page's view-models, over production's shape (the launch seed, the release plan,
// Weeks 0 to 3's sessions and December's run) with Connor's January created through the admin action.
import { describe, expect, it } from 'vitest';
import { createCohortFromShape } from '@ai/core';
import type { Db } from '@ai/core';
import { seedProduction } from '@ai/core/seed/curriculum';
import { planContentV2 } from '@ai/core/seed/content-v2';
import { planDecemberRunV1 } from '@ai/core/seed/december-run-v1';
import { planReleaseV1 } from '@ai/core/seed/release-plan-v1';
import {
  cohortHeadVM,
  datesForm,
  filterRows,
  moveWeek1,
  newCohortVM,
  overviewVM,
  runArgs,
  scheduleVM,
  settingsVM,
} from './cohort.vm';
import type { NewCohortForm } from './cohort.vm';
import { runRows } from '@ai/core';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const NOW = MT('2026-11-26T12:00:00');
const W = (n: number) => `accelerator-week-${n}`;
const JAN = {
  name: 'January 2027 Cohort',
  start: '2027-01-03',
  sourceCohortId: 'dec26',
  picks: [1, 2, 3, 4, 5, 6].map(W),
  shape: {
    setupWeek: true,
    slots: [
      { day: 2 as const, time: '12:00', kind: 'live_build' as const, mins: 90 },
      { day: 4 as const, time: '12:00', kind: 'office_hours' as const, mins: 60 },
    ],
    hosts: 'Connor Leiva and Spring',
  },
};

function world(): { db: Db; jan: string } {
  let db = planDecemberRunV1(
    planContentV2(
      planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db,
    ).db,
  ).db;
  db = {
    ...db,
    cohorts: db.cohorts.map((c) => (c.id === 'dec26' ? { ...c, previewOpensAt: MT('2026-11-23T09:00:00') } : c)),
  };
  let n = 1;
  const out = createCohortFromShape(db, { kind: 'staff', staffId: 'st_owner' }, JAN, {
    now: NOW,
    id: (p) => `${p}_${n++}`,
  });
  return { db: out.db, jan: out.cohort!.cohortId };
}

describe('the Cohort page’s head', () => {
  it('says the status word and the shape line', () => {
    const { db, jan } = world();
    expect(cohortHeadVM(db, jan, NOW)).toEqual({
      label: 'January 2027 Cohort',
      status: { label: 'Draft', tone: 'off' },
      line: 'Amplified AI Accelerator · 6 weeks of building · twice a week · opens Sun, Dec 27',
      draft: true,
    });
    expect(cohortHeadVM(db, 'dec26', NOW)).toMatchObject({
      status: { label: 'Active', tone: 'ok' },
      line: 'Amplified AI Accelerator · 8 weeks of building · twice a week · opens Mon, Nov 23',
    });
    // A cohort with no building weeks has no shape to say (the mockup's `p3Line`).
    const none = { ...db, cohorts: db.cohorts.map((c) => (c.id === 'dec26' ? { ...c, run: [] } : c)) };
    expect(cohortHeadVM(none, 'dec26', NOW)?.line).toBe('Amplified AI Accelerator');
  });
});

describe('Overview', () => {
  it('a draft: the facts, each a link, and Before It Opens in Open enrollment’s order', () => {
    const { db, jan } = world();
    const vm = overviewVM(db, jan, NOW, null)!;
    expect(vm.facts.map((f) => [f.label, f.value, f.to])).toEqual([
      ['Opens', 'Sun, Dec 27 · 12:00 PM MT / 1:00 PM CT', `/admin/cohort/${jan}/settings#dates`],
      ['Shape', '6 weeks · twice a week', `/admin/cohort/${jan}/settings`],
      ['Teams', '0 of 15 seats', `/admin/cohort/${jan}/settings#enrollment`],
      ['Learners', '0', `/admin/cohort/${jan}/people`],
      ['Next session', 'Tue, Jan 5', `/admin/cohort/${jan}/schedule`],
    ]);
    expect(vm.before!.lines.map((l) => [l.label, l.done])).toEqual([
      ['Shape', true],
      ['Its weeks', true],
      ['Sessions', false],
      ['Zoom links', false],
      ['Week 0 due date', false],
      ['Stripe price found for each lookup key', false],
      ['Payment Links entered', false],
      ['Included time ends', true],
      ['Words learners see', false],
      ['Test emails sent', false],
      ['Open enrollment', false],
    ]);
    expect(vm.before!.lines.find((l) => l.key === 'tests')!.to).toBe('/admin/flags');
    expect(vm.needs).toBeNull();
    expect(vm.run.map((w) => w.n)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(vm.run[1]!.line).toBe('Opens Sun, Jan 3 · Meets Tue, Jan 5 and Thu, Jan 7');
    expect(vm.coming.map((c) => [c.day, c.mon, c.flag])).toEqual([
      ['5', 'Jan', 'No link'],
      ['7', 'Jan', 'Same time'],
      ['12', 'Jan', 'No link'],
    ]);
  });

  it('a cohort with people in it: Needs You, from what exists', () => {
    const { db } = world();
    const vm = overviewVM(db, 'dec26', NOW, {
      testSends: { welcome: true, week0: true },
      plans: 3,
      teams: 3,
      learners: 4,
      intakeNotStarted: 1,
      intakeGhlFailed: 0,
      signedIn: 2,
      intakeSubmitted: 1,
      paidInFull: 2,
    })!;
    expect(vm.before).toBeNull();
    // The seed's sessions have no Zoom link yet: that row is drawn too. Rows with a count of zero are not.
    expect(vm.needs!.map((n) => n.title)).toEqual([
      '1 team hasn’t started their intake',
      '18 sessions have no Zoom link',
    ]);
    expect(vm.needs![1]!.detail).toBe('The next one without a link is Wed, Dec 2.');
    expect(vm.readiness!.map((r) => [r.label, r.n])).toEqual([
      ['Signed in', 2],
      ['Intake submitted', 1],
      ['Paid in full', 2],
    ]);
  });
});

describe('Schedule', () => {
  it('January: twelve sessions, five at the same time as December’s office hours, each with its week', () => {
    const { db, jan } = world();
    const vm = scheduleVM(db, jan, NOW)!;
    expect(vm.facts.map((f) => [f.label, f.value])).toEqual([
      ['On the calendar', '12 of 12 sessions'],
      ['Rhythm', 'Tue live build and Thu office hours'],
      ['Without a Zoom link', '12'],
      ['Same time as another cohort', '5'],
    ]);
    expect(vm.clash).toEqual({ n: 5, words: 'December’s office hours', kept: false });
    expect(vm.missing).toBeNull();
    expect(filterRows(vm.rows, 'Same time as another cohort')).toHaveLength(5);
    expect(filterRows(vm.rows, 'Live builds')).toHaveLength(6);
    expect(vm.rows[0]).toMatchObject({
      day: 'Tue, Jan 5',
      time: '12:00 PM MT / 1:00 PM CT',
      week: { label: 'Week 1 · Where the Money Goes' },
      reminder: { label: 'Draft' },
    });
  });
});

describe('Settings', () => {
  it('January’s shape, dates and words; December’s shape read off its sessions', () => {
    const { db, jan } = world();
    const vm = settingsVM(db, jan, null)!;
    expect(vm.shape.rows).toEqual([
      { label: 'Length', value: '6 weeks of building, after a setup week' },
      { label: 'Meets', value: 'Tuesday · 12:00 PM MT / 1:00 PM CT · Live build · 1 hr 30 min' },
      { label: 'And', value: 'Thursday · 12:00 PM MT / 1:00 PM CT · Office hours · 1 hr' },
    ]);
    expect(vm.shape.weeks).toBe('6 of the program’s 8');
    expect(vm.dates.find((d) => d.label === 'A week opens')!.value).toBe('Every Sunday · 12:00 PM MT / 1:00 PM CT');
    expect(vm.dates.find((d) => d.label === 'Included time ends')!.value).toBe('Mon, May 10, 2027');
    expect(vm.words!.unread).toBe(true);
    const dec = settingsVM(db, 'dec26', null)!;
    expect(dec.shape.stored).toBe(false);
    expect(dec.shape.rows[1]!.value).toBe('Wednesday · 12:00 PM MT / 1:00 PM CT · Live build · 1 hr 30 min');
    expect(dec.dates.find((d) => d.label === 'A week opens')!.value).toBe('Every Wednesday · 12:00 PM MT / 1:00 PM CT');
    expect(dec.words!.unread).toBe(false);
  });

  it('Dates and Release: moving Week 1 moves every week after it by the same number of days', () => {
    const { db, jan } = world();
    const f = datesForm(db, jan)!;
    expect(f.week1).toBe('2027-01-03');
    const moved = moveWeek1(f, '2027-01-10');
    expect(moved.weeks.map((w) => w.opens)).toEqual([
      '',
      '2027-01-10',
      '2027-01-17',
      '2027-01-24',
      '2027-01-31',
      '2027-02-07',
      '2027-02-14',
    ]);
    const args = runArgs(
      jan,
      { ...moved, weeks: moved.weeks.map((w) => (w.n === 0 ? { ...w, due: '2027-01-04' } : w)) },
      runRows(db, jan),
    );
    expect(args.weeks[0]).toEqual({ moduleId: W(0), opens: null, due: { date: '2027-01-04', time: '12:00' } });
    expect(args.weeks[1]).toEqual({ moduleId: W(1), opens: { date: '2027-01-10', time: '12:00' }, due: null });
  });
});

describe('New cohort’s preview', () => {
  it('lays Connor’s January out as the Done-when says, with December’s overlap reported', () => {
    const { db } = world();
    const base = {
      ...db,
      cohorts: db.cohorts.filter((c) => c.id === 'dec26'),
      sessions: db.sessions.filter((s) => s.cohortId === 'dec26'),
    };
    const vm = newCohortVM(
      base,
      {
        name: null,
        from: 'dec26',
        promise: null,
        setupWeek: true,
        picks: JAN.picks,
        slots: JAN.shape.slots,
        start: '2027-01-03',
        included: null,
        hosts: '',
      },
      'Promise.',
    );
    expect(vm.name).toBe('January 2027 Cohort');
    expect(vm.promise).toBe('Promise.');
    expect(vm.setupOpens).toBe('Sun, Dec 27');
    expect(vm.sessions).toBe(12);
    expect(vm.firstSession).toBe('Tue, Jan 5');
    expect(vm.lastSession).toBe('Thu, Feb 11');
    expect(vm.clash).toEqual({ n: 5, words: 'December’s' });
    expect(vm.included).toBe('2027-05-10');
    expect(vm.plan[1]!.sessions.map((s) => s.label)).toEqual([
      'Tue Jan 5 · 12 PM MT · Live build',
      'Thu Jan 7 · 12 PM MT · Office hours',
    ]);
  });

  it('in the Shape dialog, a cohort’s own sessions are no clash; another cohort’s still are', () => {
    const { db, jan } = world();
    const form: NewCohortForm = {
      name: null,
      from: '',
      promise: '',
      setupWeek: true,
      picks: JAN.picks,
      slots: JAN.shape.slots,
      start: '2027-01-03',
      included: '',
      hosts: '',
    };
    const tones = (selfId: string | null) =>
      newCohortVM(db, form, '', selfId).plan.flatMap((w) => w.sessions.map((s) => s.tone));
    // Without its own id, January clashes with itself at every one of its 12 sessions.
    expect(tones(null).filter((t) => t === 'warn')).toHaveLength(12);
    // With it, only the five Thursdays at December's office hours.
    expect(tones(jan).filter((t) => t === 'warn')).toHaveLength(5);
  });
});
