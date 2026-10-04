// Rendering a session instant for an arbitrary recipient, phase 08 § 8.1:
//
//   "Session times in emails use `fmt.when` with the **recipient's** saved zone, and fall back
//    to CT."
//
// =================================================================================================
// HOW `fmt` CAN BE POINTED AT A CHOSEN ZONE, AND THE ONE RULE THAT MAKES IT SAFE
// =================================================================================================
//
// `packages/core/src/time.ts` holds the viewer zone in a module-level `let VIEW_TZ`, set by
// `setViewerZone(z)` and read by `viewerZone()`, which every `fmt.*` function calls. In the browser
// that is exactly right: there is one viewer per tab, and `apps/web/src/lib/prefs.ts` sets it once
// from the saved preference.
//
// In a Node process there is no single viewer. Each email has its own recipient, so the zone has to
// be chosen per render — and it CAN be, with `setViewerZone`, but only under one rule:
//
//   THE ZONE MUST BE SET AND READ INSIDE ONE SYNCHRONOUS RUN, WITH NO `await` IN BETWEEN.
//
// That is not a stylistic preference, it is the difference between a correct email and a wrong one.
// `@react-email/render`'s `render()` is async and renders through `renderToReadableStream`, so
// component bodies execute across microtask boundaries. Wrapping `await render(<Session … />)` in
// `setViewerZone(recipient)` / `setViewerZone(null)` would let a second, concurrent render — a
// scheduler fanning the same reminder out to twelve learners in twelve zones — change `VIEW_TZ`
// under the first one. Nothing would throw. Some learners would simply be told the wrong hour.
//
// So `whenFor` formats the string FIRST, synchronously, and the components receive a finished
// string. `elementFor` in `index.tsx` is where that happens, before any `await`.
//
// Two further consequences, recorded because they are not obvious:
//
//   1. THE ZONE IS RESTORED TO `null`, NOT TO WHAT IT WAS. `time.ts` exports no reader for the raw
//      `VIEW_TZ` — `viewerZone()` already substitutes `autoZone()` for `null` — so "what it was"
//      cannot be observed, and reading it back would turn an unset zone into the host's zone
//      permanently. `null` means "auto", which is the correct resting value for a server that has
//      no viewer: nothing else in `apps/api/src` formats through `fmt` (only `fmt.pct` appears, in
//      the snapshot codec's tests, and percentages carry no zone). `setViewerZone(null)` in an
//      `afterAll` is the same reset the web view-model suites already use.
//
//   2. IT IS RESTORED IN A `finally`. If `fmt.when` ever threw, leaving a recipient's zone latched
//      into a shared module would mis-render every later email in the process.
//
// REQUIRED FOLLOW-UP (not this sprint). The honest fix is for `fmt` to take the zone rather than
// read it from module state — an optional `zone` argument, or a `withViewerZone(zone, fn)` helper
// in `packages/core`. Either changes a `packages/core` export's signature, which this sprint is not
// allowed to touch, and both deserve to be decided with the scheduler (§ 8.5) that will be the
// first caller to render many zones at once.

import { PROGRAM_TZ, fmt, setViewerZone } from '@ai/core';

/**
 * A recipient's saved zone, as `users.prefs.tz` stores it (`apps/api/src/db/schema.ts`): an IANA
 * name, or `null`/absent/`''` for "auto" — which on the server means "we were never told".
 */
export type RecipientZone = string | null | undefined;

/**
 * Can `Intl` — and therefore every `fmt.*` function — actually format in this zone?
 *
 * `fmt.when` reaches `toLocaleDateString(…, { timeZone: z })`, and an unrecognised `timeZone`
 * makes that THROW a `RangeError` rather than fall back to anything. So this question has to be
 * asked before the zone is handed to `fmt`, and the only way to ask it is to try.
 *
 * The constructor, not a format call: constructing is where `Intl` validates the zone, and it is
 * the same probe `@ai/core`'s own `zoneAbbr` makes (`new Intl.DateTimeFormat('en-US', { timeZone:
 * z, … })` inside a try/catch) for exactly this reason.
 */
function formattable(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The zone to render in: the recipient's, or § 8.1's CT fallback.
 *
 * `PROGRAM_TZ` rather than the literal `'America/Chicago'`, so this follows the program if it ever
 * moves. An empty string falls back too — `''` is what `ZONES`'s first entry ("Auto") stores.
 *
 * AN UNUSABLE ZONE FALLS BACK TOO, and that is not defensive decoration. `users.prefs` is
 * free-form `jsonb` (`apps/api/src/db/schema.ts`) with no enum and no check constraint, so the
 * stored `tz` is NOT guaranteed to be one of `ZONES`'s eight: a hand-written migration, an
 * imported roster or a typo'd API body can put `'America/Chigago'` in that column. Without this
 * check `whenFor` throws `RangeError` out of `elementFor`, `transport.send` logs `template render
 * threw: …` and returns `{ok: false}`, and that ONE learner silently receives no email at all —
 * not a wrong time, no email — while the other thirteen get theirs. § 8.1 says "and fall back to
 * CT"; a zone we cannot render in is a zone we were not usefully told, so it falls back.
 *
 * Silently, with no `console.warn`: `zoneAbbr` in `packages/core/src/time.ts` swallows the same
 * failure the same way, and § 8.5's scheduler re-renders every open window on every 60-second
 * tick, so one bad row would print a warning a minute, for ever, for a learner who is now reading
 * the right email. A bad `prefs.tz` is a data-repair job, not a per-send log line.
 */
export const zoneFor = (zone: RecipientZone): string => {
  const named = (zone && zone.trim()) || '';
  return named && formattable(named) ? named : PROGRAM_TZ;
};

/**
 * § 8.1's rule, as one synchronous call: `fmt.when(t)` rendered for `zone`, falling back to CT.
 *
 * The result reads "Tue, Dec 8 · 1:00 PM CT" for a Central recipient and
 * "Tue, Dec 8 · 2:00 PM ET (1:00 PM CT)" for an Eastern one — the viewer zone first and the program
 * zone in parentheses, which is CLAUDE.md's time rule and `fmt.time`'s own behaviour. Nothing is
 * reimplemented here; the only thing this function does is choose the zone.
 */
export function whenFor(t: number, zone: RecipientZone): string {
  setViewerZone(zoneFor(zone));
  try {
    return fmt.when(t);
  } finally {
    setViewerZone(null);
  }
}
