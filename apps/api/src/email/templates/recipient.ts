// Rendering a session instant for one recipient (§ 8.1's session reminders, D-250).
//
// D-250: the course shows times in Mountain Time, with "MT" (D-175), and so do its reminders. A recipient who saved a
// zone (`users.prefs.tz`) sees theirs first and Mountain Time in parentheses, the time rule with this program's zone;
// one who saved none, or a zone `Intl` can't format, sees Mountain Time alone. § 8.1 had "fall back to CT", the
// reference program's zone; Connor moved it to MT on Nov 24, 2026.
//
// PURE, PER CALL. `mountainWhenFor` takes the zone as an argument. It never sets or reads the shared viewer zone
// (`setViewerZone`), so a scheduler rendering one reminder for many recipients in many zones, with renders
// interleaved across `await`s, can't hand one recipient another's zone.

import { mountainWhenFor } from '@ai/core';

/**
 * A recipient's saved zone, as `users.prefs.tz` stores it (`apps/api/src/db/schema.ts`): an IANA
 * name, or `null`/absent/`''` for "auto", which on the server means "we were never told".
 */
export type RecipientZone = string | null | undefined;

/** Can `Intl` format in this zone? Constructing is where `Intl` validates it, and it throws a `RangeError` when not. */
function formattable(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The recipient's zone if it is one to render in, else `null` (Mountain Time alone).
 *
 * AN UNUSABLE ZONE IS NO ZONE. `users.prefs` is free-form `jsonb` with no enum and no check constraint, so a
 * hand-written migration, an imported roster or a typo'd API body can store `'America/Chigago'`. Rendering in it
 * would throw out of `elementFor`, and that one learner would get no email at all. Silently, with no warning: the
 * scheduler re-renders every open window on every tick, and a bad `prefs.tz` is a data repair, not a log line a minute.
 */
export const zoneFor = (zone: RecipientZone): string | null => {
  const named = (zone && zone.trim()) || '';
  return named && formattable(named) ? named : null;
};

/** The session instant as the recipient reads it: "Wed, Dec 9 · 2:00 PM ET (12:00 PM MT)", or "… · 12:00 PM MT". */
export function whenFor(t: number, zone: RecipientZone): string {
  return mountainWhenFor(t, zoneFor(zone));
}
