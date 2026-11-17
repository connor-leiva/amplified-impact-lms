// The R2 admin's support-record words (D-160 R2-1c): the mockup's stamps in MST, its seat bars (green,
// amber when nearly full, grey when a fixed-seat plan is full, never red), its plan lines, MRR from
// local orders, and its status words with their tones.
import { describe, expect, it } from 'vitest';
import {
  ADMIN_TZ,
  adminDate,
  adminStamp,
  initialsOf,
  mrrOf,
  orderStatusOf,
  planLine,
  planStatusOf,
  seatBar,
  seatPct,
  tierLabel,
  usdCents,
  usdWhole,
  userStatusOf,
} from '../src/index';

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

describe('money and names @console', () => {
  it('prints cents', () => {
    expect(usdCents(149500)).toBe('$1,495.00');
    expect(usdCents(9700)).toBe('$97.00');
    expect(usdWhole(149500)).toBe('$1,495');
  });
  it('takes two initials', () => {
    expect(initialsOf('Elena Vargas')).toBe('EV');
    expect(initialsOf('Amplified AI Accelerator')).toBe('AA');
  });
  it('prints a tier', () => {
    expect(tierLabel('team')).toBe('Team');
    expect(tierLabel(null)).toBe('—');
  });
});

describe('statuses: a word and a tone, as the mockup’s TONE @console', () => {
  it('plans', () => {
    expect(planStatusOf('active')).toEqual({ label: 'Active', tone: 'ok' });
    expect(planStatusOf('past_due')).toEqual({ label: 'Past due', tone: 'bad' });
    expect(planStatusOf('trialing')).toEqual({ label: 'Trialing', tone: 'info' });
    expect(planStatusOf('canceled')).toEqual({ label: 'Canceled', tone: 'off' });
    expect(planStatusOf(null)).toEqual({ label: 'No plan', tone: 'neutral' });
  });
  it('people', () => {
    expect(userStatusOf('active')).toEqual({ label: 'Active', tone: 'ok' });
    expect(userStatusOf('invited')).toEqual({ label: 'Invited', tone: 'info' });
  });
  it('orders', () => {
    expect(orderStatusOf('paid')).toEqual({ label: 'Paid', tone: 'ok' });
    expect(orderStatusOf('failed')).toEqual({ label: 'Failed', tone: 'bad' });
    expect(orderStatusOf('refunded')).toEqual({ label: 'Refunded', tone: 'warn' });
  });
});

describe('plans and seats (BUILD-SPEC § 7) @console', () => {
  it('names the Team Plan by its size', () => {
    expect(planLine('agents', 41)).toBe('Team Plan · 41 seats');
    expect(planLine('agent_plan', 50)).toBe('Agent Plan');
    expect(planLine('cohort', 2)).toBe('AI Accelerator');
    expect(planLine('membership', 1)).toBe('Insiders');
    expect(planLine(null, 0)).toBe('No plan');
  });
  it('colours the seat bar: green, amber near the cap, grey when a fixed-seat plan is full, never red', () => {
    expect(seatBar(33, 41, 'agents')).toBe('ok');
    expect(seatBar(15, 16, 'agents')).toBe('hot');
    expect(seatBar(46, 50, 'agent_plan')).toBe('hot');
    expect(seatBar(2, 2, 'cohort')).toBe('full');
    expect(seatBar(1, 1, 'membership')).toBe('full');
    expect(seatBar(0, 16, 'agents')).toBe('ok');
    expect(seatPct(33, 41)).toBeCloseTo(80.49, 1);
    expect(seatPct(1, 0)).toBe(0);
  });
  it('reads MRR from local orders', () => {
    const o = (cents: number | null, at: number) => ({ amountTotal: cents, createdAt: at });
    expect(mrrOf({ kind: 'agents', status: 'active' }, [o(69500, 1), o(149500, 2)])).toBe('$1,495');
    expect(mrrOf({ kind: 'cohort', status: 'active' }, [o(375000, 1)])).toBe('One-time');
    expect(mrrOf({ kind: 'agents', status: 'trialing' }, [o(69500, 1)])).toBe('$0');
    expect(mrrOf({ kind: 'membership', status: 'past_due' }, [o(9700, 1)])).toBe('$97');
    expect(mrrOf({ kind: 'agents', status: 'active' }, [o(null, 1)])).toBe('—');
    expect(mrrOf(null, [])).toBe('—');
  });
});
