// A Library skill's page, from the Library's own record (`../../library/content.ts`): never typed into
// v3. Brief § 4: every skill name in S6, S7, S8 and S13 links to its live skill page.

import { ENTRIES } from '../../library/content';

/** The live page of the Library record whose page is `/<slug>`. Throws if there is none, or it isn't live. */
export function skillHref(slug: string): string {
  const entry = ENTRIES.find((e) => e.href === `/${slug}`);
  if (!entry?.href) throw new Error(`The Library has no live page for "${slug}"`);
  return entry.href;
}
