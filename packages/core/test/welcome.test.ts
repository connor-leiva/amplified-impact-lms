// The cohort welcome: when it is due, and that every date in the copy comes from the schedule.
import { describe, expect, it } from 'vitest';
import {
  ACADEMY_URL,
  WELCOME_TEST_ADDRESS,
  accessOpensAt,
  baselineTaskCount,
  buildWelcomeCopy,
  enrolledBeforeSwitch,
  week0DueAt,
  welcomeDecision,
  welcomeSchedule,
  welcomeSendInstant,
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
const WEEK0: WelcomeWeek0 = { dueAt: WEEK0_DUE, title: 'Foundations', steps: 8, baselineTasks: 6 };

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

describe('the copy', () => {
  const copy = buildWelcomeCopy(schedule(), WEEK0, 'Pat', null);
  const withLink = buildWelcomeCopy(schedule(), WEEK0, 'Pat', 'https://learn.amplifiedimpact.io/set-password?token=abc');

  it('uses the cohort name in the subject and fills every time from the schedule, MT first and CT after it', () => {
    expect(copy.subject).toBe('Your Access To The December Cohort Is Live');
    expect(copy.preheader).toBe("You're in! Here's what to do before our first live build on Wed, Dec 2.");
    expect(copy.cohortLine).toBe('December Cohort Starts Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT');
    expect(copy.rows[0]).toEqual({ label: 'Sunday', body: 'The week opens at 12:00 PM MT / 1:00 PM CT with a playbook to read and load into your AI before the build.' });
    expect(copy.rows[1]?.body).toBe('The live build from 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT. 90 minutes, building your next AI hire together.');
    expect(copy.rows[1]?.label).toBe('Wednesday');
    expect(copy.rows[2]?.body).toBe('Office hours Friday at 11:00 AM MT / 12:00 PM CT, for anything that got stuck.');
    expect(copy.buttonHref).toBe(ACADEMY_URL);
    expect(copy.signoffName).toBe('Connor Leiva');
    expect(copy.setPasswordUrl).toBeNull();
    expect(withLink.setPasswordLine).toBe('If you have not set a password yet, set one here.');
  });

  it('has no em dash or en dash', () => {
    const text = JSON.stringify(copy);
    expect(text).not.toMatch(/[–—]/);
  });

  it('says Week 0 is due Mon, Nov 30, from Week 0’s Due, and never that it is due at the first live build', () => {
    expect(copy.steps[2]).toEqual({
      n: '03',
      title: 'Finish Week 0 by Mon, Nov 30',
      body: "That's Mon, Nov 30 at 12:00 PM MT / 1:00 PM CT. Everything in Foundations feeds our first live build, so I'd love for every team to walk in with it done and ready to build.",
    });
    expect(copy.intro[1]).toContain('By Mon, Nov 30, your AI is set up');
    expect(copy.intro[1]).not.toContain('By our first live build');
    // Another Due moves every line that names it.
    const later = buildWelcomeCopy(schedule(), { ...WEEK0, dueAt: Date.parse('2026-12-01T17:30:00Z') }, 'Pat', null);
    expect(later.steps[2]?.title).toBe('Finish Week 0 by Tue, Dec 1');
    expect(later.steps[2]?.body).toContain("That's Tue, Dec 1 at 10:30 AM MT / 11:30 AM CT.");
    expect(later.intro[1]).toContain('By Tue, Dec 1,');
  });

  it('counts the baseline tasks from the data, in words, and never says seven', () => {
    expect(copy.intro[1]).toContain("you've timed the six tasks we'll measure against");
    expect(JSON.stringify(copy)).not.toMatch(/\bseven\b/i);
    expect(buildWelcomeCopy(schedule(), { ...WEEK0, baselineTasks: 5 }, 'Pat', null).intro[1]).toContain('timed the five tasks');
  });

  it('names Week 0 by the title the course shows, with its step count, from the data', () => {
    expect(copy.steps[1]?.title).toBe('Start Week 0 · Foundations');
    expect(copy.steps[1]?.body).toMatch(/^Foundations is the Week 0 course, and it has eight steps\./);
    const renamed = buildWelcomeCopy(schedule(), { ...WEEK0, title: 'Get Ready', steps: 6 }, 'Pat', null);
    expect(renamed.steps[1]?.title).toBe('Start Week 0 · Get Ready');
    expect(renamed.steps[1]?.body).toMatch(/^Get Ready is the Week 0 course, and it has six steps\./);
    expect(renamed.steps[2]?.body).toContain('Everything in Get Ready feeds');
    expect(JSON.stringify(renamed)).not.toContain('Foundations');
  });

  it('shows every clock MT first with CT after it, and no clock with MT alone', () => {
    const text = JSON.stringify(copy);
    const clocks = text.match(/\d{1,2}:\d{2}(?: (?:AM|PM))?(?: to \d{1,2}:\d{2} (?:AM|PM))? (?:MT|CT)/g) ?? [];
    expect(clocks.length).toBeGreaterThan(0);
    for (const m of text.matchAll(/(\d{1,2}:\d{2}(?: (?:AM|PM))?(?: to \d{1,2}:\d{2} (?:AM|PM))?) MT/g)) {
      expect(text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 3), m[0]).toBe(' / ');
    }
  });

  it('computes the week-open clock from a real instant when Week 1 has no Opens, so CT follows that date', () => {
    // A cohort starting in summer: 12:00 PM MDT is 1:00 PM CDT. One starting in winter: 12:00 PM MST, 1:00 PM CST.
    const summer = welcomeSchedule({ name: 'June', start: Date.parse('2027-06-09T18:00:00Z'), defaultOpenTime: '09:30' }, [], [session('s1', 1, Date.parse('2027-06-09T18:00:00Z')), session('oh', 101, Date.parse('2027-06-11T18:00:00Z'))]);
    expect(summer.ok).toBe(true);
    if (!summer.ok) return;
    const out = buildWelcomeCopy({ ...summer.schedule, weekOpenAt: null }, WEEK0, '', null);
    expect(out.rows[0]).toEqual({ label: 'Week Open', body: 'The week opens at 9:30 AM MT / 10:30 AM CT with a playbook to read and load into your AI before the build.' });
    expect(new Date(summer.schedule.weekOpenClockAt).toISOString()).toBe('2027-06-09T15:30:00.000Z');
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
