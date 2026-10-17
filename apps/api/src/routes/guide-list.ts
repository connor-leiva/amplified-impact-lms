// The free guides the API serves (DECISIONS.md D-038, D-039, D-040), and where each one's pieces live. No
// imports, so `routes/ai101.ts` (the opt-in route) and `routes/guides.ts` (the pages) can both read it.
//
// A guide's slug is its page (`/<slug>`), its opt-in route (`POST /api/<slug>`), its built file
// (`apps/web/dist/<slug>.html`) and the `source` its sign-ups are stored under, which picks their
// GoHighLevel tags (`SOURCE_TAGS` in integrations/ghl.ts). Its words, PDF and shell are the web app's
// (`apps/web/src/guides/`; the voice profile setup's, `apps/web/src/voice/`). To add a guide, add its
// slug here, its tags there, and its path to `PUBLIC_PREFIX` in routes/marketing.ts.

export const GUIDE_SLUGS = ['task-sync-starter', 'ops-time-audit', 'voice-profile'] as const;
export type GuideSlug = (typeof GUIDE_SLUGS)[number];

/**
 * What the no-JS form's success lands on, where the page shows it with `:target`: a PDF guide's
 * download, or the voice profile setup's gated steps (D-040).
 */
const JOINED_FRAGMENT: Readonly<Record<GuideSlug, string>> = {
  'task-sync-starter': 'download',
  'ops-time-audit': 'download',
  'voice-profile': 'unlocked',
};

export const guidePagePath = (slug: GuideSlug): string => `/${slug}`;
export const guideSignUpPath = (slug: GuideSlug): string => `/api/${slug}`;
/** Where the no-JS form lands once the sign-up is stored. */
export const guideJoinedLocation = (slug: GuideSlug): string => `/${slug}#${JOINED_FRAGMENT[slug]}`;
/** Where a refused no-JS form lands: the page's error line, shown the same way. */
export const guideErrorLocation = (slug: GuideSlug): string => `/${slug}#guide-error`;
