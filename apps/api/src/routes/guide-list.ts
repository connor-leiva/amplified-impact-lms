// The free guides the API serves (DECISIONS.md D-038, D-039, D-040, D-045, D-046), and where each one's pieces
// live. No imports, so `routes/ai101.ts` (the opt-in route) and `routes/guides.ts` (the pages) can both read it.
//
// A guide's slug is its page (`/<slug>`), its opt-in route (`POST /api/<slug>`), its built file
// (`apps/web/dist/<slug>.html`) and the `source` its sign-ups are stored under, which picks their
// GoHighLevel tags (`SOURCE_TAGS` in integrations/ghl.ts). Its words, PDF and shell are the web app's
// (`apps/web/src/guides/`; the voice profile setup's, `apps/web/src/voice/`). To add a guide, add its
// slug here, its tags there, and its path (and any alias in `GUIDE_ALIASES` below) to `PUBLIC_PREFIX`
// in routes/marketing.ts, and list it in the free library (`ENTRIES` in `apps/web/src/library/content.ts`,
// D-050; a test fails until you do). A guide whose form asks for more than a name and an address says so in
// `SIGN_UP_FORMS` (routes/ai101.ts): /retool's team size (D-046) is the only one so far.

export const GUIDE_SLUGS = ['task-sync-starter', 'ops-time-audit', 'voice-profile', 'reel-editor', 'retool'] as const;
export type GuideSlug = (typeof GUIDE_SLUGS)[number];

/**
 * What the no-JS form's success lands on, where the page shows it with `:target`: a guide's
 * download (`download`: the PDF guides', the Reel Editor's, which holds its setup steps, D-045, and
 * every skill page's, D-052), or the gated steps of a page that is a step-through with the opt-in
 * part way down it: the voice profile setup's (D-040) and /retool's, the "Retool, Don't Replace"
 * talk's (D-046). Only those two are listed; every other guide lands on `download`.
 */
const JOINED_FRAGMENT: Readonly<Partial<Record<GuideSlug, string>>> = {
  'voice-profile': 'unlocked',
  retool: 'unlocked',
};

/**
 * Other spellings of a guide's page, each answered with a 301 to `/<slug>` (`routes/guides.ts`), and
 * let through on the marketing host (`PUBLIC_PREFIX` in routes/marketing.ts) — exact spellings only,
 * so a lookalike still goes to the placeholder. /retool's talk ends on "Type RETOOL in the chat"
 * (D-046), so the room types it in capitals, the way /ai101's slide made `/AI101` one (D-028).
 */
export const GUIDE_ALIASES: Readonly<Partial<Record<GuideSlug, readonly string[]>>> = {
  retool: ['/RETOOL', '/Retool'],
};

export const guidePagePath = (slug: GuideSlug): string => `/${slug}`;
export const guideSignUpPath = (slug: GuideSlug): string => `/api/${slug}`;
/** Where the no-JS form lands once the sign-up is stored. */
export const guideJoinedLocation = (slug: GuideSlug): string => `/${slug}#${JOINED_FRAGMENT[slug] ?? 'download'}`;
/** Where a refused no-JS form lands: the page's error line, shown the same way. */
export const guideErrorLocation = (slug: GuideSlug): string => `/${slug}#guide-error`;
