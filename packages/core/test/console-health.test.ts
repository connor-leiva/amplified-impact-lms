// System Health's rules (D-169, spec § 7.1): each tile degrades on its own, the attention list's order
// and cap, seat pressure (top five, fixed-seat plans that are simply full never count as pressure), and
// the head's one status.
import { describe, expect, it } from 'vitest';
import {
  HEALTH_ATTENTION_MAX,
  HEALTH_TILE_KEYS,
  attentionItems,
  composeHealth,
  healthHeadline,
  seatsNeedLook,
  successPct,
  topSeatPressure,
} from '../src';
import type { HealthInputs, HealthResponse, HealthWorkspace, Settled } from '../src';

const NOW = Date.parse('2026-12-10T16:30:00Z');
const ok = <T>(value: T): Settled<T> => ({ ok: true, value });
const fail = { ok: false, reason: 'failed' } as const;

const ws = (teamId: string, name: string, used: number, cap: number, planKind: HealthWorkspace['planKind'] = 'agents', planStatus: HealthWorkspace['planStatus'] = 'active'): HealthWorkspace => ({
  teamId,
  name,
  planKind,
  planStatus,
  seatsUsed: used,
  seatCap: cap,
});

/** Everything healthy: nothing failed, nothing open, nobody near a cap. */
const calm = (): HealthInputs => ({
  browsers: ok(37),
  signIns: ok({ attempts: 500, ok: 493 }),
  billing: ok({ failedPayments: 0, mrrCents: 1851600, activeSubscriptions: 77, failed: [] }),
  stripeWebhooks: ok({ total: 0, rows: [] }),
  ghl: ok({ gaveUp: 0, retrying: 0 }),
  jobs: ok({ jobs: ['session-24h', 'ghl-orders'], failures: [] }),
  incidents: ok([]),
  seats: ok({ sold: 11, cap: 15 }),
  workspaces: ok([ws('ws_a', 'Northshore Group', 33, 41)]),
  deploys: ok({ state: 'ok', rows: [] }),
});

