// The R2 admin's support-record words (D-160 R2-1c): the mockup's stamps in MST. R2-2 carries this
// file's #126-independent part only, byte for byte from R2-1c's aebc45b; #136 brings the rest.
import { describe, expect, it } from 'vitest';
import { ADMIN_TZ, adminDate, adminStamp } from '../src/index';

const mst = (s: string) => Date.parse(`${s}-07:00`);

describe('admin stamps (BUILD-SPEC § 7: one zone, MST) @console', () => {
  it('is America/Phoenix', () => expect(ADMIN_TZ).toBe('America/Phoenix'));
  it('prints a moment as the mockup does', () => {
    expect(adminStamp(mst('2026-12-10T08:52:00'))).toBe('Dec 10, 8:52 AM');
    expect(adminStamp(mst('2026-12-10T00:41:00'))).toBe('Dec 10, 12:41 AM');
    expect(adminStamp(mst('2026-11-02T16:40:00'))).toBe('Nov 2, 4:40 PM');
  });
  it('prints a day with its year', () => expect(adminDate(mst('2026-12-08T09:00:00'))).toBe('Dec 8, 2026'));
  it('has no narrow no-break space', () => expect(adminStamp(mst('2026-12-09T18:10:00'))).not.toMatch(/\u202f/));
});
