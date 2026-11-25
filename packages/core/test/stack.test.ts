// D-197: the stack card prefills from the intake and refuses a secret.
import { describe, expect, it } from 'vitest';
import { cleanStackRows, looksSecret, prefillStack, stackCardText, stackCheckTarget } from '../src/stack';
import type { StackRow } from '../src/stack';
import type { AIEmployee } from '../src/types';
import { WEEK0_STACK } from '../seed/stack-v1';

describe('the stack card (D-197)', () => {
  it('fills Books, Closings, Leads and Email from the intake', () => {
    const rows = prefillStack(WEEK0_STACK, { books: 'QuickBooks Online', sisu: 'Sisu, admin', crm: 'Follow Up Boss', google: 'Yes' });
    expect(rows.map((r) => [r.source, r.tool, r.plan])).toEqual([
      ['Books', 'QuickBooks Online', 'yellow'],
      ['Closings and production', 'Sisu, admin', 'yellow'],
      ['Leads and follow-up', 'Follow Up Boss', 'yellow'],
      ['Email, calendar, files', '', 'green'],
    ]);
  });

  it('refuses a password or an account number', () => {
    expect(looksSecret('hunter2 password')).toBe(true);
    expect(looksSecret('123456789')).toBe(true);
    const out = cleanStackRows(WEEK0_STACK, [{ source: 'Books', tool: 'my password', plan: 'green', who: 'Sam' }]);
    expect(out.secret).toBe(true);
    expect(out.rows.find((r) => r.source === 'Books')!.tool).toBe('');
  });
});

// D-253: Send Back ticks the live step 1 item, whose title the draft didn't have.
describe('stackCheckTarget (D-197, D-253)', () => {
  const week0 = (claude: unknown[], chatgpt: unknown[] = claude) =>
    ({ id: 'accelerator-week-0', checklist: [{ id: 'c1', paths: { claude: { blocks: claude }, chatgpt: { blocks: chatgpt } } }] }) as unknown as AIEmployee;
  const download = { type: 'download', kitItemIds: ['stack-card'] };

  it('finds the live item by its title, "Send back your stack card", in any case and trimmed', () => {
    expect(stackCheckTarget(week0([{ type: 'check', id: 's1-send', title: 'Send back your stack card', action: download }]))).toEqual({ moduleId: 'accelerator-week-0', stepId: 'c1', itemId: 's1-send' });
    expect(stackCheckTarget(week0([{ type: 'check', id: 's1-send', title: '  SEND BACK YOUR STACK CARD ', action: download }]))?.itemId).toBe('s1-send');
  });

  it('still finds the draft’s title, and nothing for another title', () => {
    expect(stackCheckTarget(week0([{ type: 'check', id: 's1-fill', title: 'Fill in your stack card' }]))?.itemId).toBe('s1-fill');
    expect(stackCheckTarget(week0([{ type: 'check', id: 's1-x', title: 'Send back your stack card today' }]))).toBeNull();
    expect(stackCheckTarget(undefined)).toBeNull();
  });

  it('lets a Form action that opens the stack card win over a title, wherever it is', () => {
    const titled = { type: 'check', id: 's1-send', title: 'Send back your stack card', action: download };
    const form = { type: 'check', id: 's1-form', title: 'Your card', action: { type: 'form', formId: 'stack-card', label: '' } };
    expect(stackCheckTarget(week0([titled, form]))?.itemId).toBe('s1-form');
    expect(stackCheckTarget(week0([titled], [form]))?.itemId).toBe('s1-form');
    // An item's own itemId on the action wins over the block's id, as before.
    expect(stackCheckTarget(week0([titled, { ...form, action: { ...form.action, itemId: 's1-send' } }]))?.itemId).toBe('s1-send');
  });
});

// D-253: the Console's View stack card says who, and whether the team sent it back, in MT / CT.
describe('stackCardText (D-253)', () => {
  const rows: StackRow[] = [
    { source: 'Books', tool: 'QuickBooks Online', plan: 'green', who: 'The bookkeeper' },
    { source: 'Leads and follow-up', tool: 'Follow Up Boss', plan: 'yellow', who: '  ' },
  ];

  it('lists each row with its who, then the time it was sent back, Mountain first and Central after', () => {
    expect(stackCardText({ rows, sentAt: Date.parse('2026-11-27T17:30:00Z') })).toBe(
      ['Books: QuickBooks Online (green), Who: The bookkeeper', 'Leads and follow-up: Follow Up Boss (yellow)', 'Sent back Fri, Nov 27, 10:30 AM MT / 11:30 AM CT'].join('\n'),
    );
  });

  it('says when it is not sent back yet', () => {
    expect(stackCardText({ rows, sentAt: null })).toBe(
      ['Books: QuickBooks Online (green), Who: The bookkeeper', 'Leads and follow-up: Follow Up Boss (yellow)', 'Not sent back yet'].join('\n'),
    );
  });

  it('says a team with no card has none yet', () => {
    expect(stackCardText({ rows: [], sentAt: null })).toBe('No stack card yet.');
  });
});
