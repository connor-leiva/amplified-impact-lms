// The Console fixture's System Health and Skills (D-169): the R2 mockup's `Health()`, in the API's
// shapes (`@ai/core` console-health.ts), so the Health screen's view-model prints the mockup's words
// from what the API would answer. FIXTURE ONLY: only `console-fixture.ts` imports this, and
// `console.ts` loads that behind `VITE_DATA_SOURCE` (`console-build.test.ts` proves the http build has
// none of it).
//
// The tiles go through `composeHealth`, the API's own rule, from the mockup's figures. Needs attention
// is the mockup's four rows as drawn (the rule would also list GHL's three gave-up rows and Red Cliff's
// 46 of 50 seats, which the mockup leaves out). `?console-state=empty` is the mockup's `ds === 'empty'`:
// nothing failed, nothing open, "All systems normal".

import { composeHealth } from '@ai/core';
import { FREE_SKILLS, LAUNCH_RELEASE, SKILL_CATALOG } from '@ai/core/skills';
import type { ConsoleSkillRow, HealthAttention, HealthResponse } from '@ai/core';
import type { HealthSample } from './console';
import { fixtureWorkspaceRows } from './console-fixture-records';
import type { FixtureRecords } from './console-fixture-records';
import { BILLING_SAMPLE, mockCents, mockStamp } from './parity-r2';
import {
  HEALTH_DEPLOYS,
  HEALTH_FAILED_JOB,
  HEALTH_FAILED_PAYMENTS,
  HEALTH_INCIDENT,
  HEALTH_JOBS,
  HEALTH_PAYMENT,
  HEALTH_SAMPLE,
  HEALTH_SEATS,
  HEALTH_TILES,
  HEALTH_WEBHOOK,
  HEALTH_WEBHOOKS,
} from './parity-r2-health';

const ok = <T>(value: T) => ({ ok: true as const, value });

/** The mockup's four rows. */
function attention(): HealthAttention[] {
  return [
    { kind: 'incident', id: HEALTH_INCIDENT.id, title: HEALTH_INCIDENT.title, severity: HEALTH_INCIDENT.severity, openedAt: mockStamp(HEALTH_INCIDENT.opened) },
    {
      kind: 'payment',
      invoiceId: 'in_1QxT6dTw0288',
      customer: HEALTH_PAYMENT.customer,
      teamId: 'ws_tidewater',
      plan: HEALTH_PAYMENT.plan,
      amountCents: mockCents(HEALTH_PAYMENT.amount),
      attempts: HEALTH_PAYMENT.attempts,
      retriesLeft: HEALTH_PAYMENT.retriesLeft,
    },
    { kind: 'webhook', eventId: 'evt_1QxT9sSubUpd', eventType: HEALTH_WEBHOOK.type, receivedAt: mockStamp('Dec 8, 7:31 PM'), error: HEALTH_WEBHOOK.error, attempts: HEALTH_WEBHOOK.attempts },
    { kind: 'seats', teamId: HEALTH_SEATS.teamId, name: HEALTH_SEATS.name, plan: 'agents', used: HEALTH_SEATS.used, cap: HEALTH_SEATS.cap },
  ];
}

export function fixtureHealth(records: FixtureRecords, now: number, empty: boolean): HealthResponse {
  const r = composeHealth(
    {
      browsers: ok(HEALTH_TILES.browsers),
      signIns: ok({ ...HEALTH_TILES.signIns }),
      billing: ok({ failedPayments: empty ? 0 : HEALTH_FAILED_PAYMENTS, mrrCents: mockCents(BILLING_SAMPLE.mrr), activeSubscriptions: BILLING_SAMPLE.subscriptions, failed: [] }),
      stripeWebhooks: ok({ total: empty ? 0 : HEALTH_WEBHOOKS.stripe, rows: [] }),
      ghl: ok({ gaveUp: empty ? 0 : HEALTH_WEBHOOKS.ghl, retrying: 0 }),
      jobs: ok({
        jobs: Array.from({ length: HEALTH_JOBS }, (_, n) => (n === 0 ? HEALTH_FAILED_JOB : `job-${n}`)),
        failures: empty ? [] : [{ job: HEALTH_FAILED_JOB, failures: 3, lastAt: mockStamp('Dec 10, 8:58 AM'), error: 'http_401' }],
      }),
      incidents: ok(
        empty
          ? []
          : [{ id: HEALTH_INCIDENT.id, title: HEALTH_INCIDENT.title, severity: HEALTH_INCIDENT.severity, status: 'open' as const, openedAt: mockStamp(HEALTH_INCIDENT.opened), fingerprint: `job:${HEALTH_FAILED_JOB}` }],
      ),
      seats: ok({ sold: 11, cap: 15 }),
      workspaces: ok(fixtureWorkspaceRows(records, {})),
      deploys: ok({
        state: 'ok',
        rows: HEALTH_DEPLOYS.map((d) => ({ sha: d.sha, message: d.m, author: d.a, at: mockStamp(d.t), status: d.st })),
      }),
    },
    now,
  );
  return { ...r, attention: empty ? [] : attention() };
}

/** What the mockup draws in production's place; its empty state's GoHighLevel reads Connected. */
export function fixtureHealthSample(empty: boolean): HealthSample {
  return {
    tiles: HEALTH_SAMPLE.tiles,
    services: HEALTH_SAMPLE.services.map(([name, st]) => [name, empty && name in HEALTH_SAMPLE.servicesEmpty ? HEALTH_SAMPLE.servicesEmpty.GoHighLevel : st] as const),
    deploys: HEALTH_SAMPLE.deploys,
  };
}

/** The Build hub's Skills list: the skill library's own catalog (`@ai/core/skills`), as `skills` rows. */
export function fixtureSkills(): ConsoleSkillRow[] {
  return SKILL_CATALOG.map((s) => ({ id: s.id, title: s.title, sets: s.sets, free: FREE_SKILLS.includes(s.id), status: 'published' as const, releasedAt: LAUNCH_RELEASE })).sort(
    (a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()) || (a.id < b.id ? -1 : 1),
  );
}
