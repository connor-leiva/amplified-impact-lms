// The mockup's illustrations on /teams: the owner's usage view beside the hero, and a panel for each step
// of "How your agents join". MADE-UP NAMES, EMAILS AND COUNTS, so each carries the "Made-up example"
// tag, and none sits next to a price or a buy button (the brief, audit §6).
//
// OFF UNTIL CONNOR TURNS IT ON. `EXAMPLES_ON` is the page's one switch. Every word here is the mockup's,
// listed under "New copy for Spring's review". Skills are named by Library slug, so their titles are
// the Library's.

/** The page's one switch for its illustrations. */
export const EXAMPLES_ON = false;

/** The owner's view of who's using it (the mockup's `UsageView`), at rest. */
export const USAGE = {
  kicker: 'Your team · this week',
  title: 'Who’s using it',
  roster: [
    ['MR', 'Maya R.', 9, 'Today'],
    ['JP', 'Jordan P.', 7, 'Today'],
    ['AT', 'Alex T.', 5, 'Yesterday'],
    ['SK', 'Sam K.', 3, 'Monday'],
    ['PD', 'Priya D.', 1, 'Last week'],
  ] as readonly (readonly [initials: string, name: string, used: number, last: string])[],
  invited: { initials: 'RM', name: 'Riley M.', chip: 'Login sent', email: 'riley@yourteam.com', button: 'Invite' },
  caption: 'Skills used this week',
} as const;

/** A panel for each step of joining (the mockup's `JoinPanels`), shown together, in order. */
export const JOIN_PANELS = {
  invite: {
    tag: 'Invite your agents',
    meta: '4 of 12 invited',
    emails: ['maya@yourteam.com', 'jordan@yourteam.com', 'alex@yourteam.com', 'sam@yourteam.com'],
    chip: 'Login sent',
  },
  open: {
    tag: 'Monday, December 14',
    meta: 'Skills open',
    slugs: [
      'speed-to-lead-reply',
      'sphere-touch-plan',
      'open-house-follow-up',
      'pricing-conversation-prep',
      'listing-description-writer',
      'seller-listing-update',
    ],
  },
  week: {
    tag: 'The week of January 4',
    meta: 'Training starts',
    events: [
      ['Live training', 'Weekly · 60 minutes'],
      ['Office hours', 'Thursdays · 1:00 PM Central'],
    ] as readonly (readonly [string, string])[],
  },
} as const;
