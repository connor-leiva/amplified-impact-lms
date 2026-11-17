// D-166 (spec §§ 7.7, 7.15): the email log's rules (statuses, error kinds, the CSV) and usage's days
// (the program zone), ranges, ceiling and figures.
import { describe, expect, it } from 'vitest';
import {
  EMAIL_CSV_HEADER,
  EMAIL_LOG_RETENTION_DAYS,
  EMAIL_STATUSES,
  PROGRAM_TZ,
  USAGE_KINDS,
  USAGE_MAX_DAYS,
  USAGE_RETENTION_DAYS,
  addDays,
  dayLabel,
  dayLabelLong,
  dayList,
  daysIn,
  emailCsv,
  emailErrorKind,
  emailStatusOf,
  isDay,
  isEmailStatus,
  lastDays,
  niceCeiling,
  programDay,
  programDayStart,
  seatUtilization,
  storageLabel,
} from '../src/index';
import type { EmailLogRow } from '../src/index';

describe('the email log (spec § 7.15) @console', () => {
  it('keeps three statuses and no delivery events', () => {
    expect(EMAIL_STATUSES).toEqual(['sent', 'failed', 'skipped']);
    expect(isEmailStatus('sent')).toBe(true);
    expect(isEmailStatus('delivered')).toBe(false);
  });
  it('keeps 180 days of email and 400 of usage (D6)', () => {
    expect(EMAIL_LOG_RETENTION_DAYS).toBe(180);
    expect(USAGE_RETENTION_DAYS).toBe(400);
    expect(USAGE_MAX_DAYS).toBe(400);
  });
  it('names a failure by kind, from the transport’s own messages, never its words', () => {
    expect(emailErrorKind('"to" is empty')).toBe('invalid_recipient');
    expect(emailErrorKind('"to" is not one address: "a@b"')).toBe('invalid_recipient');
    expect(emailErrorKind('subject builder threw: boom')).toBe('subject');
    expect(emailErrorKind('subject is empty')).toBe('subject');
    expect(emailErrorKind('template render threw: x')).toBe('render');
    expect(emailErrorKind('RESEND_API_KEY is not set')).toBe('config');
    expect(emailErrorKind('EMAIL_FROM is not set')).toBe('config');
    expect(emailErrorKind('No template renderer is registered')).toBe('config');
    expect(emailErrorKind('validation_error: The to address is invalid')).toBe('provider');
  });
  it('words a status with its tone, never a colour alone', () => {
    expect(emailStatusOf('sent')).toEqual({ label: 'Sent', tone: 'ok' });
    expect(emailStatusOf('failed')).toEqual({ label: 'Failed', tone: 'bad' });
    expect(emailStatusOf('skipped')).toEqual({ label: 'Skipped', tone: 'off' });
    // The mockup's delivery words (fixture only in v1).
    expect(emailStatusOf('Delivered')).toEqual({ label: 'Delivered', tone: 'ok' });
    expect(emailStatusOf('Queued')).toEqual({ label: 'Queued', tone: 'info' });
    expect(emailStatusOf('Bounced')).toEqual({ label: 'Bounced', tone: 'bad' });
    expect(emailStatusOf('odd')).toEqual({ label: 'odd', tone: 'neutral' });
  });
  it('exports CSV with no body column, formula cells defused', () => {
    expect(EMAIL_CSV_HEADER).not.toContain('body');
    expect(EMAIL_CSV_HEADER).not.toContain('html');
    const row: EmailLogRow = {
      id: '7',
      at: Date.parse('2026-12-08T19:00:00Z'),
      to: 'elena@example.com',
      userId: 'u_1',
      template: 'session-24h',
      subject: '=HYPERLINK("x")',
      provider: 'resend',
      providerId: 're_123',
      status: 'sent',
      errorKind: null,
    };
    const csv = emailCsv([row]);
    expect(csv.split('\r\n')[0]).toBe('"id","sent_at","to","user_id","template","subject","provider","provider_id","status","error_kind"');
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('"2026-12-08T19:00:00.000Z"');
  });
});

