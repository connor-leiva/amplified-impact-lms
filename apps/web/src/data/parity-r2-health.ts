// The R2 parity fixture's System Health (D-169): the mockup's `Health()` (AdminRedesign.jsx), its
// default and its `ds === 'empty'` states, verbatim. FIXTURE ONLY, like `parity-r2.ts` beside it: only
// `console-fixture-health.ts` imports this, and the http build never contains it.
//
// The mockup draws three things production doesn't (spec § 7.1 names other tiles and cards): "Live
// sessions · on /api/events" where production says "Connected browsers · On this server"; "p95
// latency" and "DB connections" where production has MRR and Accelerator seats; and a "Services" card
// where production has "Seat pressure". They are `HEALTH_SAMPLE`, which only the fixture's
// `healthSample()` hands the screen; everything else the screen prints from API-shaped data.

/** The tiles both share, as the mockup prints them: 37 browsers, 98.6% of sign-ins. */
export const HEALTH_TILES = { browsers: 37, signIns: { attempts: 500, ok: 493 } } as const;

/** Failed webhooks' "3 GHL, 1 Stripe"; Job failures' "ghl-orders", and "12 of 12 succeeded" when empty. */
export const HEALTH_WEBHOOKS = { ghl: 3, stripe: 1 } as const;
export const HEALTH_JOBS = 12;
export const HEALTH_FAILED_JOB = 'ghl-orders';

/** Needs attention, the mockup's four rows. */
export const HEALTH_INCIDENT = { id: 'INC-0007', title: 'GHL order sync failing with 401', severity: 'sev2', opened: 'Dec 9, 9:14 PM' } as const;
export const HEALTH_PAYMENT = { customer: 'Tidewater Property Co.', plan: 'Insiders', amount: '$97.00', attempts: 2, retriesLeft: 2 } as const;
export const HEALTH_WEBHOOK = { type: 'subscription.updated', attempts: 5, error: 'Handler timeout after 10 s' } as const;
export const HEALTH_SEATS = { teamId: 'ws_halemarlowe', name: 'Hale & Marlowe Realty', used: 15, cap: 16 } as const;
/** "Failed payments 3": Tidewater, Hale & Marlowe and Copper Basin (Billing's Failed tab). */
export const HEALTH_FAILED_PAYMENTS = 3;

/** `DEPLOYS`' first three: the mockup's "Latest deploy" card draws the first (`HEALTH_SAMPLE.deploys`). */
export const HEALTH_DEPLOYS = [
  { sha: 'a3f91c2', m: 'Scope 16px floor and 44px targets to phone widths', a: 'Connor Leiva', t: 'Dec 9, 10:42 PM', st: 'live' },
  { sha: '7be20d4', m: 'Curriculum: fitted grid, tier pill, drag handles', a: 'Avery Stone', t: 'Dec 9, 3:15 PM', st: 'succeeded' },
  { sha: 'c41d8e0', m: 'GHL orders: back off on 401 and record last error', a: 'Connor Leiva', t: 'Dec 8, 8:02 PM', st: 'succeeded' },
] as const;

/** What the mockup draws in production's place (see above). */
export const HEALTH_SAMPLE = {
  tiles: {
    connectedBrowsers: { label: 'Live sessions', sub: 'on /api/events' },
    mrr: { label: 'p95 latency', value: '212 ms', sub: 'Healthy', tone: 'ok', to: '/admin/api' },
    acceleratorSeats: { label: 'DB connections', value: '14 / 100', sub: 'Healthy', tone: 'ok', to: '/admin/db' },
  },
  services: [
    ['Web · Railway', 'Healthy'],
    ['Postgres', 'Healthy'],
    ['Stripe', 'Connected'],
    ['GoHighLevel', 'Degraded'],
    ['Resend', 'Connected'],
    ['Zoom', 'Connected'],
  ],
  /** The empty state's GoHighLevel. */
  servicesEmpty: { GoHighLevel: 'Connected' },
  /** The mockup's card shows one deploy. */
  deploys: 1,
} as const;

