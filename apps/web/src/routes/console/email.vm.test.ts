// D-166 (spec § 7.15): the Email Log's words, filters, rows and detail, from the API's rows. D-263: each
// row's delivery, opens and clicks from Resend's webhook, and the five rollup tiles, in the mockup's words.
import { describe, expect, it } from 'vitest';
import { NO_DELIVERY, NO_ROLLUP, emailRollup } from '@ai/core';
import type { EmailLogRow } from '@ai/core';
import { fixtureEmailPage, fixtureEmails } from '../../data/console-fixture-email-usage';
import {
  emailDetailVM,
  emailFiltersFor,
  emailFiltersFromSearch,
  emailLogHref,
  emailRollupVM,
  emailRowVM,
  isDefaultEmailFilters,
  statusOptions,
  templateOptions,
  workspaceChip,
} from './email.vm';

const row: EmailLogRow = {
  ...NO_DELIVERY,
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
    const none = { q: '', template: '', status: '', teamId: '', workspace: '' };
    expect(emailFiltersFor({ ...none, q: '  ' })).toEqual({});
    expect(emailFiltersFor({ ...none, q: ' jamie ', template: 'sign-in', status: 'failed' })).toEqual({
      q: 'jamie',
      template: 'sign-in',
      status: 'failed',
    });
    expect(emailFiltersFromSearch('?q=sam%40tidewater.example&template=payment-failed')).toEqual({
      ...none,
      q: 'sam@tidewater.example',
      template: 'payment-failed',
    });
    expect(isDefaultEmailFilters(none)).toBe(true);
  });
  it('opens one workspace’s emails from Billing’s “Open email log”, and says which', () => {
    const href = emailLogHref({ teamId: 'ws_tidewater', name: 'Tidewater Property Co.' });
    expect(href).toBe('/admin/email?teamId=ws_tidewater&workspace=Tidewater+Property+Co.');
    const f = emailFiltersFromSearch(href.slice(href.indexOf('?')));
    expect(f).toMatchObject({ teamId: 'ws_tidewater', workspace: 'Tidewater Property Co.' });
    expect(emailFiltersFor(f)).toEqual({ teamId: 'ws_tidewater' });
    expect(isDefaultEmailFilters(f)).toBe(false);
    expect(workspaceChip(f.workspace)).toBe('Workspace: Tidewater Property Co.');
    expect(emailLogHref(null)).toBe('/admin/email');
    expect(fixtureEmailPage(fixtureEmails(), { teamId: 'ws_tidewater' }).rows.map((r) => r.to)).toEqual([
      'sam@tidewaterproperty.example',
    ]);
  });
  it('offers the log’s templates and the API’s statuses, in words', () => {
    expect(templateOptions(['sign-in', 'team-invite'], '').map((o) => o.label)).toEqual([
      'Any template',
      'sign-in',
      'team-invite',
    ]);
    expect(templateOptions([], 'payment-failed').map((o) => o.value)).toEqual(['', 'payment-failed']);
    expect(statusOptions(['sent', 'failed', 'skipped']).map((o) => o.label)).toEqual([
      'Any status',
      'Sent',
      'Failed',
      'Skipped',
    ]);
  });
});

describe('the Email Log’s rows and detail @console', () => {
  it('prints a row in MT and CT with its status word and tone', () => {
    expect(emailRowVM(row)).toMatchObject({
      subject: row.subject,
      to: row.to,
      template: 'session-24h',
      sent: 'Dec 8, 12:00 PM MT / 1:00 PM CT',
      status: { label: 'Failed', tone: 'bad' },
    });
  });
  it('says the body is not kept, and names a failure’s kind', () => {
    const d = emailDetailVM(row);
    expect(d.title).toBe(row.subject);
    expect(d.rows.map((r) => [r.label, r.value])).toEqual([
      ['To', 'jamie@ortizhomes.com'],
      ['From', 'Amplified Impact'],
      ['Template', 'session-24h'],
      ['Provider', 'Resend'],
      ['Status', 'Failed'],
      ['Error', 'Resend refused it'],
      ['Sent', 'Dec 8, 12:00 PM MT / 1:00 PM CT'],
    ]);
    // The mockup's own note, now that the log keeps delivery events (D-263).
    expect(d.note).toBe('The log keeps the subject and delivery events. The message body is not stored here.');
    expect(emailDetailVM({ ...row, status: 'sent', errorKind: null }).rows.map((r) => r.label)).not.toContain('Error');
  });
  it('draws the mockup’s rows from the fixture, and filters them as the API does', () => {
    const rows = fixtureEmails();
    expect(rows.map(emailRowVM).map((r) => [r.subject, r.status.label, r.opens, r.clicks, r.sent])).toEqual([
      [
        'Tomorrow at 12:00 PM MT / 1:00 PM CT: Session 2 live build',
        'Delivered',
        2,
        1,
        'Dec 8, 12:00 PM MT / 1:00 PM CT',
      ],
      ['Your Insiders payment did not go through', 'Delivered', 1, 0, 'Dec 4, 9:04 AM MT / 10:04 AM CT'],
      ['The Session 2 replay is ready', 'Delivered', 3, 2, 'Dec 9, 3:10 PM MT / 4:10 PM CT'],
      ['Your sign-in link', 'Delivered', 1, 1, 'Dec 9, 11:26 AM MT / 12:26 PM CT'],
      ['This week: 2 new AI Employees', 'Bounced', 0, 0, 'Dec 7, 7:00 AM MT / 8:00 AM CT'],
      ['Receipt for Team Plan, 16 seats', 'Sent', 0, 0, 'Dec 10, 9:18 AM MT / 10:18 AM CT'],
      ['New in the vault: listing appointment checklist', 'Delivered', 0, 0, 'Dec 8, 3:00 PM MT / 4:00 PM CT'],
    ]);
    expect(fixtureEmailPage(rows, { status: 'bounced' }).rows).toHaveLength(1);
    expect(fixtureEmailPage(rows, { q: 'SESSION' }).rows).toHaveLength(2);
    expect(fixtureEmailPage(rows, { userId: 'u_1042' }).rows.map((r) => r.template)).toEqual(['session-24h']);
    expect(statusOptions(fixtureEmailPage(rows, {}).statuses).map((o) => o.label)).toEqual([
      'Any status',
      'Sent',
      'Delivered',
      'Delayed',
      'Bounced',
      'Complained',
      'Failed',
      'Skipped',
    ]);
  });
});

