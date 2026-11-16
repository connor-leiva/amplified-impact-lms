// Incidents, PR 8 (D-167, spec § 7.14, D5): the four auto-open rules at their thresholds, their
// fingerprints, the repeat-or-open plan, and the words the screens print.
import { describe, expect, it } from 'vitest';
import {
  INCIDENT_RULES,
  NO_SIGNALS,
  cleanIncidentNote,
  cleanIncidentTitle,
  failureStreak,
  incidentEventText,
  incidentIdOf,
  incidentLinked,
  incidentNumberOf,
  incidentOwner,
  observeIncidents,
  planIncidentWrites,
} from '../src/index';
import type { IncidentSignals, JobTickFact } from '../src/index';

const NOW = Date.parse('2026-12-10T16:30:00Z');
const MIN = 60_000;
const sig = (s: Partial<IncidentSignals>): IncidentSignals => ({ ...NO_SIGNALS, ...s });
const ticks = (job: string, statuses: ('succeeded' | 'failed')[]): JobTickFact[] =>
  statuses.map((status, i) => ({ job, status, finishedAt: NOW - (i + 1) * 5 * MIN }));

describe('ids and words (D-167)', () => {
  it('numbers incidents INC-0001 upward and reads them back', () => {
    expect(incidentIdOf(7)).toBe('INC-0007');
    expect(incidentIdOf(12345)).toBe('INC-12345');
    expect(incidentNumberOf('INC-0007')).toBe(7);
    for (const bad of ['INC-7', 'inc-0007', 'INC-0007x', 7, null]) expect(incidentNumberOf(bad)).toBeNull();
  });

  it('cleans a title (3 to 200 characters) and a note (1 to 2,000)', () => {
    expect(cleanIncidentTitle('  GHL   order sync failing ')).toBe('GHL order sync failing');
    expect(cleanIncidentTitle('ab')).toBeNull();
    expect(cleanIncidentTitle('x'.repeat(201))).toBeNull();
    expect(cleanIncidentNote(' ok ')).toBe('ok');
    expect(cleanIncidentNote('')).toBeNull();
    expect(cleanIncidentNote('x'.repeat(2001))).toBeNull();
  });

  it('prints each timeline line in the mockup’s words', () => {
    const imani = { id: 'st3', name: 'Imani Brooks' };
    expect(incidentEventText({ kind: 'opened', actor: null, body: 'Opened automatically after 3 failed runs of ghl-orders.' })).toBe(
      'Opened automatically after 3 failed runs of ghl-orders.',
    );
    expect(incidentEventText({ kind: 'opened', actor: { id: 'st1', name: 'Connor Leiva' }, body: null })).toBe('Opened by Connor Leiva.');
    expect(incidentEventText({ kind: 'acknowledged', actor: { id: 'st2', name: 'Avery Stone' }, body: null })).toBe('Acknowledged by Avery Stone.');
    expect(incidentEventText({ kind: 'resolved', actor: { id: 'st1', name: 'Connor Leiva' }, body: null })).toBe('Resolved by Connor Leiva.');
    expect(incidentEventText({ kind: 'resolved', actor: imani, body: 'Token rotated.' })).toBe('Resolved by Imani Brooks. Token rotated.');
    expect(incidentEventText({ kind: 'note', actor: imani, body: 'Orders are saved locally.' })).toBe('Imani Brooks: Orders are saved locally.');
    expect(incidentEventText({ kind: 'acknowledged', actor: { id: 'gone', name: null }, body: null })).toBe('Acknowledged by A staff member.');
  });

  it('names who has it: the acknowledger, else the resolver, else the opener', () => {
    const a = { id: 'a', name: 'A' };
    const b = { id: 'b', name: 'B' };
    expect(incidentOwner({ acknowledgedBy: a, resolvedBy: b, openedBy: null })).toBe(a);
    expect(incidentOwner({ acknowledgedBy: null, resolvedBy: b, openedBy: a })).toBe(b);
    expect(incidentOwner({ acknowledgedBy: null, resolvedBy: null, openedBy: a })).toBe(a);
    expect(incidentOwner({ acknowledgedBy: null, resolvedBy: null, openedBy: null })).toBeNull();
  });

  it('lists the Linked pages once each, with the latest count', () => {
    expect(
      incidentLinked([
        { link: '/admin/jobs?job=ghl-orders' },
        { link: null },
        { link: '/admin/api/webhooks?type=invoice.paid&n=1' },
        { link: '/admin/jobs?job=ghl-orders' },
        { link: '/admin/api/webhooks?type=invoice.paid&n=3' },
        { link: '/admin/api' },
        { link: 'https://elsewhere.example/' },
      ]),
    ).toEqual([
      { to: '/admin/jobs?job=ghl-orders', icon: 'jobs', label: 'Job ghl-orders' },
      { to: '/admin/api/webhooks?type=invoice.paid&n=3', icon: 'api', label: '3 webhook deliveries' },
      { to: '/admin/api', icon: 'api', label: 'API endpoints' },
    ]);
    expect(incidentLinked([{ link: '/admin/api/webhooks?source=ghl&n=1' }])[0]!.label).toBe('1 webhook delivery');
  });
});

