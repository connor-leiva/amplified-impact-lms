// D-259: the learner portal's times with LMS v3 on (Connor, Nov 25): "Times everywhere in the learner portal use one
// line: '12:00 PM MT / 1:00 PM CT'". `setTimeStyle('mtct')` turns it on; `'viewer'`, the default, is the reference's rule.
import { afterEach, describe, expect, it } from 'vitest';
import { mountainWhen, sessionTimeMtCtParts } from '../src/release';
import { fmt, mtCtTime, setTimeStyle, setViewerZone, timeStyle } from '../src/time';

/** Wed, Dec 2, 2026, 12:00 PM MT: the first live build. */
const BUILD = Date.parse('2026-12-02T12:00:00-07:00');
const ZONES = ['America/Chicago', 'America/Denver', 'America/New_York', 'America/Los_Angeles', 'Pacific/Honolulu', 'Europe/London'];

afterEach(() => {
  setTimeStyle('viewer');
  setViewerZone(null);
});

describe('mtCtTime (D-259)', () => {
  it('reads Mountain, then Central, whatever the viewer’s zone', () => {
    for (const z of ZONES) {
      setViewerZone(z);
      expect(mtCtTime(BUILD)).toBe('12:00 PM MT / 1:00 PM CT');
    }
  });

  it('is the emails’ clock for the same instant (D-250)', () => {
    const instants = [
      BUILD,
      Date.parse('2026-11-30T12:00:00-07:00'),
      Date.parse('2027-06-09T12:00:00-06:00'),
      Date.parse('2026-12-02T23:30:00-07:00'),
      Date.parse('2026-11-01T07:30:00Z'),
    ];
    for (const t of instants) expect(mtCtTime(t)).toBe(sessionTimeMtCtParts(t).time);
  });

  it('keeps each zone’s daylight saving, and gives Central its own day past midnight', () => {
    expect(mtCtTime(Date.parse('2027-06-09T12:00:00-06:00'))).toBe('12:00 PM MT / 1:00 PM CT');
    expect(mtCtTime(Date.parse('2026-11-01T07:30:00Z'))).toBe('1:30 AM MT / 1:30 AM CT');
    expect(mtCtTime(Date.parse('2026-12-02T23:30:00-07:00'))).toBe('11:30 PM MT / Thu, Dec 3, 12:30 AM CT');
  });
});

describe('fmt in the learner portal (setTimeStyle mtct)', () => {
  it('is off by default: the reference’s rule, the viewer’s zone first', () => {
    expect(timeStyle()).toBe('viewer');
    setViewerZone('America/Denver');
    expect(fmt.time(BUILD)).toBe('12:00 PM MT (1:00 PM CT)');
    setViewerZone('America/Chicago');
    expect(fmt.when(BUILD)).toBe('Wed, Dec 2 · 1:00 PM CT');
    expect(fmt.clockTime(BUILD)).toBe('1:00 PM');
    expect(mountainWhen(BUILD)).toBe('Wed, Dec 2 · 12:00 PM MT');
  });

  it('prints every time as the one line, in every viewer zone', () => {
    setTimeStyle('mtct');
    for (const z of ZONES) {
      setViewerZone(z);
      expect(fmt.time(BUILD)).toBe('12:00 PM MT / 1:00 PM CT');
      expect(fmt.timeOnly(BUILD)).toBe('12:00 PM MT / 1:00 PM CT');
      expect(fmt.clockTime(BUILD)).toBe('12:00 PM MT / 1:00 PM CT');
      expect(fmt.when(BUILD)).toBe('Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT');
      expect(fmt.abs(BUILD)).toBe('Dec 2, 2026, 12:00 PM MT / 1:00 PM CT');
      expect(mountainWhen(BUILD)).toBe('Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT');
    }
  });

  it('reads every date in Mountain Time, so the day agrees with the time', () => {
    setTimeStyle('mtct');
    setViewerZone('Europe/London'); // already Thursday there
    const late = Date.parse('2026-12-02T22:00:00-07:00');
    expect(fmt.day(late)).toBe('Wed, Dec 2');
    expect(fmt.date(late)).toBe('Dec 2');
    expect(fmt.dayPlain(late)).toBe('Wed Dec 2');
    expect(fmt.weekday(late)).toBe('Wednesday');
    expect(fmt.weekdayShort(late)).toBe('Wed');
    expect(fmt.when(late)).toBe('Wed, Dec 2 · 10:00 PM MT / 11:00 PM CT');
  });

  it('leaves relative times and video clocks alone', () => {
    setTimeStyle('mtct');
    expect(fmt.ago(BUILD - 5 * 60_000, BUILD)).toBe('5 min ago');
    expect(fmt.until(BUILD + 2 * 3_600_000, BUILD)).toBe('in 2 hours');
    expect(fmt.clock(95)).toBe('1:35');
  });
});
