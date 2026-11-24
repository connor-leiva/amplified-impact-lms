// D-250: a session time for one reader, as the course shows times: the reader's saved zone first and Mountain Time in
// parentheses, or Mountain Time alone. Pure: the zone is an argument, never the shared viewer zone.
import { afterEach, describe, expect, it } from 'vitest';
import { mountainWhenFor } from '../src/release';
import { fmt, setViewerZone } from '../src/time';

/** Wed, Dec 2, 2026, 12:00 PM MT: the first live build. */
const BUILD = Date.parse('2026-12-02T12:00:00-07:00');
/** 11:30 PM MT, which is already the next day in New York. */
const LATE = Date.parse('2026-12-02T23:30:00-07:00');

afterEach(() => setViewerZone(null));

describe('mountainWhenFor (D-250)', () => {
  it('is Mountain Time alone for a reader with no saved zone', () => {
    for (const zone of [undefined, null, '', '   ']) expect(mountainWhenFor(BUILD, zone)).toBe('Wed, Dec 2 · 12:00 PM MT');
  });

  it('puts the reader’s zone first and Mountain Time in parentheses', () => {
    expect(mountainWhenFor(BUILD, 'America/New_York')).toBe('Wed, Dec 2 · 2:00 PM ET (12:00 PM MT)');
    expect(mountainWhenFor(BUILD, 'America/Chicago')).toBe('Wed, Dec 2 · 1:00 PM CT (12:00 PM MT)');
    expect(mountainWhenFor(BUILD, 'America/Los_Angeles')).toBe('Wed, Dec 2 · 11:00 AM PT (12:00 PM MT)');
    expect(mountainWhenFor(BUILD, 'Pacific/Honolulu')).toBe('Wed, Dec 2 · 9:00 AM HT (12:00 PM MT)');
  });

  it('names the reader’s own day when it differs from Mountain Time’s', () => {
    expect(mountainWhenFor(LATE, 'America/New_York')).toBe('Thu, Dec 3 · 1:30 AM ET (11:30 PM MT)');
  });

  it('prints one clock when the reader’s clock and day are Mountain Time’s', () => {
    expect(mountainWhenFor(BUILD, 'America/Denver')).toBe('Wed, Dec 2 · 12:00 PM MT');
    // Arizona keeps standard time, so in December its clock is Mountain Time's.
    expect(mountainWhenFor(BUILD, 'America/Phoenix')).toBe('Wed, Dec 2 · 12:00 PM MT');
  });

  it('reads a zone Intl can’t format as no zone, rather than throwing', () => {
    expect(() => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chigago' })).toThrow(RangeError);
    expect(mountainWhenFor(BUILD, 'America/Chigago')).toBe('Wed, Dec 2 · 12:00 PM MT');
  });

  it('never reads or changes the shared viewer zone', () => {
    setViewerZone('Pacific/Honolulu');
    const before = fmt.when(BUILD);
    expect(mountainWhenFor(BUILD, 'America/New_York')).toBe('Wed, Dec 2 · 2:00 PM ET (12:00 PM MT)');
    expect(fmt.when(BUILD)).toBe(before);
  });
});
