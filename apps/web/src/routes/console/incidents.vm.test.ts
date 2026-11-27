// Incidents and Incident on R2 (D-167): the mockup's words from the API's shapes, its tones (a word
// with a dot, never a colour alone), who may Acknowledge and Resolve (D3), and the parity fixture's
// records printing exactly the mockup's rows, facts, timeline and links.
import { describe, expect, it } from 'vitest';
import type { IncidentDetail } from '@ai/core';
import { fixtureIncidentChange, fixtureIncidents, rowOf } from '../../data/console-fixture-incidents';
import { STATUS_OPTIONS, incidentFiltersFor, incidentRowVM, incidentStatusOf, incidentVM, severityOf } from './incidents.vm';

const [i7, i6, i5] = fixtureIncidents() as [IncidentDetail, IncidentDetail, IncidentDetail];

describe('the list (the mockup’s Incidents)', () => {
  it('prints the mockup’s three rows', () => {
    expect(fixtureIncidents().map((i) => incidentRowVM(rowOf(i))).map((r) => [r.title, r.id, r.severity.label, r.status.label, r.owner, r.opened])).toEqual([
      ['GHL order sync failing with 401', 'INC-0007', 'Sev 2', 'Open', 'Imani Brooks', 'Dec 9, 9:14 PM'],
      ['Stripe subscription.updated handler timeout', 'INC-0006', 'Sev 3', 'Acknowledged', 'Avery Stone', 'Dec 8, 7:31 PM'],
      ['Weekly digest bounces above 2%', 'INC-0005', 'Sev 3', 'Resolved', 'Connor Leiva', 'Dec 7, 7:12 AM'],
    ]);
  });

  it('filters by the mockup’s four options', () => {
    expect(STATUS_OPTIONS.map((o) => o.label)).toEqual(['Any status', 'Open', 'Acknowledged', 'Resolved']);
    expect(STATUS_OPTIONS.map((o) => incidentFiltersFor(o.value))).toEqual([{}, { status: 'open' }, { status: 'acknowledged' }, { status: 'resolved' }]);
  });

  it('gives every status and severity a word and a tone', () => {
    expect(['open', 'acknowledged', 'resolved'].map((s) => incidentStatusOf(s as 'open'))).toEqual([
      { label: 'Open', tone: 'bad' },
      { label: 'Acknowledged', tone: 'info' },
      { label: 'Resolved', tone: 'ok' },
    ]);
    expect(['sev1', 'sev2', 'sev3'].map((s) => severityOf(s as 'sev1'))).toEqual([
      { label: 'Sev 1', tone: 'bad' },
      { label: 'Sev 2', tone: 'bad' },
      { label: 'Sev 3', tone: 'warn' },
    ]);
  });

  it('shows "—" for an incident nobody has yet (the rules’ own, unacknowledged)', () => {
    expect(incidentRowVM({ ...rowOf(i7), owner: null }).owner).toBe('—');
  });
});

describe('one incident (the mockup’s Incident, INC-0007)', () => {
  it('prints its facts, timeline and links', () => {
    const vm = incidentVM(i7, 'Owner');
    expect(vm.facts).toEqual({ id: 'INC-0007', severity: 'Sev 2', owner: 'Imani Brooks', opened: 'Dec 9, 9:14 PM MT' });
    expect(vm.timeline.map((t) => [t.when, t.text])).toEqual([
      ['Dec 9, 9:14 PM', 'Opened automatically after 3 failed runs of ghl-orders.'],
      ['Dec 9, 9:20 PM', 'Imani Brooks confirmed orders are saved locally. Only the GHL copy is behind.'],
      ['Dec 9, 10:42 PM', 'Deploy a3f91c2 went live. No change in error rate.'],
    ]);
    expect(vm.linked.map((l) => [l.icon, l.label, l.to])).toEqual([
      ['r2Jobs', 'Job ghl-orders', '/admin/jobs?job=ghl-orders'],
      ['r2Api', '3 webhook deliveries', '/admin/api/hooks?n=3'],
    ]);
    expect(incidentVM(i6, 'Owner').timeline.map((t) => t.text)).toEqual(['Opened after a delivery used all 5 attempts.', 'Acknowledged by Avery Stone.']);
    expect(incidentVM(i5, 'Owner').linked.map((l) => l.label)).toEqual(['Email log, weekly-digest']);
  });

  it('offers Acknowledge while open and Resolve until resolved; Resolve never to Support (D3)', () => {
    expect([incidentVM(i7, 'Owner').canAck, incidentVM(i7, 'Owner').canResolve]).toEqual([true, true]);
    expect([incidentVM(i7, 'Support').canAck, incidentVM(i7, 'Support').canResolve]).toEqual([true, false]);
    expect([incidentVM(i6, 'Admin').canAck, incidentVM(i6, 'Admin').canResolve]).toEqual([false, true]);
    expect([incidentVM(i5, 'Owner').canAck, incidentVM(i5, 'Owner').canResolve]).toEqual([false, false]);
  });

  it('acknowledges, resolves and notes as the API would, in the mockup’s words', () => {
    const me = { id: 'st_connor', name: 'Connor Leiva' };
    const acked = fixtureIncidentChange(i7, { kind: 'acknowledged' }, me, i7.openedAt + 1);
    expect(incidentVM(acked, 'Owner').timeline.at(-1)!.text).toBe('Acknowledged by Connor Leiva.');
    expect(acked.owner).toEqual(me);
    expect(() => fixtureIncidentChange(acked, { kind: 'acknowledged' }, me, 0)).toThrow();
    const noted = fixtureIncidentChange(acked, { kind: 'note', body: 'Token rotated.' }, me, i7.openedAt + 2);
    expect(incidentVM(noted, 'Owner').timeline.at(-1)!.text).toBe('Connor Leiva: Token rotated.');
    const done = fixtureIncidentChange(noted, { kind: 'resolved', body: 'Green again.' }, me, i7.openedAt + 3);
    expect(incidentVM(done, 'Owner')).toMatchObject({ status: { label: 'Resolved' }, canAck: false, canResolve: false });
  });
});
