// D-166 (spec § 7.15): the Email Log's words, filters, rows and detail, from the API's rows. v1 has no
// delivery events, and the detail says so; the fixture draws the mockup's delivery words.
import { describe, expect, it } from 'vitest';
import type { EmailLogRow } from '@ai/core';
import { fixtureEmailPage, fixtureEmails } from '../../data/console-fixture-email-usage';
import { emailDetailVM, emailFiltersFor, emailFiltersFromSearch, emailRowVM, isDefaultEmailFilters, statusOptions, templateOptions } from './email.vm';

const row: EmailLogRow = {
  id: '7',
  at: Date.parse('2026-12-08T19:00:00Z'),
  to: 'jamie@ortizhomes.com',
  userId: 'u_jamie',
  template: 'session-24h',
  subject: 'Tomorrow at 1:00 PM CT: Session 3',
  provider: 'resend',
  providerId: 're_1',
  status: 'failed',
  errorKind: 'provider',
};

describe('the Email Log’s filters @console', () => {
  it('sends only what is set, and opens from a link’s query', () => {
    expect(emailFiltersFor({ q: '  ', template: '', status: '' })).toEqual({});
    expect(emailFiltersFor({ q: ' jamie ', template: 'sign-in', status: 'failed' })).toEqual({ q: 'jamie', template: 'sign-in', status: 'failed' });
    expect(emailFiltersFromSearch('?q=sam%40tidewater.example&template=payment-failed')).toEqual({ q: 'sam@tidewater.example', template: 'payment-failed', status: '' });
    expect(isDefaultEmailFilters({ q: '', template: '', status: '' })).toBe(true);
  });
  it('offers the log’s templates and the API’s statuses, in words', () => {
    expect(templateOptions(['sign-in', 'team-invite'], '').map((o) => o.label)).toEqual(['Any template', 'sign-in', 'team-invite']);
    expect(templateOptions([], 'payment-failed').map((o) => o.value)).toEqual(['', 'payment-failed']);
    expect(statusOptions(['sent', 'failed', 'skipped']).map((o) => o.label)).toEqual(['Any status', 'Sent', 'Failed', 'Skipped']);
  });
});

describe('the Email Log’s rows and detail @console', () => {
  it('prints a row in MST with its status word and tone', () => {
    expect(emailRowVM(row)).toMatchObject({ subject: row.subject, to: row.to, template: 'session-24h', sent: 'Dec 8, 12:00 PM', status: { label: 'Failed', tone: 'bad' } });
  });
  it('says the body is not kept and v1 tracks no delivery events, and names a failure’s kind', () => {
    const d = emailDetailVM(row);
    expect(d.title).toBe(row.subject);
    expect(d.rows.map((r) => [r.label, r.value])).toEqual([
      ['To', 'jamie@ortizhomes.com'],
      ['From', 'Amplified Impact'],
      ['Template', 'session-24h'],
      ['Provider', 'Resend'],
      ['Status', 'Failed'],
      ['Error', 'Resend refused it'],
      ['Sent', 'Dec 8, 12:00 PM MST'],
    ]);
    expect(d.note).toBe('The log keeps the subject and whether it was sent. Delivery events are not tracked yet. The message body is not stored here.');
    expect(emailDetailVM({ ...row, status: 'sent', errorKind: null }).rows.map((r) => r.label)).not.toContain('Error');
  });
  it('draws the mockup’s rows from the fixture, and filters them as the API does', () => {
    const rows = fixtureEmails();
    expect(rows.map(emailRowVM).map((r) => [r.subject, r.status.label, r.sent])).toEqual([
      ['Tomorrow at 12:00 PM MST: Session 2 live build', 'Delivered', 'Dec 8, 12:00 PM'],
      ['Your Insiders payment did not go through', 'Delivered', 'Dec 4, 9:04 AM'],
      ['The Session 2 replay is ready', 'Opened', 'Dec 9, 3:10 PM'],
      ['Your sign-in link', 'Delivered', 'Dec 9, 11:26 AM'],
      ['This week: 2 new AI Employees', 'Bounced', 'Dec 7, 7:00 AM'],
      ['Receipt for Team Plan, 16 seats', 'Queued', 'Dec 10, 9:18 AM'],
      ['New in the vault: listing appointment checklist', 'Delivered', 'Dec 8, 3:00 PM'],
    ]);
    expect(fixtureEmailPage(rows, { status: 'bounced' }).rows).toHaveLength(1);
    expect(fixtureEmailPage(rows, { q: 'SESSION' }).rows).toHaveLength(2);
    expect(fixtureEmailPage(rows, { userId: 'u_1042' }).rows.map((r) => r.template)).toEqual(['session-24h']);
    expect(statusOptions(fixtureEmailPage(rows, {}).statuses).map((o) => o.label)).toEqual(['Any status', 'Delivered', 'Opened', 'Queued', 'Bounced']);
  });
});
