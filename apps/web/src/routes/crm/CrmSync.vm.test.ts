import { describe, expect, it } from 'vitest';
import { COPY, crmView, reasonOf } from './CrmSync.vm';
import type { CrmRow, CrmSyncReport } from './CrmSync.vm';

const row = (over: Partial<CrmRow>): CrmRow => ({
  kind: 'order', id: 'o-1', email: 'pat@example.com', state: 'synced', attempts: 1, lastAttemptAt: null, nextAttemptAt: null, syncedAt: null, error: null, ...over,
});
const zero = { total: 0, synced: 0, waiting: 0, retrying: 0, gaveUp: 0 };
const report = (over: Partial<CrmSyncReport> = {}): CrmSyncReport => ({
  sync: 'on', fields: [], pipeline: false, stages: [], counts: { waitlist: zero, order: zero, login: zero, skill: zero }, problems: [], recent: [], ...over,
});

describe('CrmSync.vm (D-134)', () => {
  it('says whether the sync is on, paused or off, in words that name the Railway variable', () => {
    expect(crmView(report()).status).toBe(COPY.status.on);
    expect(crmView(report({ sync: 'paused' })).status).toContain('GHL_SYNC_ENABLED');
    expect(crmView(report({ sync: 'off' })).status).toContain('GHL_TOKEN and GHL_LOCATION_ID');
  });

  it('names the fields and stages that are set, and says when none are', () => {
    expect(crmView(report())).toMatchObject({ fields: 'None set', pipeline: 'Not set' });
    expect(crmView(report({ fields: ['offer', 'lmsLogin'], pipeline: true, stages: ['lead', 'purchased'] }))).toMatchObject({
      fields: 'AI Offer, LMS Login',
      pipeline: 'Lead, Purchased',
    });
  });

  it('counts each kind in its own row, in a fixed order', () => {
    const v = crmView(report({ counts: { waitlist: { ...zero, total: 1200, synced: 1190, waiting: 10 }, order: zero, login: zero, skill: zero } }));
    expect(v.counts.map((c) => c.label)).toEqual(['Sign-Ups', 'Buyers', 'First Sign-Ins', 'Skill Purchases']);
    expect(v.counts[0]).toMatchObject({ total: '1,200', synced: '1,190', waiting: '10' });
  });

  it('turns an error code into words, and offers Retry only for a row that gave up', () => {
    expect(reasonOf('fields:rejected:422')).toBe('Custom field: GHL refused it (422)');
    expect(reasonOf('opportunity:unauthorized:403')).toBe('Pipeline: the token was refused (403)');
    expect(reasonOf('upsert:timeout')).toBe('Contact: timed out');
    expect(reasonOf(null)).toBe('');
    const v = crmView(report({ problems: [row({ state: 'gave-up', attempts: 8, error: 'upsert:rejected:400' }), row({ id: 'o-2', state: 'retrying', error: 'tags:server:503' })] }));
    expect(v.problems.map((r) => [r.state, r.canRetry, r.tone])).toEqual([
      ['Gave Up', true, 'attention'],
      ['Retrying', false, 'progress'],
    ]);
    expect(v.problems[0]!.last).toBe('Never');
  });
});
