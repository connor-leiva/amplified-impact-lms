// D-197: the stack card prefills from the intake and refuses a secret.
import { describe, expect, it } from 'vitest';
import { cleanStackRows, looksSecret, prefillStack } from '../src/stack';
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
