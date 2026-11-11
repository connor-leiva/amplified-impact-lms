import { describe, expect, it } from 'vitest';
import { COHORT_SEATS } from '../src/offer';
import { countdownWords, FOUNDING_TOKENS, foundingValues } from '../src/founding';

// The founding countdown and seats left on the www sales pages (D-111).

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Mon, Nov 30, 2026, 11:59 PM Mountain: the default FOUNDING_CLOSES_AT (D-104).
const CLOSES = Date.parse('2026-11-30T23:59:00-07:00');

describe('countdownWords', () => {
  it('counts whole days, then whole hours on the last day, then the last hour', () => {
    expect(countdownWords(19 * DAY + 5 * HOUR)).toBe('19 days left');
    expect(countdownWords(2 * DAY)).toBe('2 days left');
    expect(countdownWords(DAY + 23 * HOUR)).toBe('1 day left');
    expect(countdownWords(DAY)).toBe('1 day left');
    expect(countdownWords(DAY - 1)).toBe('23 hours left');
    expect(countdownWords(HOUR)).toBe('1 hour left');
    expect(countdownWords(HOUR - 1)).toBe('Less than an hour left');
    expect(countdownWords(1)).toBe('Less than an hour left');
  });

  it('says nothing once founding has closed', () => {
    expect(countdownWords(0)).toBe('');
    expect(countdownWords(-DAY)).toBe('');
    expect(countdownWords(Number.NaN)).toBe('');
  });
});

describe('foundingValues', () => {
  it('fills the countdown from the deadline, and the seats from the sales', () => {
    // Wed, Nov 11, 2026, 9:00 AM Central.
    const now = Date.parse('2026-11-11T09:00:00-06:00');
    expect(foundingValues(now, CLOSES, 3)).toEqual({ countdown: '19 days left', 'seats-left': String(COHORT_SEATS - 3), 'seats-total': '15', seats: 'left' });
  });

  it('never shows fewer than no seats, and says sold out at the cap', () => {
    expect(foundingValues(CLOSES - DAY * 3, CLOSES, COHORT_SEATS)).toMatchObject({ 'seats-left': '0', seats: 'soldout' });
    expect(foundingValues(CLOSES - DAY * 3, CLOSES, COHORT_SEATS + 4)).toMatchObject({ 'seats-left': '0', seats: 'soldout' });
    expect(foundingValues(CLOSES + 1, CLOSES, 0)).toMatchObject({ countdown: '', seats: 'left' });
  });

  it('has a value for every token it names', () => {
    const values = foundingValues(0, CLOSES, 0);
    for (const t of Object.values(FOUNDING_TOKENS)) expect(Object.keys(values)).toContain(t.slice(2, -2));
  });
});