describe('the auto-open rules at their thresholds (D5)', () => {
  it('has no rule fire on no signals', () => {
    expect(observeIncidents(NO_SIGNALS, NOW)).toEqual([]);
  });

  it('job: three failed ticks in a row is sev2; two, or a success in between, is nothing', () => {
    expect(failureStreak(ticks('ghl-orders', ['failed', 'failed', 'succeeded', 'failed']))).toEqual({ count: 2, latestAt: NOW - 5 * MIN });
    expect(observeIncidents(sig({ jobTicks: ticks('ghl-orders', ['failed', 'failed', 'succeeded', 'failed']) }), NOW)).toEqual([]);
    const [o, ...rest] = observeIncidents(sig({ jobTicks: [...ticks('ghl-orders', ['failed', 'failed', 'failed', 'failed']), ...ticks('digest', ['succeeded'])] }), NOW);
    expect(rest).toEqual([]);
    expect(o).toEqual({
      rule: 'job_failures',
      fingerprint: 'job:ghl-orders',
      severity: 'sev2',
      title: 'Job ghl-orders is failing',
      opened: 'Opened automatically after 3 failed runs of ghl-orders.',
      signal: 'ghl-orders failed again: 4 failed runs in a row.',
      link: '/admin/jobs?job=ghl-orders',
      evidenceAt: NOW - 5 * MIN,
    });
    expect(INCIDENT_RULES.jobFailedTicks).toBe(3);
  });

  it('stripe: an errored, unprocessed event more than 15 minutes old is sev2, by event type', () => {
    const at = (m: number) => NOW - m * MIN;
    const fresh = sig({ stripeErrors: [{ id: 'evt_1', type: 'invoice.paid', receivedAt: at(15) }] });
    expect(observeIncidents(fresh, NOW)).toEqual([]);
    const [o] = observeIncidents(
      sig({ stripeErrors: [{ id: 'evt_1', type: 'invoice.paid', receivedAt: at(16) }, { id: 'evt_2', type: 'invoice.paid', receivedAt: at(40) }] }),
      NOW,
    );
    expect(o).toMatchObject({
      rule: 'stripe_stuck',
      fingerprint: 'stripe:invoice.paid',
      severity: 'sev2',
      opened: 'Opened automatically after 2 invoice.paid deliveries errored and stayed unprocessed for over 15 minutes.',
      link: '/admin/api/webhooks?type=invoice.paid&n=2',
      evidenceAt: at(16) + 15 * MIN,
    });
  });

  it('ghl: more than five rows gave up is sev3; five is nothing', () => {
    expect(observeIncidents(sig({ ghl: { count: 5, latestAt: NOW - MIN } }), NOW)).toEqual([]);
    expect(observeIncidents(sig({ ghl: { count: 6, latestAt: NOW - MIN } }), NOW)).toEqual([
      expect.objectContaining({ fingerprint: 'ghl:gave_up', severity: 'sev3', opened: 'Opened automatically after 6 GHL rows gave up.', evidenceAt: NOW - MIN }),
    ]);
  });

  it('api: 5xx above 5% of at least 50 requests over 10 minutes is sev1', () => {
    expect(observeIncidents(sig({ api: { requests: 49, errors5xx: 49 } }), NOW)).toEqual([]);
    expect(observeIncidents(sig({ api: { requests: 100, errors5xx: 5 } }), NOW)).toEqual([]);
    expect(observeIncidents(sig({ api: { requests: 100, errors5xx: 6 } }), NOW)).toEqual([
      expect.objectContaining({
        fingerprint: 'api:5xx',
        severity: 'sev1',
        opened: 'Opened automatically: 6.0% of 100 API requests answered 5xx over 10 minutes.',
        evidenceAt: NOW - 10 * MIN,
      }),
    ]);
  });
});

describe('open, repeat, or nothing (D5: deduped by fingerprint)', () => {
  const [job] = observeIncidents(sig({ jobTicks: ticks('ghl-orders', ['failed', 'failed', 'failed']) }), NOW);

  it('opens a fingerprint with nothing unresolved', () => {
    expect(planIncidentWrites([job!], { unresolved: [], lastResolvedAt: {} })).toEqual([{ kind: 'open', observation: job }]);
  });

  it('repeats on an unresolved one only with newer evidence', () => {
    const live = { id: 'INC-0001', fingerprint: 'job:ghl-orders' };
    expect(planIncidentWrites([job!], { unresolved: [{ ...live, lastSystemAt: job!.evidenceAt - 1 }], lastResolvedAt: {} })).toEqual([
      { kind: 'signal', incidentId: 'INC-0001', observation: job },
    ]);
    expect(planIncidentWrites([job!], { unresolved: [{ ...live, lastSystemAt: job!.evidenceAt }], lastResolvedAt: {} })).toEqual([]);
  });

  it('never reopens on evidence older than the last resolution', () => {
    expect(planIncidentWrites([job!], { unresolved: [], lastResolvedAt: { 'job:ghl-orders': job!.evidenceAt } })).toEqual([]);
    expect(planIncidentWrites([job!], { unresolved: [], lastResolvedAt: { 'job:ghl-orders': job!.evidenceAt - 1 } })).toHaveLength(1);
  });
});
