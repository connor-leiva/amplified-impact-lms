import { describe, expect, it } from 'vitest';
import { consoleCaps } from '@ai/core';
import type { MasqueradeHistoryRow, MasqueradeView } from '@ai/core';
import {
  MASQ_COPY,
  activeVM,
  announcement,
  atCap,
  bannerVM,
  clockText,
  entryState,
  historyRowVM,
  pickLabel,
  reasonCheck,
  secondsLeft,
} from './masquerade.vm';

// D-162 3b: what the banner, the dialogs, the paused Console and /admin/masquerade print, in the
// mockup's words, with the spec's behaviour (10 characters, the server's clock, the 60-minute cap).

const MIN = 60_000;
const T0 = Date.parse('2026-12-10T16:30:00Z');

const view = (over: Partial<MasqueradeView> = {}): MasqueradeView => ({
  id: 'mq_1',
  target: { id: 'u_1042', name: 'Elena Vargas', teamName: 'Northshore Group' },
  staff: { id: 'st1', name: 'Connor Leiva' },
  reason: 'Customer reports Week 2 steps are out of order.',
  startedAt: T0,
  expiresAt: T0 + 15 * MIN,
  hardExpiresAt: T0 + 60 * MIN,
  extendCount: 0,
  canExtend: true,
  startedFrom: '/admin/users/u_1042',
  ...over,
});

describe('the banner (D-162 3b)', () => {
  it('prints the mockup’s words at 768 and up', () => {
    expect(bannerVM(view(), T0, false)).toEqual({
      who: 'Masquerading as Elena Vargas · Northshore Group',
      reason: 'Reason: Customer reports Week 2 steps are out of order. All writes are blocked.',
      left: '15:00 left',
      seconds: 900,
      extend: { label: 'Extend 15 min', disabled: false },
      exit: 'Exit masquerade',
    });
  });

  it('on a phone: the name alone, no reason, "Extend" and "Exit"', () => {
    const vm = bannerVM(view(), T0, true);
    expect(vm.who).toBe('Masquerading as Elena Vargas');
    expect(vm.reason).toBeNull();
    expect(vm.extend.label).toBe('Extend');
    expect(vm.exit).toBe('Exit');
  });

  it('ends the reason with a full stop before "All writes are blocked."; no workspace, no " · "', () => {
    const vm = bannerVM(view({ reason: 'Ticket 4411 seat invite', target: { id: 'u', name: 'Sam Whitlock', teamName: null } }), T0, false);
    expect(vm.reason).toBe('Reason: Ticket 4411 seat invite. All writes are blocked.');
    expect(vm.who).toBe('Masquerading as Sam Whitlock');
  });

  it('counts down on the clock it is given (the server’s: the browser’s plus the skew)', () => {
    const skew = 90_000; // the browser is a minute and a half behind the server
    const browser = T0 + 4 * MIN;
    expect(bannerVM(view(), browser + skew, false).left).toBe('09:30 left');
    expect(bannerVM(view(), T0 + 15 * MIN - 400, false).left).toBe('00:01 left');
    expect(bannerVM(view(), T0 + 16 * MIN, false).left).toBe('00:00 left');
    expect(secondsLeft(view(), T0 + 16 * MIN)).toBe(0);
    expect(clockText(61_000)).toBe('01:01');
  });

  it('at the 60-minute cap Extend is "Max 60 min", disabled, with the mockup’s title', () => {
    const capped = view({ expiresAt: T0 + 60 * MIN, extendCount: 3, canExtend: false });
    expect(atCap(capped)).toBe(true);
    expect(bannerVM(capped, T0, false).extend).toEqual({ label: 'Max 60 min', disabled: true, title: '60-minute maximum reached' });
    expect(bannerVM(capped, T0, true).extend.label).toBe('Max 60 min');
    // Either side saying so is enough.
    expect(atCap(view({ canExtend: false }))).toBe(true);
    expect(atCap(view({ expiresAt: T0 + 60 * MIN }))).toBe(true);
    expect(atCap(view())).toBe(false);
  });

  it('speaks only when it crosses 5:00 and 1:00, and at the end; never on the first tick', () => {
    expect(announcement(null, 290)).toBeNull();
    expect(announcement(301, 300)).toBe(MASQ_COPY.announce.five);
    expect(announcement(300, 299)).toBeNull();
    expect(announcement(61, 60)).toBe(MASQ_COPY.announce.one);
    expect(announcement(400, 50)).toBe(MASQ_COPY.announce.one);
    expect(announcement(1, 0)).toBe(MASQ_COPY.announce.ended);
    expect(announcement(0, 0)).toBeNull();
    // An Extend moves the clock up: nothing to say.
    expect(announcement(200, 1100)).toBeNull();
    expect(MASQ_COPY.announce).toEqual({
      five: '5 minutes left in this masquerade session.',
      one: '1 minute left in this masquerade session.',
      ended: 'This masquerade session has ended.',
    });
  });
});

describe('the paused Console’s "Active session" card', () => {
  it('names the person and workspace, the reason, and the minutes granted of 60', () => {
    const vm = activeVM(view({ expiresAt: T0 + 30 * MIN, extendCount: 1 }), T0 + 5 * MIN);
    expect(vm.left).toBe('25:00 left');
    expect(vm.rows).toEqual([
      { label: 'Signed in as', value: 'Elena Vargas · Northshore Group' },
      { label: 'Reason', value: 'Customer reports Week 2 steps are out of order.' },
      { label: 'Time granted', value: '30 of 60 minutes' },
    ]);
  });
});