describe('the Email Log’s delivery (D-263) @console', () => {
  it('badges a row with its delivery once reported, else its send’s outcome', () => {
    expect(emailRowVM({ ...row, status: 'sent', errorKind: null }).status).toEqual({ label: 'Sent', tone: 'ok' });
    expect(emailRowVM({ ...row, status: 'sent', errorKind: null, delivery: 'delayed' }).status).toEqual({
      label: 'Delayed',
      tone: 'warn',
    });
    expect(emailRowVM({ ...row, status: 'sent', errorKind: null, delivery: 'complained' }).status).toEqual({
      label: 'Complained',
      tone: 'bad',
    });
    expect(emailRowVM({ ...row, status: 'skipped', errorKind: null }).status).toEqual({
      label: 'Skipped',
      tone: 'off',
    });
  });

  it('prints the mockup’s five tiles from the fixture’s rollup', () => {
    const page = fixtureEmailPage(fixtureEmails(), {});
    expect(emailRollupVM(page.rollup!).map((t) => [t.label, t.value, t.sub, t.tone])).toEqual([
      ['Sent', '7', 'Last 180 days', null],
      ['Delivered', '71%', '5 of 7 sent', null],
      ['Bounced', '1', '14% of sent', 'bad'],
      ['Unique opens', '80%', '4 of 5 delivered', null],
      ['Unique clicks', '60%', '3 of 5 delivered', null],
    ]);
    // The tiles follow the filters.
    expect(
      emailRollupVM(fixtureEmailPage(fixtureEmails(), { template: 'replay-ready' }).rollup!).map((t) => t.value),
    ).toEqual(['1', '100%', '0', '100%', '100%']);
  });

  it('says so when there is nothing to rate, and counts complaints beside bounces', () => {
    expect(emailRollupVM(emailRollup(NO_ROLLUP)).map((t) => [t.value, t.sub])).toEqual([
      ['0', 'Last 180 days'],
      ['—', '0 of 0 sent'],
      ['0', 'None sent'],
      ['—', '0 of 0 delivered'],
      ['—', '0 of 0 delivered'],
    ]);
    const tiles = emailRollupVM(
      emailRollup({
        ...NO_ROLLUP,
        sent: 2400,
        delivered: 2390,
        bounced: 10,
        complained: 2,
        opened: 1200,
        clicked: 300,
      }),
    );
    expect(tiles.map((t) => t.value)).toEqual(['2,400', '99%', '10', '50%', '13%']);
    expect(tiles[2]).toMatchObject({ sub: '1% of sent · 2 complaints', tone: 'bad' });
    expect(emailRollupVM(emailRollup({ ...NO_ROLLUP, sent: 100, delivered: 99, bounced: 1 }))[2]).toMatchObject({
      sub: '1% of sent',
      tone: null,
    });
  });

  it('opens a delivered row’s detail with its delivery, opens, clicks and last link', () => {
    const elena = fixtureEmails()[0]!;
    expect(emailDetailVM(elena).rows.map((r) => [r.label, r.value])).toEqual([
      ['To', 'elena@northshoregroup.example'],
      ['From', 'Amplified Impact'],
      ['Template', 'session-24h'],
      ['Provider', 'Resend'],
      ['Status', 'Delivered'],
      ['Sent', 'Dec 8, 12:00 PM MT / 1:00 PM CT'],
      ['Delivered', 'Dec 8, 12:00 PM MT / 1:00 PM CT'],
      ['Opens', '2'],
      ['First opened', 'Dec 8, 12:41 PM MT / 1:41 PM CT'],
      ['Last opened', 'Dec 8, 6:40 PM MT / 7:40 PM CT'],
      ['Clicks', '1'],
      ['First clicked', 'Dec 8, 12:42 PM MT / 1:42 PM CT'],
      ['Last clicked', 'Dec 8, 12:42 PM MT / 1:42 PM CT'],
      ['Last link clicked', 'https://learn.example.com/sessions/2'],
    ]);
  });

  it('gives a bounce its reason, and a skipped send no opens or clicks', () => {
    const priya = fixtureEmails()[4]!;
    expect(emailDetailVM(priya).rows.map((r) => [r.label, r.value])).toEqual([
      ['To', 'priya@fourthmeridian.example'],
      ['From', 'Amplified Impact'],
      ['Template', 'weekly-digest'],
      ['Provider', 'Resend'],
      ['Status', 'Bounced'],
      ['Sent', 'Dec 7, 7:00 AM MT / 8:00 AM CT'],
      ['Bounce', 'Permanent · General · The mailbox does not exist.'],
      ['Opens', '0'],
      ['Clicks', '0'],
    ]);
    expect(
      emailDetailVM({ ...row, status: 'skipped', errorKind: null, provider: 'outbox' }).rows.map((r) => r.label),
    ).not.toContain('Opens');
  });
});
