// /admin/health's view-model (D-169): production prints spec § 7.1's tiles and Seat pressure in the
// mockup's words; the fixture's sample turns it into the mockup's own frame; each tile and card has its
// unavailable, empty and attention words.
import { describe, expect, it } from 'vitest';
import { composeHealth } from '@ai/core';
import type { HealthInputs, HealthResponse } from '@ai/core';
import { HEALTH_SAMPLE } from '../../data/parity-r2-health';
import { attentionVM, healthVM } from './health.vm';

const NOW = Date.parse('2026-12-10T16:30:00Z');
const ok = <T>(value: T) => ({ ok: true as const, value });

const inputs = (over: Partial<HealthInputs> = {}): HealthInputs => ({
  browsers: ok(37),
  signIns: ok({ attempts: 500, ok: 493 }),
  billing: ok({ failedPayments: 3, mrrCents: 1851600, activeSubscriptions: 77, failed: [] }),
  stripeWebhooks: ok({ total: 1, rows: [] }),
  ghl: ok({ gaveUp: 3, retrying: 0 }),
  jobs: ok({ jobs: Array.from({ length: 12 }, (_, n) => `job-${n}`), failures: [{ job: 'ghl-orders', failures: 3, lastAt: NOW - 3600_000, error: 'http_401' }] }),
  incidents: ok([{ id: 'INC-0007', title: 'GHL order sync failing with 401', severity: 'sev2', status: 'open', openedAt: NOW - 4e7, fingerprint: 'job:ghl-orders' }]),
  seats: ok({ sold: 11, cap: 15 }),
  workspaces: ok([
    { teamId: 'ws_h', name: 'Hale & Marlowe Realty', planKind: 'agents', planStatus: 'active', seatsUsed: 15, seatCap: 16 },
    { teamId: 'ws_c', name: 'Copper Basin Realty', planKind: 'cohort', planStatus: 'active', seatsUsed: 2, seatCap: 2 },
  ]),
  deploys: ok({ state: 'ok', rows: [{ sha: 'a3f91c2aaaa', message: 'Scope 16px floor', author: 'Connor Leiva', at: Date.parse('2026-12-10T05:42:00Z'), status: 'live' }] }),
  ...over,
});
const health = (over?: Partial<HealthInputs>): HealthResponse => composeHealth(inputs(over), NOW);
const sample = { tiles: HEALTH_SAMPLE.tiles, services: HEALTH_SAMPLE.services, deploys: 1 };

