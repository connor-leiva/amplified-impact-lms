// The cohort welcome: when it is due, its subject and cohort label, and Week 0's facts from the stored module. The
// email's words are the template's (`apps/api/src/email/templates/cohort-welcome-html.test.ts`).
import { describe, expect, it } from 'vitest';
import {
  WELCOME_TEST_ADDRESS,
  accessOpensAt,
  baselineTaskCount,
  cohortLabel,
  enrolledBeforeSwitch,
  week0DueAt,
  welcomeDecision,
  welcomeSchedule,
  welcomeSendInstant,
  welcomeSubject,
  welcomeTestAllowed,
  welcomeWeek0,
} from '../src/welcome';
import type { WelcomeSchedule, WelcomeSession, WelcomeWeek, WelcomeWeek0 } from '../src/welcome';

const SESSION = Date.parse('2026-12-02T12:00:00-07:00'); // Wed, Dec 2, 12:00 PM MT
const WEEK_OPEN = Date.parse('2026-11-29T12:00:00-07:00'); // Sun, Nov 29, 12:00 PM MT
const OFFICE = Date.parse('2026-12-04T11:00:00-07:00'); // Fri, Dec 4, 11:00 AM MT
const LIVE = Date.parse('2026-11-20T12:00:00-07:00');
const LATER = Date.parse('2026-12-10T12:00:00-07:00');

const schedule = (over: Partial<WelcomeSchedule> = {}): WelcomeSchedule => ({
  cohortName: 'December Cohort',
  sendsAt: LIVE,
  session1At: SESSION,
  session1Mins: 90,
  officeHoursAt: OFFICE,
  weekOpenAt: WEEK_OPEN,
  weekOpenClock: '12:00',
  weekOpenClockAt: Date.parse('2026-12-02T12:00:00-07:00'),
  ...over,
});

/** Mon, Nov 30, 2026, 12:00 PM MT (1:00 PM CT): Week 0's Due, as the release plan sets it. */
const WEEK0_DUE = Date.parse('2026-11-30T19:00:00Z');
const WEEK0: WelcomeWeek0 = { dueAt: WEEK0_DUE, title: 'Foundations', steps: 8, baselineTasks: 6, tour: false };

const session = (id: string, n: number, start: number, kind: string | null = null): WelcomeSession => ({ id, n, start, mins: 75, kind });

describe('when a welcome is due', () => {
  it('holds everything while the switch is off', () => {
    expect(welcomeDecision({ enabledAt: null, now: LATER, enrolledAt: LIVE, sendsAt: LIVE })).toBe('hold');
  });

  it('waits for the later of enrollment and go-live', () => {
    expect(welcomeDecision({ enabledAt: LIVE - 1, now: SESSION - 1, enrolledAt: LIVE, sendsAt: SESSION })).toBe('wait');
    expect(welcomeDecision({ enabledAt: LIVE - 1, now: SESSION, enrolledAt: LIVE, sendsAt: SESSION })).toBe('send');
  });

  it('sends at enrollment when the cohort is already live', () => {
    expect(welcomeDecision({ enabledAt: LIVE, now: LATER, enrolledAt: LATER, sendsAt: LIVE })).toBe('send');
    expect(welcomeDecision({ enabledAt: LIVE, now: LATER - 1, enrolledAt: LATER, sendsAt: LIVE })).toBe('wait');
  });

  it('does not backfill enrollments that were already due when the switch came on', () => {
    expect(welcomeDecision({ enabledAt: LATER, now: LATER, enrolledAt: LIVE, sendsAt: LIVE })).toBe('skip');
  });

  it('never sends an enrollment that existed when the switch came on, even when go-live is after the switch', () => {
    // The cohort is not live yet when the switch comes on, and its send time comes later: still skipped.
    expect(welcomeDecision({ enabledAt: LIVE, now: LIVE, enrolledAt: LIVE - 86_400_000, sendsAt: SESSION })).toBe('skip');
    expect(welcomeDecision({ enabledAt: LIVE, now: SESSION, enrolledAt: LIVE - 86_400_000, sendsAt: SESSION })).toBe('skip');
    expect(welcomeDecision({ enabledAt: LIVE, now: LATER, enrolledAt: LIVE - 86_400_000, sendsAt: SESSION })).toBe('skip');
  });

  it('skips a pre-switch enrollment before it would wait, whatever the send time', () => {
    // Not due for months: still skipped now, not left waiting to be sent later.
    expect(welcomeDecision({ enabledAt: LIVE, now: LIVE + 1, enrolledAt: LIVE - 1, sendsAt: LATER + 365 * 86_400_000 })).toBe('skip');
    // Send time long past: skipped as well.
    expect(welcomeDecision({ enabledAt: LATER, now: LATER, enrolledAt: LIVE, sendsAt: LIVE - 365 * 86_400_000 })).toBe('skip');
  });

  it('counts an enrollment made at the switch-on instant as before it; only one made after qualifies', () => {
    expect(enrolledBeforeSwitch(LIVE - 1, LIVE)).toBe(true);
    expect(enrolledBeforeSwitch(LIVE, LIVE)).toBe(true);
    expect(enrolledBeforeSwitch(LIVE + 1, LIVE)).toBe(false);
    expect(welcomeDecision({ enabledAt: LIVE, now: SESSION, enrolledAt: LIVE, sendsAt: SESSION })).toBe('skip');
    expect(welcomeDecision({ enabledAt: LIVE, now: SESSION, enrolledAt: LIVE + 1, sendsAt: SESSION })).toBe('send');
  });
});

