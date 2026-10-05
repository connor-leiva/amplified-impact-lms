// The API's clock and its id generator — phase 07 § 7.7.
//
// § 7.7 is one sentence: "`clock.now()` returns `Date.parse(process.env.FIXED_NOW)` when
// `NODE_ENV === 'test'` and `FIXED_NOW` is set; otherwise `Date.now()`." Everything else in this
// file exists because of the Gate 7 checklist's other sentence, the one about ids:
//
//   "Ids are deterministic because the API uses the same `deterministicIds()` generator when
//    NODE_ENV === 'test'."
//
// That makes the oracle comparison possible at all. The oracle runs each mutation TWICE — once
// through the HTTP route against Postgres, once in-process against `seedForDatabase('live')` — and
// compares the two snapshots with `toEqual`. Three of the 37 mutations mint an id
// (`requestUpgrade` → `ur…`, `inviteMember` → `u…`, `inviteStaff` → `st…`, plus `createCohort`,
// `uploadResource` and `sendAnnouncement` on the admin side), so if the two runs disagree about
// one character of one id the test fails on a diff that looks like a persistence bug and is not.
//
// WHY THE GENERATOR IS CREATED PER MUTATION, NOT PER PROCESS. The oracle writes
// `{ now: NOW, id: deterministicIds() }` — a FRESH generator, inside the `it()`, for a single
// mutation call. For the API side to produce the same ids, § 7.3's `newId` has to be a fresh
// generator per request too, which is why `newIds()` returns one rather than being one. A
// process-wide counter would make the first request of a run and the fortieth disagree.
//
// WHY THE SHAPE MATCHES THE FIXTURE'S. `apps/web/src/data/fixture.ts` mints
// `${prefix}${clock.now().toString(36)}${(n++).toString(36)}`. Keeping that exact shape here means
// an id minted by the API is indistinguishable from one minted in fixture mode — which matters
// because Gate 7 re-runs the portal parity scenarios in http mode against the SAME goldens, and a
// generated id can reach a `data-` attribute or a key. It also keeps the generated ids clear of the
// seed's own namespace: `uploadResource` mints `c.id('r')` and the seed already contains `r1`…`r13`,
// so a bare counter would hand out `r1` a second time on its second call. The clock segment makes
// that collision impossible without needing a lookup.

import { randomUUID } from 'node:crypto';

/**
 * Epoch ms the FIXED_NOW environment variable names, or `null` when the test clock is not in play.
 *
 * Read on every call, never captured at import. The oracle sets `process.env.FIXED_NOW` inside a
 * `beforeEach`, which runs long after this module is first imported, so a value cached at import
 * would pin every test to whatever the clock was when the first `import` ran.
 */
function fixedNow(): number | null {
  if (process.env.NODE_ENV !== 'test') return null;
  const raw = process.env.FIXED_NOW;
  if (raw === undefined || raw.trim() === '') return null;

  const parsed = Date.parse(raw);
  // `Date.parse` answers NaN for anything it cannot read, and NaN propagates silently: every
  // `isOpen`, every window in `dueWork` and every stored `at` would be NaN, every comparison would
  // be false, and the suite would fail somewhere else entirely with no mention of this variable.
  if (Number.isNaN(parsed)) {
    throw new Error(
      `FIXED_NOW is not a date this runtime can parse: ${JSON.stringify(raw)}. ` +
        'Use an ISO 8601 instant with an explicit offset, e.g. 2026-12-07T10:42:00-06:00.',
    );
  }
  return parsed;
}

export const clock = {
  /** § 7.7: the pinned test instant when there is one, the wall clock otherwise. */
  now: (): number => fixedNow() ?? Date.now(),

  /**
   * Whether the test clock is in play. The routes need this for more than time: § 7.7's test-only
   * `POST /api/test/session` and the Gate 7 outbox exist only when this is true, and `newIds()`
   * switches generators on it.
   */
  isFixed: (): boolean => fixedNow() !== null,
};

/**
 * The generator the Gate 7 oracle uses on the core side, and the one `newIds()` returns in test
 * mode. Same sequence from the same `now`, so two fresh generators handed the same pinned instant
 * agree call for call.
 *
 * `now` defaults to `clock.now()`, which under FIXED_NOW is the pinned instant on both sides of the
 * comparison — so the oracle can write `deterministicIds()` with no argument, exactly as the Gate 7
 * snippet does, and still match the API. Passing it explicitly is for the caller who has a `now` in
 * hand and would rather not depend on the environment at all.
 */
export function deterministicIds(now: number = clock.now()): (prefix: string) => string {
  let n = 0;
  return (prefix: string) => `${prefix}${now.toString(36)}${(n++).toString(36)}`;
}

/**
 * A generator whose ids are unique across processes, for production.
 *
 * The counter alone is not enough once there is more than one replica, and `clock.now()` alone is
 * not enough because two requests inside the same millisecond would collide — so the random
 * segment carries the uniqueness and the other two keep ids roughly sortable and readable in a log.
 * `randomUUID` rather than `Math.random`, because these ids land in a URL and in the activity feed.
 */
export function randomIds(): (prefix: string) => string {
  let n = 0;
  return (prefix: string) =>
    `${prefix}${Date.now().toString(36)}${(n++).toString(36)}${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

/**
 * § 7.3's `newId`, one generator per mutation request.
 *
 * Deterministic under the test clock and random otherwise. The route does
 * `const id = newIds()` once per request and passes it as `ctx.id`.
 */
export const newIds = (): ((prefix: string) => string) => (clock.isFixed() ? deterministicIds() : randomIds());