describe('the reason dialog', () => {
  it('needs 10 to 500 characters, trimmed (the spec’s 10, not the mockup’s 8)', () => {
    expect(reasonCheck('')).toEqual({ ok: false, help: 'Required. Saved to the audit log with your name.' });
    expect(reasonCheck('   12345678  ').ok).toBe(false);
    expect(reasonCheck('123456789').ok).toBe(false);
    expect(reasonCheck('1234567890')).toEqual({ ok: true, help: 'Saved to the audit log with your name.' });
    expect(reasonCheck('x'.repeat(500)).ok).toBe(true);
    expect(reasonCheck('x'.repeat(501)).ok).toBe(false);
  });

  it('speaks the mockup’s words', () => {
    expect(MASQ_COPY.reason.startTitle('Elena Vargas')).toBe('Masquerade as Elena Vargas');
    expect(MASQ_COPY.reason.extendTitle).toBe('Extend masquerade by 15 minutes');
    expect(MASQ_COPY.reason.body('Elena Vargas', 'Northshore Group')).toBe(
      'You will be signed in as Elena Vargas (Northshore Group) for 15 minutes. Every write is blocked, and the session is audit-logged.',
    );
    expect(MASQ_COPY.reason.body('Sam Whitlock', null)).toBe(
      'You will be signed in as Sam Whitlock for 15 minutes. Every write is blocked, and the session is audit-logged.',
    );
    expect([MASQ_COPY.reason.start, MASQ_COPY.reason.extend]).toEqual(['Start 15-minute session', 'Extend 15 minutes']);
  });
});

describe('recent sessions', () => {
  const row = (over: Partial<MasqueradeHistoryRow>): MasqueradeHistoryRow => ({
    id: 'mq_9',
    target: { id: 'u_1104', name: 'Sam Whitlock' },
    staff: { id: 'st2', name: 'Avery Stone' },
    reason: 'Customer cannot see the Session 2 replay.',
    startedAt: Date.parse('2026-12-10T04:25:00Z'),
    expiresAt: Date.parse('2026-12-10T04:40:00Z'),
    endedAt: Date.parse('2026-12-10T04:31:00Z'),
    endReason: 'exit',
    extendCount: 0,
    startedFrom: null,
    ...over,
  });

  it('prints a row as the mockup does: the person, by whom, MST, minutes, how it ended', () => {
    expect(historyRowVM(row({}), T0)).toMatchObject({
      user: 'Sam Whitlock',
      by: 'by Avery Stone',
      started: 'Dec 9, 9:25 PM',
      length: '6 min',
      ended: 'Exited by staff',
    });
  });

  it('an expired session’s length stops at its expiry, a running one is "Running"; every end reason has words', () => {
    expect(historyRowVM(row({ endReason: 'expired', endedAt: Date.parse('2026-12-10T04:41:30Z') }), T0)).toMatchObject({ length: '15 min', ended: 'Expired' });
    expect(historyRowVM(row({ endReason: null, endedAt: null }), Date.parse('2026-12-10T04:33:00Z'))).toMatchObject({ length: '8 min', ended: 'Running' });
    expect(historyRowVM(row({ endReason: 'signed_out' }), T0).ended).toBe('Signed out');
    expect(historyRowVM(row({ endReason: 'revoked' }), T0).ended).toBe('Revoked');
    expect(historyRowVM(row({ target: { id: 'u_gone', name: null } }), T0).user).toBe('u_gone');
  });

  it('labels the picker’s people as the mockup’s select does', () => {
    expect(pickLabel({ name: 'Elena Vargas', workspace: 'Northshore Group' })).toBe('Elena Vargas · Northshore Group');
    expect(pickLabel({ name: 'Sam Whitlock', workspace: null })).toBe('Sam Whitlock');
  });
});

describe('the entry points, by role (spec § 6)', () => {
  const me = (role: 'Owner' | 'Admin' | 'Support' | 'Instructor' | 'Content Editor', masqueradeEnabled = true) => ({ role, caps: consoleCaps(role), masqueradeEnabled });

  it('Owner and Admin see them; Support, Instructor and Content Editor do not', () => {
    expect(entryState(me('Owner'))).toEqual({ show: true, off: null });
    expect(entryState(me('Admin'))).toEqual({ show: true, off: null });
    for (const r of ['Support', 'Instructor', 'Content Editor'] as const) expect(entryState(me(r))).toEqual({ show: false });
    expect(entryState(null)).toEqual({ show: false });
  });

  it('follows the capabilities `me` answers, so a Roles & Permissions change moves it', () => {
    expect(entryState({ caps: consoleCaps('Admin').filter((c) => c !== 'masquerade.start'), masqueradeEnabled: true })).toEqual({ show: false });
    expect(entryState({ caps: ['console.view', 'masquerade.start'], masqueradeEnabled: true })).toEqual({ show: true, off: null });
  });

  it('never for a staff target; disabled, saying why, while the flag is off', () => {
    expect(entryState(me('Owner'), 'staff')).toEqual({ show: false });
    expect(entryState(me('Admin', false))).toEqual({ show: true, off: 'Masquerade is turned off.' });
  });
});