describe('the send time comes from the builder', () => {
  const cohort = { name: 'December Cohort', start: SESSION, previewOpensAt: WEEK_OPEN as number | undefined, welcomeSendsAt: undefined as number | undefined, defaultOpenTime: '12:00' };
  const weeks: WelcomeWeek[] = [
    { week: 0, opens: WEEK_OPEN, status: 'scheduled' },
    { week: 1, opens: SESSION, status: 'scheduled', liveSessionId: 's1', officeSessionId: 'oh' },
  ];

  it('prefers Week 0 Opens, then the preview, then the first dated week, then the cohort start', () => {
    expect(accessOpensAt(cohort, weeks)).toBe(WEEK_OPEN);
    expect(accessOpensAt(cohort, weeks.filter((w) => w.week !== 0))).toBe(WEEK_OPEN);
    expect(accessOpensAt({ ...cohort, previewOpensAt: undefined }, weeks.filter((w) => w.week !== 0))).toBe(SESSION);
    expect(accessOpensAt({ ...cohort, previewOpensAt: undefined }, [])).toBe(SESSION);
  });

  it('uses Welcome email sends at when the builder set one', () => {
    expect(welcomeSendInstant({ ...cohort, welcomeSendsAt: LATER }, weeks)).toBe(LATER);
    expect(welcomeSendInstant(cohort, weeks)).toBe(WEEK_OPEN);
  });

  it('reads the live build and office hours off the sessions', () => {
    const sessions = [session('s1', 1, SESSION, 'live_build'), session('oh', 101, OFFICE, 'office_hours')];
    const out = welcomeSchedule(cohort, weeks, sessions);
    expect(out.ok && out.schedule.session1At).toBe(SESSION);
    expect(out.ok && out.schedule.officeHoursAt).toBe(OFFICE);
    expect(welcomeSchedule(cohort, [], [session('only', 1, SESSION)])).toEqual({ ok: false, reason: 'no-office-hours' });
  });
});

