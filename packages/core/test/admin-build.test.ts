// The R2 Build screens' times (D-160 R2-2): one zone, MST (America/Phoenix), as the mockup prints them.
import { describe, expect, it } from 'vitest';
import { ADMIN_ZONE, adminDay, adminMonthDay, adminTime, adminWhen, fromAdminLocal, toAdminLocal } from '../src/index';

const mst = (s: string) => Date.parse(`${s}-07:00`);

describe('the R2 Build screens print MST (BUILD-SPEC § 7)', () => {
  it('has one label', () => expect(ADMIN_ZONE).toBe('MST'));
  it('prints a session as the mockup does', () => {
    expect(adminWhen(mst('2026-12-02T12:00:00'))).toBe('Wed, Dec 2 · 12:00 PM MST');
    expect(adminWhen(mst('2027-01-06T12:00:00'))).toBe('Wed, Jan 6 · 12:00 PM MST');
    expect(adminDay(mst('2026-12-30T12:00:00'))).toBe('Wed, Dec 30');
    expect(adminTime(mst('2026-12-15T09:05:00'))).toBe('9:05 AM');
    expect(adminMonthDay(mst('2026-12-14T09:00:00'))).toBe('Dec 14');
  });
  it('reads the same moment the program stores in Central Time', () => {
    // 1:00 PM CT in December is 12:00 PM MST.
    expect(adminWhen(Date.parse('2026-12-02T13:00:00-06:00'))).toBe('Wed, Dec 2 · 12:00 PM MST');
  });
  it('round-trips a form date and time', () => {
    const t = fromAdminLocal('2026-12-16', '12:00');
    expect(t).toBe(mst('2026-12-16T12:00:00'));
    expect(toAdminLocal(t)).toEqual({ date: '2026-12-16', time: '12:00' });
    expect(toAdminLocal(mst('2027-07-01T08:30:00'))).toEqual({ date: '2027-07-01', time: '08:30' });
  });
  it('never prints CT or a narrow no-break space', () => {
    const s = adminWhen(mst('2026-12-09T18:10:00'));
    expect(s).not.toMatch(/\bCT\b|Central|\u202f/);
  });
});
