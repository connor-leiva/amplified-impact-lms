// The admin's times (D-160 R2-2). R-5 audit (D-267): one zone, MT (America/Denver), and a time that names its zone in MT
// with CT after it, "12:00 PM MT / 1:00 PM CT", through `fmt.mtCt`; never "MST".
import { describe, expect, it } from 'vitest';
import { adminDay, adminMonthDay, adminStamp, adminStampZoned, adminTime, adminWhen, fromAdminLocal, toAdminLocal } from '../src/index';

const mst = (s: string) => Date.parse(`${s}-07:00`);
const mdt = (s: string) => Date.parse(`${s}-06:00`);

describe('the admin prints MT, with CT after it (D-267)', () => {
  it('prints a session as one line in MT and CT', () => {
    expect(adminWhen(mst('2026-12-02T12:00:00'))).toBe('Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT');
    expect(adminWhen(mst('2027-01-06T12:00:00'))).toBe('Wed, Jan 6 · 12:00 PM MT / 1:00 PM CT');
    expect(adminDay(mst('2026-12-30T12:00:00'))).toBe('Wed, Dec 30');
    expect(adminTime(mst('2026-12-15T09:05:00'))).toBe('9:05 AM');
    expect(adminMonthDay(mst('2026-12-14T09:00:00'))).toBe('Dec 14');
    expect(adminStampZoned(mst('2026-12-10T08:58:00'))).toBe('Dec 10, 8:58 AM MT');
  });
  it('reads the same moment the program stores in Central Time', () => {
    // 1:00 PM CT in December is 12:00 PM MT.
    expect(adminWhen(Date.parse('2026-12-02T13:00:00-06:00'))).toBe('Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT');
  });
  it('is Mountain time, daylight saving included: from mid-March MT is an hour past MST', () => {
    expect(adminStamp(mdt('2027-07-01T08:30:00'))).toBe('Jul 1, 8:30 AM');
    expect(adminWhen(mdt('2027-07-01T12:00:00'))).toBe('Thu, Jul 1 · 12:00 PM MT / 1:00 PM CT');
  });
  it('round-trips a form date and time, typed in MT', () => {
    const t = fromAdminLocal('2026-12-16', '12:00');
    expect(t).toBe(mst('2026-12-16T12:00:00'));
    expect(toAdminLocal(t)).toEqual({ date: '2026-12-16', time: '12:00' });
    expect(fromAdminLocal('2027-07-01', '08:30')).toBe(mdt('2027-07-01T08:30:00'));
    expect(toAdminLocal(mdt('2027-07-01T08:30:00'))).toEqual({ date: '2027-07-01', time: '08:30' });
  });
  it('never prints MST or a narrow no-break space', () => {
    const s = adminWhen(mst('2026-12-09T18:10:00'));
    expect(s).not.toMatch(/\bMST\b|\u202f/);
    expect(s).toBe('Wed, Dec 9 · 6:10 PM MT / 7:10 PM CT');
  });
});
