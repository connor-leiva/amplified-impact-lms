// Every word on /teams, the Amplified Team Plan's sales page (DECISIONS.md D-113), that is not already
// somewhere else.
//
// THE SOURCES. Spring's page outline (docs/SPRING-PLAN.md, "Amplified Team Plan (/teams)"): "Let us
// train your team." and three tier cards, what your agents get (the same as the Amplified Agent Plan),
// what you get as the owner, how agents join, the 3 month minimum then month to month, then proof, the
// questions and the buttons, with over 40 booking a call. The overnight brief: the `agents-upto15` and
// `agents-16to40` carts from /api/offer, the waitlist after November 30, the owner view and agent
// invites, and agent skills opening December 14. The prices and dates are D-104's checkout terms, as
// /offer says them (`OFFERS.agents`, D-105); a test holds the two pages to the same numbers.
//
// Spring's voice: contractions, short sentences, lead with a statement, no victim language. No em
// dashes, no exclamation marks. Labels and buttons in Title Case. No testimonials. Never "Forum".
// Open decisions stay open: the weekly training's day and time ("weekly, starting the week of
// January 4"), and any Team Plan price after founding (the waitlist instead, Connor 2026-11-10).

import type { CartId } from '@ai/core/offer';
import type { Faq } from '../site/offers-content';

export const TEAMS_META = {
  title: 'Amplified Team Plan · Amplified Impact',
  description:
    'Let us train your team. Every agent gets the skills and weekly live training. You get their logins and a view of who’s using it. From $1,491 today for your first 3 months.',
  path: '/teams',
} as const;

export const TEAMS_HERO = {
  eyebrow: 'Amplified Team Plan',
  title: 'Let us train your team.',
  lede: 'Every agent on your team gets the skills and weekly live training. You get their logins and a view of who’s using it.',
  countdownAfter: ' at founding prices. They end ',
  countdownEnd: '.',
  closedBefore: 'Founding prices ended ',
  closedAfter: '. Join the waitlist to hear what’s next.',
} as const;

/** One team size. The first two sell through their carts; over 40 is a conversation. */
export interface Tier {
  id: string;
  name: string;
  cart: CartId | null;
  amount: string;
  unit: string;
  terms: readonly string[];
  owner: readonly string[];
  button: string;
}

export const TIERS = {
  heading: 'Pick your team size',
  ownerLabel: 'For you',
  items: [
    {
      id: 'size-15',
      name: 'Up to 15 agents',
      cart: 'agents-upto15',
      amount: '$1,491',
      unit: 'today for your first 3 months',
      terms: ['That covers January 4 to April 3, 2027.', 'Then $497 a month, starting Sunday, April 4, 2027.'],
      owner: ['Logins for your agents', 'A view of who’s using it'],
      button: 'Get Amplified Team Plan',
    },
    {
      id: 'size-40',
      name: '16 to 40 agents',
      cart: 'agents-16to40',
      amount: '$2,391',
      unit: 'today for your first 3 months',
      terms: ['That covers January 4 to April 3, 2027.', 'Then $797 a month, starting Sunday, April 4, 2027.'],
      owner: ['Logins for your agents', 'A view of who’s using it', 'A monthly owner call on who’s using it'],
      button: 'Get Amplified Team Plan',
    },
    {
      id: 'size-more',
      name: 'Over 40 agents',
      cart: null,
      amount: 'Custom',
      unit: 'for large teams and brokerages',
      terms: ['We’ll set it up around your team.'],
      owner: ['Everything above, sized to you'],
      button: 'Let’s Talk',
    },
  ] as readonly Tier[],
} as const;

export const AGENTS_GET = {
  heading: 'What your agents get',
  lede: 'The same as the Amplified Agent Plan. An agent on your team gets exactly what a solo agent gets.',
  lines: [
    'Every agent skill',
    'A short recorded starter path for their first week',
    'One live training a week, 60 minutes',
    'Weekly office hours, 60 minutes on Thursdays',
  ],
  rotationLabel: 'The live training changes topic each week of the month:',
  // Spring's plan, "How each program runs". [OPEN: the training's day and time.]
  rotation: ['Week 1: Leads and follow-up', 'Week 2: Listings', 'Week 3: Buyers and contracts', 'Week 4: Content and your week'],
} as const;

export const OWNER_GETS = {
  heading: 'What you get as the owner',
  lines: [
    'A login for every agent, invited from your account',
    'A view of who’s using it',
    '16 to 40 agents: a monthly owner call on who’s using it',
    'Our year-end AI goal planning Zooms: Thursday, December 10, and Thursday, December 17 with your agents invited',
  ],
} as const;

/** How agents join, in order. The first step's login line has a version for before and after the invite hold. */
export const JOIN = {
  heading: 'How your agents join',
  steps: [
    {
      title: 'You buy',
      held: { before: 'Your login comes by email on ', after: '.' },
      sent: 'Your login comes by email within a few minutes.',
    },
    { title: 'You invite your agents', body: 'Add each agent by email from your account. Their login comes straight to them.' },
    { title: 'Monday, December 14', body: 'Your agents’ skills and the starter path open, with the 5 free skills.' },
    { title: 'The week of January 4', body: 'Weekly live training starts. Agents who join later start the starter path the day they join.' },
  ],
} as const;

export const BILLING = {
  heading: 'How billing works',
  lines: [
    'Your first 3 months are paid today. They cover January 4 to April 3, 2027.',
    'Then it’s monthly, starting Sunday, April 4, 2027: $497 up to 15 agents, or $797 for 16 to 40.',
    'After that, it’s month to month.',
  ],
} as const;

export const TEAMS_FAQ: { heading: string; items: readonly Faq[] } = {
  heading: 'Questions',
  items: [
    {
      q: 'When do my agents start?',
      a: ['Their skills and the starter path open Monday, December 14. Weekly live training starts the week of January 4.'],
    },
    {
      q: 'Do my agents need Claude or ChatGPT?',
      a: ['Yes, one of them. Most skills run in both. Every skill page says which tools it works in.'],
    },
    {
      q: 'What happens after November 30?',
      a: ['Founding prices end Monday, November 30 at 11:59 PM Mountain. After that, join the waitlist and we’ll tell you what’s next.'],
      link: { label: 'Join the Waitlist', href: '/offer#waitlist' },
    },
    {
      q: 'Can I cancel?',
      a: [
        'Your first 3 months are paid up front. After that, it’s month to month.',
        'If you cancel, you keep the skills you’ve downloaded. You lose new skills, updates and training.',
      ],
    },
    {
      q: 'What if I have more than 40 agents?',
      a: ['Let’s talk. We’ll size it to your team.'],
    },
    {
      q: 'What’s the refund policy?',
      // The attorney's wording is the agreement's (docs/SPRING-PLAN.md, Phase 1 item 4): this page points to it.
      a: ['It’s in our Subscription Agreement, which you accept at checkout.'],
      link: { label: 'Read the Subscription Agreement', href: '/agreement' },
    },
  ],
};

export const TEAMS_END = {
  heading: 'Ready to train your team?',
  button: 'Pick Your Team Size',
  moreBefore: 'Over 40 agents? ',
  moreLink: 'Let’s talk',
  moreAfter: '.',
} as const;
