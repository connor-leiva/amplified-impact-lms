// What the homepage reads from the Library (`../library/content.ts`): its live cards, for the count it
// prints in four places, and each named skill's card, for its title, its page and its free tag.

import { ENTRIES, type Entry } from '../library/content';

/** The library's live cards: the ones with a page. Their number is the count the page prints (58 today). */
export const liveEntries = (): Entry[] => ENTRIES.filter((e) => e.href !== null);

/** The library card for a page, by its slug. A build error when there is none, so a link never names a missing page. */
export function entryFor(slug: string): Entry {
  const entry = ENTRIES.find((e) => e.href === `/${slug}`);
  if (!entry) throw new Error(`The homepage names /${slug}, but no library card links to it. Fix src/home/content.ts.`);
  return entry;
}