describe('the subject, the cohort label and the test list', () => {
  it('welcomes the cohort by its name with its noun', () => {
    expect(welcomeSubject('December 2026')).toBe('🎉 Welcome to the December 2026 Cohort: You’re In');
    expect(welcomeSubject('December 2026')).not.toMatch(/[–—]/);
    // A name that already carries the noun is not given a second one.
    expect(welcomeSubject('December Cohort')).toBe('🎉 Welcome to the December Cohort: You’re In');
    expect(cohortLabel('December 2026')).toBe('December 2026 Cohort');
    expect(cohortLabel(' December Cohort ')).toBe('December Cohort');
    expect(cohortLabel('Spring cohort')).toBe('Spring cohort');
  });

  it('computes the week-open clock from a real instant when Week 1 has no Opens, so CT follows that date', () => {
    const summer = welcomeSchedule({ name: 'June', start: Date.parse('2027-06-09T18:00:00Z'), defaultOpenTime: '09:30' }, [], [session('s1', 1, Date.parse('2027-06-09T18:00:00Z')), session('oh', 101, Date.parse('2027-06-11T18:00:00Z'))]);
    expect(summer.ok).toBe(true);
    if (!summer.ok) return;
    expect(new Date(summer.schedule.weekOpenClockAt).toISOString()).toBe('2027-06-09T15:30:00.000Z');
    expect(schedule().session1Mins).toBe(90);
  });

  it('allows only the test address, plus an extra list', () => {
    expect(welcomeTestAllowed(WELCOME_TEST_ADDRESS)).toBe(true);
    expect(welcomeTestAllowed(' ACCELERATOR-TEST@amplifiedimpact.io ')).toBe(true);
    expect(welcomeTestAllowed('pat@example.com')).toBe(false);
    expect(welcomeTestAllowed('pat@example.com', ['pat@example.com'])).toBe(true);
  });
});

describe('Week 0, from the Week 0 module', () => {
  const baselineStep = (rows: number, chatgptRows = rows) => ({
    ch: 'Start Your Time Baseline',
    paths: {
      claude: { blocks: [{ type: 'table' as const, head: ['#', 'Task'], rows: Array.from({ length: rows }, (_, i) => [String(i + 1), 'Task']) }] },
      chatgpt: { blocks: [{ type: 'table' as const, head: ['#', 'Task'], rows: Array.from({ length: chatgptRows }, (_, i) => [String(i + 1), 'Task']) }] },
    },
  });

  it('counts the rows of the baseline step’s table, and nothing else', () => {
    expect(baselineTaskCount([{ ch: 'Watch the Orientation' }, baselineStep(6), { ch: 'Connect Your Data', paths: { claude: { blocks: [{ type: 'table', rows: [['a'], ['b']] }] } } }])).toBe(6);
    expect(baselineTaskCount([baselineStep(7)])).toBe(7);
  });

  it('answers null, so the welcome waits, when there is no baseline table or its two paths disagree', () => {
    expect(baselineTaskCount([{ ch: 'Start Your Time Baseline' }])).toBeNull();
    expect(baselineTaskCount([baselineStep(6, 5)])).toBeNull();
    expect(baselineTaskCount(null)).toBeNull();
  });

  const week0: WelcomeWeek = { week: 0, opens: null, status: 'published', dueAt: WEEK0_DUE, title: 'Foundations', steps: 8, baselineTasks: 6 };

  it('says whether the "How the LMS Works" tour is live, from the week (D-252)', () => {
    expect(welcomeWeek0([week0])).toMatchObject({ ok: true, week0: { tour: false } });
    expect(welcomeWeek0([{ ...week0, tour: true }])).toMatchObject({ ok: true, week0: { tour: true } });
  });

  it('reads Week 0’s Due, title, steps and baseline, and waits on the builder while any is missing', () => {
    expect(week0DueAt([week0])).toBe(WEEK0_DUE);
    expect(welcomeWeek0([week0])).toEqual({ ok: true, week0: WEEK0 });
    expect(welcomeWeek0([{ ...week0, dueAt: null }])).toEqual({ ok: false, reason: 'no-week0-due' });
    expect(week0DueAt([{ ...week0, dueAt: null }])).toBeNull();
    expect(welcomeWeek0([{ ...week0, baselineTasks: null }])).toEqual({ ok: false, reason: 'no-baseline' });
    expect(welcomeWeek0([{ ...week0, title: ' ' }])).toEqual({ ok: false, reason: 'no-week0' });
    expect(welcomeWeek0([{ ...week0, status: 'draft' }])).toEqual({ ok: false, reason: 'no-week0' });
    expect(welcomeWeek0([])).toEqual({ ok: false, reason: 'no-week0' });
  });
});