describe('healthVM (D-169)', () => {
  it('production: spec § 7.1’s eight tiles, in the mockup’s words where it has them', () => {
    const vm = healthVM(health());
    expect(vm.pill).toEqual({ label: '1 open incident', tone: 'bad' });
    expect(vm.tiles.map((t) => [t.label, t.value, t.sub, t.tone, t.to])).toEqual([
      ['Connected browsers', '37', 'on this server', null, '/admin/revenue/usage'],
      ['Sign-in success', '98.6%', 'Healthy · 24h', 'ok', '/admin/revenue/usage'],
      ['Failed payments', '3', 'Needs review', 'bad', '/admin/revenue/payments/failed'],
      ['Failed webhooks', '4', '3 GHL, 1 Stripe', 'bad', '/admin/api/hooks'],
      ['Job failures, 24h', '1', 'ghl-orders', 'bad', '/admin/jobs'],
      ['Open incidents', '1', 'Sev 2 · INC-0007', 'bad', '/admin/incidents'],
      ['MRR', '$18,516', '77 active subscriptions', null, '/admin/revenue'],
      ['Accelerator seats', '11 / 15', '4 left', null, '/admin/revenue'],
    ]);
    // Seat pressure (never red: a full fixed-seat plan is grey), then the deploys.
    expect(vm.side.map((c) => [c.kind, c.title])).toEqual([
      ['seats', 'Seat pressure'],
      ['deploys', 'Latest deploy'],
    ]);
    const seats = vm.side[0]!;
    expect(seats.kind === 'seats' && seats.rows!.map((r) => [r.name, r.text, r.bar, r.to])).toEqual([
      ['Copper Basin Realty', '2 / 2', 'full', '/admin/people/teams/ws_c'],
      ['Hale & Marlowe Realty', '15 / 16', 'hot', '/admin/people/teams/ws_h'],
      ['AI Accelerator', '11 / 15', 'ok', '/admin/revenue'],
    ]);
    expect(vm.side[1]).toEqual({
      kind: 'deploys',
      title: 'Latest deploy',
      link: { label: 'All deploys', to: '/admin/deploys' },
      state: 'ok',
      rows: [{ sha: 'a3f91c2', status: { label: 'Live', tone: 'ok' }, message: 'Scope 16px floor', byline: 'Connor Leiva · Dec 9, 10:42 PM' }],
    });
    // No production words from the mockup's own tiles.
    expect(JSON.stringify(vm)).not.toMatch(/Live sessions|p95 latency|DB connections|Services/);
  });

  it('the fixture’s sample draws the mockup’s frame: Live sessions, p95 latency, DB connections, Services', () => {
    const vm = healthVM(health(), sample);
    expect(vm.tiles.map((t) => [t.label, t.value, t.sub])).toEqual([
      ['Live sessions', '37', 'on /api/events'],
      ['Sign-in success', '98.6%', 'Healthy · 24h'],
      ['Failed payments', '3', 'Needs review'],
      ['Failed webhooks', '4', '3 GHL, 1 Stripe'],
      ['Job failures, 24h', '1', 'ghl-orders'],
      ['Open incidents', '1', 'Sev 2 · INC-0007'],
      ['p95 latency', '212 ms', 'Healthy'],
      ['DB connections', '14 / 100', 'Healthy'],
    ]);
    expect(vm.side.map((c) => c.title)).toEqual(['Services', 'Latest deploy']);
  });

  it('the mockup’s empty state: "All systems normal", None, 12 of 12 succeeded, nothing to look at', () => {
    const vm = healthVM(
      health({
        billing: ok({ failedPayments: 0, mrrCents: 0, activeSubscriptions: 1, failed: [] }),
        stripeWebhooks: ok({ total: 0, rows: [] }),
        ghl: ok({ gaveUp: 0, retrying: 0 }),
        jobs: ok({ jobs: Array.from({ length: 12 }, (_, n) => `job-${n}`), failures: [] }),
        incidents: ok([]),
        workspaces: ok([]),
      }),
    );
    expect(vm.pill).toEqual({ label: 'All systems normal', tone: 'ok' });
    expect(vm.tiles.slice(2, 6).map((t) => [t.value, t.sub, t.tone])).toEqual([
      ['0', 'None', 'ok'],
      ['0', 'None', 'ok'],
      ['0', '12 of 12 succeeded', 'ok'],
      ['0', 'None', 'ok'],
    ]);
    expect(vm.attention).toEqual([]);
    expect(vm.tiles[6]!.sub).toBe('1 active subscription');
  });

  it('a tile that can’t be read says why, and the head says some checks are unavailable', () => {
    const vm = healthVM(
      health({
        billing: { ok: false, reason: 'stripe_not_connected' },
        signIns: { ok: false, reason: 'not_configured' },
        stripeWebhooks: { ok: false, reason: 'failed' },
        ghl: ok({ gaveUp: 0, retrying: 0 }),
        jobs: ok({ jobs: [], failures: [] }),
        incidents: ok([]),
        workspaces: { ok: false, reason: 'failed' },
      }),
    );
    expect(vm.pill).toEqual({ label: 'Some checks unavailable', tone: 'neutral' });
    const t = Object.fromEntries(vm.tiles.map((x) => [x.key, [x.value, x.sub]]));
    expect(t.failedPayments).toEqual(['—', 'Stripe isn’t connected']);
    expect(t.mrr).toEqual(['—', 'Stripe isn’t connected']);
    expect(t.signInSuccess).toEqual(['—', 'Not configured']);
    expect(t.failedWebhooks).toEqual(['—', 'Unavailable']);
    expect(t.jobFailures).toEqual(['0', 'No runs · 24h']);
    expect(vm.side[0]).toMatchObject({ kind: 'seats', rows: null });
  });

  it('sign-ins: none over the day, and under the 95% floor', () => {
    expect(healthVM(health({ signIns: ok({ attempts: 0, ok: 0 }) })).tiles[1]).toMatchObject({ value: '—', sub: 'No sign-ins · 24h', tone: null });
    expect(healthVM(health({ signIns: ok({ attempts: 40, ok: 30 }) })).tiles[1]).toMatchObject({ value: '75.0%', sub: 'Below 95% · 24h', tone: 'bad' });
  });

  it('deploys: three are "Recent deploys"; not configured says so; a role without ops.read has no card', () => {
    const rows = ['a1', 'b2', 'c3'].map((sha) => ({ sha: `${sha}00000`, message: sha, author: null, at: NOW, status: null }));
    const three = healthVM(health({ deploys: ok({ state: 'ok', rows }) })).side[1]!;
    expect(three).toMatchObject({ title: 'Recent deploys', state: 'ok' });
    expect(three.kind === 'deploys' && three.rows.map((r) => [r.sha, r.status, r.byline])).toEqual([
      ['a100000', null, 'Dec 10, 9:30 AM'],
      ['b200000', null, 'Dec 10, 9:30 AM'],
      ['c300000', null, 'Dec 10, 9:30 AM'],
    ]);
    expect(healthVM(health({ deploys: ok({ state: 'not_configured', live: 'abc1234def' }) })).side[1]).toMatchObject({
      title: 'Recent deploys',
      state: 'not_configured',
      rows: [{ sha: 'abc1234', status: { label: 'Live', tone: 'ok' } }],
    });
    expect(healthVM(health({ deploys: null })).side.map((c) => c.kind)).toEqual(['seats']);
  });
});

