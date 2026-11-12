// The mockup's illustrations on /agents: three skill cards fanned out beside the hero, and a small card
// under each step of the starter path. MADE-UP NAMES, ADDRESSES AND NUMBERS, so each set carries the
// "Made-up example" tag, and none sits next to a price or a buy button (the brief, audit §6).
//
// OFF UNTIL CONNOR TURNS IT ON. `EXAMPLES_ON` is the page's one switch. Every word here is the mockup's,
// listed under "New copy for Spring's review". The skills are named by Library slug, so each card's
// title is the Library's.

/** The page's one switch for its illustrations. */
export const EXAMPLES_ON = false;

export type FanBody =
  | { kind: 'bubble'; text: string }
  | { kind: 'copy'; text: string }
  | { kind: 'terms'; rows: readonly [label: string, value: string, risk: string][] };

/** The three skill cards beside the hero (the mockup's `Fan`), front card first. */
export const FAN: readonly { tag: string; slug: string; meta: string; body: FanBody; foot: readonly string[] }[] = [
  {
    tag: 'Leads',
    slug: 'speed-to-lead-reply',
    meta: 'New lead · 2 minutes ago',
    body: {
      kind: 'bubble',
      text: 'Hi Dana, thanks for asking about 418 Maple. It’s still available, and Thursday after 5 is open for a showing. Want me to hold a time?',
    },
    foot: ['Call opener ready', '2 follow-ups drafted'],
  },
  {
    tag: 'Listings',
    slug: 'listing-description-writer',
    meta: 'MLS remarks · draft 2',
    body: {
      kind: 'copy',
      text: 'Sunlit corner lot with a remodeled kitchen, a fenced backyard and a two-car garage, a short walk from Main Street.',
    },
    foot: ['Fair housing review done', 'Headline and caption'],
  },
  {
    tag: 'Buyers',
    slug: 'offer-strategy',
    meta: 'Offer terms · 2286 E Pretend Poppy Ln',
    body: {
      kind: 'terms',
      rows: [
        ['Price', '$612,000', ''],
        ['Due diligence', '10 days', '$0 at risk'],
        ['Appraisal gap', '$8,000', '$8,000 at risk'],
      ],
    },
    foot: ['Buyer email drafted'],
  },
];

/** A small card under each step of the starter path, by step (the mockup's `FirstWeek`). */
export const STARTER_CARDS = {
  brain: [
    ['Market', 'Davis County, Utah'],
    ['You work with', 'Buyers and first-time sellers'],
    ['Hours', '8 to 6, never Sundays'],
  ] as const,
  voice: {
    generic: {
      label: 'Generic AI',
      text: 'I hope this message finds you well. I wanted to follow up regarding the inspection results for the property.',
    },
    you: {
      label: 'Sounds like you',
      text: 'Hey Sam, quick one on the inspection: the roof’s fine, the water heater isn’t. I’ll call you at 4 with options.',
    },
  },
  /** Agent skills to pick three from, by Library slug, the first two picked. */
  pick: {
    count: '2 of 3 picked',
    slugs: [
      'speed-to-lead-reply',
      'seller-listing-update',
      'sphere-touch-plan',
      'open-house-follow-up',
      'listing-description-writer',
      'offer-strategy',
    ],
    picked: 2,
  },
} as const;
