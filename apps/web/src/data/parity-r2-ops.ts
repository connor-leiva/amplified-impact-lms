// The R2 parity fixture's Operations data (D-168, BUILD-SPEC § 6.1): the mockup's own `Integrations`
// list (`L`), `DEPLOYS`, the `Db` page's figures and the `Flags` page's `F` and secrets, verbatim from
// design-reference/admin-redesign-r2/AdminRedesign.jsx. FIXTURE ONLY, like `parity-r2.ts`: the Console
// fixture (`console-fixture-ops.ts`) reads it, and the http build has neither (`console-build.test.ts`).
//
// Every value is fiction. The mockup's flags list (`F`) is its own: v1's only Console flag is
// `masquerade_enabled` (spec § 7.13, D10); the other seven are drawn here, read-only, for parity, and
// listed in D-168 under "Needs Connor's call".

/** `Integrations`'s `L`: name, state, last success, last error, the secrets and their presence, the public id. */
export const INTEGRATIONS = [
  { id: 'stripe', st: 'Connected', ok: 'Dec 10, 9:18 AM', err: 'None', sec: [['Secret key', 1], ['Webhook signing secret', 1]] },
  { id: 'ghl', st: 'Degraded', ok: 'Dec 9, 9:04 PM', err: 'Dec 10, 9:10 AM · 401 Unauthorized', sec: [['Access token', 1], ['Location ID', 1]] },
  { id: 'zoom', st: 'Connected', ok: 'Dec 9, 12:00 PM', err: 'None', sec: [['OAuth client secret', 1], ['Recording webhook secret', 0]] },
  { id: 'google', st: 'Connected', ok: 'Dec 10, 8:52 AM', err: 'None', sec: [['OAuth client secret', 1]] },
  { id: 'resend', st: 'Connected', ok: 'Dec 10, 9:18 AM', err: 'Dec 7, 7:00 AM · 1 hard bounce', sec: [['API key', 1]] },
  { id: 'storage', st: 'Connected', ok: 'Dec 10, 9:02 AM', err: 'None', sec: [['Access key', 1]] },
  { id: 'ga4', st: 'Connected', ok: '—', err: '—', pub: 'G-TSQ5YB5BCP', sec: [] },
  { id: 'meta', st: 'Connected', ok: '—', err: '—', pub: '1835170747490806', sec: [] },
] as const;

/** `DEPLOYS`, newest first. */
export const DEPLOYS = [
  { sha: 'a3f91c2', m: 'Scope 16px floor and 44px targets to phone widths', a: 'Connor Leiva', t: 'Dec 9, 10:42 PM', st: 'Live', dur: '1m 48s' },
  { sha: '7be20d4', m: 'Curriculum: fitted grid, tier pill, drag handles', a: 'Avery Stone', t: 'Dec 9, 3:15 PM', st: 'Succeeded', dur: '1m 52s' },
  { sha: 'c41d8e0', m: 'GHL orders: back off on 401 and record last error', a: 'Connor Leiva', t: 'Dec 8, 8:02 PM', st: 'Succeeded', dur: '1m 44s' },
  { sha: '19aa6f3', m: 'Sidebar: collapsible groups and cohort switcher', a: 'Avery Stone', t: 'Dec 8, 11:20 AM', st: 'Failed', dur: '0m 39s' },
  { sha: 'e5527b9', m: 'Cohort starts at first build (migration 0014)', a: 'Connor Leiva', t: 'Dec 2, 9:48 AM', st: 'Succeeded', dur: '2m 03s' },
] as const;

/** `Db`: "14 / 100", "1.8 GB", "3 … over 500 ms" in 24 hours. */
export const DB_FIGURES = { used: 14, max: 100, sizeGb: 1.8, slowWindowHours: 24, slowOver500: 3 } as const;

/** `Db`'s slow queries: "1,940 ms mean · 96 calls" and its statement. */
export const SLOW_QUERIES = [
  [1940, 96, 'SELECT o.id, o.ghl_attempts, o.ghl_error\nFROM orders o\nWHERE o.ghl_synced_at IS NULL\nORDER BY o.created_at\nLIMIT $1'],
  [812, 14, 'SELECT p.user_id, count(*)\nFROM progress p\nJOIN modules m ON m.id = p.module_id\nWHERE m.cohort_id = $1\nGROUP BY p.user_id'],
  [604, 7, 'SELECT job, key, sent_at\nFROM job_runs\nWHERE job = $1 AND sent_at > $2'],
] as const;

/** `Db`'s largest tables: name, megabytes, rows. */
export const LARGEST_TABLES = [
  ['activity', 412, 2_100_000],
  ['progress', 288, 940_000],
  ['auth_sessions', 164, 310_000],
  ['job_runs', 121, 1_400_000],
  ['stripe_events', 96, 48_000],
  ['orders', 22, 3_200],
] as const;

/** `Db`'s migrations, newest first, with the mockup's times. */
export const MIGRATIONS = [
  ['0014_cohort_starts_at_first_build', 'Dec 2, 9:48 AM'],
  ['0013_course_guide_links', 'Nov 24, 4:48 PM'],
  ['0012_access_group_domains', 'Nov 12, 1:10 PM'],
  ['0011_google_identities', 'Nov 3, 9:32 AM'],
] as const;

/** `Flags`'s `F`: key, line, on. */
export const FLAGS = [
  ['masquerade_enabled', 'Staff can start masquerade sessions', 1],
  ['preview_as_learner', 'Curriculum preview in the builder', 1],
  ['google_sign_in', 'Sign in with Google on the login page', 1],
  ['accelerator_two_pay', 'Offer two payments at Accelerator checkout', 1],
  ['weekly_digest', 'Send the Monday digest email', 1],
  ['ghl_sync_write', 'Write logins and orders to GoHighLevel', 1],
  ['zoom_recording_webhook', 'Accept Zoom recording webhooks', 0],
  ['maintenance_mode', 'Show the maintenance page to learners', 0],
] as const;

/** `Flags`'s Configured secrets, and whether each is present. */
export const SECRETS = [
  ['Stripe secret key', 1],
  ['Stripe webhook signing secret', 1],
  ['Resend API key', 1],
  ['GoHighLevel access token', 1],
  ['Google OAuth client secret', 1],
  ['Zoom OAuth client secret', 1],
  ['Zoom recording webhook secret', 0],
  ['Session signing secret', 1],
  ['Storage access key', 1],
] as const;