describe('attentionVM (D-169)', () => {
  it('words each kind as the mockup does, and links it to its screen', () => {
    const at = Date.parse('2026-12-10T04:14:00Z'); // Dec 9, 9:14 PM MST
    expect(attentionVM({ kind: 'incident', id: 'INC-0007', title: 'GHL order sync failing with 401', severity: 'sev2', openedAt: at })).toEqual({
      key: 'i:INC-0007',
      title: 'GHL order sync failing with 401',
      meta: 'Open since Dec 9, 9:14 PM',
      pill: { label: 'Sev 2', tone: 'bad' },
      to: '/admin/incidents/INC-0007',
    });
    expect(
      attentionVM({ kind: 'payment', invoiceId: 'in_1', customer: 'Tidewater Property Co.', teamId: 'ws_t', plan: 'Insiders', amountCents: 9700, attempts: 2, retriesLeft: 2 }),
    ).toMatchObject({ title: 'Tidewater Property Co. is past due', meta: 'Insiders · $97.00 · 2 retries left', pill: { label: 'Past due', tone: 'bad' } });
    // Production never knows the retries left: it says how many attempts failed.
    expect(attentionVM({ kind: 'payment', invoiceId: 'in_2', customer: null, teamId: null, plan: null, amountCents: 69500, attempts: 1, retriesLeft: null }).meta).toBe('$695.00 · 1 failed attempt');
    expect(attentionVM({ kind: 'webhook', eventId: 'evt_1', eventType: 'subscription.updated', receivedAt: at, error: 'Handler timeout after 10 s', attempts: 5 })).toMatchObject({
      title: 'Stripe subscription.updated used all 5 attempts',
      meta: 'Handler timeout after 10 s',
      pill: { label: 'Failed', tone: 'bad' },
      to: '/admin/api/hooks',
    });
    expect(attentionVM({ kind: 'webhook', eventId: 'evt_2', eventType: 'invoice.paid', receivedAt: at, error: null, attempts: null })).toMatchObject({
      title: 'Stripe invoice.paid failed',
      meta: 'Received Dec 9, 9:14 PM',
    });
    expect(attentionVM({ kind: 'ghl', gaveUp: 0, retrying: 2 })).toMatchObject({ title: '2 GHL syncs retrying', pill: { label: 'Retrying', tone: 'run' } });
    expect(attentionVM({ kind: 'job', job: 'session-24h', failures: 1, lastAt: at, error: 'timeout' })).toMatchObject({
      title: 'session-24h failed 1 time in 24h',
      meta: 'Last failed Dec 9, 9:14 PM · timeout',
      to: '/admin/jobs',
    });
    expect(attentionVM({ kind: 'seats', teamId: 'ws_halemarlowe', name: 'Hale & Marlowe Realty', plan: 'agents', used: 15, cap: 16 })).toEqual({
      key: 's:ws_halemarlowe',
      title: 'Hale & Marlowe Realty is at 15 of 16 seats',
      meta: 'Team Plan · 16 seats',
      pill: { label: 'Waiting', tone: 'warn' },
      to: '/admin/people/teams/ws_halemarlowe',
    });
  });
});
