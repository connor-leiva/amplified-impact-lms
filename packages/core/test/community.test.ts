// D-231: the cohort Community's rules (B-29 to B-34): spaces, what a thread and a reply hold, who sees and changes what.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fmt, setViewerZone } from '../src/time';
import {
  COMMUNITY_ERRORS,
  cleanPost,
  cleanThread,
  excerptOf,
  mayDeletePost,
  mayEditPost,
  spaceLabel,
  spacesFor,
  visibleTo,
  waitingOn,
} from '../src/community';

beforeEach(() => setViewerZone('America/Chicago'));
afterEach(() => setViewerZone(null));

describe('spaces (§7.5)', () => {
  it('General, a space per open week, then Wins', () => {
    const s = spacesFor([{ week: 0, title: 'Foundations' }]);
    expect(s).toEqual([
      { id: 'general', label: 'General' },
      { id: 'week-0', label: 'Week 0 · Foundations' },
      { id: 'wins', label: 'Wins' },
    ]);
    expect(spaceLabel(s, 'week-0')).toBe('Week 0 · Foundations');
    expect(spaceLabel(s, 'week-3')).toBe('Week 3');
  });
});

describe('a new thread (B-32), as the drawer checks it', () => {
  const spaces = ['general', 'week-0', 'wins'];
  it('names each missing piece in the mockup’s words', () => {
    expect(cleanThread({}, spaces)).toEqual({
      ok: false,
      errors: { space: COMMUNITY_ERRORS.needSpace, title: COMMUNITY_ERRORS.needTitle, details: COMMUNITY_ERRORS.needDetails },
    });
    expect(cleanThread({ space: 'week-9', title: 'Hi there', body: 'x' }, spaces)).toEqual({ ok: false, errors: { space: COMMUNITY_ERRORS.needSpace } });
    expect(cleanThread({ space: 'wins', title: ' a ', body: 'x' }, spaces)).toEqual({ ok: false, errors: { title: COMMUNITY_ERRORS.needTitle } });
  });
  it('runs the title’s whitespace together and trims both, within the limits', () => {
    const out = cleanThread({ space: 'week-0', title: '  Does   the baseline\ncount weekends? ', body: '\n We log calls.\n\n ' }, spaces);
    expect(out).toEqual({ ok: true, value: { space: 'week-0', title: 'Does the baseline count weekends?', body: 'We log calls.' } });
    const long = cleanThread({ space: 'general', title: 'x'.repeat(200), body: 'y'.repeat(5000) }, spaces);
    expect(long.ok && long.value.title.length).toBe(140);
    expect(long.ok && long.value.body.length).toBe(4000);
  });
  it('a reply or an edit needs something to say', () => {
    expect(cleanPost('  ')).toBeNull();
    expect(cleanPost(42)).toBeNull();
    expect(cleanPost(' Thanks. ')).toBe('Thanks.');
  });
});

describe('who sees and changes what (B-31, B-33)', () => {
  it('hidden is staff-only; deleted is nobody’s', () => {
    expect(visibleTo({ hidden: false, deletedAt: null }, false)).toBe(true);
    expect(visibleTo({ hidden: true, deletedAt: null }, false)).toBe(false);
    expect(visibleTo({ hidden: true, deletedAt: null }, true)).toBe(true);
    expect(visibleTo({ hidden: false, deletedAt: 1 }, true)).toBe(false);
  });
  it('you edit your own; you or staff delete', () => {
    expect(mayEditPost('am', 'am')).toBe(true);
    expect(mayEditPost('am', 'cl')).toBe(false);
    expect(mayDeletePost('am', 'dw', false)).toBe(false);
    expect(mayDeletePost('am', 'cl', true)).toBe(true);
  });
  it('a list row’s excerpt is the first post with its whitespace run together', () => {
    expect(excerptOf('Step 6 asks us.\n\nIs an export enough?')).toBe('Step 6 asks us. Is an export enough?');
  });
});

describe('fmt.activity (B-30): the mockup’s activity words', () => {
  // The mockup's clock: Fri, Nov 20, 2026, 3:18 PM CT. Its sample threads' last posts and their activity.
  const NOW = Date.parse('2026-11-20T21:18:00Z');
  const ct = (s: string) => Date.parse(s);
  it('matches each sample thread', () => {
    expect(fmt.activity(ct('2026-11-20T18:20:00Z'), NOW)).toBe('3 hr ago'); // Fri 12:20 PM
    expect(fmt.activity(ct('2026-11-20T16:05:00Z'), NOW)).toBe('5 hr ago'); // Fri 10:05 AM
    expect(fmt.activity(ct('2026-11-19T14:15:00Z'), NOW)).toBe('1 day ago'); // Thu 8:15 AM
    expect(fmt.activity(ct('2026-11-18T15:00:00Z'), NOW)).toBe('2 days ago'); // Wed 9:00 AM
    expect(fmt.activity(ct('2026-11-18T20:30:00Z'), NOW)).toBe('2 days ago'); // Wed 2:30 PM
  });
  it('just now, minutes, then a date after a week', () => {
    expect(fmt.activity(NOW - 20_000, NOW)).toBe('just now');
    expect(fmt.activity(NOW - 12 * 60_000, NOW)).toBe('12 min ago');
    expect(fmt.activity(NOW - 59 * 60_000, NOW)).toBe('59 min ago');
    expect(fmt.activity(NOW - 23.6 * 3_600_000, NOW)).toBe('1 day ago');
    expect(fmt.activity(NOW - 9 * 86_400_000, NOW)).toBe('Nov 11');
  });
});

// D-238 (B-34): the admin's "Waiting on you", the mockup's `waiting`: the cohort's last word is a member's.
describe('waiting on staff (D-238)', () => {
  const staff = new Set(['cl', 'sam']);
  const isStaff = (id: string) => staff.has(id);
  const post = (by: string, hidden = false) => ({ by, hidden });

  it('waits when the newest post the cohort sees is a member’s, and not after staff answer', () => {
    expect(waitingOn({ hidden: false }, [post('u1')], isStaff)).toBe(true);
    expect(waitingOn({ hidden: false }, [post('u1'), post('u2')], isStaff)).toBe(true);
    expect(waitingOn({ hidden: false }, [post('u1'), post('cl')], isStaff)).toBe(false);
    expect(waitingOn({ hidden: false }, [post('u1'), post('cl'), post('u1')], isStaff)).toBe(true);
    // A thread staff started, with no reply yet, waits on no one.
    expect(waitingOn({ hidden: false }, [post('sam')], isStaff)).toBe(false);
  });

  it('skips a hidden reply: the newest one the cohort can see decides', () => {
    expect(waitingOn({ hidden: false }, [post('u1'), post('cl'), post('u2', true)], isStaff)).toBe(false);
    expect(waitingOn({ hidden: false }, [post('u1'), post('cl', true)], isStaff)).toBe(true);
    // Every reply hidden: the first post stands in.
    expect(waitingOn({ hidden: false }, [post('u1', true), post('cl', true)], isStaff)).toBe(true);
  });

  it('a hidden thread waits on no one, and an empty one neither', () => {
    expect(waitingOn({ hidden: true }, [post('u1')], isStaff)).toBe(false);
    expect(waitingOn({ hidden: false }, [], isStaff)).toBe(false);
  });
});
