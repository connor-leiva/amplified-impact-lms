// The cohort welcome: when it is due, and that every date in the copy comes from the schedule.
import { describe, expect, it } from 'vitest';
import { ACADEMY_URL, WELCOME_TEST_ADDRESS, accessOpensAt, buildWelcomeCopy, enrolledBeforeSwitch, welcomeDecision, welcomeSchedule, welcomeSendInstant, welcomeTestAllowed } from '../src/welcome';
import type { WelcomeSchedule, WelcomeSession, WelcomeWeek } from '../src/welcome';

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
  ...over,
});

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
  const copy = buildWelcomeCopy(schedule(), 'Pat', null);
  const withLink = buildWelcomeCopy(schedule(), 'Pat', 'https://learn.amplifiedimpact.io/set-password?token=abc');

  it('uses the cohort name in the subject and fills every time from the schedule, in Mountain Time', () => {
    expect(copy.subject).toBe('Your Access To The December Cohort Is Live');
    expect(copy.preheader).toBe("You're in! Here's what to do before our first live build on Wed, Dec 2.");
    expect(copy.cohortLine).toBe('December Cohort Starts Wed, Dec 2 · 12:00 PM MT');
    expect(copy.rows[0]).toEqual({ label: 'Sunday', body: 'The week opens at 12:00 PM MT with a playbook to read and load into your AI before the build.' });
    expect(copy.rows[1]?.body).toBe('The live build at 12:00 PM MT. 90 minutes, building your next AI hire together.');
    expect(copy.rows[1]?.label).toBe('Wednesday');
    expect(copy.rows[2]?.body).toBe('Office hours Friday at 11:00 AM MT, for anything that got stuck.');
    expect(copy.buttonHref).toBe(ACADEMY_URL);
    expect(copy.signoffName).toBe('Connor Leiva');
    expect(copy.setPasswordUrl).toBeNull();
    expect(withLink.setPasswordLine).toBe('If you have not set a password yet, set one here.');
  });

  it('has no em dash or en dash', () => {
    const text = JSON.stringify(copy);
    expect(text).not.toMatch(/[–—]/);
  });

  it('allows only the test address, plus an extra list', () => {
    expect(welcomeTestAllowed(WELCOME_TEST_ADDRESS)).toBe(true);
    expect(welcomeTestAllowed(' ACCELERATOR-TEST@amplifiedimpact.io ')).toBe(true);
    expect(welcomeTestAllowed('pat@example.com')).toBe(false);
    expect(welcomeTestAllowed('pat@example.com', ['pat@example.com'])).toBe(true);
  });
});
