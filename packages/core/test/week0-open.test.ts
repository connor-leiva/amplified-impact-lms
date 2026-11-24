// The Week 0 Is Open email's rules: when it is due, who is on its roster, the switch-on rule (the welcome's mirror),
// never both emails, and its due time in MT and CT from the instant.
import { describe, expect, it } from 'vitest';
import type { AcceleratorPlan } from '../src/accelerator';
import { dueTimeMtCt, sessionTimeMtCt, sessionTimeMtCtParts } from '../src/release';
import { enrolledBeforeSwitch } from '../src/welcome';
import { WEEK0_OPEN_FLAG, enrolledAtSwitch, otherEmailReached, week0OpenDecision, week0Roster } from '../src/week0-open';

const ON = Date.parse('2026-11-25T16:00:00Z');
const PREVIEW = Date.parse('2026-11-26T19:00:00Z');

describe('when the Week 0 email is due', () => {
  it('holds everything while the switch is off', () => {
    expect(WEEK0_OPEN_FLAG).toBe('week0_open_email');
    expect(week0OpenDecision({ enabledAt: null, now: PREVIEW + 1, enrolledAt: ON - 1, previewOpensAt: PREVIEW })).toBe('hold');
  });

  it('goes only to an enrollment that existed at the switch-on time, the welcome’s rule read the other way', () => {
    expect(enrolledAtSwitch(ON - 1, ON)).toBe(true);
    expect(enrolledAtSwitch(ON, ON)).toBe(true);
    expect(enrolledAtSwitch(ON + 1, ON)).toBe(false);
    for (const at of [ON - 86_400_000, ON, ON + 1]) expect(enrolledAtSwitch(at, ON)).toBe(enrolledBeforeSwitch(at, ON));
    expect(week0OpenDecision({ enabledAt: ON, now: PREVIEW, enrolledAt: ON + 1, previewOpensAt: PREVIEW })).toBe('skip');
    expect(week0OpenDecision({ enabledAt: ON, now: PREVIEW, enrolledAt: ON, previewOpensAt: PREVIEW })).toBe('send');
  });

  it('waits for the preview to open, and waits with no preview date at all', () => {
    expect(week0OpenDecision({ enabledAt: ON, now: PREVIEW - 1, enrolledAt: ON - 1, previewOpensAt: PREVIEW })).toBe('wait');
    expect(week0OpenDecision({ enabledAt: ON, now: PREVIEW + 86_400_000, enrolledAt: ON - 1, previewOpensAt: null })).toBe('wait');
    expect(week0OpenDecision({ enabledAt: ON, now: PREVIEW, enrolledAt: ON - 1, previewOpensAt: PREVIEW })).toBe('send');
  });

  it('sends on the first tick after the switch when the preview opened before it', () => {
    expect(week0OpenDecision({ enabledAt: PREVIEW + 3_600_000, now: PREVIEW + 3_660_000, enrolledAt: ON - 1, previewOpensAt: PREVIEW })).toBe('send');
  });
});

describe('who is on the Week 0 roster (courseRoster’s rule, Accelerator plans only)', () => {
  const plan = (over: Partial<AcceleratorPlan>): AcceleratorPlan => ({ kind: 'cohort', option: 'full', status: 'active', startsAt: null, ...over });
  const roster = week0Roster(
    new Map<string, AcceleratorPlan[]>([
      ['t_full', [plan({})]],
      ['t_two', [plan({ option: 'two_pay' })]],
      ['t_paused', [plan({ option: 'two_pay', status: 'past_due' })]],
      ['t_ended', [plan({ status: 'ended' })]],
      ['t_insiders', [plan({ kind: 'membership', option: 'monthly' })]],
      ['t_agent', [plan({ kind: 'agent_plan', option: 'monthly' })]],
      ['t_team', [plan({ kind: 'agents', option: '16to40' })]],
      ['t_none', []],
      // Bought later than the course opens: still on the roster before it, as the preview admits it.
      ['t_later', [plan({ startsAt: Date.parse('2027-01-01T00:00:00Z') })]],
    ]),
    new Map<string, string | null>([
      ['full', 't_full'],
      ['two', 't_two'],
      ['paused', 't_paused'],
      ['ended', 't_ended'],
      ['insiders', 't_insiders'],
      ['agent', 't_agent'],
      ['team', 't_team'],
      ['skill_only', 't_none'],
      ['utah_life', null],
      ['later', 't_later'],
    ]),
  );

  it('holds Accelerator owners bought in full or in two payments', () => {
    expect(roster.has('full')).toBe(true);
    expect(roster.has('two')).toBe(true);
    expect(roster.has('later')).toBe(true);
  });

  it('leaves out a paused or ended plan, Insiders, the Agent Plan, the Team Plan, a $37 skill buyer and Utah Life', () => {
    for (const id of ['paused', 'ended', 'insiders', 'agent', 'team', 'skill_only', 'utah_life', 'nobody']) expect(roster.has(id), id).toBe(false);
  });
});

describe('never both emails', () => {
  it('treats the other email as reached when it was sent or its claim was lost', () => {
    expect(otherEmailReached('sent', null)).toBe(true);
    expect(otherEmailReached('failed', 'lost')).toBe(true);
    expect(otherEmailReached('failed', 'send')).toBe(false);
    expect(otherEmailReached('skipped', 'enrolled_before_switch')).toBe(false);
    expect(otherEmailReached('claimed', null)).toBe(false);
    expect(otherEmailReached(null, null)).toBe(false);
  });
});

describe('the due time, MT first and CT after it', () => {
  it('reads Mon, Nov 30 at 12:00 PM MT / 1:00 PM CT, with or without the year', () => {
    const due = Date.parse('2026-11-30T19:00:00Z');
    expect(dueTimeMtCt(due)).toBe('Mon, Nov 30 at 12:00 PM MT / 1:00 PM CT');
    expect(dueTimeMtCt(due, { year: true })).toBe('Mon, Nov 30, 2026 at 12:00 PM MT / 1:00 PM CT');
  });

  it('is the same formatter as the reminders’ (D-250), in two parts', () => {
    const build = Date.parse('2026-12-02T19:00:00Z');
    expect(sessionTimeMtCtParts(build, 90)).toEqual({ day: 'Wed, Dec 2', time: '12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT' });
    expect(sessionTimeMtCt(build, 90)).toBe('Wed, Dec 2, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT');
  });

  it('follows each zone’s own daylight saving: a July instant is MDT and CDT, not a fixed offset', () => {
    // 18:00 UTC in July is 12:00 PM MDT (UTC-6) and 1:00 PM CDT (UTC-5). A fixed winter offset would say 11:00 AM MT.
    const july = Date.parse('2027-07-12T18:00:00Z');
    expect(dueTimeMtCt(july, { year: true })).toBe('Mon, Jul 12, 2027 at 12:00 PM MT / 1:00 PM CT');
    expect(sessionTimeMtCt(july, 90)).toBe('Mon, Jul 12, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT');
    // The same UTC clock in winter is an hour earlier in both zones.
    expect(dueTimeMtCt(Date.parse('2027-01-11T18:00:00Z'))).toBe('Mon, Jan 11 at 11:00 AM MT / 12:00 PM CT');
  });

  it('gives Central its own day when the due time falls after its midnight', () => {
    expect(dueTimeMtCt(Date.parse('2026-11-30T23:30:00-07:00'))).toBe('Mon, Nov 30 at 11:30 PM MT / Tue, Dec 1, 12:30 AM CT');
  });
});