describe('composeHealth (D-169)', () => {
  it('answers every tile, and everything calm reads "All systems normal"', () => {
    const r = composeHealth(calm(), NOW);
    expect(Object.keys(r.tiles)).toEqual([...HEALTH_TILE_KEYS]);
    expect(r.asOf).toBe(NOW);
    expect(r.tiles.connectedBrowsers).toEqual({ value: 37, status: 'ok' });
    expect(r.tiles.signInSuccess).toEqual({ value: 98.6, status: 'ok', detail: { attempts: 500 } });
    expect(r.tiles.mrr).toEqual({ value: 1851600, status: 'ok', detail: { activeSubscriptions: 77 } });
    expect(r.tiles.acceleratorSeats).toEqual({ value: 11, status: 'ok', detail: { cap: 15 } });
    expect(r.tiles.jobFailures).toEqual({ value: 0, status: 'ok', detail: { failedJobs: [], jobs: 2 } });
    expect(r.attention).toEqual([]);
    expect(healthHeadline(r)).toEqual({ kind: 'normal' });
  });

  it('a failing source makes only its own tile unavailable, never the answer', () => {
    for (const key of ['browsers', 'signIns', 'billing', 'stripeWebhooks', 'ghl', 'jobs', 'incidents', 'seats'] as const) {
      const r = composeHealth({ ...calm(), [key]: fail }, NOW);
      const off = HEALTH_TILE_KEYS.filter((k) => r.tiles[k].status === 'unavailable');
      const want = {
        browsers: ['connectedBrowsers'],
        signIns: ['signInSuccess'],
        billing: ['failedPayments', 'mrr'],
        stripeWebhooks: ['failedWebhooks'],
        ghl: ['failedWebhooks'],
        jobs: ['jobFailures'],
        incidents: ['openIncidents'],
        seats: ['acceleratorSeats'],
      }[key];
      expect(off, key).toEqual(want);
      for (const k of off) expect(r.tiles[k], `${key} ${k}`).toEqual({ value: null, status: 'unavailable', reason: 'failed' });
      expect(healthHeadline(r), key).toEqual({ kind: 'unavailable' });
    }
  });

  it('Stripe’s refusals carry their reason to the tile', () => {
    const r = composeHealth({ ...calm(), billing: { ok: false, reason: 'stripe_not_connected' } }, NOW);
    expect(r.tiles.mrr).toEqual({ value: null, status: 'unavailable', reason: 'stripe_not_connected' });
    expect(r.tiles.acceleratorSeats.status).toBe('ok'); // D-154's counter is local
  });

  it('sign-in success: rounds down, needs a look under 95% from 20 sign-ins, and has no figure with none', () => {
    expect(successPct(9996, 10000)).toBe(99.9);
    expect(composeHealth({ ...calm(), signIns: ok({ attempts: 20, ok: 18 }) }, NOW).tiles.signInSuccess).toEqual({ value: 90, status: 'attention', detail: { attempts: 20 } });
    expect(composeHealth({ ...calm(), signIns: ok({ attempts: 19, ok: 10 }) }, NOW).tiles.signInSuccess.status).toBe('ok');
    expect(composeHealth({ ...calm(), signIns: ok({ attempts: 0, ok: 0 }) }, NOW).tiles.signInSuccess).toEqual({ value: null, status: 'ok', detail: { attempts: 0 } });
  });

  it('failed webhooks are Stripe’s errored events plus GHL’s gave-up and retrying rows', () => {
    const r = composeHealth(
      {
        ...calm(),
        stripeWebhooks: ok({ total: 1, rows: [{ kind: 'webhook', eventId: 'evt_1', eventType: 'customer.subscription.updated', receivedAt: NOW - 60_000, error: 'handler_timeout', attempts: null }] }),
        ghl: ok({ gaveUp: 2, retrying: 1 }),
      },
      NOW,
    );
    expect(r.tiles.failedWebhooks).toEqual({ value: 4, status: 'attention', detail: { stripe: 1, ghl: 3 } });
    expect(r.attention.map((a) => a.kind)).toEqual(['webhook', 'ghl']);
    expect(healthHeadline(r)).toEqual({ kind: 'attention' });
  });

  it('open incidents count the open ones (not acknowledged), worst first, and lead the attention list', () => {
    const r = composeHealth(
      {
        ...calm(),
        incidents: ok([
          { id: 'INC-0006', title: 'Stripe handler timeout', severity: 'sev3', status: 'acknowledged', openedAt: NOW - 9e7, fingerprint: null },
          { id: 'INC-0008', title: 'Digest bounces', severity: 'sev3', status: 'open', openedAt: NOW - 1e6, fingerprint: null },
          { id: 'INC-0007', title: 'GHL order sync failing with 401', severity: 'sev2', status: 'open', openedAt: NOW - 4e7, fingerprint: 'job:ghl-orders' },
        ]),
        jobs: ok({ jobs: ['ghl-orders', 'session-24h'], failures: [{ job: 'ghl-orders', failures: 3, lastAt: NOW - 1e6, error: '401' }, { job: 'session-24h', failures: 1, lastAt: NOW - 2e6, error: 'timeout' }] }),
      },
      NOW,
    );
    expect(r.tiles.openIncidents).toEqual({ value: 2, status: 'attention', detail: { top: { id: 'INC-0007', severity: 'sev2' } } });
    expect(r.tiles.jobFailures.detail).toEqual({ failedJobs: ['ghl-orders', 'session-24h'], jobs: 2 });
    // INC-0007 already covers ghl-orders, so only session-24h is listed as a job.
    expect(r.attention.map((a) => (a.kind === 'incident' ? a.id : a.kind === 'job' ? a.job : a.kind))).toEqual(['INC-0007', 'INC-0008', 'session-24h']);
    expect(healthHeadline(r)).toEqual({ kind: 'incidents', n: 2 });
  });

  it('caps Needs attention at six, in its order', () => {
    const failed = Array.from({ length: 4 }, (_, n) => ({ kind: 'payment' as const, invoiceId: `in_${n}`, customer: `C${n}`, teamId: null, plan: 'Insiders', amountCents: 9700, attempts: 1, retriesLeft: null }));
    const r = composeHealth(
      {
        ...calm(),
        incidents: ok([{ id: 'INC-1', title: 'x', severity: 'sev1', status: 'open', openedAt: NOW, fingerprint: null }]),
        billing: ok({ failedPayments: 4, mrrCents: 0, activeSubscriptions: 0, failed }),
        workspaces: ok([ws('ws_h', 'Hale & Marlowe Realty', 15, 16), ws('ws_r', 'Red Cliff Collective', 46, 50)]),
      },
      NOW,
    );
    expect(r.attention).toHaveLength(HEALTH_ATTENTION_MAX);
    expect(r.attention.map((a) => a.kind)).toEqual(['incident', 'payment', 'payment', 'payment', 'payment', 'seats']);
    expect(r.attention[5]).toMatchObject({ kind: 'seats', teamId: 'ws_h', used: 15, cap: 16 });
  });
});

