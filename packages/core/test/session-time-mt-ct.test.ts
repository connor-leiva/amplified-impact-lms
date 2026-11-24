// D-250: a live session's time in the reminders, Mountain Time first and Central Time after it, both from the
// session's own instant. Pure: no viewer zone, no saved zone.
import { afterEach, describe, expect, it } from 'vitest';
import { sessionTimeMtCt } from '../src/release';
import { fmt, setViewerZone } from '../src/time';

/** Wed, Dec 2, 2026, 12:00 PM MT (standard time): the first live build, 90 minutes. */
const BUILD = Date.parse('2026-12-02T12:00:00-07:00');

afterEach(() => setViewerZone(null));

describe('sessionTimeMtCt (D-250)', () => {
  it('shows the range in Mountain and Central, MT first', () => {
    expect(sessionTimeMtCt(BUILD, 90)).toBe('Wed, Dec 2, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT');
  });

  it('names both halves of the day when a range crosses noon', () => {
    const late = Date.parse('2026-12-02T11:30:00-07:00');
    expect(sessionTimeMtCt(late, 90)).toBe('Wed, Dec 2, 11:30 AM to 1:00 PM MT / 12:30 to 2:00 PM CT');
  });

  it('shows the start alone with no length', () => {
    for (const mins of [undefined, null, 0, -5, Number.NaN]) expect(sessionTimeMtCt(BUILD, mins)).toBe('Wed, Dec 2, 12:00 PM MT / 1:00 PM CT');
  });

  it('computes each zone from the instant, so daylight saving is each zone’s own', () => {
    // Summer: MDT and CDT. Winter: MST and CST. Central is an hour ahead in both.
    expect(sessionTimeMtCt(Date.parse('2027-06-09T12:00:00-06:00'), 60)).toBe('Wed, Jun 9, 12:00 to 1:00 PM MT / 1:00 to 2:00 PM CT');
    expect(sessionTimeMtCt(Date.parse('2027-01-06T12:00:00-07:00'), 90)).toBe('Wed, Jan 6, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT');
    // The morning the clocks go back (Sun, Nov 1, 2026, 2:00 AM local in each zone): Central has fallen back an hour
    // before Mountain has, so for that hour they show the same clock. Read off the instant, not a fixed offset.
    const between = Date.parse('2026-11-01T07:30:00Z'); // 1:30 AM CST, and still 1:30 AM MDT
    expect(sessionTimeMtCt(between)).toBe('Sun, Nov 1, 1:30 AM MT / 1:30 AM CT');
  });

  it('gives Central its own day when its start falls on the next one', () => {
    const night = Date.parse('2026-12-02T23:30:00-07:00');
    expect(sessionTimeMtCt(night, 60)).toBe('Wed, Dec 2, 11:30 PM to 12:30 AM MT / Thu, Dec 3, 12:30 to 1:30 AM CT');
  });

  it('never reads or changes the shared viewer zone', () => {
    setViewerZone('Pacific/Honolulu');
    const before = fmt.when(BUILD);
    expect(sessionTimeMtCt(BUILD, 90)).toBe('Wed, Dec 2, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT');
    expect(fmt.when(BUILD)).toBe(before);
  });
});