describe('usage days (spec § 7.7: the program zone) @console', () => {
  it('counts four kinds', () => expect(USAGE_KINDS).toEqual(['sign_in', 'lesson_play', 'guide_view', 'session_join']));
  it('is America/Chicago', () => expect(PROGRAM_TZ).toBe('America/Chicago'));
  it('puts a moment on its program-zone day', () => {
    // 11:30 PM CT on Dec 9 is 5:30 AM UTC on Dec 10.
    expect(programDay(Date.parse('2026-12-10T05:30:00Z'))).toBe('2026-12-09');
    expect(programDay(Date.parse('2026-12-10T06:00:00Z'))).toBe('2026-12-10');
    // Summer: CDT is UTC−5.
    expect(programDay(Date.parse('2026-07-01T04:59:00Z'))).toBe('2026-06-30');
    expect(programDay(Date.parse('2026-07-01T05:00:00Z'))).toBe('2026-07-01');
  });
  it('finds a day’s midnight, across daylight saving', () => {
    expect(programDayStart('2026-12-10')).toBe(Date.parse('2026-12-10T06:00:00Z'));
    expect(programDayStart('2026-07-01')).toBe(Date.parse('2026-07-01T05:00:00Z'));
    expect(programDayStart('2026-03-08')).toBe(Date.parse('2026-03-08T06:00:00Z'));
    expect(programDayStart('2026-11-01')).toBe(Date.parse('2026-11-01T05:00:00Z'));
    expect(programDay(programDayStart('2026-11-01'))).toBe('2026-11-01');
    expect(programDay(programDayStart('2026-11-02') - 1)).toBe('2026-11-01');
  });
  it('checks a day, counts and lists a range', () => {
    expect(isDay('2026-12-10')).toBe(true);
    expect(isDay('2026-02-30')).toBe(false);
    expect(isDay('2026-1-1')).toBe(false);
    expect(isDay(20261210)).toBe(false);
    expect(addDays('2026-12-10', -13)).toBe('2026-11-27');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysIn('2026-11-27', '2026-12-10')).toBe(14);
    expect(daysIn('2026-12-10', '2026-12-09')).toBe(0);
    expect(dayList('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });
  it('makes the mockup’s “Last 14 days” ending Dec 10', () => {
    expect(lastDays(14, Date.parse('2026-12-10T16:30:00Z'))).toEqual({ from: '2026-11-27', to: '2026-12-10' });
    expect(lastDays(7, Date.parse('2026-12-10T16:30:00Z'))).toEqual({ from: '2026-12-04', to: '2026-12-10' });
  });
  it('labels a day as the chart’s axis does', () => {
    expect(dayLabel('2026-11-27')).toBe('Nov 27');
    expect(dayLabel('2026-12-10')).toBe('Dec 10');
    expect(dayLabelLong('2026-11-16')).toBe('Nov 16, 2026');
  });
});

describe('usage figures @console', () => {
  it('rounds seat utilization to a whole percent', () => {
    expect(seatUtilization(103, 126)).toBe(82);
    expect(seatUtilization(0, 0)).toBeNull();
  });
  it('rounds a chart’s ceiling up to 1, 2, 2.5 or 5 × 10ⁿ', () => {
    expect(niceCeiling(92)).toBe(100);
    expect(niceCeiling(100)).toBe(100);
    expect(niceCeiling(101)).toBe(200);
    expect(niceCeiling(240)).toBe(250);
    expect(niceCeiling(7)).toBe(10);
    expect(niceCeiling(0)).toBe(1);
  });
  it('prints storage in decimal units', () => {
    expect(storageLabel(41.2e9)).toBe('41.2 GB');
    expect(storageLabel(6.6e9)).toBe('6.6 GB');
    expect(storageLabel(250e6)).toBe('250.0 MB');
    expect(storageLabel(4_000)).toBe('4 KB');
  });
});
