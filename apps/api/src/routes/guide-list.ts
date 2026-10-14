// The free guides the API serves (DECISIONS.md D-038, D-039), and where each one's pieces live. No
// imports, so `routes/ai101.ts` (the opt-in route) and `routes/guides.ts` (the pages) can both read it.
//
// A guide's slug is its page (`/<slug>`), its opt-in route (`POST /api/<slug>`), its built file
// (`apps/web/dist/<slug>.html`) and the `source` its sign-ups are stored under, which picks their
// GoHighLevel tags (`SOURCE_TAGS` in integrations/ghl.ts). Its words, PDF and shell are the web app's
// (`apps/web/src/guides/`). To add a guide, add its slug here, its tags there, and its path to
// `PUBLIC_PREFIX` in routes/marketing.ts.

export const GUIDE_SLUGS = ['task-sync-starter', 'ops-time-audit'] as const;
export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export const guidePagePath = (slug: GuideSlug): string => `/${slug}`;
export const guideSignUpPath = (slug: GuideSlug): string => `/api/${slug}`;
/** Where the no-JS form lands: the download, which the page shows with `:target`. */
export const guideJoinedLocation = (slug: GuideSlug): string => `/${slug}#download`;
/** Where a refused no-JS form lands: the page's error line, shown the same way. */
export const guideErrorLocation = (slug: GuideSlug): string => `/${slug}#guide-error`;