describe('seat pressure (D-169, BUILD-SPEC § 7)', () => {
  it('lists the five fullest live caps, the AI Accelerator among them', () => {
    const r = composeHealth(
      {
        ...calm(),
        workspaces: ok([
          ws('a', 'Alpha', 3, 16),
          ws('b', 'Bravo', 15, 16),
          ws('c', 'Charlie', 46, 50),
          ws('d', 'Delta', 2, 2, 'cohort'),
          ws('e', 'Echo', 1, 1, 'membership', 'past_due'),
          ws('f', 'Foxtrot', 16, 16, 'agents', 'canceled'),
          ws('g', 'Golf', 6, 16, 'agents', 'trialing'),
        ]),
      },
      NOW,
    );
    expect(r.seatPressure!.map((s) => `${s.name} ${s.used}/${s.cap}`)).toEqual(['Delta 2/2', 'Echo 1/1', 'Bravo 15/16', 'Charlie 46/50', 'AI Accelerator 11/15']);
  });

  it('a fixed-seat plan that is full is not pressure; a nearly full one is', () => {
    expect(seatsNeedLook({ kind: 'cohort', used: 2, cap: 2 })).toBe(false);
    expect(seatsNeedLook({ kind: 'membership', used: 1, cap: 1 })).toBe(false);
    expect(seatsNeedLook({ kind: 'agents', used: 15, cap: 16 })).toBe(true);
    expect(seatsNeedLook({ kind: 'agents', used: 14, cap: 16 })).toBe(false);
    expect(attentionItems({ ...calm(), workspaces: ok([ws('d', 'Delta', 2, 2, 'cohort')]) })).toEqual([]);
  });

  it('is null when the workspaces could not be read', () => {
    expect(composeHealth({ ...calm(), workspaces: fail }, NOW).seatPressure).toBeNull();
    expect(topSeatPressure([], 5)).toEqual([]);
  });
});

describe('deploys (D-169)', () => {
  const row = (sha: string) => ({ sha, message: 'm', author: 'a', at: NOW, status: 'succeeded' as const });
  it('keeps the latest three, says "not configured" as it was told, and hides them from a role without ops.read', () => {
    const three: HealthResponse['deploys'] = composeHealth({ ...calm(), deploys: ok({ state: 'ok', rows: ['a', 'b', 'c', 'd'].map(row) }) }, NOW).deploys;
    expect(three).toEqual({ state: 'ok', rows: ['a', 'b', 'c'].map(row) });
    expect(composeHealth({ ...calm(), deploys: ok({ state: 'not_configured', live: 'a3f91c2' }) }, NOW).deploys).toEqual({ state: 'not_configured', live: 'a3f91c2' });
    expect(composeHealth({ ...calm(), deploys: fail }, NOW).deploys).toEqual({ state: 'unavailable' });
    expect(composeHealth({ ...calm(), deploys: null }, NOW).deploys).toBeNull();
  });
});
